import React from 'react';
import { Text, View } from 'react-native';
import { makeStyles, useTheme } from '../context/ThemeContext';
import { fontSize, radius, spacing } from '../theme';
import StatusDot, { DotTone } from './StatusDot';

// The big status block at the top of a detail screen: colored label, one large value, one detail line.
export default function StatusHero({
  tone,
  label,
  value,
  detail,
  children,
}: {
  tone: DotTone;
  label: string;
  value: string;
  detail?: string;
  children?: React.ReactNode;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const toneColor = { danger: colors.danger, warning: colors.warning, success: colors.success, empty: colors.textMuted }[tone];
  return (
    <View style={styles.hero}>
      <View style={styles.labelRow}>
        <StatusDot tone={tone} halo />
        <Text style={[styles.label, { color: toneColor }]}>{label}</Text>
      </View>
      <Text style={[styles.value, tone === 'danger' && { color: colors.danger }]}>{value}</Text>
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
