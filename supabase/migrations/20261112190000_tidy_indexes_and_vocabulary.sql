-- =====================================================================
-- Orden: índices de las relaciones y vocabulario de la base
-- ---------------------------------------------------------------------
-- 1. Las relaciones entre tablas son de a dos columnas (id, user_id): los índices pasan a cubrir
--    las dos, así borrar o buscar por contrato, propiedad, inquilino, cobro o cargo es directo.
-- 2. La tarea diaria y las descripciones de la base usan las palabras de la app
--    (cargo, cobro, propiedad) en vez de "liquidación", "pago" o "carpeta".
-- =====================================================================

-- ── 1. Índices ────────────────────────────────────────────────────────

drop index if exists public.charges_contract_idx;
drop index if exists public.contracts_property_idx;
drop index if exists public.contracts_tenant_idx;
drop index if exists public.payments_contract_idx;
drop index if exists public.payment_allocations_charge_idx;

create index charges_contract_idx on public.charges (contract_id, user_id);
create index contracts_property_idx on public.contracts (property_id, user_id);
create index contracts_tenant_idx on public.contracts (tenant_id, user_id);
create index payments_contract_idx on public.payments (contract_id, user_id);
create index payment_allocations_charge_idx on public.payment_allocations (charge_id, user_id);
create index payment_allocations_payment_idx on public.payment_allocations (payment_id, user_id);

-- ── 2. Tarea diaria ───────────────────────────────────────────────────

select cron.unschedule('liquidaciones-del-mes');
select cron.schedule('cargos-del-mes', '5 6 * * *', $$ select public.run_monthly_billing(); $$);

-- ── 3. Descripciones ──────────────────────────────────────────────────

comment on table public.charges is 'Cargos: lo que el inquilino debe por un concepto y un mes.';
comment on column public.charges.auto_generated is 'true si lo creó la generación mensual; false si se agregó a mano.';
comment on column public.charges.period is 'Mes al que corresponde (AAAA-MM).';
comment on column public.charges.voided is 'Anulado: queda guardado para que la generación mensual no lo vuelva a crear, pero no se cobra.';
comment on column public.contracts.billing_start_period is 'Primer mes (AAAA-MM) con cargos automáticos.';
comment on column public.contracts.status is 'activo, finalizado o cancelado (rescindido). Solo los activos generan cargos nuevos.';
comment on table public.payments is 'Cobros recibidos de los inquilinos.';
comment on column public.payments.amount is 'Lo que se descuenta de la deuda, en la moneda del cargo.';
comment on column public.payments.currency is 'Moneda de amount (la del cargo).';
comment on column public.payments.date is 'Fecha en que se recibió el cobro.';
comment on column public.payments.method is 'Medio de pago: Transferencia, Efectivo, etc.';
comment on column public.payments.receipt_id is 'Los cobros registrados juntos (un recibo con varios conceptos) comparten este valor.';
comment on table public.properties is 'Propiedades administradas.';
comment on column public.properties.title is 'Nombre corto de la propiedad, por ejemplo "Carpeta 102".';
comment on column public.properties.expensas_amount is 'Expensas mensuales en pesos. Si tiene valor, cada mes se genera el cargo de expensas.';
comment on column public.properties.servicios_amount is 'Servicios mensuales en pesos. Si tiene valor, cada mes se genera el cargo de servicios.';
