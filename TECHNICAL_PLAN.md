# План технической реализации

Платформа предзаказа кофе: Telegram Mini App + сайт для гостя, панель бариста, админка владельца. Мультитенантная (одна инсталляция — много кофеен), white-label.

---

## 1. Общая архитектура

```
                        ┌─────────────────────────────┐
   Гость (TMA / сайт)   │                             │
   Панель бариста  ────▶│   Backend-монолит (API)     │────▶ PostgreSQL
   Админка владельца    │   NestJS, REST + WebSocket  │────▶ Redis (pub/sub, кеш, очереди)
                        │                             │────▶ S3 (фото меню)
   Telegram Bot API ◀──▶│  (вебхуки бота и платежей)  │◀──── ЮKassa (вебхуки оплат)
                        └─────────────────────────────┘
```

Принципы:
- **Модульный монолит**, не микросервисы. Один деплой, один процесс (масштабируется репликами), модули разделены на уровне кода.
- **Один фронтенд гостя** для TMA и сайта: канал определяется в рантайме, различается только слой авторизации.
- **Мультитенантность на уровне строк**: `tenant_id` в каждой бизнес-таблице + PostgreSQL Row-Level Security как страховка.
- Всё время в БД — UTC; таймзона хранится у точки (`location.timezone`).

## 2. Стек

| Слой | Технология | Обоснование |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | один код на TMA и сайт |
| TMA SDK | `@telegram-apps/sdk-react` | initData, тема, BackButton, MainButton |
| UI-состояние | TanStack Query + Zustand | серверный кеш + локальный стейт корзины |
| Backend | NestJS (Node 20+, TypeScript) | модульность, DI, guards под мультитенантность |
| ORM | Prisma или Drizzle | миграции, типобезопасность |
| БД | PostgreSQL 16 | RLS, JSONB для снапшотов заказа |
| Кеш/реалтайм/очереди | Redis 7 (+ BullMQ) | pub/sub для WS, отложенные джобы (автоотмена) |
| Файлы | S3-совместимое (MinIO локально) | фото меню |
| Платежи | ЮKassa API (ключи per-tenant) | самый распространённый эквайринг в РФ, фискализация на стороне кофейни |
| Реалтайм | WebSocket (socket.io) + fallback long-polling | статусы заказов |
| Инфра | Docker Compose → VPS; GitHub Actions CI/CD | просто и дёшево на старте |
| Наблюдаемость | Sentry, pino-логи, Uptime Kuma | алерты «точка офлайн» |

## 3. Структура репозитория (монорепо)

```
/apps
  /api            — NestJS backend
  /client         — приложение гостя (TMA + web)
  /staff          — панель бариста (web, планшет)
  /admin          — админка владельца + суперадминка платформы
/packages
  /shared         — типы DTO, enum статусов, валидация (zod), общие утилиты
  /ui             — общие React-компоненты (кнопки, лоадеры, темизация)
/infra            — docker-compose, nginx, миграции окружений
```

Инструменты: pnpm workspaces + Turborepo, ESLint/Prettier, husky pre-commit.

## 4. Модель данных (ядро)

```
tenant            (id, name, slug, plan, status, branding jsonb, bot_token?, created_at)
location          (id, tenant_id, name, address, timezone, schedule jsonb,
                   is_accepting_orders bool, max_orders_per_slot int, geo point)
staff_user        (id, tenant_id, role: owner|manager|barista, phone, tg_user_id?, pin_hash)
customer          (id, phone?, tg_user_id?, name, created_at)        -- глобальный
tenant_customer   (tenant_id, customer_id, first_order_at, orders_count)

category          (id, tenant_id, name, sort, is_active)
product           (id, tenant_id, category_id, name, description, photo_url,
                   base_price int, sort, is_active)
modifier_group    (id, tenant_id, name, min_select, max_select, is_required)
product_modifier_group (product_id, group_id, sort)
modifier_option   (id, group_id, name, price_delta int, is_default)
stop_list         (location_id, product_id? | modifier_option_id?, until_ts?)

order             (id, tenant_id, location_id, customer_id, number,           -- короткий номер дня: A-17
                   status, items jsonb,                                        -- СНАПШОТ позиций с ценами
                   total int, ready_at_requested, ready_at_promised,
                   channel: tma|web, comment, created_at, status_history jsonb)
payment           (id, order_id, provider: yookassa, provider_payment_id,
                   status, amount int, idempotency_key uuid, payload jsonb)
refund            (id, payment_id, amount, status, reason, initiated_by)

payment_credential(tenant_id, provider, shop_id, secret encrypted)
notification_log  (id, tenant_id, order_id, channel, status, payload)
```

Ключевые решения:
- **`order.items` — JSONB-снапшот** (названия, цены, модификаторы на момент заказа): меню меняется, заказ — нет.
- Деньги — **integer в копейках**, никогда float.
- `idempotency_key` на платеже — защита от двойных списаний.
- Индексы: `(tenant_id, status, created_at)` на orders; уникальный `(tenant_id, slug)`.
- RLS-политика на все tenant-таблицы: `tenant_id = current_setting('app.tenant_id')::uuid` — middleware выставляет переменную на каждый запрос; даже баг в коде не отдаст чужие данные.

