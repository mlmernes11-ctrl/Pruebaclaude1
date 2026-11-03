// =====================================================================
// Etiqueta de color
// ---------------------------------------------------------------------
// Rectangulito con texto y color de estado (por ejemplo "Vencida" en rojo).
// =====================================================================

import React from 'react';
import { Text, View } from 'react-native';
import { fontSize, Palette, radius, spacing } from '../theme';
import { makeStyles, useTheme } from '../context/ThemeContext';

// ── Constantes y funciones auxiliares ─────────────────────────────────

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral' | 'primary' | 'info';

const toneStyles = (colors: Palette): Record<BadgeTone, { bg: string; fg: string }> => ({
  success: { bg: colors.successMuted, fg: colors.success },
  warning: { bg: colors.warningMuted, fg: colors.warning },
  danger: { bg: colors.dangerMuted, fg: colors.danger },
  neutral: { bg: colors.neutralMuted, fg: colors.textMuted },
  primary: { bg: colors.primaryMuted, fg: colors.primary },
  info: { bg: colors.infoMuted, fg: colors.info },
});

// ── Componente ────────────────────────────────────────────────────────

export default function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const toneStyle = toneStyles(colors)[tone];
  return (
    <View style={[styles.container, { backgroundColor: toneStyle.bg }]}>
      <Text style={[styles.text, { color: toneStyle.fg }]}>{label}</Text>
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles(() => ({
  container: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm - 2,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
}));
