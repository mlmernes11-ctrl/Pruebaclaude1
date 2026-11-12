// =====================================================================
// Pantalla: Cobros
// ---------------------------------------------------------------------
// Lo importante primero, en una sola lista: lo vencido, lo que está por vencer y lo cobrado
// este mes, cada bloque con su total. Arriba solo el buscador (busca propiedad, inquilino,
// importe, mes…) y "Filtrar", que abre lo demás: ver todos los cargos o todos los cobros,
// por estado o por mes, y el orden. Abajo, el historial por mes.
// Otras pantallas la abren ya filtrada por propiedad (se ve como una etiqueta que se puede quitar).
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import DataTable, { Column } from '../../components/DataTable';
import EmptyState from '../../components/EmptyState';
import LargeTitleHeader from '../../components/LargeTitleHeader';
import ListRow from '../../components/ListRow';
import ListSection from '../../components/ListSection';
import Screen from '../../components/Screen';
import SearchBar from '../../components/SearchBar';
import SortMenu, { SortOption } from '../../components/SortMenu';
import StatusHero from '../../components/StatusHero';
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
import { CHARGE_STATUS_DOT, CHARGE_STATUS_LABEL, CHARGE_VALUE_TONE, chargeProgress, chargeShownAmount } from '../../utils/status';
import { capitalize, compareTitles, plural } from '../../utils/text';

// ── Constantes ────────────────────────────────────────────────────────

// resumen = vencido + a vencer + cobrado del mes · cargos = todos los cargos · cobros = todos los cobros.
export type CollectionsMode = 'resumen' | 'cargos' | 'cobros';
type StatusFilter = 'todos' | ChargeStatus;
type MonthFilter = 'todos' | 'este' | 'anterior';
type SortValue = 'reciente' | 'antiguo' | 'propiedad' | 'importe';

const MODES: { value: CollectionsMode; label: string }[] = [
  { value: 'resumen', label: 'Lo importante' },
  { value: 'cargos', label: 'Todos los cargos' },
  { value: 'cobros', label: 'Todos los cobros' },
];
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'vencido', label: 'Vencidos' },
  { value: 'pendiente', label: 'A vencer' },
  { value: 'pagado', label: 'Pagados' },
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
  { value: 'importe', label: 'Mayor importe' },
];

// Columnas de las tablas en pantalla grande.
const CHARGE_COLUMNS: Column[] = [
  { key: 'property', label: 'Propiedad', flex: 1.3 },
  { key: 'tenant', label: 'Inquilino', flex: 1.5 },
  { key: 'concept', label: 'Concepto', flex: 1 },
  { key: 'period', label: 'Mes', flex: 0.9 },
  { key: 'status', label: 'Estado', flex: 2 },
  { key: 'amount', label: 'Importe', flex: 1.1, align: 'right' },
];
const PAYMENT_COLUMNS: Column[] = [
  { key: 'property', label: 'Propiedad', flex: 1.3 },
  { key: 'tenant', label: 'Inquilino', flex: 1.5 },
  { key: 'concept', label: 'Concepto', flex: 1 },
  { key: 'date', label: 'Fecha', flex: 1 },
  { key: 'method', label: 'Medio de pago', flex: 1.8 },
  { key: 'amount', label: 'Importe', flex: 1.1, align: 'right' },
];

// Lo que muestra una fila, más campos que solo mira el buscador.
interface Row {
  title: string;
  subtitle: string;
  value: string;
  hidden: SearchField[];
  detail?: string;
}

const byDate = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const hasMoney = (t: MoneyTotals) => t.USD > 0 || t.ARS > 0;

// ── Pantalla ──────────────────────────────────────────────────────────

