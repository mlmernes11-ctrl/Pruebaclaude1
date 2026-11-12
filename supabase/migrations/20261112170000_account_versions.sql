-- =====================================================================
-- Número de versión de cada cuenta
-- ---------------------------------------------------------------------
-- Cada vez que cambia algo de una cuenta (propiedades, inquilinos, contratos, cargos, cobros o
-- repartos), desde la app, desde otro dispositivo o desde las tareas del servidor, su número
-- sube solo. La app lo consulta cada 60 segundos (un pedido mínimo) y solo vuelve a bajar
-- todo si cambió.
-- =====================================================================

create table public.account_versions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  version bigint not null default 0,
  updated_at timestamptz not null default now()
);
comment on table public.account_versions is 'Sube con cada cambio en los datos de la cuenta; la app lo usa para saber si tiene que volver a leer.';

alter table public.account_versions enable row level security;
create policy "read_own_version" on public.account_versions for select to authenticated
  using ((select auth.uid()) = user_id);
revoke all on table public.account_versions from anon;

create or replace function public.bump_account_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid := coalesce(new.user_id, old.user_id);
begin
  insert into public.account_versions (user_id, version, updated_at)
  values (owner, 1, now())
  on conflict (user_id) do update
    set version = public.account_versions.version + 1, updated_at = now();
  return null;
end;
$$;

revoke all on function public.bump_account_version() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['properties', 'tenants', 'contracts', 'charges', 'payments', 'payment_allocations'] loop
    execute format(
      'create trigger bump_account_version after insert or update or delete on public.%I for each row execute function public.bump_account_version()',
      t
    );
  end loop;
end $$;
