import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import FAB from '../../components/FAB';
import MoneyText from '../../components/MoneyText';
import Screen from '../../components/Screen';
import SortMenu, { SortOption } from '../../components/SortMenu';
import YearHistory from '../../components/YearHistory';
import { CONCEPT_LABEL } from '../../constants';
import { unallocatedAmount, useData } from '../../context/DataContext';
import { useExchangeRate } from '../../context/ExchangeRateContext';
import { colors, fontSize, radius, spacing } from '../../theme';
import { ChargeStatus, Currency, MoneyTotals } from '../../types';
import {
  addMonthsToPeriod,
  addToTotals,
  currentPeriod,
  describeTotals,
  emptyTotals,
  formatDate,
  formatMoney,
  formatPeriod,
} from '../../utils/format';
import { CHARGE_STATUS_LABEL, CHARGE_STATUS_TONE, ChargeView } from '../../utils/ledger';

type View_ = 'pagos' | 'liquidaciones' | 'historial';

const VIEW_LABEL: Record<View_, string> = {
  pagos: 'Recibidos',
  liquidaciones: 'Liquidaciones',
  historial: 'Historial',
};
type FilterValue = 'todos' | ChargeStatus;
type MonthFilter = 'todos' | 'este' | 'anterior';
type SortValue = 'reciente' | 'antiguo' | 'propiedad' | 'monto';

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'todos', label: 'Todas' },
  { value: 'vencido', label: 'Vencidas' },
  { value: 'pendiente', label: 'Por vencer' },
  { value: 'pagado', label: 'Pagadas' },
];

const MONTH_FILTERS: { value: MonthFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'este', label: 'Este mes' },
  { value: 'anterior', label: 'Mes anterior' },
];

const SORT_OPTIONS: SortOption<SortValue>[] = [
  { value: 'reciente', label: 'Más recientes' },
  { value: 'antiguo', label: 'Más antiguos' },
  { value: 'propiedad', label: 'Propiedad' },
  { value: 'monto', label: 'Mayor monto' },
];

const STATUS_SUMMARY: { status: ChargeStatus; label: string; color: string }[] = [
  { status: 'vencido', label: 'En mora', color: colors.danger },
  { status: 'pendiente', label: 'Por vencer', color: colors.warning },
  { status: 'pagado', label: 'Pagado', color: colors.success },
];

const byDate = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// What a liquidación counts for in totals: the outstanding part, or the full amount once paid.
const chargeValue = (view: ChargeView) => (view.status === 'pagado' ? view.charge.amount : view.balance);