## 5. Машина состояний заказа

```
created ──оплата──▶ paid ──бариста принял──▶ accepted ──▶ preparing ──▶ ready ──▶ completed
   │                  │                          │
   │ таймаут 15 мин   │ не принят за N мин       │ отказ бариста
   ▼                  ▼ (BullMQ delayed job)     ▼
expired            auto_cancelled ──▶ refund   rejected ──▶ refund
```

- Переходы — только через `OrderService.transition(orderId, event)` с проверкой допустимости; каждый переход пишется в `status_history` и публикуется в Redis pub/sub → WebSocket-комнаты `order:{id}` (гость) и `location:{id}` (бариста).
- Автоотмена: при переходе в `paid` ставится отложенная джоба BullMQ; если к моменту исполнения заказ всё ещё `paid` → `auto_cancelled` + автоматический возврат + уведомление гостя.
- Возврат — идемпотентная операция через API ЮKassa, статус подтверждается вебхуком.

## 6. Авторизация

| Кто | Как |
|---|---|
| Гость в TMA | `initData` из Telegram → бэкенд валидирует HMAC-подпись (токен бота), TTL ≤ 1 час → выдаёт JWT (access 15 мин + refresh) |
| Гость на сайте | Telegram Login Widget (основной, бесплатно) или телефон + код (Flash Call/SMS — платно, вторая очередь) |
| Бариста | вход по ссылке точки + PIN; долгоживущая сессия на устройстве (планшет общий) |
| Владелец | телефон + код или Telegram Login; роли owner/manager |
| Суперадмин платформы | отдельная таблица, TOTP 2FA |

JWT несёт `tenant_id`, `role`, `sub`. Guard в NestJS сверяет `tenant_id` токена с ресурсом запроса и выставляет RLS-переменную.

**Определение тенанта на фронте:** TMA — из `start_param` (`t.me/bot/app?startapp=<tenant_slug>`); сайт — по поддомену `<slug>.platform.ru`.

## 7. API (основные контуры, REST)

```
Гость:
  GET  /v1/menu?location=            — меню с учётом стоп-листа (кеш Redis 30с)
  POST /v1/orders                    — создать заказ (валидация цен на сервере!)
  POST /v1/orders/:id/pay            — создать платёж, вернуть confirmation_url/token
  GET  /v1/orders/:id                — статус (+ WS подписка)
  GET  /v1/orders/my                 — история

Бариста:
  GET   /v1/staff/orders?status=active
  POST  /v1/staff/orders/:id/accept | reject | preparing | ready | complete
  PUT   /v1/staff/stop-list          — тумблеры позиций/модификаторов
  PUT   /v1/staff/location/pause     — приостановить приём заказов

Владелец:
  CRUD /v1/admin/{categories,products,modifier-groups,locations,staff}
  PUT  /v1/admin/payment-credentials
  GET  /v1/admin/stats/…

Вебхуки:
  POST /v1/webhooks/yookassa/:tenantId   — проверка подписи, идемпотентная обработка
  POST /v1/webhooks/telegram/:botId      — апдейты бота
```

Критично: **сумма заказа всегда пересчитывается на сервере** из актуального меню; клиентские цены — только для отображения. При расхождении (цена изменилась между открытием меню и заказом) — ответ 409 с новым прайсом.

## 8. Реалтайм и уведомления

1. **WebSocket** (socket.io, адаптер Redis): комнаты `location:{id}` для панели бариста, `order:{id}` для гостя. При реконнекте — рефетч через REST (WS только «пинок», источник истины — API).
2. **Панель бариста**: звук + вибрация на новый заказ, повтор звука каждые 30 с, пока заказ не принят; watchdog «нет пинга от планшета 2 мин» → пометить точку офлайн, алерт владельцу в бот, автопауза приёма заказов.
3. **Telegram-бот**: сообщения гостю о смене статуса («Готов! Номер A-17»), дублирование новых заказов владельцу/бариста в личку — резервный канал на случай смерти планшета.
4. Все отправки — через очередь BullMQ с ретраями; лог в `notification_log`.

## 9. Платёжный поток (ЮKassa, ключи кофейни)

```
POST /orders/:id/pay
  → создаём payment (idempotency_key)
  → YooKassa create payment (ключи тенанта, receipt для 54-ФЗ из items)
  → отдаём confirmation_url → фронт открывает внутри TMA (openLink) / редирект на сайте
Вебхук payment.succeeded
  → проверка подписи и суммы → order: created→paid → джоба автоотмены → WS/бот уведомления
Фолбэк-сверка: cron каждые 5 мин опрашивает YooKassa по «зависшим» платежам (вебхук мог потеряться)
```

Секреты эквайринга — шифрование на уровне приложения (AES-GCM, ключ в ENV/KMS), в логи не попадают.

