// =====================================================================
// Función del servidor: cotización del dólar del día
// ---------------------------------------------------------------------
// Baja de DolarAPI el blue, el oficial y el MEP y los guarda en la tabla exchange_rates con
// la fecha de hoy (hora argentina). La corre todos los días a las 11 h una tarea programada
// de la base (pg_cron).
// Solo guarda la primera vez de cada día: si se vuelve a llamar, no cambia nada. Así el
// valor del día queda fijo y es el mismo para todas las cuentas.
// =====================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';

const QUOTES_URL = 'https://dolarapi.com/v1/dolares';
const SOURCES = ['blue', 'oficial', 'bolsa'];

Deno.serve(async () => {
  // ── Bajar las cotizaciones ─────────────────────────────────────────
  const response = await fetch(QUOTES_URL);
  if (!response.ok) return Response.json({ error: `DolarAPI respondió ${response.status}` }, { status: 502 });
  const list = (await response.json()) as { casa?: string; compra?: number; venta?: number }[];

  // Fecha de hoy en Argentina, como AAAA-MM-DD.
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
  const rows = list
    .filter((item) => SOURCES.includes(item.casa ?? '') && Number(item.compra) > 0 && Number(item.venta) > 0)
    .map((item) => ({ date: today, source: item.casa, buy: Number(item.compra), sell: Number(item.venta) }));
  if (!rows.length) return Response.json({ error: 'DolarAPI no trajo cotizaciones' }, { status: 502 });

  // ── Guardar (solo si todavía no hay valor para hoy) ────────────────
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error } = await supabase
    .from('exchange_rates')
    .upsert(rows, { onConflict: 'date,source', ignoreDuplicates: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ date: today, sources: rows.map((row) => row.source) });
});
