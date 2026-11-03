-- Descripciones en español de cada tabla y columna (se ven en el panel de Supabase, en Table Editor)
-- y limpieza de un índice que la app no usa.

-- =====================================================================
-- Limpieza
-- =====================================================================

-- La app descarga todos los pagos de una vez y agrupa los recibos en el celular;
-- nunca busca en el servidor por receipt_id, así que este índice no se usa.
drop index if exists public.payments_receipt_idx;

-- =====================================================================
-- Acceso
-- =====================================================================

comment on table public.app_admins is
  'Mails que pueden usar la app (en minúsculas). Sin políticas a propósito: nadie la lee directo, solo la función private.is_admin().';
comment on function private.is_admin() is
  'Devuelve true si el mail de la sesión está en app_admins. La usan todas las reglas de seguridad (RLS).';

-- =====================================================================
-- Propiedades
-- =====================================================================

comment on table public.properties is 'Propiedades administradas (cada una es una "carpeta").';
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

-- =====================================================================
-- Inquilinos
-- =====================================================================

comment on table public.tenants is 'Inquilinos (personas o empresas).';
comment on column public.tenants.document is 'DNI o CUIT.';

-- =====================================================================
-- Contratos
-- =====================================================================

comment on table public.contracts is 'Contratos: unen una propiedad con un inquilino por un período.';
comment on column public.contracts.rent_amount is 'Alquiler mensual pactado.';
comment on column public.contracts.currency is 'Moneda del alquiler: USD o ARS.';
comment on column public.contracts.deposit_amount is 'Depósito en garantía (opcional).';
comment on column public.contracts.payment_day is 'Día del mes en que vence el alquiler (1 a 28).';
comment on column public.contracts.billing_start_period is 'Primer mes (AAAA-MM) que se liquida automáticamente.';
comment on column public.contracts.status is 'activo, finalizado o cancelado. Solo los activos generan liquidaciones nuevas.';

-- =====================================================================
-- Liquidaciones
-- =====================================================================

comment on table public.charges is 'Liquidaciones: lo que el inquilino debe por un concepto y un mes.';
comment on column public.charges.concept is 'alquiler, expensas o servicios.';
comment on column public.charges.period is 'Mes que se liquida (AAAA-MM).';
comment on column public.charges.amount is 'Monto a pagar.';
comment on column public.charges.due_date is 'Fecha de vencimiento.';
comment on column public.charges.auto_generated is 'true si la generó la app sola al empezar el mes; false si se cargó a mano.';
comment on column public.charges.voided is 'Anulada: queda guardada para que la generación mensual no la vuelva a crear, pero no se cobra.';

-- =====================================================================
-- Pagos
-- =====================================================================

comment on table public.payments is 'Pagos recibidos de los inquilinos.';
comment on column public.payments.concept is 'Concepto que paga: alquiler, expensas o servicios.';
comment on column public.payments.date is 'Fecha en que se recibió el pago.';
comment on column public.payments.method is 'Método de pago: Transferencia, Efectivo, etc.';
comment on column public.payments.exchange_rate is 'Cotización del dólar usada, si el pago fue en dólares (opcional).';
comment on column public.payments.allocations is 'A qué liquidaciones se aplicó: lista de {chargeId, amount}. Lo que sobra queda a favor del inquilino.';
comment on column public.payments.receipt_id is 'Los pagos cargados juntos en un mismo recibo (varios conceptos) comparten este valor.';

-- =====================================================================
-- Configuración y cotizaciones (preparadas para la cotización compartida)
-- =====================================================================

comment on table public.settings is
  'Preferencias compartidas (una sola fila, id = 1). Todavía no la usa la app: hoy la cotización elegida se guarda en cada dispositivo.';
comment on column public.settings.rate_source is 'Cotización a usar: blue, oficial, bolsa (MEP) o manual.';
comment on column public.settings.manual_rate is 'Valor del dólar cargado a mano, si rate_source = manual.';
comment on table public.exchange_rates is
  'Cotización del dólar de cada día. La va a escribir una función programada del servidor; la app solo la lee.';
