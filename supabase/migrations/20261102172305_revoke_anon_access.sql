-- Signed-out clients get no table access at all (RLS already returns nothing; this is defense in depth).
revoke all on table public.app_admins, public.properties, public.tenants, public.contracts,
  public.charges, public.payments, public.settings, public.exchange_rates from anon;
revoke execute on function public.is_admin() from anon;
