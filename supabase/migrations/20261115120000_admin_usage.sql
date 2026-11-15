-- =====================================================================
-- Modo admin: uso de la app
-- ---------------------------------------------------------------------
-- La app anota qué se hace (abrir, cambiar de pantalla, terminar una acción, tiempo de uso),
-- sin nombres ni montos: solo el nombre de la acción, la hora, la plataforma y si es el modo
-- de ejemplo o una cuenta. Nadie puede leer esas anotaciones desde la app: solo el admin
-- del servicio, y únicamente a través de los resúmenes de abajo (funciones admin_*).
-- Las anotaciones se borran solas a los 12 meses.
-- =====================================================================

-- ── 1. Quién es admin del servicio ──────────────────────────────────
-- Se carga a mano desde el panel de Supabase (el id del usuario). La app nunca lee esta tabla.
create table public.service_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);

comment on table public.service_admins is 'Usuarios que ven el modo admin (uso de todas las cuentas). Se cargan a mano.';

alter table public.service_admins enable row level security;
revoke all on public.service_admins from anon, authenticated;

-- ¿La persona con sesión abierta es admin? (la app lo pregunta para mostrar el modo admin)
create or replace function public.am_i_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.service_admins a where a.user_id = auth.uid());
$$;
revoke all on function public.am_i_admin() from public;
grant execute on function public.am_i_admin() to authenticated;

-- ── 2. Anotaciones de uso ───────────────────────────────────────────
create table public.usage_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete cascade,
  device_id text not null check (length(device_id) between 8 and 64),
  session_id text not null check (length(session_id) between 8 and 64),
  mode text not null check (mode in ('demo', 'cuenta')),
  kind text not null check (kind in ('open', 'screen', 'action', 'time')),
  name text not null check (length(name) between 1 and 60),
  seconds integer check (seconds between 0 and 600),
  platform text check (length(platform) <= 20)
);

comment on table public.usage_events is 'Uso de la app: qué acción o pantalla, cuándo, desde dónde. Sin nombres ni montos.';
comment on column public.usage_events.device_id is 'Número al azar que guarda cada celular o navegador; une la prueba en modo de ejemplo con la cuenta que se crea después.';
comment on column public.usage_events.kind is 'open = abrió la app · screen = abrió una pantalla · action = terminó una acción · time = segundos de uso.';

create index usage_events_created_idx on public.usage_events (created_at);
create index usage_events_user_idx on public.usage_events (user_id, created_at);
create index usage_events_device_idx on public.usage_events (device_id);

alter table public.usage_events enable row level security;

-- Cualquiera puede anotar (también el modo de ejemplo, sin sesión), pero solo como sí mismo.
create policy "insert_own_usage" on public.usage_events
  for insert to anon, authenticated
  with check (
    (mode = 'demo' and user_id is null)
    or (mode = 'cuenta' and user_id = (select auth.uid()))
  );

revoke all on public.usage_events from anon, authenticated;
grant insert on public.usage_events to anon, authenticated;

-- Borrar lo que tenga más de 12 meses, todos los días a las 3:30 (Argentina).
select cron.schedule(
  'borrar-uso-viejo',
  '30 6 * * *',
  $$ delete from public.usage_events where created_at < now() - interval '12 months' $$
);

-- ── 3. Resúmenes para el admin ──────────────────────────────────────
-- Todos piden ser admin. Las cuentas admin y sus dispositivos no cuentan en los números.

create or replace function public.admin_check()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.service_admins a where a.user_id = auth.uid()) then
    raise exception 'Solo para el admin' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.admin_check() from public;

-- Las anotaciones de un período, sin las del admin.
create or replace function public.admin_events(p_from timestamptz, p_to timestamptz)
returns setof public.usage_events
language sql
stable
security definer
set search_path = ''
as $$
  select e.*
  from public.usage_events e
  where e.created_at >= p_from and e.created_at < p_to
    and (e.user_id is null or e.user_id not in (select a.user_id from public.service_admins a))
    and e.device_id not in (
      select x.device_id from public.usage_events x join public.service_admins a on a.user_id = x.user_id
    );
$$;
revoke all on function public.admin_events(timestamptz, timestamptz) from public;

