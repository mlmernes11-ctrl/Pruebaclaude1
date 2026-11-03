// =====================================================================
// Detalles de la plataforma
// ---------------------------------------------------------------------
// Saber si la app corre dentro de la versión de prueba (claude.ai) y el mensaje de "sin conexión".
// =====================================================================

import { Platform } from 'react-native';

// La versión de prueba corre dentro de otra página (claude.ai), que bloquea los pedidos a otros sitios.
export function embeddedPreview(): boolean {
  if (Platform.OS !== 'web') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

// Mensaje cuando no se puede llegar al servidor. En la versión de prueba (dentro de claude.ai)
// la conexión está bloqueada siempre, así que se sugiere el modo demo.
export function connectionErrorMessage(): string {
  return embeddedPreview()
    ? 'La versión de prueba no puede conectarse al servidor. Usá «Probar con datos de ejemplo».'
    : 'No se pudo conectar con el servidor. Revisá la conexión a internet.';
}
