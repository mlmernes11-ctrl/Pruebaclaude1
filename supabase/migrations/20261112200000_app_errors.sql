-- =====================================================================
-- Registro de errores de la app
-- ---------------------------------------------------------------------
-- Cuando la app falla en el celular o en la web de alguien, anota qué pasó acá, así nos
-- enteramos sin que la persona tenga que avisar. Cada cuenta solo puede agregar filas suyas;
-- nadie puede leerlas desde la app (se miran desde el panel de Supabase).
-- =====================================================================

create table public.app_errors (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  message text not null check (length(message) <= 2000),
  stack text check (length(stack) <= 8000),
  platform text check (length(platform) <= 20),
  app_version text check (length(app_version) <= 50)
);

comment on table public.app_errors is 'Errores que la app anotó sola (mensaje, dónde falló, celular o web y versión).';

create index app_errors_user_idx on public.app_errors (user_id);

alter table public.app_errors enable row level security;

create policy "insert_own" on public.app_errors
  for insert to authenticated
  with check (user_id = (select auth.uid()));

revoke all on public.app_errors from anon;
grant insert on public.app_errors to authenticated;
