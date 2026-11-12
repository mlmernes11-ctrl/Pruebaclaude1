-- =====================================================================
-- Liquidaciones mensuales y ajustes del alquiler, hechos por el servidor
-- ---------------------------------------------------------------------
-- 1. price_indices: los índices oficiales (ICL del BCRA e IPC del INDEC). Los guarda la
--    función del servidor "daily-indices" todos los días.
-- 2. Contratos: cómo se ajusta el alquiler (IPC, ICL o porcentaje fijo) y cada cuántos meses.
-- 3. run_monthly_billing(): crea las liquidaciones del mes que falten y aplica los ajustes que
--    tocan. Corre todos los días a las 3 h (Argentina), así todo está al día aunque nadie abra
--    la app. La app también crea las liquidaciones al abrirse; el índice único evita duplicados.
-- 4. keepalive(): consulta mínima para que el proyecto gratis no se pause por falta de uso.
-- =====================================================================

-- ── 1. Índices oficiales ──────────────────────────────────────────────

create table public.price_indices (
  index text not null check (index in ('ipc', 'icl')),
  date date not null,
  value numeric not null check (value > 0),
  primary key (index, date)
);
comment on table public.price_indices is 'Índices para ajustar alquileres. icl: ICL diario del BCRA. ipc: IPC nacional mensual del INDEC (fecha = primer día del mes).';

alter table public.price_indices enable row level security;
create policy "read_indices" on public.price_indices for select to authenticated using (true);
revoke all on table public.price_indices from anon;

-- ── 2. Ajuste del alquiler en cada contrato ───────────────────────────