## 10. Фронтенды

**Гость (`apps/client`):** экраны — выбор точки → меню → карточка товара с модификаторами → корзина → время готовности (слоты с учётом `max_orders_per_slot`) → оплата → статус-трекер. Тема из Telegram (`themeParams`) + брендинг тенанта (CSS-переменные из `tenant.branding`). Корзина — в Zustand + persist в `cloudStorage` (TMA) / localStorage (web).

**Бариста (`apps/staff`):** одна страница-лента, крупные кнопки под планшет, тёмная тема, работает при блокировке экрана (Wake Lock API), офлайн-баннер при потере сети.

**Админка (`apps/admin`):** формы меню с drag&drop сортировкой, загрузка фото (пресайн-URL в S3, ресайз на бэке через sharp), настройки точки, простая статистика.

## 11. Инфраструктура и эксплуатация

- **Dev:** `docker compose up` — Postgres, Redis, MinIO, api, все фронты; сиды с демо-кофейней. Туннель (cloudflared) для тестов TMA с реального телефона.
- **CI (GitHub Actions):** lint → typecheck → unit → build → миграции на staging → e2e → деплой по тегу.
- **Prod (старт):** 1 VPS в РФ (152-ФЗ), Docker Compose, nginx + certbot (wildcard-сертификат для поддоменов), ежедневные бэкапы Postgres (pg_dump → S3, тест восстановления раз в месяц).
- **Мониторинг:** Sentry (front+back), структурные логи pino, Uptime Kuma; бизнес-алерты в служебный TG-канал: точка офлайн, заказ не принят за 3 мин, вебхук-ошибки, расхождения сверки платежей.

## 12. Тестирование

- Unit: калькулятор цены заказа (модификаторы, краевые случаи), машина состояний, валидация initData — самое ценное покрытие.
- Integration: платёжные вебхуки (двойная доставка, не тот tenant, подделка подписи), RLS-изоляция (тест «тенант А не видит заказы тенанта Б» — обязательный).
- E2E (Playwright): happy path гостя и бариста на каждом релизе.
- Ручное: TMA на реальных iOS + Android (WebView ведут себя по-разному).

---

## 13. Этапы реализации

### Этап 1 — фундамент (2 недели)
Монорепо, docker-compose, CI, скелет NestJS (config, логирование, Sentry), схема БД + миграции + RLS, модуль тенантов и auth (initData-валидация, JWT, guards), сиды. 
**Готово, когда:** e2e-тест «валидный initData → JWT → запрос меню чужого тенанта → 403».

### Этап 2 — меню и заказы без оплаты (2 недели)
CRUD меню с модификаторами (admin API + минимальная админка), публичное меню с кешем и стоп-листом, создание заказа с серверным пересчётом цены, машина состояний, панель бариста (лента + статусы + звук), WebSocket. 
**Готово, когда:** полный цикл заказа «за наличные» проходит на двух устройствах в реальном времени.

### Этап 3 — оплата и уведомления (2 недели)
Интеграция ЮKassa (создание платежа, вебхуки, возвраты, чеки 54-ФЗ), идемпотентность, автоотмена через BullMQ, cron-сверка, Telegram-бот (уведомления гостю, дубли владельцу), стоп-лист с планшета. 
**Готово, когда:** тестовый платёж → paid → таймаут непринятия → автовозврат — без ручных действий.

### Этап 4 — приложение гостя целиком (2–3 недели)
Все экраны TMA, слоты времени с лимитами, история заказов, web-версия (Telegram Login, поддомены), темизация/брендинг, полировка UX корзины и модификаторов, тестирование на устройствах. 
**Готово, когда:** пилотная кофейня может принять реальный заказ от реального гостя.

### Этап 5 — пилот и обвязка эксплуатации (2 недели, параллельно с пилотом)
Мониторинг и бизнес-алерты, watchdog планшета, автопауза точки, бэкапы, регламент возвратов в админке, багфиксы по обратной связи.

### Этап 6 — white-label самообслуживание (3–4 недели)
Онбординг-мастер тенанта (регистрация → меню → эквайринг → QR-коды), суперадминка платформы, биллинг подписки, поддержка собственного бота тенанта (регистрация вебхука по токену), нагрузочный тест изоляции.

**Итого: ~13–15 недель до продаваемого продукта силами 1–2 разработчиков.**

---

## 14. Технические решения, зафиксированные заранее (чтобы не переделывать)

1. `tenant_id` + RLS с первого коммита — ретрофит мультитенантности дороже всего остального вместе взятого.
2. Снапшот заказа в JSONB — заказы неизменяемы, меню волатильно.
3. Деньги в копейках (int), пересчёт суммы только на сервере.
4. Идемпотентность всего платёжного контура: ключи, повторные вебхуки, cron-сверка.
5. WS — только сигнал, источник истины — REST; любой реконнект = рефетч.
6. Монолит до тех пор, пока не заболит; Redis и BullMQ дают весь нужный асинхрон.
