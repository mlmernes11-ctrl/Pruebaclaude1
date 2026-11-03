// =====================================================================
// Tabla (versión de escritorio)
// ---------------------------------------------------------------------
// Filas con columnas alineadas, para listas largas en pantalla grande (por ejemplo las
// liquidaciones y los pagos). Cada celda puede resaltar lo buscado.
// =====================================================================

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { makeStyles } from '../context/ThemeContext';
import { fontSize, radius, spacing } from '../theme';
import { highlightRanges } from '../utils/search';
import HighlightText from './HighlightText';
import StatusDot, { DotTone } from './StatusDot';

// ── Tipos ─────────────────────────────────────────────────────────────

export interface Column {
  key: string;
  label: string;
  // Ancho relativo de la columna.
  flex: number;
  align?: 'left' | 'right';
}

export interface Cell {
  text: string;
  // Color del texto: normal, gris, rojo (deuda) o fuerte (negrita).
  tone?: 'default' | 'muted' | 'danger' | 'strong';
  // Punto de estado antes del texto.
  dot?: DotTone;
  // Montos: también resalta lo buscado sin puntos ("95000" → "$ 95.000").
  amount?: boolean;
}

export interface TableRow {
  key: string;
  cells: Record<string, Cell>;
  onPress?: () => void;
}

// ── Componente ────────────────────────────────────────────────────────

export default function DataTable({
  columns,
  rows,
  highlight,
}: {
  columns: Column[];
  rows: TableRow[];
  highlight?: string[];
}) {
  const styles = useStyles();
  const words = highlight?.length ? highlight : undefined;

  return (
    <View style={styles.table}>
      <View style={styles.headerRow}>
        {columns.map((column) => (
          <Text
            key={column.key}
            style={[styles.headerCell, { flex: column.flex }, column.align === 'right' && styles.right]}
            numberOfLines={1}
          >
            {column.label}
          </Text>
        ))}
      </View>
      {rows.map((row) => (
        <TouchableOpacity
          key={row.key}
          style={styles.row}
          onPress={row.onPress}
          disabled={!row.onPress}
          activeOpacity={0.6}
          accessibilityRole="button"
        >
          {columns.map((column) => {
            const cell = row.cells[column.key];
            if (!cell) return <View key={column.key} style={{ flex: column.flex }} />;
            const text = words ? (
              <HighlightText text={cell.text} ranges={highlightRanges(cell.text, words, false, cell.amount)} />
            ) : (
              cell.text
            );
            return (
              <View
                key={column.key}
                style={[styles.cell, { flex: column.flex }, column.align === 'right' && styles.cellRight]}
              >
                {cell.dot ? <StatusDot tone={cell.dot} size={8} /> : null}
                <Text style={[styles.cellText, cell.tone && styles[cell.tone]]} numberOfLines={1}>
                  {text}
                </Text>
              </View>
            );
          })}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  table: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerCell: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  right: {
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  cellRight: {
    justifyContent: 'flex-end',
  },
  cellText: {
    flexShrink: 1,
    fontSize: fontSize.md,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  default: {},
  muted: {
    color: colors.textMuted,
  },
  danger: {
    color: colors.danger,
    fontWeight: '600',
  },
  strong: {
    fontWeight: '600',
  },
}));
