// =====================================================================
// Función del servidor: índices para ajustar alquileres
// ---------------------------------------------------------------------
// Baja el ICL (Índice para Contratos de Locación, diario) del BCRA y el IPC nacional (mensual)
// del INDEC, y los guarda en la tabla price_indices. La corre todos los días una tarea
// programada de la base (pg_cron). Si un organismo corrige un valor, se actualiza.
// =====================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';

// ICL: variable 40 de la API de estadísticas del BCRA (versión 4). Viene del más nuevo al más viejo.
const ICL_URL = 'https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/40?limit=3000';
// IPC nacional, nivel general (base dic-2016), de la API de series de tiempo de datos.gob.ar.
const IPC_URL = 'https://apis.datos.gob.ar/series/api/series/?ids=148.3_INIVELNAL_DICI_M_26&limit=1000&format=json';

type Row = { index: 'icl' | 'ipc'; date: string; value: number };

async function downloadIcl(): Promise<Row[]> {
  const response = await fetch(ICL_URL);
  if (!response.ok) throw new Error(`BCRA respondió ${response.status}`);
  const payload = (await response.json()) as { results?: { detalle?: { fecha?: string; valor?: number }[] }[] };
  return (payload.results?.[0]?.detalle ?? [])
    .filter((item) => item.fecha && Number(item.valor) > 0)
    .map((item) => ({ index: 'icl', date: item.fecha!, value: Number(item.valor) }));
}

async function downloadIpc(): Promise<Row[]> {
  const response = await fetch(IPC_URL);
  if (!response.ok) throw new Error(`datos.gob.ar respondió ${response.status}`);
  const payload = (await response.json()) as { data?: [string, number | null][] };
  return (payload.data ?? [])
    .filter(([date, value]) => date && Number(value) > 0)
    .map(([date, value]) => ({ index: 'ipc', date, value: Number(value) }));
}

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const saved: Record<string, number | string> = {};

  // Cada índice por separado: si uno falla, el otro igual se guarda.
  for (const [name, download] of [['icl', downloadIcl], ['ipc', downloadIpc]] as const) {
    try {
      const rows = await download();
      if (!rows.length) throw new Error('sin datos');
      const { error } = await supabase.from('price_indices').upsert(rows, { onConflict: 'index,date' });
      if (error) throw error;
      saved[name] = rows.length;
    } catch (e) {
      saved[name] = `error: ${(e as Error).message}`;
    }
  }

  const failed = Object.values(saved).some((v) => typeof v === 'string');
  return Response.json(saved, { status: failed ? 502 : 200 });
});
