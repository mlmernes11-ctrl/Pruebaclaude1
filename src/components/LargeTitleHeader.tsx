// =====================================================================
// Título grande de pestaña
// =====================================================================

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { makeStyles } from '../context/ThemeContext';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { fontSize, spacing } from '../theme';

// ── Componente ────────────────────────────────────────────────────────

// Título grande de cada pestaña (estilo iOS) con un texto o un botón "+" opcional a la derecha.
export default function LargeTitleHeader({
  title,
  caption,
  onCaptionPress,
  onAdd,
  addLabel = 'Agregar',
  middle,
}: {
  title: string;
  caption?: string;
  onCaptionPress?: () => void;
  onAdd?: () => void;
  addLabel?: string;
  // Algo entre el título y el botón (en pantalla grande, el selector de vistas).
  middle?: React.ReactNode;
}) {
  const styles = useStyles();
  // En pantalla grande el "+" pasa a ser un botón con texto ("+ Registrar cobro").
  const desktop = useIsDesktop();
  return (
    <View style={styles.row}>
      <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      {middle}
      {caption ? (
        <TouchableOpacity onPress={onCaptionPress} disabled={!onCaptionPress} hitSlop={8}>
          <Text style={styles.caption}>{caption}</Text>
        </TouchableOpacity>
      ) : null}
      {onAdd && desktop ? (
        <TouchableOpacity onPress={onAdd} style={styles.addButton} accessibilityRole="button">
          <Text style={styles.addButtonText}>+ {addLabel}</Text>
        </TouchableOpacity>
      ) : onAdd ? (
        <TouchableOpacity
          onPress={onAdd}
          style={styles.addTarget}
          accessibilityRole="button"
          accessibilityLabel={addLabel}
        >
          <View style={styles.addCircle}>
            <Text style={styles.addText}>+</Text>
          </View>
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
    minHeight: 52,
    paddingLeft: spacing.xl - 4,
    paddingRight: spacing.md,
    paddingTop: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    flexShrink: 1,
    fontSize: fontSize.largeTitle,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.text,
  },
  caption: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    paddingRight: spacing.sm,
  },
  addButton: {
    height: 38,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    backgroundColor: colors.primarySolid,
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.white,
  },
  addTarget: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    fontSize: 26,
    lineHeight: 28,
    color: colors.primary,
    fontWeight: '400',
  },
}));