-- Las cuentas, sin las del admin.
create or replace function public.admin_users()
returns setof auth.users
language sql
stable
security definer
set search_path = ''
as $$
  select u.* from auth.users u where u.id not in (select a.user_id from public.service_admins a);
$$;
revoke all on function public.admin_users() from public;

-- Inicio: los cuatro números (y el período anterior para comparar) y lo más usado.
create or replace function public.admin_overview(p_days integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  d integer := greatest(1, least(coalesce(p_days, 7), 365));
  cur_from timestamptz := now() - make_interval(days => d);
  prev_from timestamptz := now() - make_interval(days => 2 * d);
  result jsonb;
begin
  perform public.admin_check();
  with cur as (select * from public.admin_events(cur_from, now())),
       prev as (select * from public.admin_events(prev_from, cur_from)),
       pays as (
         select p.created_at from public.payments p
         where p.created_at >= prev_from and p.user_id in (select id from public.admin_users())
       )
  select jsonb_build_object(
    'accounts', (select count(*) from public.admin_users()),
    'activeAccounts', (select count(distinct user_id) from cur where mode = 'cuenta'),
    'activeAccountsPrev', (select count(distinct user_id) from prev where mode = 'cuenta'),
    'demoDevices', (select count(distinct device_id) from cur where mode = 'demo'),
    'demoDevicesPrev', (select count(distinct device_id) from prev where mode = 'demo'),
    'payments', (select count(*) from pays where created_at >= cur_from),
    'paymentsPrev', (select count(*) from pays where created_at < cur_from),
    'minutesPerDay', round((select coalesce(sum(seconds), 0) from cur where kind = 'time') / 60.0 / d, 1),
    'minutesPerDayPrev', round((select coalesce(sum(seconds), 0) from prev where kind = 'time') / 60.0 / d, 1),
    'topActions', coalesce((
      select jsonb_agg(jsonb_build_object('name', t.name, 'count', t.c) order by t.c desc)
      from (select name, count(*) as c from cur where kind = 'action' group by name order by c desc limit 5) t
    ), '[]'::jsonb),
    'latestSignup', (select max(created_at) from public.admin_users())
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_overview(integer) from public;
grant execute on function public.admin_overview(integer) to authenticated;

-- Cuentas: una fila por cuenta, con su última actividad y cuánto cargó.
create or replace function public.admin_accounts(p_days integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  d integer := greatest(1, least(coalesce(p_days, 7), 365));
  cur_from timestamptz := now() - make_interval(days => d);
  result jsonb;
begin
  perform public.admin_check();
  select jsonb_build_object(
    'demoDevices', (select count(distinct device_id) from public.admin_events(cur_from, now()) where mode = 'demo'),
    'accounts', coalesce(jsonb_agg(row_to_json(a) order by a."lastSeen" desc nulls last), '[]'::jsonb)
  )
  into result
  from (
    select
      u.id,
      u.email,
      coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name') as name,
      u.created_at as "createdAt",
      greatest(u.last_sign_in_at, (select max(e.created_at) from public.usage_events e where e.user_id = u.id)) as "lastSeen",
      (select count(*) from public.usage_events e where e.user_id = u.id and e.kind = 'action' and e.created_at >= cur_from) as actions,
      (select count(*) from public.properties p where p.user_id = u.id) as properties,
      (select count(*) from public.payments p where p.user_id = u.id) as payments
    from public.admin_users() u
  ) a;
  return result;
end;
$$;
revoke all on function public.admin_accounts(integer) from public;
grant execute on function public.admin_accounts(integer) to authenticated;

-- Ficha de una cuenta: datos de ingreso, cuánto cargó y cómo usa la app (nunca sus datos).
create or replace function public.admin_account(p_user uuid, p_days integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  d integer := greatest(1, least(coalesce(p_days, 7), 365));
  cur_from timestamptz := now() - make_interval(days => d);
  result jsonb;
begin
  perform public.admin_check();
  with cur as (select * from public.admin_events(cur_from, now()) where user_id = p_user)
  select jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'name', coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
    'phone', nullif(u.phone, ''),
    'providers', coalesce(u.raw_app_meta_data -> 'providers', '[]'::jsonb),
    'createdAt', u.created_at,
    'confirmedAt', u.email_confirmed_at,
    'lastSignInAt', u.last_sign_in_at,
    'lastSeen', (select max(e.created_at) from public.usage_events e where e.user_id = u.id),
    'triedDemoFirst', exists (
      select 1 from public.usage_events x
      where x.mode = 'demo' and x.created_at < u.created_at
        and x.device_id in (select y.device_id from public.usage_events y where y.user_id = u.id)
    ),
    'counts', jsonb_build_object(
      'properties', (select count(*) from public.properties p where p.user_id = u.id),
      'tenants', (select count(*) from public.tenants t where t.user_id = u.id),
      'contracts', (select count(*) from public.contracts c where c.user_id = u.id),
      'payments', (select count(*) from public.payments p where p.user_id = u.id)
    ),
    'daysActive', (select count(distinct (created_at at time zone 'America/Argentina/Buenos_Aires')::date) from cur),
    'minutesPerDay', round((select coalesce(sum(seconds), 0) from cur where kind = 'time') / 60.0 / d, 1),
    'platforms', coalesce((
      select jsonb_object_agg(coalesce(platform, 'otro'), c)
      from (select platform, count(distinct session_id) as c from cur group by platform) t
    ), '{}'::jsonb),
    'topActions', coalesce((
      select jsonb_agg(jsonb_build_object('name', t.name, 'count', t.c) order by t.c desc)
      from (select name, count(*) as c from cur where kind = 'action' group by name order by c desc limit 5) t
    ), '[]'::jsonb),
    'latest', coalesce((
      select jsonb_agg(jsonb_build_object('name', t.name, 'kind', t.kind, 'at', t.created_at, 'platform', t.platform) order by t.created_at desc)
      from (
        select name, kind, created_at, platform from public.usage_events e
        where e.user_id = u.id and e.kind in ('open', 'action')
        order by e.created_at desc limit 12
      ) t
    ), '[]'::jsonb)
  )
  into result
  from public.admin_users() u
  where u.id = p_user;
  return result;
end;
$$;
revoke all on function public.admin_account(uuid, integer) from public;
grant execute on function public.admin_account(uuid, integer) to authenticated;

-- Uso: acciones, pantallas, plataformas, horarios y el camino de la prueba al primer cobro.
create or replace function public.admin_usage(p_days integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  d integer := greatest(1, least(coalesce(p_days, 7), 365));
  cur_from timestamptz := now() - make_interval(days => d);
  result jsonb;
begin
  perform public.admin_check();
  with cur as (select * from public.admin_events(cur_from, now())),
       fresh as (select id, created_at from public.admin_users() where created_at >= cur_from)
  select jsonb_build_object(
    'actions', coalesce((
      select jsonb_agg(jsonb_build_object('name', t.name, 'count', t.c) order by t.c desc)
      from (select name, count(*) as c from cur where kind = 'action' group by name) t
    ), '[]'::jsonb),
    'screens', coalesce((
      select jsonb_agg(jsonb_build_object('name', t.name, 'count', t.c) order by t.c desc)
      from (select name, count(*) as c from cur where kind = 'screen' group by name) t
    ), '[]'::jsonb),
    'platforms', coalesce((
      select jsonb_object_agg(coalesce(platform, 'otro'), c)
      from (select platform, count(distinct session_id) as c from cur group by platform) t
    ), '{}'::jsonb),
    'hours', coalesce((
      select jsonb_object_agg(h, c)
      from (
        select extract(hour from created_at at time zone 'America/Argentina/Buenos_Aires')::int as h, count(*) as c
        from cur where kind in ('screen', 'action') group by 1
      ) t
    ), '{}'::jsonb),
    'sessions', (select count(distinct session_id) from cur),
    'minutes', round((select coalesce(sum(seconds), 0) from cur where kind = 'time') / 60.0, 1),
    'funnel', jsonb_build_object(
      'opened', (select count(distinct device_id) from cur where kind = 'open'),
      'triedDemo', (select count(distinct device_id) from cur where mode = 'demo' and kind in ('screen', 'action')),
      'signedUp', (select count(*) from fresh),
      'loaded', (select count(*) from fresh f where exists (select 1 from public.properties p where p.user_id = f.id)),
      'firstPayment', (select count(*) from fresh f where exists (select 1 from public.payments p where p.user_id = f.id))
    )
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_usage(integer) from public;
grant execute on function public.admin_usage(integer) to authenticated;
