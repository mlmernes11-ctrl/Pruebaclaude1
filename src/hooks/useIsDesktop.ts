// =====================================================================
// ¿Pantalla grande?
// ---------------------------------------------------------------------
// La app elige el diseño por el ancho de la pantalla (no por el tipo de aparato): desde
// DESKTOP_MIN_WIDTH se usa la versión de escritorio (barra lateral, tablas, ficha al costado);
// más angosto, la de celular, igual que el APK. Si se achica la ventana, cambia sola.
// =====================================================================

import { useWindowDimensions } from 'react-native';

const DESKTOP_MIN_WIDTH = 1024;

export function useIsDesktop(): boolean {
  return useWindowDimensions().width >= DESKTOP_MIN_WIDTH;
}
