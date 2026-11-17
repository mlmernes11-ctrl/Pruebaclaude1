// =====================================================================
// Bloque de estado grande
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { makeStyles, useTheme } from '../context/ThemeContext';
import { fontSize, radius, spacing } from '../theme';
import StatusDot, { DotTone } from './StatusDot';

// ── Componente ────────────────────────────────────────────────────────

// Bloque grande de arriba de una pantalla: una etiqueta, un número grande y una línea de detalle.
// Con "tone" la etiqueta lleva el punto de color del semáforo; sin "tone" es un total neutro.
// Con "onPress" se puede tocar para desplegar algo (una flechita a la derecha muestra si está abierto).
export default function StatusHero({
  tone,
  label,
  value,
  detail,
  danger,
  style,
  children,
  onPress,
  open,
  accessibilityLabel,
}: {
  tone?: DotTone;
  label: string;
  value: string;
  detail?: string;
  // Número en rojo (deuda). Con tone="danger" ya sale en rojo.
  danger?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  onPress?: () => void;
  open?: boolean;
  accessibilityLabel?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const toneColor = tone
    ? { danger: colors.danger, warning: colors.warning, success: colors.success, empty: colors.textMuted }[tone]
    : colors.textMuted;
  const Box = onPress ? Pressable : View;
  return (
    <Box
      style={[styles.hero, style]}
      {...(onPress
        ? { onPress, accessibilityRole: 'button' as const, accessibilityState: { expanded: Boolean(open) }, accessibilityLabel }
        : null)}
    >
      <View style={styles.labelRow}>
        {tone ? <StatusDot tone={tone} halo /> : null}
        <Text style={[styles.label, { color: toneColor }]}>{label}</Text>
        {onPress ? (
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.chevron} style={styles.chevron} />
        ) : null}
      </View>
      <Text style={[styles.value, (danger || tone === 'danger') && { color: colors.danger }]}>{value}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      {children}
    </Box>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

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
  chevron: {
    marginLeft: 'auto',
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
