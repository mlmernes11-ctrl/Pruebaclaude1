import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useExchangeRate } from '../context/ExchangeRateContext';
import { colors, fontSize, radius, spacing } from '../theme';
import { MoneyTotals } from '../types';
import { describeTotals, formatPeriod } from '../utils/format';
import { buildYearHistory, HistoryRow, yearRange } from '../utils/history';
import { ChargeView } from '../utils/ledger';
import Card from './Card';

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const SEGMENTS = [
  { key: 'paid', label: 'Pagado', color: colors.chartPaid },
  { key: 'overdue', label: 'En mora', color: colors.chartOverdue },
  { key: 'pending', label: 'Por vencer', color: colors.chartPending },
] as const;

const hasAmount = (totals: MoneyTotals) => totals.USD > 0 || totals.ARS > 0;

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
  const { rate, toPesos } = useExchangeRate();
  const currentYear = new Date().getFullYear();
  const range = yearRange(views, currentYear);
  const { months, total } = buildYearHistory(views, year, toPesos);
  const collectedPct = total.count ? Math.round(total.shares.paid * 100) : 0;

  return (
    <View>
      <View style={styles.yearSelector}>
        <TouchableOpacity
          onPress={() => onChangeYear(year - 1)}
          disabled={year <= range.min}
          style={[styles.yearButton, year <= range.min && styles.yearButtonDisabled]}
          accessibilityLabel="Año anterior"
        >
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.yearText}>{year}</Text>
        <TouchableOpacity
          onPress={() => onChangeYear(year + 1)}
          disabled={year >= range.max}
          style={[styles.yearButton, year >= range.max && styles.yearButtonDisabled]}
          accessibilityLabel="Año siguiente"
        >
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <Card style={styles.totalCard}>
        <Text style={styles.totalTitle}>Total {year}</Text>
        {total.count === 0 ? (
          <Text style={styles.muted}>No hay liquidaciones en {year}.</Text>
        ) : (
          <>
            <AmountLine label="Liquidado" totals={total.billed} rate={rate} strong />
            <AmountLine label="Pagado" totals={total.paid} rate={rate} swatch={colors.chartPaid} />
            <AmountLine label="En mora" totals={total.overdue} rate={rate} swatch={colors.chartOverdue} />
            {hasAmount(total.pending) ? (
              <AmountLine label="Por vencer" totals={total.pending} rate={rate} swatch={colors.chartPending} />
            ) : null}
            <SegmentedBar row={total} />
            <Text style={styles.muted}>
              {collectedPct}% cobrado de lo liquidado
              {total.sharesByAmount ? '' : ' (por liquidación; cargá la cotización para ponderar por monto)'}
            </Text>
          </>
        )}
      </Card>

      {months.length ? (
        <>
          <View style={styles.legend}>
            {SEGMENTS.map((segment) => (
              <View key={segment.key} style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: segment.color }]} />
                <Text style={styles.legendText}>{segment.label}</Text>
              </View>
            ))}
          </View>
          {months.map((row) => (
            <MonthRow key={row.period} row={row} rate={rate} onPress={() => onPressMonth(row.period)} />
          ))}
        </>
      ) : null}
    </View>
  );
}

function MonthRow({ row, rate, onPress }: { row: HistoryRow; rate?: number; onPress: () => void }) {
  const billed = describeTotals(row.billed, rate);
  const paid = describeTotals(row.paid, rate);
  const unpaid: MoneyTotals = {
    USD: row.overdue.USD + row.pending.USD,
    ARS: row.overdue.ARS + row.pending.ARS,
  };
  const monthIndex = Number(row.period.slice(5, 7)) - 1;

  return (
    <TouchableOpacity
      style={styles.monthRow}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${formatPeriod(row.period)}: liquidado ${billed.main}, pagado ${paid.main}`}
    >
      <View style={styles.monthHeader}>
        <Text style={styles.monthName}>{MONTH_SHORT[monthIndex]}</Text>
        <Text style={styles.monthBilled}>{billed.main}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
      <SegmentedBar row={row} />
      <Text style={styles.monthMeta}>
        Pagado {paid.main}
        {hasAmount(unpaid) ? ` · Sin pagar ${describeTotals(unpaid, rate).main}` : ' · Todo pago'}
        {row.overdueCount ? ` · ${row.overdueCount} en mora` : ''}
      </Text>
    </TouchableOpacity>
  );
}

// One whole split into paid / overdue / pending, with a 2px surface gap between segments.
function SegmentedBar({ row }: { row: HistoryRow }) {
  const parts = SEGMENTS.map((segment) => ({ ...segment, share: row.shares[segment.key] })).filter(
    (part) => part.share > 0.001,
  );
  return (
    <View style={styles.bar}>
      {parts.map((part, index) => (
        <View
          key={part.key}
          style={[
            styles.barSegment,
            {
              flex: part.share,
              backgroundColor: part.color,
              marginLeft: index === 0 ? 0 : 2,
              borderTopLeftRadius: index === 0 ? 4 : 0,
              borderBottomLeftRadius: index === 0 ? 4 : 0,
              borderTopRightRadius: index === parts.length - 1 ? 4 : 0,
              borderBottomRightRadius: index === parts.length - 1 ? 4 : 0,
            },
          ]}
        />
      ))}
    </View>
  );
}

function AmountLine({
  label,
  totals,
  rate,
  swatch,
  strong,
}: {
  label: string;
  totals: MoneyTotals;
  rate?: number;
  swatch?: string;
  strong?: boolean;
}) {
  const described = describeTotals(totals, rate);
  return (
    <View style={styles.amountLine}>
      <View style={styles.amountLabelRow}>
        {swatch ? <View style={[styles.legendSwatch, { backgroundColor: swatch }]} /> : null}
        <Text style={[styles.amountLabel, strong && styles.amountStrong]}>{label}</Text>
      </View>
      <View style={styles.amountValues}>
        <Text style={[styles.amountValue, strong && styles.amountStrong]}>{described.main}</Text>
        {described.detail ? <Text style={styles.amountDetail}>{described.detail}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  yearButton: {
    padding: spacing.sm,
    borderRadius: radius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  yearButtonDisabled: {
    opacity: 0.3,
  },
  yearText: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    minWidth: 64,
    textAlign: 'center',
  },
  totalCard: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  totalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  muted: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  amountLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  amountLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  amountLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  amountValues: {
    alignItems: 'flex-end',
    flexShrink: 1,
  },
  amountValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  amountDetail: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  amountStrong: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.text,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: '600',
  },
  monthRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    gap: 6,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  monthName: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    width: 40,
  },
  monthBilled: {
    flex: 1,
    textAlign: 'right',
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  monthMeta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  bar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.neutralTint,
  },
  barSegment: {
    height: '100%',
  },
});
