-- Row-Level Security как страховка поверх прикладного скоупирования по tenant_id.
-- Применяется после `prisma migrate deploy`:
--   pnpm --filter @coffee/api db:rls
--
-- Идея: приложение подключается ролью coffee_app (НЕ владелец таблиц, НЕ superuser),
-- и на каждый запрос выставляет app.tenant_id через set_config(...).
-- Политика пропускает только строки своего тенанта. Пустой app.tenant_id (напр.
-- при работе бота/вебхуков вне тенанта) обрабатывается в коде отдельными путями.

-- Включаем RLS на tenant-таблицах и создаём политику.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'location','staff_user','staff_invite','tenant_customer',
    'category','product','modifier_group','order','notification_log'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I;', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_setting(''app.tenant_id'', true)::uuid) WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true)::uuid);',
      t
    );
  END LOOP;
END $$;

-- Прикладная роль (создать один раз; пароль задаётся при провижининге).
-- CREATE ROLE coffee_app LOGIN PASSWORD '...';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO coffee_app;
-- GRANT USAGE ON SCHEMA public TO coffee_app;
