import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import EmptyState from '../../components/EmptyState';
import LargeTitleHeader from '../../components/LargeTitleHeader';
import ListRow from '../../components/ListRow';
import ListSection from '../../components/ListSection';
import PropertyFilter from '../../components/PropertyFilter';
import Screen from '../../components/Screen';
import SegmentedControl from '../../components/SegmentedControl';
import SortMenu, { SortOption } from '../../components/SortMenu';
import { DotTone } from '../../components/StatusDot';
import YearHistory from '../../components/YearHistory';
import { CONCEPT_LABEL } from '../../constants';
import { useData } from '../../context/DataContext';
import { useExchangeRate } from '../../context/ExchangeRateContext';
import { makeStyles, useTheme } from '../../context/ThemeContext';
import { useRefresh } from '../../hooks/useRefresh';
import { fontSize, radius, spacing } from '../../theme';
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
  formatPeriodShort,
} from '../../utils/format';
import { ChargeView, unallocatedAmount } from '../../utils/ledger';
import { compareTitles, plural } from '../../utils/text';

type View_ = 'pagos' | 'liquidaciones' | 'historial';
type FilterValue = 'todos' | ChargeStatus;
type MonthFilter = 'todos' | 'este' | 'anterior';
type SortValue = 'reciente' | 'antiguo' | 'propiedad' | 'monto';

const VIEWS: { value: View_; label: string }[] = [
  { value: 'pagos', label: 'Recibidos' },
  { value: 'liquidaciones', label: 'Liquidaciones' },
  { value: 'historial', label: 'Historial' },
];

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

const STATUS_SUMMARY: { status: ChargeStatus; label: string; dot: DotTone }[] = [
  { status: 'vencido', label: 'En mora', dot: 'danger' },
  { status: 'pendiente', label: 'Por vencer', dot: 'warning' },
  { status: 'pagado', label: 'Pagado', dot: 'success' },
];

const STATUS_DOT: Record<ChargeStatus, DotTone> = { vencido: 'danger', pendiente: 'warning', pagado: 'success' };

const byDate = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const shortDate = (iso?: string) => formatDate(iso).slice(0, 5);

// What a liquidación counts for in totals: the outstanding part, or the full amount once paid.
const chargeValue = (view: ChargeView) => (view.status === 'pagado' ? view.charge.amount : view.balance);

