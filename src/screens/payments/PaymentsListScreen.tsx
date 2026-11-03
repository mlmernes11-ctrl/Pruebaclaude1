// =====================================================================
// Pantalla: Pagos
// ---------------------------------------------------------------------
// Tres vistas: pagos recibidos, liquidaciones e historial del año. Con buscador, filtros por
// estado o mes, filtro por propiedad y orden.
// =====================================================================

import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import DataTable, { Column } from '../../components/DataTable';
import EmptyState from '../../components/EmptyState';
import LargeTitleHeader from '../../components/LargeTitleHeader';
import ListRow from '../../components/ListRow';
import ListSection from '../../components/ListSection';
import PropertyFilter from '../../components/PropertyFilter';
import Screen from '../../components/Screen';
import StatusHero from '../../components/StatusHero';
import SearchBar from '../../components/SearchBar';
import SegmentedControl from '../../components/SegmentedControl';
import SortMenu, { SortOption } from '../../components/SortMenu';
import StatusDot, { DotTone } from '../../components/StatusDot';
import YearHistory from '../../components/YearHistory';
import { CONCEPT_LABEL } from '../../constants';
import { useData } from '../../context/DataContext';
import { useExchangeRate } from '../../context/ExchangeRateContext';
import { makeStyles, useTheme } from '../../context/ThemeContext';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { useRefresh } from '../../hooks/useRefresh';
import { fontSize, radius, spacing } from '../../theme';
import { ChargeStatus, Currency, MoneyTotals, Payment } from '../../types';
import {
  addMonthsToPeriod,
  addToTotals,
  currentPeriod,
  describeTotals,
  emptyTotals,
  formatDate,
  formatDayMonth,
  formatMoney,
  formatPeriod,
  formatPeriodShort,
} from '../../utils/format';
import { ChargeView, unallocatedAmount } from '../../utils/ledger';
import { matchRow, SearchField, searchWords } from '../../utils/search';
import {
  CHARGE_STATUS_DOT,
  CHARGE_STATUS_LABEL,
  CHARGE_VALUE_TONE,
  chargeProgress,
  chargeShownAmount,
} from '../../utils/status';
import { capitalize, compareTitles, plural } from '../../utils/text';

// ── Constantes y funciones auxiliares ─────────────────────────────────

type PaymentsView = 'pagos' | 'liquidaciones' | 'historial';
type FilterValue = 'todos' | ChargeStatus;
type MonthFilter = 'todos' | 'este' | 'anterior';
type SortValue = 'reciente' | 'antiguo' | 'propiedad' | 'monto';

