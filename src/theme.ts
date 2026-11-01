// Apple-inspired palette: neutral grouped surfaces, color reserved for status and actions.
export const lightColors = {
  background: '#F2F2F7',
  surface: '#FFFFFF',
  // Hairline separators between rows.
  border: '#E5E5EA',
  text: '#1C1C1E',
  textMuted: '#6C6C70',
  // primary/danger color text, icons and links; the *Solid versions fill buttons with white text.
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
  // Status dots (non-text marks): red = overdue, amber = due soon, green = up to date.
  dotDanger: '#D70015',
  dotWarning: '#F59E0B',
  dotSuccess: '#059669',
  dotEmpty: '#AEAEB2',
  chevron: '#C7C7CC',
  // Segmented history bars; validated together for color-vision deficiency separation.
  chartPaid: '#059669',
  chartOverdue: '#B91C1C',
  chartPending: '#F59E0B',
  // Search matches, like a highlighter pen over the text.
  highlight: '#FDE68A',
  // Fill of controls on the grouped background (search field, segmented track, pills).
  neutralMuted: '#E3E3E8',
  neutralTint: '#F2F2F7',
  segmentSelected: '#FFFFFF',
  tabBar: '#F9F9F9',
  // Text on solid buttons.
  white: '#FFFFFF',
  // Text on a strong accent or on the text color used as a background (active pills).
  onAccent: '#FFFFFF',
  backdrop: 'rgba(0, 0, 0, 0.35)',
};

export type Palette = typeof lightColors;

// Every text/background pair meets WCAG AA on the dark surface; the chart trio was re-validated
// for dark surfaces (the light one is too bright there).
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

// lg (17) is the iOS body size; largeTitle (34) heads each tab.
export const fontSize = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  largeTitle: 34,
};
