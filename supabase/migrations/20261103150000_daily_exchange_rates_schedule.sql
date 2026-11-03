-- =====================================================================
-- Tarea programada: guardar la cotización del dólar todos los días a las 11 h (Argentina).
-- Llama a la función del servidor "daily-exchange-rates" (supabase/functions/).
-- 11 h en Argentina son las 14 h UTC, que es la hora que usa pg_cron.
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'cotizacion-del-dia',
  '0 14 * * *',
  $$
  select net.http_post(
    url := 'https://txuobaovrmdcecdkmrgd.supabase.co/functions/v1/daily-exchange-rates',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
