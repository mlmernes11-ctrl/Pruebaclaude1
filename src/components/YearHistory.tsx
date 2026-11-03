// =====================================================================
// Historial del año
// ---------------------------------------------------------------------
// Resumen anual de lo cobrado y una fila por mes con su barra de colores.
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useExchangeRate } from '../context/ExchangeRateContext';
import { makeStyles, useTheme } from '../context/ThemeContext';
import { fontSize, radius, spacing } from '../theme';
import { MoneyTotals } from '../types';
import { describeTotals, formatPeriod } from '../utils/format';
import { buildYearHistory, HistoryRow, yearRange } from '../utils/history';
import { ChargeView } from '../utils/ledger';
import { plural } from '../utils/text';

// ── Constantes y funciones auxiliares ─────────────────────────────────

const SEGMENTS = [
  { key: 'paid', label: 'Cobrado', colorKey: 'chartPaid' },
  { key: 'overdue', label: 'En mora', colorKey: 'chartOverdue' },
  { key: 'pending', label: 'Por vencer', colorKey: 'chartPending' },
] as const;

const hasAmount = (totals: MoneyTotals) => totals.USD > 0 || totals.ARS > 0;
// Total en pesos sin "≈": la nota de abajo ya aclara que los dólares van a la cotización de hoy.
const inPesos = (totals: MoneyTotals, rate?: number) => describeTotals(totals, rate, false).main;

// ── Componente ────────────────────────────────────────────────────────

// Vista del año: cuánto se cobró de lo liquidado y una fila por mes.
export default function YearHistory({
  views,
  year,
  onChangeYear,
  onPressMonth,
}: {
  views: ChargeView[];
  year: number;
  onChangeYear: (year: number) => void;
  onPressMonth: (period: string) => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { rate, toPesos } = useExchangeRate();
  const range = yearRange(views, new Date().getFullYear());
  const { months, total } = buildYearHistory(views, year, toPesos);
  const hasDollars = views.some((v) => v.charge.currency === 'USD');

  return (
    <View>
      <View style={styles.yearSelector}>
        <TouchableOpacity
          onPress={() => onChangeYear(year - 1)}
          disabled={year <= range.min}
          style={styles.yearButton}
          accessibilityLabel="Año anterior"
        >
          <Ionicons name="chevron-back" size={22} color={year <= range.min ? colors.chevron : colors.primary} />
        </TouchableOpacity>
        <Text style={styles.yearText}>{year}</Text>
        <TouchableOpacity
          onPress={() => onChangeYear(year + 1)}
          disabled={year >= range.max}
          style={styles.yearButton}
          accessibilityLabel="Año siguiente"
        >
          <Ionicons name="chevron-forward" size={22} color={year >= range.max ? colors.chevron : colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Cobrado en {year}</Text>
        {total.count === 0 ? (
          <Text style={styles.heroDetail}>No hay liquidaciones en {year}.</Text>
        ) : (
          <>
            <Text style={styles.heroValue}>{Math.round(total.shares.paid * 100)} %</Text>
            <Text style={styles.heroDetail}>
              {inPesos(total.paid, rate)} de {inPesos(total.billed, rate)}
            </Text>
            <SegmentedBar row={total} height={8} />
            <View style={styles.stats}>
              {SEGMENTS.map((segment) => (
                <View key={segment.key} style={styles.stat}>
                  <View style={styles.statLabelRow}>
                    <View style={[styles.swatch, { backgroundColor: colors[segment.colorKey] }]} />
                    <Text style={styles.statLabel}>{segment.label}</Text>
                  </View>
                  <Text
                    style={[styles.statValue, segment.key === 'overdue' && hasAmount(total.overdue) && { color: colors.danger }]}
                  >
                    {inPesos(total[segment.key], rate)}
                  </Text>
                </View>
              ))}
            </View>
            {total.sharesByAmount ? null : (
              <Text style={styles.note}>Porcentaje por cantidad de liquidaciones: falta la cotización del dólar.</Text>
            )}
          </>
        )}
      </View>

      {months.length ? (
        <View style={styles.group}>
          {months.map((row, index) => (
            <MonthRow key={row.period} row={row} rate={rate} first={index === 0} onPress={() => onPressMonth(row.period)} />
          ))}
        </View>
      ) : null}
      {months.length && hasDollars && rate ? (
        <Text style={styles.footer}>Montos en dólares convertidos a pesos con la cotización de hoy.</Text>
      ) : null}
    </View>
  );
}

// ── Partes de la pieza ────────────────────────────────────────────────

function MonthRow({ row, rate, first, onPress }: { row: HistoryRow; rate?: number; first: boolean; onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const unpaid: MoneyTotals = { USD: row.overdue.USD + row.pending.USD, ARS: row.overdue.ARS + row.pending.ARS };
  const monthName = formatPeriod(row.period).split(' ')[0];
  let caption = 'Todo cobrado';
  let captionColor = colors.success;
  if (row.overdueCount) {
    caption = `En mora ${inPesos(row.overdue, rate)} · ${plural(row.overdueCount, 'liquidación', 'liquidaciones')}`;
    captionColor = colors.danger;
  } else if (hasAmount(unpaid)) {
    caption = `Por cobrar ${inPesos(unpaid, rate)}`;
    captionColor = colors.textMuted;
  }

  return (
    <TouchableOpacity
      style={styles.monthRow}
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={`${formatPeriod(row.period)}: ${caption}`}
    >
      {!first ? <View style={styles.separator} /> : null}
      <View style={styles.monthTop}>
        <Text style={styles.monthName}>{monthName}</Text>
        <Text style={styles.monthAmount}>{inPesos(row.billed, rate)}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.chevron} />
      </View>
      <SegmentedBar row={row} height={6} />
      <Text style={[styles.monthCaption, { color: captionColor }]}>{caption}</Text>
    </TouchableOpacity>
  );
}

// Barra partida en cobrado / en mora / por vencer, con un espacio fino entre partes.
function SegmentedBar({ row, height }: { row: HistoryRow; height: number }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const parts = SEGMENTS.map((segment) => ({ ...segment, share: row.shares[segment.key] })).filter(
    (part) => part.share > 0.001,
  );
  return (
    <View style={[styles.bar, { height, borderRadius: height / 2 }]}>
      {parts.map((part) => (
        <View key={part.key} style={{ flex: part.share, backgroundColor: colors[part.colorKey] }} />
      ))}
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  yearButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    minWidth: 64,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl - 4,
    marginBottom: spacing.xl,
  },
  heroLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroValue: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1,
    color: colors.text,
    marginTop: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  heroDetail: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  stat: {
    flex: 1,
    minWidth: 0,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  swatch: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  statValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  note: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  monthRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    gap: 6,
  },
  separator: {
    position: 'absolute',
    top: 0,
    left: spacing.lg,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
  },
  monthTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  monthName: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  monthAmount: {
    fontSize: fontSize.lg,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  monthCaption: {
    fontSize: fontSize.sm,
  },
  bar: {
    flexDirection: 'row',
    gap: 2,
    overflow: 'hidden',
    backgroundColor: colors.neutralMuted,
  },
  footer: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
  },
}));