export default function PaymentsListScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const desktop = useIsDesktop();
  const { refreshing, onRefresh } = useRefresh();
  const { toPesos, rate } = useExchangeRate();
  const { chargeViews: allChargeViews, payments: allPayments, contracts, getContractById, getPropertyById, getTenantById } =
    useData();

  // — Estado: modo, filtros, orden, búsqueda y propiedad —
  const [mode, setMode] = useState<CollectionsMode>('resumen');
  const [status, setStatus] = useState<StatusFilter>('todos');
  const [month, setMonth] = useState<MonthFilter>('todos');
  const [sort, setSort] = useState<SortValue>('reciente');
  const [showFilters, setShowFilters] = useState(false);
  const [propertyId, setPropertyId] = useState<string>();
  const [query, setQuery] = useState('');
  const words = useMemo(() => searchWords(query), [query]);

  // Otras pantallas la abren ya filtrada (por ejemplo "En mora" desde el Inicio).
  useEffect(() => {
    const params = route.params;
    if (!params) return;
    setMode(params.mode ?? 'resumen');
    setStatus(params.status ?? 'todos');
    setMonth(params.month ?? 'todos');
    setPropertyId(params.propertyId);
    setQuery('');
  }, [route.params]);

  // Todo respeta la propiedad elegida (si hay).
  const propertyContracts = useMemo(
    () => (propertyId ? new Set(contracts.filter((c) => c.propertyId === propertyId).map((c) => c.id)) : undefined),
    [contracts, propertyId],
  );
  const chargeViews = propertyContracts
    ? allChargeViews.filter((v) => propertyContracts.has(v.charge.contractId))
    : allChargeViews;
  const payments = propertyContracts ? allPayments.filter((p) => propertyContracts.has(p.contractId)) : allPayments;

  // — Filas y búsqueda —
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
        { label: 'Importe', value: formatMoney(item.charge.amount, item.charge.currency), amount: true },
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
        { label: 'Medio de pago', value: item.method },
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
  const searchedPayments = search(payments, paymentRow);

  // — Orden —
  // Sin cotización no se pueden comparar dólares con pesos, así que van primero los dólares.
  const compareAmounts = (a: number, ca: Currency, b: number, cb: Currency) => {
    const pa = toPesos(a, ca);
    const pb = toPesos(b, cb);
    if (pa !== undefined && pb !== undefined) return pb - pa;
    if (ca !== cb) return ca === 'USD' ? -1 : 1;
    return b - a;
  };
  const compareProperties = (a: string, b: string) => compareTitles(describeContract(a).property, describeContract(b).property);
  const sortCharges = (list: typeof searchedCharges, defaultOldestFirst = false) =>
    [...list].sort(({ item: a }, { item: b }) => {
      if (sort === 'propiedad') return compareProperties(a.charge.contractId, b.charge.contractId);
      if (sort === 'importe') return compareAmounts(chargeShownAmount(a), a.charge.currency, chargeShownAmount(b), b.charge.currency);
      const oldestFirst = sort === 'antiguo' || (sort === 'reciente' && defaultOldestFirst);
      return oldestFirst ? byDate(a.charge.dueDate, b.charge.dueDate) : byDate(b.charge.dueDate, a.charge.dueDate);
    });
  const sortPayments = (list: typeof searchedPayments) =>
    [...list].sort(({ item: a }, { item: b }) => {
      if (sort === 'propiedad') return compareProperties(a.contractId, b.contractId) || byDate(b.date, a.date);
      if (sort === 'importe') return compareAmounts(a.amount, a.currency, b.amount, b.currency);
      return sort === 'antiguo' ? byDate(a.date, b.date) : byDate(b.date, a.date);
    });

  const totalsOf = (charges: typeof searchedCharges) => {
    const t = emptyTotals();
    charges.forEach(({ item }) => addToTotals(t, chargeShownAmount(item), item.charge.currency));
    return t;
  };
  const paymentTotalsOf = (list: typeof searchedPayments) => {
    const t = emptyTotals();
    list.forEach(({ item }) => addToTotals(t, item.amount, item.currency));
    return t;
  };
  const money = (t: MoneyTotals) => describeTotals(t, rate, false).main;

  // — Bloques de "Lo importante" —
  const thisPeriod = currentPeriod();
  const overdue = sortCharges(searchedCharges.filter(({ item }) => item.status === 'vencido'), true);
  const upcoming = sortCharges(searchedCharges.filter(({ item }) => item.status === 'pendiente'), true);
  const collectedThisMonth = sortPayments(searchedPayments.filter(({ item }) => item.date.slice(0, 7) === thisPeriod));

  // — Listas completas (desde "Filtrar") —
  const allCharges = sortCharges(status === 'todos' ? searchedCharges : searchedCharges.filter(({ item }) => item.status === status));
  const monthPeriod = month === 'este' ? thisPeriod : month === 'anterior' ? addMonthsToPeriod(thisPeriod, -1) : undefined;
  const allPaymentsList = sortPayments(
    monthPeriod ? searchedPayments.filter(({ item }) => item.date.slice(0, 7) === monthPeriod) : searchedPayments,
  );

  // — Acciones —
  const registerPayment = () => {
    const active = propertyId ? contracts.find((c) => c.propertyId === propertyId && c.status === 'activo') : undefined;
    navigation.navigate('PaymentForm', active ? { contractId: active.id } : undefined);
  };
  const openCharge = (id: string) => navigation.navigate('ChargeForm', { chargeId: id });
  const openPayment = (id: string) => navigation.navigate('PaymentDetail', { paymentId: id });
  const activeFilters = Number(mode !== 'resumen') + Number(sort !== 'reciente');

  // — Partes de la lista —
  const chargeList = (list: typeof searchedCharges) =>
    desktop ? (
      <DataTable
        highlight={words}
        columns={CHARGE_COLUMNS}
        rows={list.map(({ item }) => {
          const { property, tenant } = describeContract(item.charge.contractId);
          return {
            key: item.charge.id,
            onPress: () => openCharge(item.charge.id),
            cells: {
              property: { text: property, tone: 'strong', dot: CHARGE_STATUS_DOT[item.status] },
              tenant: { text: tenant },
              concept: { text: CONCEPT_LABEL[item.charge.concept] },
              period: { text: formatPeriodShort(item.charge.period) },
              status: { text: capitalize(chargeProgress(item)), tone: item.status === 'vencido' ? 'danger' : 'muted' },
              amount: {
                text: formatMoney(chargeShownAmount(item), item.charge.currency),
                tone: item.status === 'vencido' ? 'danger' : item.status === 'pagado' ? 'muted' : 'strong',
                amount: true,
              },
            },
          };
        })}
      />
    ) : (
      <ListSection>
        {list.map(({ item, row }) => (
          <ListRow
            key={item.charge.id}
            dot={CHARGE_STATUS_DOT[item.status]}
            title={row.title}
            subtitle={row.subtitle}
            value={row.value}
            detail={row.detail}
            highlight={words}
            valueTone={CHARGE_VALUE_TONE[item.status]}
            onPress={() => openCharge(item.charge.id)}
          />
        ))}
      </ListSection>
    );

  const paymentList = (list: typeof searchedPayments) =>
    desktop ? (
      <DataTable
        highlight={words}
        columns={PAYMENT_COLUMNS}
        rows={list.map(({ item }) => {
          const { property, tenant } = describeContract(item.contractId);
          const extra = [
            item.paidAmount ? `${formatMoney(item.paidAmount, item.paidCurrency ?? 'ARS')} en pesos` : '',
            unallocatedAmount(item) > 0 ? 'saldo a favor' : '',
          ]
            .filter(Boolean)
            .join(' · ');
          return {
            key: item.id,
            onPress: () => openPayment(item.id),
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
    ) : (
      <ListSection>
        {list.map(({ item, row }) => (
          <ListRow
            key={item.id}
            title={row.title}
            subtitle={row.subtitle}
            value={row.value}
            detail={row.detail}
            highlight={words}
            onPress={() => openPayment(item.id)}
          />
        ))}
      </ListSection>
    );

  // Encabezado de cada bloque: nombre, cantidad y total.
  const blockHeader = (label: string, count: number, totals: MoneyTotals, danger = false) => (
    <View style={styles.blockHeader}>
      <Text style={[styles.blockTitle, danger && { color: colors.danger }]}>{label}</Text>
      <Text style={[styles.blockTotal, danger && { color: colors.danger }]}>
        {money(totals)} · {count}
      </Text>
    </View>
  );

  const noResults = (
    <EmptyState icon="search-outline" title="Sin resultados" message={`Nada coincide con «${query.trim()}».`} />
  );

  // — Contenido según el modo —
  let body: React.ReactNode;
  if (mode === 'resumen') {
    const nothing = !overdue.length && !upcoming.length && !collectedThisMonth.length;
    body = nothing ? (
      words.length ? (
        noResults
      ) : (
        <EmptyState
          icon="checkmark-circle-outline"
          title="Todo al día"
          message="No hay cargos vencidos ni a vencer, y todavía no hay cobros este mes."
        />
      )
    ) : (
      <>
        {overdue.length ? (
          <>
            {blockHeader('Vencido', overdue.length, totalsOf(overdue), true)}
            {chargeList(overdue)}
          </>
        ) : null}
        {upcoming.length ? (
          <>
            {blockHeader('A vencer', upcoming.length, totalsOf(upcoming))}
            {chargeList(upcoming)}
          </>
        ) : null}
        {collectedThisMonth.length ? (
          <>
            {blockHeader(`Cobrado en ${formatPeriod(thisPeriod).split(' ')[0].toLowerCase()}`, collectedThisMonth.length, paymentTotalsOf(collectedThisMonth))}
            {paymentList(collectedThisMonth)}
          </>
        ) : null}
      </>
    );
  } else if (mode === 'cargos') {
    const label = status === 'todos' ? 'Total de cargos' : `Total ${CHARGE_STATUS_LABEL[status].toLowerCase()}`;
    body = (
      <>
        <StatusHero
          label={label}
          value={money(totalsOf(allCharges))}
          detail={plural(allCharges.length, 'cargo', 'cargos')}
          danger={status === 'vencido'}
          style={styles.total}
        />
        {allCharges.length ? chargeList(allCharges) : words.length ? noResults : (
          <EmptyState icon="calendar-outline" title="Sin cargos" message="Los cargos de cada contrato vigente se generan solos todos los meses." />
        )}
      </>
    );
  } else {
    body = (
      <>
        <StatusHero
          label={monthPeriod ? `Cobrado en ${formatPeriod(monthPeriod).toLowerCase()}` : 'Total cobrado'}
          value={money(paymentTotalsOf(allPaymentsList))}
          detail={plural(allPaymentsList.length, 'cobro', 'cobros')}
          style={styles.total}
        />
        {allPaymentsList.length ? paymentList(allPaymentsList) : words.length ? noResults : (
          <EmptyState icon="wallet-outline" title="Sin cobros" message="Tocá + para registrar lo que pagó un inquilino." />
        )}
      </>
    );
  }

  // — Dibujo de la pantalla —
  return (
    <Screen topSafe>
      <LargeTitleHeader title="Cobros" onAdd={registerPayment} addLabel="Registrar cobro" />

      <View style={styles.searchRow}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar propiedad, inquilino, importe, mes…"
          style={styles.search}
        />
        <TouchableOpacity
          style={[styles.filterButton, (showFilters || activeFilters > 0) && styles.filterButtonActive]}
          onPress={() => setShowFilters((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: showFilters }}
        >
          <Ionicons name="options-outline" size={18} color={colors.primary} />
          <Text style={styles.filterButtonText}>{activeFilters ? `Filtrar (${activeFilters})` : 'Filtrar'}</Text>
        </TouchableOpacity>
      </View>

      {propertyId ? (
        <TouchableOpacity style={styles.propertyChip} onPress={() => setPropertyId(undefined)} accessibilityRole="button">
          <Text style={styles.propertyChipText}>{getPropertyById(propertyId)?.title ?? 'Propiedad'}</Text>
          <Ionicons name="close-circle" size={16} color={colors.primary} />
        </TouchableOpacity>
      ) : null}

      {showFilters ? (
        <View style={styles.filters}>
          <Pills options={MODES} value={mode} onChange={setMode} />
          {mode === 'cargos' ? <Pills options={STATUS_FILTERS} value={status} onChange={setStatus} /> : null}
          {mode === 'cobros' ? <Pills options={MONTH_FILTERS} value={month} onChange={setMonth} /> : null}
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>Orden</Text>
            <SortMenu options={SORT_OPTIONS} value={sort} onChange={setSort} compact />
          </View>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
      >
        {body}
        {hasMoney(totalsOf(searchedCharges)) || searchedPayments.length ? (
          <ListSection>
            <ListRow
              title="Historial por mes"
              icon="time-outline"
              onPress={() => navigation.navigate('History', { propertyId })}
            />
          </ListSection>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

// ── Partes de la pantalla ─────────────────────────────────────────────

function Pills<T extends string>({
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  search: {
    flex: 1,
    marginHorizontal: 0,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    minHeight: 38,
    borderRadius: radius.round,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  filterButtonActive: {
    backgroundColor: colors.primaryMuted,
  },
  filterButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  propertyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 32,
    borderRadius: radius.round,
    backgroundColor: colors.primaryMuted,
  },
  propertyChipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  filters: {
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sortLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
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
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  blockTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  blockTotal: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  total: {
    marginBottom: spacing.xl,
  },
}));
