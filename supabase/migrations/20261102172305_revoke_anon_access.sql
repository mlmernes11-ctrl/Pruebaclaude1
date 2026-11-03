-- Sin sesión no hay acceso a ninguna tabla (RLS ya no devolvía nada; esto es una segunda barrera).
revoke all on table public.app_admins, public.properties, public.tenants, public.contracts,
  public.charges, public.payments, public.settings, public.exchange_rates from anon;
revoke execute on function public.is_admin() from anon;