alter table public.contracts
  add column adjustment_index text check (adjustment_index in ('ipc', 'icl', 'fijo')),
  add column adjustment_months integer check (adjustment_months between 1 and 24),
  add column adjustment_percent numeric check (adjustment_percent > 0),
  add column last_adjusted_period text check (last_adjusted_period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  add constraint contracts_adjustment_complete check (
    adjustment_index is null
    or (adjustment_months is not null and (adjustment_index <> 'fijo' or adjustment_percent is not null))
  );

comment on column public.contracts.adjustment_index is 'Cómo se ajusta el alquiler: ipc, icl o fijo (porcentaje). Vacío = sin ajuste.';
comment on column public.contracts.adjustment_months is 'Cada cuántos meses se ajusta, contando desde el inicio del contrato.';
comment on column public.contracts.adjustment_percent is 'Porcentaje de cada ajuste, si es fijo.';
comment on column public.contracts.last_adjusted_period is 'Último mes (AAAA-MM) en que se aplicó un ajuste. El alquiler cargado ya incluye los ajustes hasta ese mes.';

-- ── 3. Liquidaciones y ajustes ────────────────────────────────────────

-- Primer día de un período AAAA-MM.
create or replace function public.period_start(period text)
returns date
language sql
immutable
set search_path = ''
as $$
  select to_date(period || '-01', 'YYYY-MM-DD');
$$;

-- Fecha de un día del mes dentro de un período, sin pasarse del último día del mes.
create or replace function public.period_day(period text, day integer)
returns date
language sql
immutable
set search_path = ''
as $$
  select least(
    public.period_start(period) + (day - 1),
    (public.period_start(period) + interval '1 month' - interval '1 day')::date
  );
$$;

-- Último valor publicado de un índice hasta una fecha.
create or replace function public.index_value_at(idx text, at_date date)
returns numeric
language sql
stable
set search_path = ''
as $$
  select value from public.price_indices
  where index = idx and date <= at_date
  order by date desc
  limit 1;
$$;

create or replace function public.run_monthly_billing()
returns void
language plpgsql
set search_path = ''
as $$
declare
  this_period text := to_char(now() at time zone 'America/Argentina/Buenos_Aires', 'YYYY-MM');
  c record;
  base_period text;
  next_period text;
  factor numeric;
  ipc_last date;
  new_rent numeric;
  note text;
begin
  -- 3a. Liquidaciones que faltan, desde el primer mes a liquidar hasta este mes (igual que la app).
  with active as (
    select
      ct.id, ct.user_id, ct.rent_amount, ct.currency, ct.payment_day, ct.start_date,
      p.expensas_amount, p.servicios_amount,
      greatest(
        to_char(ct.start_date, 'YYYY-MM'),
        coalesce(ct.billing_start_period, to_char(ct.created_at at time zone 'America/Argentina/Buenos_Aires', 'YYYY-MM'))
      ) as first_period,
      least(to_char(ct.end_date, 'YYYY-MM'), this_period) as last_period
    from public.contracts ct
    join public.properties p on p.id = ct.property_id and p.user_id = ct.user_id
    where ct.status = 'activo'
  ),
  wanted as (
    select
      a.id as contract_id, a.user_id, x.concept, to_char(m, 'YYYY-MM') as period, x.amount, x.currency,
      greatest(public.period_day(to_char(m, 'YYYY-MM'), a.payment_day), a.start_date) as due_date
    from active a
    cross join lateral generate_series(
      public.period_start(a.first_period), public.period_start(a.last_period), interval '1 month'
    ) as m
    cross join lateral (values
      ('alquiler', a.rent_amount, a.currency),
      ('expensas', a.expensas_amount, 'ARS'),
      ('servicios', a.servicios_amount, 'ARS')
    ) as x (concept, amount, currency)
    where a.first_period <= a.last_period and x.amount > 0
  )
  insert into public.charges (id, user_id, contract_id, concept, period, amount, currency, due_date, auto_generated)
  select gen_random_uuid()::text, w.user_id, w.contract_id, w.concept, w.period, w.amount, w.currency, w.due_date, true
  from wanted w
  where not exists (
    select 1 from public.charges ch
    where ch.contract_id = w.contract_id and ch.concept = w.concept and ch.period = w.period
  )
  on conflict (contract_id, concept, period) where auto_generated do nothing;

  -- 3b. Ajustes que tocan (uno o varios, si quedaron atrasados).
  for c in
    select * from public.contracts
    where status = 'activo' and adjustment_index is not null and adjustment_months is not null
  loop
    loop
      base_period := coalesce(c.last_adjusted_period, to_char(c.start_date, 'YYYY-MM'));
      next_period := to_char(public.period_start(base_period) + make_interval(months => c.adjustment_months), 'YYYY-MM');
      exit when next_period > this_period or next_period > to_char(c.end_date, 'YYYY-MM');

      factor := null;
      if c.adjustment_index = 'fijo' then
        factor := 1 + c.adjustment_percent / 100;
      elsif c.adjustment_index = 'icl' then
        -- ICL del día del ajuste dividido el del ajuste anterior (o el inicio del contrato).
        factor := public.index_value_at('icl', public.period_day(next_period, extract(day from c.start_date)::int))
          / nullif(public.index_value_at('icl', public.period_day(base_period, extract(day from c.start_date)::int)), 0);
        -- Si todavía no está publicado el valor del día del ajuste, se espera.
        if not exists (
          select 1 from public.price_indices
          where index = 'icl' and date >= public.period_day(next_period, extract(day from c.start_date)::int)
        ) then
          factor := null;
        end if;
      else
        -- IPC: variación de los últimos N meses publicados antes del mes del ajuste.
        select max(date) into ipc_last from public.price_indices
        where index = 'ipc' and date < public.period_start(next_period);
        if ipc_last is not null then
          factor := public.index_value_at('ipc', ipc_last)
            / nullif((select value from public.price_indices
                      where index = 'ipc' and date = (ipc_last - make_interval(months => c.adjustment_months))::date), 0);
        end if;
      end if;

      -- Sin índice disponible todavía: se reintenta mañana.
      exit when factor is null or factor <= 0;

      new_rent := round(c.rent_amount * factor, case when c.currency = 'ARS' then 0 else 2 end);
      note := format(
        'Ajuste %s: %s%s %% (antes %s %s)',
        case c.adjustment_index when 'ipc' then 'IPC' when 'icl' then 'ICL' else 'fijo' end,
        case when factor >= 1 then '+' else '' end,
        replace(to_char((factor - 1) * 100, 'FM9999990.0'), '.', ','),
        case c.currency when 'USD' then 'US$' else '$' end,
        replace(to_char(c.rent_amount, 'FM999G999G999G990'), ',', '.')
      );

      update public.contracts
      set rent_amount = new_rent, last_adjusted_period = next_period
      where id = c.id;

      -- Las liquidaciones de alquiler impagas desde el mes del ajuste toman el valor nuevo.
      update public.charges ch
      set amount = new_rent,
          notes = case when ch.period = next_period then concat_ws(' · ', nullif(ch.notes, ''), note) else ch.notes end
      where ch.contract_id = c.id
        and ch.concept = 'alquiler'
        and ch.auto_generated
        and not ch.voided
        and ch.period >= next_period
        and not exists (
          select 1 from public.payments p, jsonb_array_elements(p.allocations) a
          where p.contract_id = c.id and a ->> 'chargeId' = ch.id
        );

      c.rent_amount := new_rent;
      c.last_adjusted_period := next_period;
    end loop;
  end loop;
end;
$$;

revoke all on function public.run_monthly_billing() from public, anon, authenticated;

select cron.schedule('liquidaciones-del-mes', '5 6 * * *', $$ select public.run_monthly_billing(); $$);

-- Índices: se bajan todos los días a las 10:40 (Argentina), antes de que se necesiten.
select cron.schedule(
  'indices-de-ajuste',
  '40 13 * * *',
  $$
  select net.http_post(
    url := 'https://txuobaovrmdcecdkmrgd.supabase.co/functions/v1/daily-indices',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- ── 4. Mantener activo el proyecto ────────────────────────────────────

create or replace function public.keepalive()
returns text
language sql
stable
set search_path = ''
as $$
  select 'ok'::text;
$$;

revoke all on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;