export default function PaymentsListScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { chargeViews: allChargeViews, payments: allPayments, contracts, getContractById, getPropertyById, getTenantById } =
    useData();
  const { toPesos, rate } = useExchangeRate();
  const { refreshing, onRefresh } = useRefresh();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [view, setView] = useState<View_>('pagos');
  const [filter, setFilter] = useState<FilterValue>('todos');
  const [month, setMonth] = useState<MonthFilter>('todos');
  const [sort, setSort] = useState<SortValue>('reciente');
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [propertyId, setPropertyId] = useState<string | undefined>();

  // Everything on this screen (lists, totals and history) follows the property filter.
  const propertyContracts = useMemo(
    () => (propertyId ? new Set(contracts.filter((c) => c.propertyId === propertyId).map((c) => c.id)) : undefined),
    [contracts, propertyId],
  );
  const chargeViews = useMemo(
    () => (propertyContracts ? allChargeViews.filter((v) => propertyContracts.has(v.charge.contractId)) : allChargeViews),
    [allChargeViews, propertyContracts],
  );
  const payments = useMemo(
    () => (propertyContracts ? allPayments.filter((p) => propertyContracts.has(p.contractId)) : allPayments),
    [allPayments, propertyContracts],
  );

  // The dashboard opens this screen already filtered (e.g. "En mora").
  useEffect(() => {
    const params = route.params;
    if (!params) return;
    if (params.view) setView(params.view);
    if (params.filter) setFilter(params.filter);
    if (params.month) setMonth(params.month);
    setPropertyId(params.propertyId);
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
    compareTitles(describeContract(contractA).property, describeContract(contractB).property);

  const visibleCharges = (filter === 'todos' ? chargeViews : chargeViews.filter((v) => v.status === filter)).sort(
    (a, b) => {
      if (sort === 'antiguo') return byDate(a.charge.dueDate, b.charge.dueDate);
      if (sort === 'propiedad') {
        return compareProperties(a.charge.contractId, b.charge.contractId) || byDate(b.charge.dueDate, a.charge.dueDate);
      }
      if (sort === 'monto') return compareAmounts(chargeValue(a), a.charge.currency, chargeValue(b), b.charge.currency);
      return byDate(b.charge.dueDate, a.charge.dueDate);
    },
  );

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
  const received = describeTotals(paymentTotals, rate, false);

  const dollarsInView = chargeViews.some((v) => v.charge.currency === 'USD');

  const registerPayment = () => {
    const active = propertyId ? contracts.find((c) => c.propertyId === propertyId && c.status === 'activo') : undefined;
    navigation.navigate('PaymentForm', active ? { contractId: active.id } : undefined);
  };

  const pills =
    view === 'liquidaciones' ? (
      <FilterPills options={FILTERS} value={filter} onChange={setFilter} />
    ) : view === 'pagos' ? (
      <FilterPills options={MONTH_FILTERS} value={month} onChange={setMonth} />
    ) : null;

  return (
    <Screen>
      <LargeTitleHeader title="Pagos" onAdd={registerPayment} addLabel="Registrar pago" />
      <SegmentedControl options={VIEWS} value={view} onChange={setView} />
      <PropertyFilter value={propertyId} onChange={setPropertyId} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
      >
        {view !== 'historial' ? (
          <View style={styles.toolbar}>
            <View style={styles.toolbarPills}>{pills}</View>
            <SortMenu options={SORT_OPTIONS} value={sort} onChange={setSort} compact />
          </View>
        ) : null}

        {view === 'historial' ? (
          <YearHistory
            views={chargeViews}
            year={year}
            onChangeYear={setYear}
            onPressMonth={(period) => navigation.navigate('MonthDetail', { period, propertyId })}
          />
        ) : view === 'liquidaciones' ? (
          <>
            {filter === 'todos' ? (
              <ListSection footer={rate && dollarsInView ? 'Totales en pesos con la cotización de hoy.' : undefined}>
                {STATUS_SUMMARY.map(({ status, label, dot }) => {
                  const { count, totals } = chargeTotals[status];
                  return (
                    <ListRow
                      key={status}
                      dot={dot}
                      title={label}
                      subtitle={plural(count, 'liquidación', 'liquidaciones')}
                      value={describeTotals(totals, rate, false).main}
                      valueTone={status === 'vencido' && count ? 'danger' : 'default'}
                      onPress={() => setFilter(status)}
                    />
                  );
                })}
              </ListSection>
            ) : (
              <Total
                label={`Total ${STATUS_SUMMARY.find((s) => s.status === filter)!.label.toLowerCase()}`}
                value={describeTotals(chargeTotals[filter].totals, rate, false).main}
                detail={plural(chargeTotals[filter].count, 'liquidación', 'liquidaciones')}
                danger={filter === 'vencido'}
              />
            )}
            {visibleCharges.length ? (
              <ListSection>
                {visibleCharges.map((item) => {
                  const { property } = describeContract(item.charge.contractId);
                  const concept = `${CONCEPT_LABEL[item.charge.concept]} ${formatPeriodShort(item.charge.period)}`;
                  const when =
                    item.status === 'pagado'
                      ? `pagada el ${shortDate(item.lastPaymentDate)}`
                      : item.paid > 0
                        ? `pagó ${formatMoney(item.paid, item.charge.currency)}`
                        : `vence el ${shortDate(item.charge.dueDate)}`;
                  return (
                    <ListRow
                      key={item.charge.id}
                      dot={STATUS_DOT[item.status]}
                      title={property}
                      subtitle={`${concept} · ${when}`}
                      value={formatMoney(chargeValue(item), item.charge.currency)}
                      valueTone={item.status === 'vencido' ? 'danger' : item.status === 'pagado' ? 'muted' : 'default'}
                      onPress={() => navigation.navigate('ChargeForm', { chargeId: item.charge.id })}
                    />
                  );
                })}
              </ListSection>
            ) : (
              <EmptyState
                icon="calendar-outline"
                title="Sin liquidaciones"
                message="Las liquidaciones de cada contrato activo se generan solas todos los meses."
              />
            )}
          </>
        ) : (
          <>
            <Total
              label={monthPeriod ? `Recibido en ${formatPeriod(monthPeriod).toLowerCase()}` : 'Total recibido'}
              value={received.main}
              detail={[plural(monthPayments.length, 'pago', 'pagos'), received.detail].filter(Boolean).join(' · ')}
            />
            {visiblePayments.length ? (
              <ListSection>
                {visiblePayments.map((item) => {
                  const { property, tenant } = describeContract(item.contractId);
                  const credit = unallocatedAmount(item) > 0 ? ' · saldo a favor' : '';
                  return (
                    <ListRow
                      key={item.id}
                      title={property}
                      subtitle={`${tenant} · ${CONCEPT_LABEL[item.concept]} · ${shortDate(item.date)}${credit}`}
                      value={formatMoney(item.amount, item.currency)}
                      onPress={() => navigation.navigate('PaymentDetail', { paymentId: item.id })}
                    />
                  );
                })}
              </ListSection>
            ) : (
              <EmptyState icon="wallet-outline" title="Sin pagos" message="Tocá + para registrar lo que pagó un inquilino." />
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function FilterPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const styles = useStyles();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.pill, active && styles.pillActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function Total({ label, value, detail, danger }: { label: string; value: string; detail: string; danger?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.total}>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={[styles.totalValue, danger && { color: colors.danger }]}>{value}</Text>
      <Text style={styles.totalDetail}>{detail}</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  toolbarPills: {
    flex: 1,
    minWidth: 0,
  },
  pills: {
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.neutralMuted,
  },
  pillActive: {
    backgroundColor: colors.primaryMuted,
  },
  pillText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
  pillTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  total: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl - 4,
    marginBottom: spacing.xl,
  },
  totalLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.8,
    color: colors.text,
    marginTop: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  totalDetail: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
}));
