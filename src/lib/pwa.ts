// =====================================================================
// Web instalable (PWA)
// ---------------------------------------------------------------------
// Solo en la web. Registra el ayudante (public/sw.js) que hace que el navegador ofrezca instalar
// Locatia como app, y guarda el aviso de "se puede instalar" que manda Chrome o Edge (llega una
// sola vez, a veces antes de que se dibuje la app; por eso se escucha acá, al arrancar).
// =====================================================================

import { Platform } from 'react-native';

// El aviso de Chrome / Edge para instalar (no está en los tipos del navegador).
export interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

// Cuándo se abrió la página: el cartel de instalar solo se muestra al abrir, no más tarde.
export const openedAt = Date.now();

let installEvent: InstallEvent | undefined;
const listeners = new Set<() => void>();

export function getInstallEvent() {
  return installEvent;
}

export function onInstallEvent(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Ya abierta como app instalada (no en una pestaña del navegador).
export function isInstalled() {
  if (!isWeb) return false;
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches;
  return Boolean(standalone || (navigator as Navigator & { standalone?: boolean }).standalone);
}

// iPhone o iPad (en el iPad nuevo, Safari se presenta como una Mac con pantalla táctil).
export function isIOS() {
  if (!isWeb) return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function installPwaSupport() {
  if (!isWeb) return;
  window.addEventListener('beforeinstallprompt', (event) => {
    // Sin el cartelito propio del navegador: se usa el de la app.
    event.preventDefault();
    installEvent = event as InstallEvent;
    listeners.forEach((listener) => listener());
  });
  window.addEventListener('appinstalled', () => {
    installEvent = undefined;
    listeners.forEach((listener) => listener());
  });
  // En desarrollo no: se interpondría con el servidor de prueba.
  if (!__DEV__ && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    });
  }
}
