// =====================================================================
// Función del servidor: eliminar la cuenta
// ---------------------------------------------------------------------
// La llama la app (Ajustes → Eliminar cuenta) con la sesión de quien la usa. Borra ese usuario
// y, con él, todos sus datos: las tablas tienen user_id con "on delete cascade".
// Solo puede borrar la cuenta que hace el pedido: el usuario sale del token de la sesión.
// =====================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return Response.json({ error: 'Método no permitido' }, { status: 405, headers: CORS });

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return Response.json({ error: 'Falta la sesión' }, { status: 401, headers: CORS });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return Response.json({ error: 'Sesión inválida' }, { status: 401, headers: CORS });

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) return Response.json({ error: deleteError.message }, { status: 500, headers: CORS });

  return Response.json({ deleted: true }, { headers: CORS });
});
