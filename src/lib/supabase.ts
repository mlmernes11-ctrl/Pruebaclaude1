// =====================================================================
// Conexión con Supabase
// ---------------------------------------------------------------------
// Crea el cliente que usa la app para hablar con la base de datos y con el inicio de sesión.
// =====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  // En el celular falta una herramienta para manejar direcciones web que Supabase necesita; esto la agrega.
  require('react-native-url-polyfill/auto');
}

// Proyecto "gestion-alquileres" (São Paulo). La clave publicable está pensada para ir dentro de la app:
// lo que protege los datos son las reglas de seguridad de la base (RLS): cada cuenta ve solo lo suyo.
const SUPABASE_URL = 'https://txuobaovrmdcecdkmrgd.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Lk7JJHh9TGYVlZ7ljm-2Tg_6tyLTR5f';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // Solo la versión web recibe el ingreso con Google en la dirección de la página.
    detectSessionInUrl: Platform.OS === 'web',
    // Ingreso con Google por "código" (PKCE): funciona igual en la web y en el celular.
    flowType: 'pkce',
  },
});
