-- =====================================================================
-- Varias cuentas: cada persona que se registra ve y edita solo sus propios datos.
-- Reemplaza la lista de mails permitidos (una sola cuenta administradora) por datos
-- separados por cuenta, agrega el pago en pesos de algo que está en dólares y deja
-- descripciones en español de cada tabla y columna (se ven en el panel de Supabase).
-- =====================================================================

-- ── 1. Sacar el acceso por lista de mails ───────────────────────────
do $$
declare t text;
begin
  foreach t in array array['properties', 'tenants', 'contracts', 'charges', 'payments', 'settings'] loop
    execute format('drop policy if exists "admin_all" on public.%I', t);
  end loop;
end $$;
drop policy if exists "admin_read" on public.exchange_rates;
drop function if exists private.is_admin();
drop schema if exists private;
drop table if exists public.app_admins;

-- ── 2. Dueño de cada fila ───────────────────────────────────────────
-- user_id se completa solo con la cuenta que guarda la fila (auth.uid()).
-- Si se borra la cuenta, se borran sus datos.
alter table public.properties add column user_id uuid not null default auth.uid() references auth.users (id) on delete cascade;
alter table public.tenants    add column user_id uuid not null default auth.uid() references auth.users (id) on delete cascade;
alter table public.contracts  add column user_id uuid not null default auth.uid() references auth.users (id) on delete cascade;
alter table public.charges    add column user_id uuid not null default auth.uid() references auth.users (id) on delete cascade;
alter table public.payments   add column user_id uuid not null default auth.uid() references auth.users (id) on delete cascade;

-- Las relaciones incluyen la cuenta: un contrato solo puede apuntar a una propiedad y un
-- inquilino de la misma cuenta, y una liquidación o un pago a un contrato de la misma cuenta.
alter table public.properties add constraint properties_id_user_key unique (id, user_id);
alter table public.tenants    add constraint tenants_id_user_key unique (id, user_id);
alter table public.contracts  add constraint contracts_id_user_key unique (id, user_id);

alter table public.contracts
  drop constraint contracts_property_id_fkey,
  drop constraint contracts_tenant_id_fkey,
  add constraint contracts_property_fkey foreign key (property_id, user_id) references public.properties (id, user_id),
  add constraint contracts_tenant_fkey foreign key (tenant_id, user_id) references public.tenants (id, user_id);
alter table public.charges
  drop constraint charges_contract_id_fkey,
  add constraint charges_contract_fkey foreign key (contract_id, user_id) references public.contracts (id, user_id) on delete cascade;
alter table public.payments
  drop constraint payments_contract_id_fkey,
  add constraint payments_contract_fkey foreign key (contract_id, user_id) references public.contracts (id, user_id) on delete cascade;

create index properties_user_idx on public.properties (user_id);
create index tenants_user_idx on public.tenants (user_id);
create index contracts_user_idx on public.contracts (user_id);
create index charges_user_idx on public.charges (user_id);
create index payments_user_idx on public.payments (user_id);

-- La app descarga todos los pagos de una vez; nunca busca en el servidor por recibo.
drop index if exists public.payments_receipt_idx;

-- ── 3. Preferencias por cuenta ──────────────────────────────────────
drop table public.settings;
create table public.settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  rate_source text not null default 'blue' check (rate_source in ('blue', 'oficial', 'bolsa', 'manual')),
  manual_rate numeric check (manual_rate > 0),
  updated_at timestamptz not null default now()
);

-- ── 4. Pago en pesos de algo que está en dólares ────────────────────
-- amount y currency siguen siendo lo que se descuenta de la deuda (por ejemplo US$ 1.100).
-- Si se pagó en otra moneda, acá queda lo que se recibió de verdad y con qué cotización.
alter table public.payments
  add column paid_amount numeric check (paid_amount > 0),
  add column paid_currency text check (paid_currency in ('USD', 'ARS')),
  add column rate_source text check (rate_source in ('blue', 'oficial', 'bolsa', 'manual'));

-- ── 5. Reglas de seguridad (RLS) ────────────────────────────────────
-- Cada cuenta lee y escribe solo sus filas. Sin sesión no se ve nada.
do $$
declare t text;
begin
  foreach t in array array['properties', 'tenants', 'contracts', 'charges', 'payments', 'settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own_rows" on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t
    );
  end loop;
end $$;
revoke all on table public.settings from anon;

-- La cotización del día es la misma para todos: cualquier cuenta la puede leer; solo la
-- escribe la función programada del servidor.
create policy "read_rates" on public.exchange_rates for select to authenticated using (true);

