// =====================================================================
// Título de sección
// =====================================================================

import React from 'react';
import { StyleProp, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { fontSize, spacing } from '../theme';
import { makeStyles } from '../context/ThemeContext';

// ── Componente ────────────────────────────────────────────────────────

// Título de sección con una acción opcional a la derecha ("Ver todas").
export default function SectionHeader({
  title,
  actionLabel,
  onAction,
  right,
  style,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {right}
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 32,
    marginHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  title: {
    flexShrink: 1,
    fontSize: fontSize.xl,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.text,
  },
  action: {
    fontSize: fontSize.md,
    color: colors.primary,
  },
}));
