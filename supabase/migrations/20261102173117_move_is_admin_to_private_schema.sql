-- Mueve is_admin() a un esquema privado, fuera de lo que expone la API; las reglas la siguen usando.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
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
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

do $$
declare t text;
begin
  foreach t in array array['properties', 'tenants', 'contracts', 'charges', 'payments', 'settings'] loop
    execute format('drop policy "admin_all" on public.%I', t);
    execute format(
      'create policy "admin_all" on public.%I for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',
      t
    );
  end loop;
end $$;
drop policy "admin_read" on public.exchange_rates;
create policy "admin_read" on public.exchange_rates for select to authenticated using ((select private.is_admin()));

drop function public.is_admin();
