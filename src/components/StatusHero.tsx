import React from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { makeStyles, useTheme } from '../context/ThemeContext';
import { fontSize, radius, spacing } from '../theme';
import StatusDot, { DotTone } from './StatusDot';

// Bloque grande de arriba de una pantalla: una etiqueta, un número grande y una línea de detalle.
// Con "tone" la etiqueta lleva el punto de color del semáforo; sin "tone" es un total neutro.
export default function StatusHero({
  tone,
  label,
  value,
  detail,
  danger,
  style,
  children,
}: {
  tone?: DotTone;
  label: string;
  value: string;
  detail?: string;
  // Número en rojo (deuda). Con tone="danger" ya sale en rojo.
  danger?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const toneColor = tone
    ? { danger: colors.danger, warning: colors.warning, success: colors.success, empty: colors.textMuted }[tone]
    : colors.textMuted;
  return (
    <View style={[styles.hero, style]}>
      <View style={styles.labelRow}>
        {tone ? <StatusDot tone={tone} halo /> : null}
        <Text style={[styles.label, { color: toneColor }]}>{label}</Text>
      </View>
      <Text style={[styles.value, (danger || tone === 'danger') && { color: colors.danger }]}>{value}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      {children}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl - 4,
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.8,
    color: colors.text,
    marginTop: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  detail: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
}));
