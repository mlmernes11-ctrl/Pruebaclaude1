// =====================================================================
// Botón "atrás" del navegador (solo web)
// ---------------------------------------------------------------------
// Hace que el "atrás" del navegador vuelva a la pantalla anterior de la app en vez de salir.
// =====================================================================

import { Platform } from 'react-native';

// En la web, el botón "atrás" del navegador sacaría al usuario de la app. Por eso se guarda
// un paso extra en el historial y cada "atrás" se convierte en volver a la pantalla anterior.
// Las ventanas que se abren encima (como el buscador) se cierran primero.
let armed = false;
const handlers: (() => void)[] = [];

export function armBrowserHistory() {
  if (Platform.OS !== 'web' || armed) return;
  try {
    window.history.pushState({ appBack: true }, '');
    armed = true;
  } catch {
    // En algunas vistas incrustadas el historial no está disponible; el "atrás" de la app sigue andando.
  }
}

export function markBrowserHistoryPopped() {
  armed = false;
}

export function pushBackHandler(handler: () => void): () => void {
  handlers.push(handler);
  armBrowserHistory();
  return () => {
    const index = handlers.lastIndexOf(handler);
    if (index >= 0) handlers.splice(index, 1);
  };
}

// Cierra la última ventana abierta encima; devuelve false si no había ninguna.
export function runBackHandler(): boolean {
  const handler = handlers.pop();
  if (!handler) return false;
  handler();
  return true;
}
