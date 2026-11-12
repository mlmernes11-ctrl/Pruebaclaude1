-- =====================================================================
-- Cargos revisados en "Actualizar importes"
-- ---------------------------------------------------------------------
-- confirmed = true cuando se revisó el importe del mes en la pantalla "Actualizar importes"
-- (con un importe nuevo o manteniendo el anterior). Los cargos que crea el servidor arrancan
-- sin revisar; así la app sabe cuántos faltan en el mes.
-- =====================================================================

alter table public.charges add column confirmed boolean not null default false;

comment on column public.charges.confirmed is 'true si el importe del mes se revisó en «Actualizar importes» (nuevo o el mismo de antes).';
