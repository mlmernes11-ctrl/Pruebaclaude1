-- =====================================================================
-- Repartos en su propia tabla y reglas automáticas por cuenta en el servidor
-- ---------------------------------------------------------------------
-- 1. payment_allocations: cuánto de cada cobro se aplicó a cada cargo. Antes era una lista JSON
--    dentro del cobro; ahora la base controla que cobro y cargo existan y sean de la misma cuenta.
-- 2. bill_account(usuario): todo lo automático de una cuenta, en el servidor:
--      a. crea los cargos del mes que falten,
--      b. aplica los ajustes de alquiler (IPC, ICL o porcentaje fijo) que toquen,
--      c. aplica el saldo a favor de cada cobro a los próximos cargos del mismo contrato,
--         concepto y moneda (del más viejo al más nuevo).
--    Devuelve cuántos cambios hizo.
-- 3. run_my_billing(): la llama la app (al abrir y después de guardar) para la cuenta propia.
--    run_monthly_billing(): la tarea diaria de las 3 h, para todas las cuentas.
-- =====================================================================

-- ── 1. Tabla de repartos ──────────────────────────────────────────────

alter table public.payments add constraint payments_id_user_key unique (id, user_id);
alter table public.charges add constraint charges_id_user_key unique (id, user_id);

create table public.payment_allocations (
  -- "cobro|cargo": así la app puede crear el reparto con su propio id, sin esperar al servidor.
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  payment_id text not null,
  charge_id text not null,
  amount numeric not null check (amount > 0),
  unique (payment_id, charge_id),
  foreign key (payment_id, user_id) references public.payments (id, user_id) on delete cascade,
  foreign key (charge_id, user_id) references public.charges (id, user_id) on delete cascade
);
create index payment_allocations_charge_idx on public.payment_allocations (charge_id);
create index payment_allocations_user_idx on public.payment_allocations (user_id);

comment on table public.payment_allocations is 'Repartos: cuánto de cada cobro se aplicó a cada cargo. Lo que sobra de un cobro es saldo a favor.';
comment on column public.payment_allocations.id is 'cobro|cargo (id del cobro, una barra y el id del cargo).';

alter table public.payment_allocations enable row level security;
create policy "own_rows" on public.payment_allocations for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on table public.payment_allocations from anon;

-- Los repartos que estaban en la lista JSON pasan a la tabla (los que apuntan a cargos que ya
-- no existen se descartan: esa plata vuelve a ser saldo a favor).
insert into public.payment_allocations (id, user_id, payment_id, charge_id, amount)
select p.id || '|' || (a ->> 'chargeId'), p.user_id, p.id, a ->> 'chargeId', sum((a ->> 'amount')::numeric)
from public.payments p
cross join lateral jsonb_array_elements(p.allocations) a
where (a ->> 'amount')::numeric > 0
  and exists (select 1 from public.charges c where c.id = a ->> 'chargeId' and c.user_id = p.user_id)
group by p.id, p.user_id, a ->> 'chargeId';

alter table public.payments drop column allocations;

-- ── 2. Todo lo automático de una cuenta ───────────────────────────────

create or replace function public.bill_account(p_user uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  this_period text := to_char(now() at time zone 'America/Argentina/Buenos_Aires', 'YYYY-MM');
  changes integer := 0;
  n integer;
  c record;
  pay record;
  ch record;
  base_period text;
  next_period text;
  factor numeric;
  ipc_last date;
  new_rent numeric;
  note text;
  remaining numeric;
  applied numeric;
begin
  -- 2a. Cargos que faltan, desde el primer mes a liquidar hasta este mes (igual que la app).
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
    where ct.status = 'activo' and ct.user_id = p_user
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
    select 1 from public.charges x
    where x.contract_id = w.contract_id and x.concept = w.concept and x.period = w.period
  )
  on conflict (contract_id, concept, period) where auto_generated do nothing;
  get diagnostics n = row_count;
  changes := changes + n;

  -- 2b. Ajustes de alquiler que tocan (uno o varios, si quedaron atrasados).
  for c in
    select * from public.contracts
    where user_id = p_user and status = 'activo' and adjustment_index is not null and adjustment_months is not null
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
        if exists (
          select 1 from public.price_indices
          where index = 'icl' and date >= public.period_day(next_period, extract(day from c.start_date)::int)
        ) then
          factor := public.index_value_at('icl', public.period_day(next_period, extract(day from c.start_date)::int))
            / nullif(public.index_value_at('icl', public.period_day(base_period, extract(day from c.start_date)::int)), 0);
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

      -- Sin índice publicado todavía: se reintenta la próxima vez.
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

      update public.contracts set rent_amount = new_rent, last_adjusted_period = next_period where id = c.id;

      -- Los cargos de alquiler sin cobros desde el mes del ajuste toman el valor nuevo.
      update public.charges x
      set amount = new_rent,
          notes = case when x.period = next_period then concat_ws(' · ', nullif(x.notes, ''), note) else x.notes end
      where x.contract_id = c.id
        and x.concept = 'alquiler'
        and x.auto_generated
        and not x.voided
        and x.period >= next_period
        and not exists (select 1 from public.payment_allocations a where a.charge_id = x.id);

      changes := changes + 1;
      c.rent_amount := new_rent;
      c.last_adjusted_period := next_period;
    end loop;
  end loop;

  -- 2c. Saldo a favor: lo que sobró de cada cobro paga los próximos cargos del mismo contrato,
  -- concepto y moneda, del que vence primero al último.
  for pay in
    select p.id, p.contract_id, p.concept, p.currency,
           p.amount - coalesce((select sum(a.amount) from public.payment_allocations a where a.payment_id = p.id), 0) as credit
    from public.payments p
    where p.user_id = p_user
    order by p.date, p.created_at
  loop
    continue when pay.credit <= 0.005;
    remaining := pay.credit;
    for ch in
      select x.id,
             x.amount - coalesce((select sum(a.amount) from public.payment_allocations a where a.charge_id = x.id), 0) as balance
      from public.charges x
      where x.user_id = p_user and x.contract_id = pay.contract_id and x.concept = pay.concept
        and x.currency = pay.currency and not x.voided
      order by x.due_date, x.period
    loop
      continue when ch.balance <= 0.005;
      applied := round(least(ch.balance, remaining), 2);
      insert into public.payment_allocations (id, user_id, payment_id, charge_id, amount)
      values (pay.id || '|' || ch.id, p_user, pay.id, ch.id, applied)
      on conflict (id) do update set amount = public.payment_allocations.amount + excluded.amount;
      changes := changes + 1;
      remaining := round(remaining - applied, 2);
      exit when remaining <= 0.005;
    end loop;
  end loop;

  return changes;
end;
$$;

revoke all on function public.bill_account(uuid) from public, anon, authenticated;

-- ── 3. Quién lo corre ─────────────────────────────────────────────────

-- La app, para la cuenta con la que se ingresó (nunca para otra).
create or replace function public.run_my_billing()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Falta la sesión';
  end if;
  return public.bill_account(auth.uid());
end;
$$;

revoke all on function public.run_my_billing() from public, anon;
grant execute on function public.run_my_billing() to authenticated;

-- La tarea diaria, para todas las cuentas con contratos.
create or replace function public.run_monthly_billing()
returns void
language plpgsql
set search_path = ''
as $$
declare
  u uuid;
begin
  for u in select distinct user_id from public.contracts loop
    perform public.bill_account(u);
  end loop;
end;
$$;

revoke all on function public.run_monthly_billing() from public, anon, authenticated;
