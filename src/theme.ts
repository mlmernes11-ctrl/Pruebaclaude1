// =====================================================================
// Colores, espacios y tamaños de letra
// ---------------------------------------------------------------------
// Paletas del modo claro y oscuro, y las medidas que usan todas las pantallas.
// Para cambiar un color en toda la app, se cambia acá.
// =====================================================================

// ── Colores del modo claro ────────────────────────────────────────────

// Paleta inspirada en Apple: fondos neutros y color solo para estados y acciones.
export const lightColors = {
  background: '#F2F2F7',
  surface: '#FFFFFF',
  // Líneas finas entre filas.
  border: '#E5E5EA',
  text: '#1C1C1E',
  textMuted: '#6C6C70',
  // primary/danger colorean textos, íconos y enlaces; las versiones *Solid rellenan botones con texto blanco.
  primary: '#0066CC',
  primarySolid: '#0066CC',
  primaryMuted: '#E2EEFB',
  success: '#1E7B34',
  successMuted: '#E3F4E8',
  warning: '#9A5B00',
  warningMuted: '#FDF1DC',
  danger: '#D70015',
  dangerSolid: '#D70015',
  dangerMuted: '#FDE7E9',
  info: '#0066CC',
  infoMuted: '#E2EEFB',
  // Puntos de estado: rojo = en mora, ámbar = por vencer, verde = al día.
  dotDanger: '#D70015',
  dotWarning: '#F59E0B',
  dotSuccess: '#059669',
  dotEmpty: '#AEAEB2',
  chevron: '#C7C7CC',
  // Barras del historial; elegidos para que se distingan también con daltonismo.
  chartPaid: '#059669',
  chartOverdue: '#B91C1C',
  chartPending: '#F59E0B',
  // Coincidencias de búsqueda, como un resaltador sobre el texto.
  highlight: '#FDE68A',
  // Relleno de controles sobre el fondo gris (buscador, selector de vistas, filtros).
  neutralMuted: '#E3E3E8',
  neutralTint: '#F2F2F7',
  segmentSelected: '#FFFFFF',
  tabBar: '#F9F9F9',
  // Texto sobre botones rellenos.
  white: '#FFFFFF',
  // Texto sobre un color fuerte usado de fondo.
  onAccent: '#FFFFFF',
  backdrop: 'rgba(0, 0, 0, 0.35)',
};

export type Palette = typeof lightColors;

// ── Colores del modo oscuro ───────────────────────────────────────────

// Modo oscuro: cada par texto/fondo cumple el contraste mínimo recomendado (WCAG AA); los colores
// del gráfico se ajustaron porque los del modo claro encandilan sobre fondo oscuro.
export const darkColors: Palette = {
  background: '#000000',
  surface: '#1C1C1E',
  border: '#38383A',
  text: '#F2F2F7',
  textMuted: '#98989F',
  primary: '#409CFF',
  primarySolid: '#0A6CD6',
  primaryMuted: '#0F2A47',
  success: '#30D158',
  successMuted: '#0E2E18',
  warning: '#FFD60A',
  warningMuted: '#332A00',
  danger: '#FF6961',
  dangerSolid: '#D70015',
  dangerMuted: '#3A1416',
  info: '#409CFF',
  infoMuted: '#0F2A47',
  dotDanger: '#FF453A',
  dotWarning: '#FF9F0A',
  dotSuccess: '#30D158',
  dotEmpty: '#636366',
  chevron: '#5A5A5E',
  chartPaid: '#059669',
  chartOverdue: '#DC2626',
  chartPending: '#BE8205',
  highlight: '#854D0E',
  neutralMuted: '#2C2C2E',
  neutralTint: '#2C2C2E',
  segmentSelected: '#636366',
  tabBar: '#161618',
  white: '#FFFFFF',
  onAccent: '#000000',
  backdrop: 'rgba(0, 0, 0, 0.6)',
};

// ── Medidas ───────────────────────────────────────────────────────────

// Espacios entre elementos (en puntos).
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// Redondeo de las esquinas.
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 999,
};

// lg (17) es el tamaño de texto normal de iOS; largeTitle (34) es el título grande de cada pestaña.
export const fontSize = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  largeTitle: 34,
};
