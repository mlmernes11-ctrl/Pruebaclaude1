-- =====================================================================
-- Modo admin: quién puede llamar a cada función
-- ---------------------------------------------------------------------
-- admin_users y admin_events son ayudas internas de los resúmenes admin_* (que primero
-- chequean que sea el admin). Ellas mismas no chequean nada y quedaban abiertas a cualquiera
-- con la clave pública de la app: admin_users devolvía los datos de inicio de sesión de todas
-- las cuentas. Se cierran: solo las usan las otras funciones, que corren como dueñas.
-- El resto de las funciones de admin ya rechazan a quien no es admin; igual se cierran para
-- quien no inició sesión, que nunca las necesita.
-- =====================================================================

revoke execute on function public.admin_users() from public, anon, authenticated;
revoke execute on function public.admin_events(timestamptz, timestamptz) from public, anon, authenticated;

revoke execute on function public.admin_check() from public, anon;
revoke execute on function public.am_i_admin() from public, anon;
revoke execute on function public.admin_overview(integer) from public, anon;
revoke execute on function public.admin_usage(integer) from public, anon;
revoke execute on function public.admin_accounts(integer) from public, anon;
revoke execute on function public.admin_account(uuid, integer) from public, anon;