-- ── 6. Descripciones (panel de Supabase › Table Editor) ─────────────
comment on table public.properties is 'Propiedades administradas (cada una es una "carpeta").';
comment on column public.properties.user_id is 'Cuenta dueña de la fila (se completa sola).';
comment on column public.properties.title is 'Nombre corto de la carpeta, por ejemplo "Carpeta 102".';
comment on column public.properties.address is 'Calle, número y piso.';
comment on column public.properties.neighborhood is 'Barrio (opcional).';
comment on column public.properties.type is 'apartamento, casa, local, oficina, terreno u otro.';
comment on column public.properties.rooms is 'Ambientes.';
comment on column public.properties.bathrooms is 'Baños.';
comment on column public.properties.area is 'Superficie en m².';
comment on column public.properties.rent_amount is 'Alquiler publicado (el del contrato puede ser otro).';
comment on column public.properties.rent_currency is 'Moneda del alquiler publicado: USD o ARS.';
comment on column public.properties.expensas_amount is 'Expensas mensuales en pesos. Si tiene valor, cada mes se genera la liquidación de expensas.';
comment on column public.properties.servicios_amount is 'Servicios mensuales en pesos. Si tiene valor, cada mes se genera la liquidación de servicios.';
comment on column public.properties.status is 'disponible, alquilada o mantenimiento. La app lo actualiza sola según los contratos activos.';

comment on table public.tenants is 'Inquilinos (personas o empresas).';
comment on column public.tenants.user_id is 'Cuenta dueña de la fila (se completa sola).';
comment on column public.tenants.document is 'DNI o CUIT.';

comment on table public.contracts is 'Contratos: unen una propiedad con un inquilino por un período.';
comment on column public.contracts.user_id is 'Cuenta dueña de la fila (se completa sola).';
comment on column public.contracts.rent_amount is 'Alquiler mensual pactado.';
comment on column public.contracts.currency is 'Moneda del alquiler: USD o ARS.';
comment on column public.contracts.deposit_amount is 'Depósito en garantía (opcional).';
comment on column public.contracts.payment_day is 'Día del mes en que vence el alquiler (1 a 28).';
comment on column public.contracts.billing_start_period is 'Primer mes (AAAA-MM) que se liquida automáticamente.';
comment on column public.contracts.status is 'activo, finalizado o cancelado. Solo los activos generan liquidaciones nuevas.';

comment on table public.charges is 'Liquidaciones: lo que el inquilino debe por un concepto y un mes.';
comment on column public.charges.user_id is 'Cuenta dueña de la fila (se completa sola).';
comment on column public.charges.concept is 'alquiler, expensas o servicios.';
comment on column public.charges.period is 'Mes que se liquida (AAAA-MM).';
comment on column public.charges.amount is 'Monto a pagar.';
comment on column public.charges.due_date is 'Fecha de vencimiento.';
comment on column public.charges.auto_generated is 'true si la generó la app sola al empezar el mes; false si se cargó a mano.';
comment on column public.charges.voided is 'Anulada: queda guardada para que la generación mensual no la vuelva a crear, pero no se cobra.';

comment on table public.payments is 'Pagos recibidos de los inquilinos.';
comment on column public.payments.user_id is 'Cuenta dueña de la fila (se completa sola).';
comment on column public.payments.concept is 'Concepto que paga: alquiler, expensas o servicios.';
comment on column public.payments.date is 'Fecha en que se recibió el pago.';
comment on column public.payments.amount is 'Lo que se descuenta de la deuda, en la moneda de la liquidación.';
comment on column public.payments.currency is 'Moneda de amount (la de la liquidación).';
comment on column public.payments.method is 'Método de pago: Transferencia, Efectivo, etc.';
comment on column public.payments.exchange_rate is 'Cotización usada (pesos por dólar), si hubo dólares de por medio.';
comment on column public.payments.paid_amount is 'Lo que se recibió de verdad, si se pagó en otra moneda (por ejemplo los pesos de un alquiler en dólares).';
comment on column public.payments.paid_currency is 'Moneda de paid_amount.';
comment on column public.payments.rate_source is 'De dónde salió la cotización: blue, oficial, bolsa (MEP) o manual.';
comment on column public.payments.allocations is 'A qué liquidaciones se aplicó: lista de {chargeId, amount}. Lo que sobra queda a favor del inquilino.';
comment on column public.payments.receipt_id is 'Los pagos cargados juntos en un mismo recibo (varios conceptos) comparten este valor.';

comment on table public.settings is 'Preferencias de cada cuenta: qué cotización del dólar usa.';
comment on column public.settings.rate_source is 'Cotización a usar: blue, oficial, bolsa (MEP) o manual.';
comment on column public.settings.manual_rate is 'Valor del dólar cargado a mano, si rate_source = manual.';

comment on table public.exchange_rates is 'Cotización del dólar de cada día (la misma para todos). La guarda una función programada del servidor.';
