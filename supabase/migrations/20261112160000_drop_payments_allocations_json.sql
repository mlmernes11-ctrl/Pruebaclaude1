-- =====================================================================
-- Se borra la lista JSON de repartos dentro de cada cobro
-- ---------------------------------------------------------------------
-- Los repartos ya viven en la tabla payment_allocations (migración anterior) y la app no usa
-- más esta columna.
-- =====================================================================

alter table public.payments drop column allocations;
