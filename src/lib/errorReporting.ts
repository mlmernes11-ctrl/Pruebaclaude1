// =====================================================================
// Aviso de errores
// ---------------------------------------------------------------------
// Cuando algo falla en la app, lo anota en la tabla app_errors de Supabase (solo con sesión
// abierta), así nos enteramos sin que la persona tenga que avisar. Como mucho 10 por sesión,
// para no llenar la tabla si un error se repite en bucle.
// =====================================================================

import * as Updates from 'expo-updates';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const MAX_REPORTS = 10;
let sent = 0;
let installed = false;

export function reportError(error: unknown) {
  if (sent >= MAX_REPORTS) return;
  sent += 1;
  const e = error instanceof Error ? error : new Error(String(error));
  (async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    await supabase.from('app_errors').insert({
      message: (e.message || 'Error sin mensaje').slice(0, 2000),
      stack: e.stack?.slice(0, 8000) ?? null,
      platform: Platform.OS,
      app_version: (Platform.OS === 'web' ? 'web' : (Updates.updateId ?? 'apk')).slice(0, 50),
    });
  })().catch(() => undefined);
}

// Se llama una vez al abrir la app: atrapa los errores que nadie atrapó.
export function installErrorReporting() {
  if (installed || __DEV__) return;
  installed = true;
  if (Platform.OS === 'web') {
    window.addEventListener('error', (event) => reportError(event.error ?? event.message));
    window.addEventListener('unhandledrejection', (event) => reportError(event.reason));
    return;
  }
  const errorUtils = (globalThis as { ErrorUtils?: { getGlobalHandler: () => (e: unknown, fatal?: boolean) => void; setGlobalHandler: (h: (e: unknown, fatal?: boolean) => void) => void } }).ErrorUtils;
  const previous = errorUtils?.getGlobalHandler();
  errorUtils?.setGlobalHandler((error, fatal) => {
    reportError(error);
    previous?.(error, fatal);
  });
}
