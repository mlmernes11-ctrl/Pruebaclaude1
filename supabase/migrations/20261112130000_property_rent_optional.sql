-- =====================================================================
-- El precio publicado de la propiedad pasa a ser opcional
-- ---------------------------------------------------------------------
-- Lo que se cobra es el alquiler del contrato. El de la propiedad es solo una referencia (lo
-- que se pide al publicarla) y sirve para completar el contrato al crearlo.
-- =====================================================================

alter table public.properties alter column rent_amount drop not null;

comment on column public.properties.rent_amount is 'Precio publicado (opcional, solo de referencia). Lo que se cobra es el alquiler del contrato.';