const VIEWS: { value: PaymentsView; label: string }[] = [
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

// Lo que muestra una fila, más campos que solo mira el buscador.
interface Row {
  title: string;
  subtitle: string;
  value: string;
  hidden: SearchField[];
  detail?: string;
}

// Columnas de las tablas en pantalla grande.
const CHARGE_COLUMNS: Column[] = [
  { key: 'property', label: 'Carpeta', flex: 1.3 },
  { key: 'tenant', label: 'Inquilino', flex: 1.5 },
  { key: 'concept', label: 'Concepto', flex: 1 },
  { key: 'period', label: 'Mes', flex: 0.9 },
  { key: 'status', label: 'Estado', flex: 2 },
  { key: 'amount', label: 'Monto', flex: 1.1, align: 'right' },
];
const PAYMENT_COLUMNS: Column[] = [
  { key: 'property', label: 'Carpeta', flex: 1.3 },
  { key: 'tenant', label: 'Inquilino', flex: 1.5 },
  { key: 'concept', label: 'Concepto', flex: 1 },
  { key: 'date', label: 'Fecha', flex: 1 },
  { key: 'method', label: 'Método', flex: 1.8 },
  { key: 'amount', label: 'Monto', flex: 1.1, align: 'right' },
];

const byDate = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// ── Pantalla ──────────────────────────────────────────────────────────

export default function PaymentsListScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const {
    chargeViews: allChargeViews,
    payments: allPayments,
    contracts,
    getContractById,
    getPropertyById,
    getTenantById,
  } = useData();
  const { toPesos, rate } = useExchangeRate();
  const { refreshing, onRefresh } = useRefresh();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // — Estado de la pantalla (vista elegida, filtros, orden, búsqueda) —
  const [view, setView] = useState<PaymentsView>('pagos');
  const [filter, setFilter] = useState<FilterValue>('todos');
  const [month, setMonth] = useState<MonthFilter>('todos');
  const [sort, setSort] = useState<SortValue>('reciente');
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [propertyId, setPropertyId] = useState<string | undefined>();
  const desktop = useIsDesktop();
  const [query, setQuery] = useState('');
  const words = useMemo(() => searchWords(query), [query]);

  // Todo en esta pantalla (listas, totales e historial) respeta el filtro por propiedad.
  const propertyContracts = useMemo(
    () => (propertyId ? new Set(contracts.filter((c) => c.propertyId === propertyId).map((c) => c.id)) : undefined),
    [contracts, propertyId],
  );
  const chargeViews = useMemo(
    () =>
      propertyContracts ? allChargeViews.filter((v) => propertyContracts.has(v.charge.contractId)) : allChargeViews,
    [allChargeViews, propertyContracts],
  );
  const propertyPayments = useMemo(
    () => (propertyContracts ? allPayments.filter((p) => propertyContracts.has(p.contractId)) : allPayments),
    [allPayments, propertyContracts],
  );

  // Otras pantallas abren esta ya filtrada (por ejemplo "En mora" desde el Inicio).
  useEffect(() => {
    const params = route.params;
    if (!params) return;
    if (params.view) setView(params.view);
    if (params.filter) setFilter(params.filter);
    if (params.month) setMonth(params.month);
    setPropertyId(params.propertyId);
    setQuery('');
  }, [route.params]);

  // — Filas: lo que muestra cada liquidación y cada pago —
  const describeContract = (contractId: string) => {
    const contract = getContractById(contractId);
    return {
      property: getPropertyById(contract?.propertyId)?.title ?? 'Propiedad',
      tenant: getTenantById(contract?.tenantId)?.name ?? 'Inquilino',
    };
  };

  const chargeRow = (item: ChargeView): Row => {
    const { property, tenant } = describeContract(item.charge.contractId);
    return {
      title: property,
      subtitle: `${CONCEPT_LABEL[item.charge.concept]} ${formatPeriodShort(item.charge.period)} · ${chargeProgress(item)}`,
      value: formatMoney(chargeShownAmount(item), item.charge.currency),
      hidden: [
        { label: 'Inquilino', value: tenant },
        { label: 'Mes', value: formatPeriod(item.charge.period) },
        { label: 'Estado', value: CHARGE_STATUS_LABEL[item.status] },
        { label: 'Monto', value: formatMoney(item.charge.amount, item.charge.currency), amount: true },
        { label: 'Vence', value: formatDate(item.charge.dueDate) },
        { label: 'Nota', value: item.charge.notes },
      ],
    };
  };

  const paymentRow = (item: Payment): Row => {
    const { property, tenant } = describeContract(item.contractId);
    const credit = unallocatedAmount(item) > 0 ? ' · saldo a favor' : '';
    const inPesos = item.paidCurrency === 'ARS' && item.paidAmount ? ' · en pesos' : '';
    return {
      title: property,
      subtitle: `${tenant} · ${CONCEPT_LABEL[item.concept]} · ${formatDayMonth(item.date)}${inPesos}${credit}`,
      value: formatMoney(item.amount, item.currency),
      hidden: [
        { label: 'Fecha', value: formatDate(item.date) },
        { label: 'Mes', value: formatPeriod(item.date.slice(0, 7)) },
        { label: 'Método', value: item.method },
        {
          label: 'En pesos',
          value: item.paidAmount ? formatMoney(item.paidAmount, item.paidCurrency ?? 'ARS') : undefined,
          amount: true,
        },
        { label: 'Nota', value: item.notes },
      ],
    };
  };

  // El buscador filtra listas y totales; cada fila guarda lo que muestra y por qué coincidió.
  const search = <T,>(items: T[], toRow: (item: T) => Row) =>
    items.flatMap((item) => {
      const row = toRow(item);
      if (!words.length) return [{ item, row }];
      const visible: SearchField[] = [
        { label: '', value: row.title },
        { label: '', value: row.subtitle },
        { label: '', value: row.value, amount: true },
      ];
      const match = matchRow(visible, row.hidden, words);
      return match ? [{ item, row: { ...row, detail: match.detail } }] : [];
    });
  const searchedCharges = search(chargeViews, chargeRow);
  const searchedPayments = search(propertyPayments, paymentRow);

  // — Orden de las listas —
  // Sin cotización no se pueden comparar dólares con pesos, así que van primero los dólares.
  const compareAmounts = (a: number, ca: Currency, b: number, cb: Currency) => {
    const pa = toPesos(a, ca);
    const pb = toPesos(b, cb);
    if (pa !== undefined && pb !== undefined) return pb - pa;
    if (ca !== cb) return ca === 'USD' ? -1 : 1;
    return b - a;
  };
  const compareProperties = (contractA: string, contractB: string) =>
    compareTitles(describeContract(contractA).property, describeContract(contractB).property);

  const visibleCharges = (
    filter === 'todos' ? searchedCharges : searchedCharges.filter(({ item }) => item.status === filter)
  ).sort(({ item: a }, { item: b }) => {
    if (sort === 'antiguo') return byDate(a.charge.dueDate, b.charge.dueDate);
    if (sort === 'propiedad') {
      return compareProperties(a.charge.contractId, b.charge.contractId) || byDate(b.charge.dueDate, a.charge.dueDate);
    }
    if (sort === 'monto')
      return compareAmounts(chargeShownAmount(a), a.charge.currency, chargeShownAmount(b), b.charge.currency);
    return byDate(b.charge.dueDate, a.charge.dueDate);
  });

  const thisPeriod = currentPeriod();
  const monthPeriod =
    month === 'este' ? thisPeriod : month === 'anterior' ? addMonthsToPeriod(thisPeriod, -1) : undefined;
  const monthPayments = monthPeriod
    ? searchedPayments.filter(({ item }) => item.date.slice(0, 7) === monthPeriod)
    : searchedPayments;
  const visiblePayments = [...monthPayments].sort(({ item: a }, { item: b }) => {
    if (sort === 'antiguo') return byDate(a.date, b.date);
    if (sort === 'propiedad') return compareProperties(a.contractId, b.contractId) || byDate(b.date, a.date);
    if (sort === 'monto') return compareAmounts(a.amount, a.currency, b.amount, b.currency);
    return byDate(b.date, a.date);
  });

  // — Totales —
  const chargeTotals: Record<ChargeStatus, { count: number; totals: MoneyTotals }> = {
    vencido: { count: 0, totals: emptyTotals() },
    pendiente: { count: 0, totals: emptyTotals() },
    pagado: { count: 0, totals: emptyTotals() },
  };
  searchedCharges.forEach(({ item: v }) => {
    chargeTotals[v.status].count += 1;
    addToTotals(chargeTotals[v.status].totals, chargeShownAmount(v), v.charge.currency);
  });

  const paymentTotals = emptyTotals();
  monthPayments.forEach(({ item: p }) => addToTotals(paymentTotals, p.amount, p.currency));
  const received = describeTotals(paymentTotals, rate, false);

  const dollarsInView = searchedCharges.some(({ item }) => item.charge.currency === 'USD');
  const noResults = (what: string) => (
    <EmptyState
      icon="search-outline"
      title="Sin resultados"
      message={`No hay ${what} que coincidan con «${query.trim()}».`}
    />
  );

  // — Acciones —
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

  // — Dibujo de la pantalla —
  return (
    <Screen>
      <LargeTitleHeader
        title="Pagos"
        onAdd={registerPayment}
        addLabel="Registrar pago"
        middle={
          desktop ? (
            <SegmentedControl options={VIEWS} value={view} onChange={setView} style={styles.segmentInline} />
          ) : null
        }
      />
      {desktop ? null : <SegmentedControl options={VIEWS} value={view} onChange={setView} />}
      {/* Pantalla grande: buscador y filtro por propiedad en una sola fila. */}
      <View style={desktop ? styles.filtersRow : undefined}>
        {view !== 'historial' ? (
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar carpeta, inquilino, monto, mes…"
            style={desktop ? styles.searchDesktop : undefined}
          />
        ) : null}
        <PropertyFilter
          value={propertyId}
          onChange={setPropertyId}
          style={desktop ? (view === 'historial' ? styles.propertyDesktopFull : styles.propertyDesktop) : undefined}
        />
      </View>

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
            {filter === 'todos' && desktop ? (
              <View style={styles.summaryRow}>
                {STATUS_SUMMARY.map(({ status, label, dot }) => {
                  const { count, totals } = chargeTotals[status];
                  return (
                    <TouchableOpacity
                      key={status}
                      style={styles.summaryCard}
                      onPress={() => setFilter(status)}
                      accessibilityRole="button"
                    >
                      <View style={styles.summaryLabelRow}>
                        <StatusDot tone={dot} size={8} />
                        <Text style={styles.summaryLabel}>
                          {label} · {plural(count, 'liquidación', 'liquidaciones')}
                        </Text>
                      </View>
                      <Text
                        style={[styles.summaryValue, status === 'vencido' && count ? { color: colors.danger } : null]}
                      >
                        {describeTotals(totals, rate, false).main}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : filter === 'todos' ? (
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
              <StatusHero
                label={`Total ${STATUS_SUMMARY.find((s) => s.status === filter)!.label.toLowerCase()}`}
                value={describeTotals(chargeTotals[filter].totals, rate, false).main}
                detail={plural(chargeTotals[filter].count, 'liquidación', 'liquidaciones')}
                danger={filter === 'vencido'}
                style={styles.total}
              />
            )}
            {visibleCharges.length && desktop ? (
              <DataTable
                highlight={words}
                columns={CHARGE_COLUMNS}
                rows={visibleCharges.map(({ item }) => {
                  const { property, tenant } = describeContract(item.charge.contractId);
                  return {
                    key: item.charge.id,
                    onPress: () => navigation.navigate('ChargeForm', { chargeId: item.charge.id }),
                    cells: {
                      property: { text: property, tone: 'strong', dot: CHARGE_STATUS_DOT[item.status] },
                      tenant: { text: tenant },
                      concept: { text: CONCEPT_LABEL[item.charge.concept] },
                      period: { text: formatPeriodShort(item.charge.period) },
                      status: {
                        text: capitalize(chargeProgress(item)),
                        tone: item.status === 'vencido' ? 'danger' : 'muted',
                      },
                      amount: {
                        text: formatMoney(chargeShownAmount(item), item.charge.currency),
                        tone: item.status === 'vencido' ? 'danger' : item.status === 'pagado' ? 'muted' : 'strong',
                        amount: true,
                      },
                    },
                  };
                })}
              />
            ) : visibleCharges.length ? (
              <ListSection>
                {visibleCharges.map(({ item, row }) => {
                  return (
                    <ListRow
                      key={item.charge.id}
                      dot={CHARGE_STATUS_DOT[item.status]}
                      title={row.title}
                      subtitle={row.subtitle}
                      value={row.value}
                      detail={row.detail}
                      highlight={words}
                      valueTone={CHARGE_VALUE_TONE[item.status]}
                      onPress={() => navigation.navigate('ChargeForm', { chargeId: item.charge.id })}
                    />
                  );
                })}
              </ListSection>
            ) : words.length ? (
              noResults('liquidaciones')
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
            <StatusHero
              label={monthPeriod ? `Recibido en ${formatPeriod(monthPeriod).toLowerCase()}` : 'Total recibido'}
              value={received.main}
              detail={[plural(monthPayments.length, 'pago', 'pagos'), received.detail].filter(Boolean).join(' · ')}
              style={styles.total}
            />
            {visiblePayments.length && desktop ? (
              <DataTable
                highlight={words}
                columns={PAYMENT_COLUMNS}
                rows={visiblePayments.map(({ item }) => {
                  const { property, tenant } = describeContract(item.contractId);
                  const extra = [
                    item.paidAmount ? `${formatMoney(item.paidAmount, item.paidCurrency ?? 'ARS')} en pesos` : '',
                    unallocatedAmount(item) > 0 ? 'saldo a favor' : '',
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  return {
                    key: item.id,
                    onPress: () => navigation.navigate('PaymentDetail', { paymentId: item.id }),
                    cells: {
                      property: { text: property, tone: 'strong' },
                      tenant: { text: tenant },
                      concept: { text: CONCEPT_LABEL[item.concept] },
                      date: { text: formatDate(item.date) },
                      method: { text: [item.method ?? '', extra].filter(Boolean).join(' · '), tone: 'muted' },
                      amount: { text: formatMoney(item.amount, item.currency), tone: 'strong', amount: true },
                    },
                  };
                })}
              />
            ) : visiblePayments.length ? (
              <ListSection>
                {visiblePayments.map(({ item, row }) => {
                  return (
                    <ListRow
                      key={item.id}
                      title={row.title}
                      subtitle={row.subtitle}
                      value={row.value}
                      detail={row.detail}
                      highlight={words}
                      onPress={() => navigation.navigate('PaymentDetail', { paymentId: item.id })}
                    />
                  );
                })}
              </ListSection>
            ) : words.length ? (
              noResults('pagos')
            ) : (
              <EmptyState
                icon="wallet-outline"
                title="Sin pagos"
                message="Tocá + para registrar lo que pagó un inquilino."
              />
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

// ── Partes de la pantalla ─────────────────────────────────────────────

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

// ── Estilos ───────────────────────────────────────────────────────────

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
    marginBottom: spacing.xl,
  },
  segmentInline: {
    marginHorizontal: 0,
    marginBottom: 0,
    width: 380,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  searchDesktop: {
    flex: 1,
    marginHorizontal: 0,
  },
  propertyDesktop: {
    width: 300,
    marginHorizontal: 0,
  },
  propertyDesktopFull: {
    flex: 1,
    marginHorizontal: 0,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl - 4,
  },
  summaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
}));