export default function PaymentsListScreen() {
  const { chargeViews, payments, charges, getContractById, getPropertyById, getTenantById } = useData();
  const { toPesos, rate } = useExchangeRate();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [view, setView] = useState<View_>('pagos');
  const [filter, setFilter] = useState<FilterValue>('todos');
  const [month, setMonth] = useState<MonthFilter>('todos');
  const [sort, setSort] = useState<SortValue>('reciente');
  const [year, setYear] = useState(() => new Date().getFullYear());

  // The dashboard opens this screen already filtered (e.g. "Dinero en mora").
  useEffect(() => {
    const params = route.params;
    if (!params) return;
    if (params.view) setView(params.view);
    if (params.filter) setFilter(params.filter);
    if (params.month) setMonth(params.month);
  }, [route.params]);

  const describeContract = (contractId: string) => {
    const contract = getContractById(contractId);
    return {
      property: getPropertyById(contract?.propertyId)?.title ?? 'Propiedad',
      tenant: getTenantById(contract?.tenantId)?.name ?? 'Inquilino',
    };
  };

  // Without an exchange rate dollars and pesos cannot be compared, so dollars go first.
  const compareAmounts = (a: number, ca: Currency, b: number, cb: Currency) => {
    const pa = toPesos(a, ca);
    const pb = toPesos(b, cb);
    if (pa !== undefined && pb !== undefined) return pb - pa;
    if (ca !== cb) return ca === 'USD' ? -1 : 1;
    return b - a;
  };

  const compareProperties = (contractA: string, contractB: string) =>
    describeContract(contractA).property.localeCompare(describeContract(contractB).property, 'es', {
      numeric: true,
      sensitivity: 'base',
    });

  const statusCharges = filter === 'todos' ? chargeViews : chargeViews.filter((v) => v.status === filter);
  const visibleCharges = [...statusCharges].sort((a, b) => {
    if (sort === 'antiguo') return byDate(a.charge.dueDate, b.charge.dueDate);
    if (sort === 'propiedad') {
      return compareProperties(a.charge.contractId, b.charge.contractId) || byDate(b.charge.dueDate, a.charge.dueDate);
    }
    if (sort === 'monto') {
      return compareAmounts(chargeValue(a), a.charge.currency, chargeValue(b), b.charge.currency);
    }
    return byDate(b.charge.dueDate, a.charge.dueDate);
  });

  const thisPeriod = currentPeriod();
  const monthPeriod = month === 'este' ? thisPeriod : month === 'anterior' ? addMonthsToPeriod(thisPeriod, -1) : undefined;
  const monthPayments = monthPeriod ? payments.filter((p) => p.date.slice(0, 7) === monthPeriod) : payments;
  const visiblePayments = [...monthPayments].sort((a, b) => {
    if (sort === 'antiguo') return byDate(a.date, b.date);
    if (sort === 'propiedad') return compareProperties(a.contractId, b.contractId) || byDate(b.date, a.date);
    if (sort === 'monto') return compareAmounts(a.amount, a.currency, b.amount, b.currency);
    return byDate(b.date, a.date);
  });

  const chargeTotals = useMemo(() => {
    const totals: Record<ChargeStatus, { count: number; totals: MoneyTotals }> = {
      vencido: { count: 0, totals: emptyTotals() },
      pendiente: { count: 0, totals: emptyTotals() },
      pagado: { count: 0, totals: emptyTotals() },
    };
    chargeViews.forEach((v) => {
      totals[v.status].count += 1;
      addToTotals(totals[v.status].totals, chargeValue(v), v.charge.currency);
    });
    return totals;
  }, [chargeViews]);

  const paymentTotals = emptyTotals();
  monthPayments.forEach((p) => addToTotals(paymentTotals, p.amount, p.currency));

  const chargesSummary = (
    <Card style={styles.summaryCard}>
      {filter === 'todos' ? (
        STATUS_SUMMARY.map(({ status, label, color }) => {
          const { count, totals } = chargeTotals[status];
          const described = describeTotals(totals, rate);
          return (
            <TouchableOpacity key={status} style={styles.summaryRow} onPress={() => setFilter(status)}>
              <View style={[styles.summaryDot, { backgroundColor: color }]} />
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryLabel}>{label}</Text>
                <Text style={styles.summaryMeta}>
                  {plural(count, 'liquidación', 'liquidaciones')}
                  {described.detail ? ` · ${described.detail}` : ''}
                </Text>
              </View>
              <Text style={[styles.summaryAmount, { color }]}>{described.main}</Text>
            </TouchableOpacity>
          );
        })
      ) : (
        <SummaryTotal
          label={`Total ${STATUS_SUMMARY.find((s) => s.status === filter)!.label.toLowerCase()}`}
          color={STATUS_SUMMARY.find((s) => s.status === filter)!.color}
          totals={chargeTotals[filter].totals}
          rate={rate}
          meta={plural(chargeTotals[filter].count, 'liquidación', 'liquidaciones')}
        />
      )}
    </Card>
  );

  const paymentsSummary = (
    <Card style={styles.summaryCard}>
      <SummaryTotal
        label={
          month === 'este'
            ? `Recibido en ${formatPeriod(thisPeriod).toLowerCase()}`
            : month === 'anterior'
              ? `Recibido en ${formatPeriod(monthPeriod!).toLowerCase()}`
              : 'Total recibido'
        }
        color={colors.success}
        totals={paymentTotals}
        rate={rate}
        meta={plural(monthPayments.length, 'pago', 'pagos')}
      />
    </Card>
  );

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Pagos</Text>
        {view === 'historial' ? null : <SortMenu options={SORT_OPTIONS} value={sort} onChange={setSort} />}
      </View>
      <View style={styles.segment}>
        {(['pagos', 'liquidaciones', 'historial'] as View_[]).map((value) => (
          <TouchableOpacity
            key={value}
            style={[styles.segmentItem, view === value && styles.segmentItemActive]}
            onPress={() => setView(value)}
          >
            <Text style={[styles.segmentText, view === value && styles.segmentTextActive]}>
              {VIEW_LABEL[value]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {view === 'historial' ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          <YearHistory
            views={chargeViews}
            year={year}
            onChangeYear={setYear}
            onPressMonth={(period) => navigation.navigate('MonthDetail', { period })}
          />
        </ScrollView>
      ) : view === 'liquidaciones' ? (
        <>
          <View style={styles.filterRow}>
            {FILTERS.map((item) => {
              const active = item.value === filter;
              return (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => setFilter(item.value)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <FlatList
            data={visibleCharges}
            keyExtractor={(item) => item.charge.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={chargesSummary}
            ListEmptyComponent={
              <EmptyState
                icon="calendar-outline"
                title="Sin liquidaciones"
                message="Las liquidaciones de cada contrato activo se generan solas todos los meses."
              />
            }
            renderItem={({ item }) => {
              const { property, tenant } = describeContract(item.charge.contractId);
              const partial = item.paid > 0 && item.balance > 0;
              return (
                <Card
                  style={styles.card}
                  onPress={() => navigation.navigate('ChargeForm', { chargeId: item.charge.id })}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {property}
                    </Text>
                    <Badge label={CHARGE_STATUS_LABEL[item.status]} tone={CHARGE_STATUS_TONE[item.status]} />
                  </View>
                  <Text style={styles.subText}>
                    {tenant} · {CONCEPT_LABEL[item.charge.concept]}
                  </Text>
                  <View style={styles.footerRow}>
                    <View>
                      <Text style={styles.periodText}>{formatPeriod(item.charge.period)}</Text>
                      <Text style={styles.metaText}>
                        {item.status === 'pagado' && item.lastPaymentDate
                          ? `Pagada el ${formatDate(item.lastPaymentDate)}`
                          : `Vence: ${formatDate(item.charge.dueDate)}`}
                      </Text>
                    </View>
                    <View style={styles.amountColumn}>
                      <MoneyText
                        amount={item.status === 'pagado' ? item.charge.amount : item.balance}
                        currency={item.charge.currency}
                        style={styles.amountText}
                      />
                      {partial ? (
                        <Text style={styles.metaText}>
                          resta de {formatMoney(item.charge.amount, item.charge.currency)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </Card>
              );
            }}
          />
        </>
      ) : (
        <>
          <View style={styles.filterRow}>
            {MONTH_FILTERS.map((item) => {
              const active = item.value === month;
              return (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => setMonth(item.value)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <FlatList
          data={visiblePayments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={paymentsSummary}
          ListEmptyComponent={
            <EmptyState
              icon="cash-outline"
              title="Sin pagos"
              message="Tocá + para registrar lo que te pagó un inquilino."
            />
          }
          renderItem={({ item }) => {
            const { property, tenant } = describeContract(item.contractId);
            const periods = item.allocations
              .map((a) => charges.find((c) => c.id === a.chargeId))
              .filter(Boolean)
              .map((c) => formatPeriod(c!.period));
            const credit = unallocatedAmount(item);
            return (
              <Card
                style={styles.card}
                onPress={() => navigation.navigate('PaymentDetail', { paymentId: item.id })}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {property}
                  </Text>
                  <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                </View>
                <Text style={styles.subText}>
                  {tenant} · {CONCEPT_LABEL[item.concept]}
                  {item.method ? ` · ${item.method}` : ''}
                </Text>
                <View style={styles.footerRow}>
                  <Text style={[styles.metaText, styles.periodsText]} numberOfLines={2}>
                    {periods.length ? `Cubre: ${periods.join(', ')}` : 'Sin liquidaciones aplicadas'}
                    {credit > 0 ? ` · ${formatMoney(credit, item.currency)} a favor` : ''}
                  </Text>
                  <MoneyText
                    amount={item.amount}
                    currency={item.currency}
                    settledRate={item.exchangeRate}
                    style={styles.amountText}
                  />
                </View>
              </Card>
            );
          }}
          />
        </>
      )}
      <FAB onPress={() => navigation.navigate('PaymentForm')} />
    </Screen>
  );
}

function SummaryTotal({
  label,
  color,
  totals,
  rate,
  meta,
}: {
  label: string;
  color: string;
  totals: MoneyTotals;
  rate?: number;
  meta: string;
}) {
  const described = describeTotals(totals, rate);
  return (
    <View>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryBig, { color }]}>{described.main}</Text>
      <Text style={styles.summaryMeta}>
        {meta}
        {described.detail ? ` · ${described.detail}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  summaryCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  summaryInfo: {
    flex: 1,
    minWidth: 0,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  summaryMeta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  summaryAmount: {
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  summaryBig: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    marginTop: 4,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
  },
  segment: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.neutralMuted,
    borderRadius: radius.md,
    padding: 3,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  segmentItemActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.text,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
  },
  filterTextActive: {
    color: colors.primary,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xxl * 3,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  dateText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
  },
  subText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  periodText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  periodsText: {
    flex: 1,
  },
  amountColumn: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
});
