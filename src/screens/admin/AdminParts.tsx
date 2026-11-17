// =====================================================================
// Modo admin: piezas compartidas
// ---------------------------------------------------------------------
// La pantalla base (franja azul noche con ADMIN, selector de período y deslizar para
// actualizar), las tarjetas de números y las listas con barras.
// =====================================================================

import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import LargeTitleHeader from '../../components/LargeTitleHeader';
import Screen from '../../components/Screen';
import SegmentedControl from '../../components/SegmentedControl';
import { makeStyles, useTheme } from '../../context/ThemeContext';
import { fontSize, radius, spacing } from '../../theme';
import { Period, PERIOD_OPTIONS, usePeriod } from './adminApi';

// ── Pantalla base ─────────────────────────────────────────────────────

export function AdminScreen({
  title,
  eyebrow,
  showPeriod = true,
  refreshing = false,
  onRefresh,
  error,
  plain,
  children,
}: {
  // Pantalla abierta encima (con barra de arriba y flecha para volver): sin la franja grande.
  plain?: boolean;
  title: string;
  eyebrow?: string;
  showPeriod?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  error?: string;
  children: React.ReactNode;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { period, setPeriod } = usePeriod();
  return (
    <Screen topSafe={!plain}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} /> : undefined}
      >
        {plain ? null : <LargeTitleHeader title={title} eyebrow={eyebrow} admin />}
        <View style={[styles.body, plain && styles.bodyPlain]}>
          {showPeriod ? (
            <SegmentedControl
              options={PERIOD_OPTIONS}
              value={`${period}`}
              onChange={(value) => setPeriod(Number(value) as Period)}
            />
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {children}
        </View>
      </ScrollView>
    </Screen>
  );
}

// ── Números ───────────────────────────────────────────────────────────

export function StatGrid({ items }: { items: { value: string; label: string; note?: string }[] }) {
  const styles = useStyles();
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.label} style={styles.stat} accessible accessibilityLabel={`${item.label}: ${item.value}${item.note ? `, ${item.note}` : ''}`}>
          <Text style={styles.statValue}>{item.value}</Text>
          <Text style={styles.statLabel}>{item.label}</Text>
          {item.note ? <Text style={styles.statNote}>{item.note}</Text> : null}
        </View>
      ))}
    </View>
  );
}

// ── Tarjeta con título ───────────────────────────────────────────────

export function AdminCard({ title, children, footer }: { title: string; children: React.ReactNode; footer?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
}

// Lista con barras: nombre, número y una barra proporcional al más alto.
export function BarList({ rows, empty = 'Todavía no hay datos en este período.' }: { rows: { label: string; value: number; display?: string }[]; empty?: string }) {
  const styles = useStyles();
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <Text style={styles.empty}>{empty}</Text>;
  return (
    <View style={styles.bars}>
      {rows.map((row) => (
        <View key={row.label} style={styles.barRow}>
          <View style={styles.barLine}>
            <Text style={styles.barLabel} numberOfLines={1}>
              {row.label}
            </Text>
            <Text style={styles.barValue}>{row.display ?? row.value}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.max(3, (row.value / max) * 100)}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

// Fila de dato: etiqueta a la izquierda, valor a la derecha.
export function InfoRow({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} selectable>
        {value}
      </Text>
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  content: {
    paddingBottom: spacing.xxl,
  },
  body: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  bodyPlain: {
    paddingTop: spacing.lg,
  },
  error: {
    fontSize: fontSize.md,
    color: colors.danger,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  stat: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 2,
  },
  statValue: {
    fontSize: fontSize.largeTitle - 4,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  statNote: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  footer: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  empty: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  bars: {
    gap: spacing.md,
  },
  barRow: {
    gap: 6,
  },
  barLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  barLabel: {
    flexShrink: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  barValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryMuted,
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  infoLabel: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  infoValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
}));
