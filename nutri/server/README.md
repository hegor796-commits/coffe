# Бэкенд «Любовь-Марковь» — мультитенант-платформа

Один сервис обслуживает **много кофеен**, у каждой — свой Telegram-бот,
своё меню, свои сотрудники, свои заказы. Ты (владелец платформы) добавляешь
новую кофейню через админ-API — деплоить ничего заново не нужно.

**Zero-dependency**: только `node:http` + `node:sqlite` + `node:crypto`.
Ни `npm install`, ни Postgres, ни Redis — один процесс Node 22+, один
файл SQLite на диске. Дёшево и просто размещать (Railway Hobby с запасом).

## Как это работает

- Клиент открывает мини-апп в Telegram → бэкенд проверяет **подпись
  Telegram initData** токеном бота конкретной кофейни → определяет роль
  (клиент / бариста / менеджер / владелец) по Telegram id.
- Клиент делает заказ → сервер **сам пересчитывает цену** по актуальному
  меню (клиенту нельзя подменить цену) → сохраняет в SQLite → шлёт пуш
  сотрудникам через бота этой кофейни.
- Бариста меняет статус заказа → клиент получает пуш от бота автоматически.
- Мини-апп (UI) размещён отдельно — на GitHub Pages (см. `../design/`).
  Бэкенд отдаёт только API + принимает вебхуки ботов; CORS открыт, чтобы
  Pages могла ходить в API с другого домена.

## Деплой на Railway

1. **New Project → Deploy from GitHub repo** → выбери этот репозиторий.
2. В настройках сервиса:
   - **Root Directory**: `nutri/server`
   - Railway сам увидит `Dockerfile` и соберёт образ (ничего дополнительно
     настраивать не нужно — команда старта уже в Dockerfile: `node src/server.js`).
3. **Добавь Volume** (Settings → Volumes → New Volume) и примонтируй его на
   `/data` — здесь живёт файл SQLite. Без Volume база пропадёт при каждом
   передеплое.
4. **Переменные окружения** (Settings → Variables) — см. `.env.example`.
   Минимум для старта:
   ```
   PUBLIC_URL=https://<домен-этого-сервиса>.up.railway.app
   WEB_APP_BASE=https://hegor796-commits.github.io/coffe
   SUPERADMIN_TG_IDS=<твой Telegram id>
   ADMIN_SECRET=<длинная случайная строка>
   ```
   `PUBLIC_URL` узнаёшь после первого деплоя (Settings → Networking →
   Generate Domain), впиши его и передеплой ещё раз — тогда бэкенд сможет
   ставить вебхуки ботам.
5. Проверь: `https://<твой-домен>/api/health` → `{"ok":true}`.
6. Открой `nutri/design/config.js`, впиши туда `apiBase: 'https://<твой-домен>'`,
   закоммить — GitHub Pages передеплоится сам, и мини-апп начнёт ходить в
   реальный бэкенд.

### Демо-кофейня «Любовь-Марковь»

Создаётся автоматически при первом старте (идемпотентно). Чтобы у нее был
рабочий бот, добавь в переменные окружения:
```
DEMO_BOT_TOKEN=<токен от @BotFather>
SEED_OWNER_TG_ID=<твой Telegram id>
```
Дальше в @BotFather → `/setmenubutton` → ссылка
`https://hegor796-commits.github.io/coffe/?t=lubov`.

## Как добавить новую кофейню (новому человеку — новый бот)

Все запросы ниже — с заголовком `X-Admin-Secret: <ADMIN_SECRET>`.

```bash
curl -X POST https://<твой-домен>/api/admin/tenants \
  -H "X-Admin-Secret: $ADMIN_SECRET" -H "Content-Type: application/json" \
  -d '{
    "slug": "vasya-coffee",
    "name": "У Васи",
    "botToken": "111111:AA...токен-нового-бота-от-BotFather",
    "ownerTgId": "222233344",
    "ownerName": "Вася"
  }'
```
Ответ содержит `webAppUrl` — эту ссылку владелец вставляет в @BotFather
(`/setmenubutton`) для **своего** бота. Готово: у него отдельная кофейня,
отдельное меню (изначально пустое — заполняется через будущую админку или
напрямую в БД), отдельные заказы, свой бот.

Добавить сотрудника существующей кофейне:
```bash
curl -X POST https://<твой-домен>/api/admin/staff \
  -H "X-Admin-Secret: $ADMIN_SECRET" -H "Content-Type: application/json" \
  -d '{"slug":"vasya-coffee","tgUserId":"333344455","role":"barista","name":"Оля"}'
```
Роли: `barista`, `manager`, `owner`.

> Наполнение меню новой кофейни (категории/товары/модификаторы) пока делается
> через прямые SQL-запросы к её `tenant_id` — см. `src/seed.js` как образец.
> Полноценная админка для этого — следующий шаг, если понадобится.

## Локальный запуск

```bash
cd nutri/server
DATA_DIR=./data DEMO_BOT_TOKEN=<токен> SEED_OWNER_TG_ID=<твой id> node src/server.js
```
Мини-апп будет доступен на `http://localhost:3000` (сервер отдаёт статику
из `../design`), API — там же под `/api/*`.

## Тесты

```bash
npm test
```
Поднимает реальный сервер на отдельном порту с чистой БД и прогоняет
сценарии: авторизация по подписи, серверный расчёт цены (включая защиту от
подмены опций), права ролей, полный жизненный цикл заказа, стоп-лист,
сводка. CI (`.github/workflows/server-ci.yml`) гоняет это на каждый пуш.

## Модель данных

`tenants` (кофейни, у каждой свой `bot_token`) → `staff` (роли по Telegram id)
→ `categories`/`products`/`modifier_groups`/`modifier_options` (меню) →
`orders` (снапшот позиций в `items_json`, история статусов в `history_json`).
Все таблицы, кроме `tenants`, содержат `tenant_id` — полная изоляция данных
между кофейнями на уровне запросов.
