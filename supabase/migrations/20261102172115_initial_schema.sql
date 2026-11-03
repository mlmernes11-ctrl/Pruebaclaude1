-- Gestión de alquileres: esquema inicial.
-- Una sola cuenta administradora (por mail, en una lista de permitidos) y sin roles.

-- Quién puede usar la app. Solo se lee a través de is_admin(); la app nunca ve esta tabla.
create table public.app_admins (
  email text primary key check (email = lower(email))
);
alter table public.app_admins enable row level security;
-- (Acá se cargaba el mail de la cuenta administradora. La lista se eliminó en la migración
-- 20261103140000_multi_account: ahora cada cuenta tiene sus propios datos.)

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.app_admins a
    where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table public.properties (
  id text primary key default gen_random_uuid()::text,
  title text not null check (length(trim(title)) > 0),
  address text not null,
  neighborhood text,
  type text not null check (type in ('apartamento', 'casa', 'local', 'oficina', 'terreno', 'otro')),
  rooms integer check (rooms >= 0),
  bathrooms integer check (bathrooms >= 0),
  area numeric check (area >= 0),
  rent_amount numeric not null check (rent_amount >= 0),
  rent_currency text not null check (rent_currency in ('USD', 'ARS')),
  expensas_amount numeric check (expensas_amount >= 0),
  servicios_amount numeric check (servicios_amount >= 0),
  status text not null check (status in ('disponible', 'alquilada', 'mantenimiento')),
  notes text,
  created_at timestamptz not null default now()
);

create table public.tenants (
  id text primary key default gen_random_uuid()::text,
  name text not null check (length(trim(name)) > 0),
  document text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.contracts (
  id text primary key default gen_random_uuid()::text,
  property_id text not null references public.properties (id) on delete restrict,
  tenant_id text not null references public.tenants (id) on delete restrict,
  start_date date not null,
  end_date date not null,
  rent_amount numeric not null check (rent_amount >= 0),
  currency text not null check (currency in ('USD', 'ARS')),
  deposit_amount numeric check (deposit_amount >= 0),
  payment_day integer not null check (payment_day between 1 and 28),
  -- Primer mes que se liquida automáticamente (AAAA-MM).
  billing_start_period text check (billing_start_period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  status text not null check (status in ('activo', 'finalizado', 'cancelado')),
  notes text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index contracts_property_idx on public.contracts (property_id);
create index contracts_tenant_idx on public.contracts (tenant_id);

-- Liquidaciones: lo que un inquilino debe por un concepto y un mes.
create table public.charges (
  id text primary key default gen_random_uuid()::text,
  contract_id text not null references public.contracts (id) on delete cascade,
  concept text not null check (concept in ('alquiler', 'expensas', 'servicios')),
  period text not null check (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  amount numeric not null check (amount > 0),
  currency text not null check (currency in ('USD', 'ARS')),
  due_date date not null,
  auto_generated boolean not null default false,
  -- Anulada: queda guardada para que la generación mensual no la vuelva a crear.
  voided boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);
create index charges_contract_idx on public.charges (contract_id);
-- La generación mensual crea como máximo una liquidación por contrato, concepto y mes.
create unique index charges_auto_unique on public.charges (contract_id, concept, period) where auto_generated;

-- Pagos recibidos; allocations = [{chargeId, amount}]: a qué liquidaciones del mismo concepto se aplicó.
create table public.payments (
  id text primary key default gen_random_uuid()::text,
  contract_id text not null references public.contracts (id) on delete cascade,
  concept text not null check (concept in ('alquiler', 'expensas', 'servicios')),
  date date not null,
  amount numeric not null check (amount > 0),
  currency text not null check (currency in ('USD', 'ARS')),
  method text,
  exchange_rate numeric check (exchange_rate > 0),
  allocations jsonb not null default '[]'::jsonb check (jsonb_typeof(allocations) = 'array'),
  notes text,
  -- Los pagos cargados juntos en un mismo recibo comparten este valor.
  receipt_id text,
  created_at timestamptz not null default now()
);
create index payments_contract_idx on public.payments (contract_id);
create index payments_receipt_idx on public.payments (receipt_id) where receipt_id is not null;

-- Preferencias compartidas (una sola fila): qué cotización del dólar usa la app.
create table public.settings (
  id integer primary key default 1 check (id = 1),
  rate_source text not null default 'blue' check (rate_source in ('blue', 'oficial', 'bolsa', 'manual')),
  manual_rate numeric check (manual_rate > 0),
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1);

-- Cotización del dólar de cada día; la escribe una función programada del servidor.
create table public.exchange_rates (
  date date not null,
  source text not null check (source in ('blue', 'oficial', 'bolsa')),
  buy numeric not null check (buy > 0),
  sell numeric not null check (sell > 0),
  fetched_at timestamptz not null default now(),
  primary key (date, source)
);

-- Seguridad por fila (RLS): solo la cuenta administradora puede leer o escribir.
do $$
declare t text;
begin
  foreach t in array array['properties', 'tenants', 'contracts', 'charges', 'payments', 'settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "admin_all" on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
      t
    );
  end loop;
end $$;

alter table public.exchange_rates enable row level security;
create policy "admin_read" on public.exchange_rates for select to authenticated using ((select public.is_admin()));
