export const lightColors = {
  background: '#F5F7FA',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  // primary/danger color text, icons and borders; the *Solid versions fill buttons with white text.
  primary: '#2563EB',
  primarySolid: '#2563EB',
  primaryMuted: '#DBEAFE',
  success: '#059669',
  successMuted: '#D1FAE5',
  warning: '#D97706',
  warningMuted: '#FEF3C7',
  danger: '#DC2626',
  dangerSolid: '#DC2626',
  dangerMuted: '#FEE2E2',
  info: '#0284C7',
  infoMuted: '#E0F2FE',
  // Segmented history bars; validated together for color-vision deficiency separation.
  chartPaid: '#059669',
  chartOverdue: '#B91C1C',
  chartPending: '#F59E0B',
  // Search matches, like a highlighter pen over the text.
  highlight: '#FDE68A',
  neutralMuted: '#E2E8F0',
  neutralTint: '#F1F5F9',
  // Text on solid buttons.
  white: '#FFFFFF',
  // Text on a strong accent or on the text color used as a background (active pills).
  onAccent: '#FFFFFF',
  backdrop: 'rgba(15, 23, 42, 0.45)',
};

export type Palette = typeof lightColors;

// Every text/background pair meets WCAG AA on the dark surface; the chart trio was re-validated
// for the dark surface (the light one is too bright there).
export const darkColors: Palette = {
  background: '#0B1220',
  surface: '#131C2E',
  border: '#24324A',
  text: '#E5E7EB',
  textMuted: '#94A3B8',
  primary: '#60A5FA',
  primarySolid: '#2563EB',
  primaryMuted: '#1E3A5F',
  success: '#34D399',
  successMuted: '#0F3D2E',
  warning: '#FBBF24',
  warningMuted: '#3D2E0A',
  danger: '#F87171',
  dangerSolid: '#DC2626',
  dangerMuted: '#451A1A',
  info: '#38BDF8',
  infoMuted: '#0C3247',
  chartPaid: '#059669',
  chartOverdue: '#DC2626',
  chartPending: '#BE8205',
  highlight: '#854D0E',
  neutralMuted: '#26334A',
  neutralTint: '#1A2436',
  white: '#FFFFFF',
  onAccent: '#0B1220',
  backdrop: 'rgba(0, 0, 0, 0.6)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 999,
};

export const fontSize = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
};
