import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import MoneyText from '../components/MoneyText';
import Screen from '../components/Screen';
import SortMenu, { SortOption } from '../components/SortMenu';
import { CONCEPT_LABEL } from '../constants';
import { useData } from '../context/DataContext';
import { RATE_SOURCE_LABEL, useExchangeRate } from '../context/ExchangeRateContext';
import { fontSize, radius, spacing, Palette } from '../theme';
import {
  currentPeriod,
  describeTotals,
  formatDateTime,
  formatMoney,
  formatPeriod,
  formatTotals,
} from '../utils/format';
import { isOutstanding, sortOldestFirst } from '../utils/ledger';
import {
  COLLECTION_LABEL,
  COLLECTION_ORDER,
  collectionCountLabel,
  CollectionState,
  PropertySummary,
  sortByCollection,
  summarizeProperty,
} from '../utils/propertySummary';
import { compareTitles, plural } from '../utils/text';
import { makeStyles, useTheme } from '../context/ThemeContext';


type PropertySort = 'estado' | 'nombre' | 'barrio';

const PROPERTY_SORT_OPTIONS: SortOption<PropertySort>[] = [
  { value: 'estado', label: 'Estado' },
  { value: 'nombre', label: 'Nombre' },
  { value: 'barrio', label: 'Barrio' },
];

const byTitle = (a: PropertySummary, b: PropertySummary) =>
  compareTitles(a.property.title, b.property.title);

// Properties without a neighborhood go last when grouping by barrio.
const NO_NEIGHBORHOOD = 'Sin barrio';
const neighborhoodOf = (summary: PropertySummary) => summary.property.neighborhood?.trim() || NO_NEIGHBORHOOD;

function sortSummaries(summaries: PropertySummary[], sort: PropertySort): PropertySummary[] {
  const sorted = [...summaries];
  if (sort === 'nombre') return sorted.sort(byTitle);
  if (sort === 'barrio') {
    return sorted.sort((a, b) => {
      const na = neighborhoodOf(a);
      const nb = neighborhoodOf(b);
      if (na !== nb) {
        if (na === NO_NEIGHBORHOOD) return 1;
        if (nb === NO_NEIGHBORHOOD) return -1;
        return compareTitles(na, nb);
      }
      return byTitle(a, b);
    });
  }
  return sortByCollection(sorted.sort(byTitle));
}

export default function DashboardScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const {
    stats,
    properties,
    tenants,
    payments,
    contracts,
    chargeViews,
    getContractById,
    getPropertyById,
    getTenantById,
    loadSampleData,
  } = useData();
  const { rate, source: rateSource, updatedAt: rateUpdatedAt } = useExchangeRate();
  const navigation = useNavigation<any>();
  const isEmpty =
    properties.length === 0 && tenants.length === 0 && contracts.length === 0 && payments.length === 0;

  const pending = describeTotals(stats.pendingAmount, rate);
  const overdue = describeTotals(stats.overdueAmount, rate);
  const collected = describeTotals(stats.collectedThisMonth, rate);
  const collectedCount = payments.filter((p) => p.date.slice(0, 7) === currentPeriod()).length;

  const [propertySort, setPropertySort] = useState<PropertySort>('estado');
  const [collectionFilter, setCollectionFilter] = useState<CollectionState | null>(null);
  const summaries = sortSummaries(
    properties.map((p) => summarizeProperty(p, contracts, chargeViews, tenants)),
    propertySort,
  );
  const visibleSummaries = collectionFilter
    ? summaries.filter((s) => s.collection === collectionFilter)
    : summaries;

  const openPayments = (params: object) =>
    navigation.navigate('PaymentsTab', { screen: 'PaymentsList', params });

  const upcomingCharges = sortOldestFirst(chargeViews.filter(isOutstanding)).slice(0, 5);


  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Inicio</Text>
        <Text style={styles.subheader}>Vista general de tu cartera de alquileres</Text>

        {isEmpty ? (
          <Card style={styles.welcomeCard}>
            <Text style={styles.welcomeTitle}>¿Querés probar la app rápido?</Text>
            <Text style={styles.welcomeText}>
              Cargá 8 propiedades, 7 inquilinos, contratos y pagos de ejemplo para recorrer todas las
              pantallas sin cargar nada a mano.
            </Text>
            <Button label="Cargar datos de ejemplo" onPress={loadSampleData} />
          </Card>
        ) : null}

        <Card
          style={[styles.rateCard, !rate && styles.rateCardMissing]}
          onPress={() => navigation.navigate('ExchangeRate')}
        >
          <Ionicons name="cash-outline" size={20} color={rate ? colors.primary : colors.warning} />
          <View style={styles.rateInfo}>
            <Text style={styles.rateTitle}>
              {rate
                ? `Dólar ${RATE_SOURCE_LABEL[rateSource]}: US$ 1 = ${formatMoney(rate, 'ARS')}`
                : 'Falta la cotización del dólar'}
            </Text>
            <Text style={styles.rateMeta}>
              {rate
                ? rateSource === 'manual'
                  ? 'Cargada a mano · tocá para cambiarla'
                  : `Promedio compra/venta · ${formatDateTime(rateUpdatedAt)}`
                : 'Tocá para cargarla y ver los montos en pesos'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Card>

        <View style={styles.grid}>
          <StatCard
            icon="business-outline"
            label="Propiedades"
            value={String(stats.totalProperties)}
            tone={colors.primary}
            onPress={() => navigation.navigate('RentalsTab', { screen: 'Rentals', params: { view: 'propiedades' } })}
          />
          <StatCard
            icon="document-text-outline"
            label="Contratos activos"
            value={String(stats.activeContracts)}
            tone={colors.success}
            onPress={() => navigation.navigate('RentalsTab', { screen: 'Rentals', params: { view: 'contratos' } })}
          />
        </View>

        <View style={styles.occupancyRow}>
          <View style={styles.incomeItem}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <Text style={styles.incomeItemText}>
              {stats.rentedProperties} {stats.rentedProperties === 1 ? 'alquilada' : 'alquiladas'}
            </Text>
          </View>
          <View style={styles.incomeItem}>
            <View style={[styles.dot, { backgroundColor: colors.info }]} />
            <Text style={styles.incomeItemText}>
              {stats.availableProperties} {stats.availableProperties === 1 ? 'disponible' : 'disponibles'}
            </Text>
          </View>
          <View style={styles.incomeItem}>
            <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
            <Text style={styles.incomeItemText}>{stats.maintenanceProperties} en mantenimiento</Text>
          </View>
        </View>

        <Card
          style={[styles.incomeCard, stats.overdueCount > 0 && styles.moraCardActive]}
          onPress={() => openPayments({ view: 'liquidaciones', filter: 'vencido' })}
        >
          <View style={styles.moraHeader}>
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color={stats.overdueCount > 0 ? colors.danger : colors.textMuted}
            />
            <Text style={styles.incomeLabel}>Dinero en mora</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
          <Text style={[styles.incomeValue, stats.overdueCount > 0 && styles.moraValueActive]}>
            {overdue.main}
          </Text>
          {overdue.detail ? <Text style={styles.incomeDetail}>{overdue.detail}</Text> : null}
          <Text style={styles.incomeItemText}>
            {stats.overdueCount > 0
              ? `${plural(stats.overdueCount, 'liquidación vencida', 'liquidaciones vencidas')} sin pagar · tocá para ver el detalle`
              : 'No hay liquidaciones vencidas.'}
          </Text>
        </Card>

        <View style={styles.grid}>
          <StatCard
            icon="time-outline"
            label="Por vencer"
            value={pending.main}
            sublabel={[plural(stats.pendingCount, 'liquidación', 'liquidaciones'), pending.detail].filter(Boolean).join(' · ')}
            tone={colors.warning}
            onPress={() => openPayments({ view: 'liquidaciones', filter: 'pendiente' })}
          />
          <StatCard
            icon="checkmark-circle-outline"
            label="Pagado este mes"
            value={collected.main}
            sublabel={[plural(collectedCount, 'pago', 'pagos'), collected.detail].filter(Boolean).join(' · ')}
            tone={colors.success}
            onPress={() => openPayments({ view: 'pagos', month: 'este' })}
          />
        </View>

        {summaries.length ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, styles.sectionTitleInline]}>Estado por propiedad</Text>
              <SortMenu options={PROPERTY_SORT_OPTIONS} value={propertySort} onChange={setPropertySort} />
            </View>
            <View style={styles.legend}>
              <TouchableOpacity
                onPress={() => setCollectionFilter(null)}
                style={[styles.legendItem, styles.legendAll, !collectionFilter && styles.legendAllActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: !collectionFilter }}
              >
                <Text style={[styles.legendText, !collectionFilter && styles.legendAllTextActive]}>
                  Todas · {summaries.length}
                </Text>
              </TouchableOpacity>
              {COLLECTION_ORDER.map((state) => {
                const count = summaries.filter((s) => s.collection === state).length;
                if (!count) return null;
                const palette = collectionColors(colors)[state];
                const active = collectionFilter === state;
                return (
                  <TouchableOpacity
                    key={state}
                    onPress={() => setCollectionFilter(active ? null : state)}
                    style={[
                      styles.legendItem,
                      { backgroundColor: palette.chip, borderColor: active ? palette.strong : 'transparent' },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <View style={[styles.legendDot, { backgroundColor: palette.strong }]} />
                    <Text style={[styles.legendText, { color: palette.text }]}>
                      {collectionCountLabel(state, count)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {visibleSummaries.map((summary, index) => {
              const showGroup =
                propertySort === 'barrio' &&
                (index === 0 || neighborhoodOf(visibleSummaries[index - 1]) !== neighborhoodOf(summary));
              return (
                <View key={summary.property.id}>
                  {showGroup ? <Text style={styles.groupTitle}>{neighborhoodOf(summary)}</Text> : null}
                  <PropertyStatusCard
                    summary={summary}
                    onPress={() =>
                      navigation.navigate('RentalsTab', {
                        screen: 'PropertyDetail',
                        params: { propertyId: summary.property.id },
                        initial: false,
                      })
                    }
                  />
                </View>
              );
            })}
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Liquidaciones pendientes</Text>
        {upcomingCharges.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>No hay liquidaciones pendientes.</Text>
          </Card>
        ) : (
          upcomingCharges.map(({ charge, balance, status }) => {
            const contract = getContractById(charge.contractId);
            const property = getPropertyById(contract?.propertyId);
            const tenant = getTenantById(contract?.tenantId);
            return (
              <Card
                key={charge.id}
                style={styles.paymentRow}
                onPress={() =>
                  navigation.navigate('PaymentsTab', {
                    screen: 'ChargeForm',
                    params: { chargeId: charge.id },
                    initial: false,
                  })
                }
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentTitle}>{property?.title ?? 'Propiedad'}</Text>
                  <Text style={styles.paymentSubtitle}>
                    {tenant?.name ?? 'Inquilino'} · {CONCEPT_LABEL[charge.concept]} ·{' '}
                    {formatPeriod(charge.period)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <MoneyText amount={balance} currency={charge.currency} style={styles.paymentAmount} />
                  <Text
                    style={[
                      styles.paymentStatus,
                      { color: status === 'vencido' ? colors.danger : colors.warning },
                    ]}
                  >
                    {status === 'vencido' ? 'Vencida' : 'Por vencer'}
                  </Text>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const collectionColors = (
  colors: Palette,
): Record<CollectionState, { strong: string; tint: string; chip: string; text: string }> => ({
  deuda: { strong: colors.danger, tint: colors.dangerMuted, chip: colors.dangerMuted, text: colors.danger },
  'por-vencer': {
    strong: colors.warning,
    tint: colors.warningMuted,
    chip: colors.warningMuted,
    text: colors.warning,
  },
  'al-dia': { strong: colors.success, tint: colors.successMuted, chip: colors.successMuted, text: colors.success },
  'sin-contrato': { strong: colors.info, tint: colors.infoMuted, chip: colors.infoMuted, text: colors.info },
  mantenimiento: {
    strong: colors.textMuted,
    tint: colors.neutralTint,
    chip: colors.neutralMuted,
    text: colors.textMuted,
  },
});

function PropertyStatusCard({ summary, onPress }: { summary: PropertySummary; onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { property, activeContract, tenant, overdue, pending, collection, notes } = summary;
  const palette = collectionColors(colors)[collection];
  const rentAmount = activeContract?.rentAmount ?? property.rentAmount;
  const rentCurrency = activeContract?.currency ?? property.rentCurrency;
  const owed = collection === 'deuda' ? overdue.totals : collection === 'por-vencer' ? pending.totals : undefined;

  return (
    <Card
      style={[styles.propertyCard, { backgroundColor: palette.tint, borderColor: palette.strong }]}
      onPress={onPress}
    >
      <View style={styles.propertyHeader}>
        <View style={styles.propertyInfo}>
          <Text style={styles.propertyTitle} numberOfLines={1}>
            {property.title}
          </Text>
          <Text style={styles.propertyTenant} numberOfLines={1}>
            {[property.neighborhood, tenant ? tenant.name : 'Sin inquilino'].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: palette.strong }]}>
          <Text style={styles.statusPillText}>{COLLECTION_LABEL[collection]}</Text>
        </View>
      </View>
      <View style={styles.propertyFooter}>
        <Text style={[styles.propertyNotes, { color: palette.text }]}>{notes.join(' · ')}</Text>
        {owed ? (
          <Text style={styles.propertyOwed}>
            {collection === 'deuda' ? 'Debe ' : 'A cobrar '}
            {formatTotals(owed)}
          </Text>
        ) : (
          <MoneyText amount={rentAmount} currency={rentCurrency} suffix="/mes" style={styles.propertyRent} />
        )}
      </View>
    </Card>
  );
}

function StatCard({
  icon,
  label,
  value,
  sublabel,
  tone,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  sublabel?: string;
  tone: string;
  onPress?: () => void;
}) {
  const styles = useStyles();
  return (
    <Card onPress={onPress} style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${tone}1A` }]}>
        <Ionicons name={icon} size={20} color={tone} />
      </View>
      <Text
        style={[styles.statValue, value.length > 11 && styles.statValueLong]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sublabel ? <Text style={styles.statSublabel}>{sublabel}</Text> : null}
    </Card>
  );
}

const useStyles = makeStyles((colors) => ({
  content: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl * 2,
  },
  header: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
  },
  subheader: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  statSublabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  incomeCard: {
    marginBottom: spacing.md,
  },
  moraCardActive: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
  },
  moraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  moraValueActive: {
    color: colors.danger,
  },
  occupancyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  incomeLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  incomeValue: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  incomeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  incomeItemText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sectionTitleInline: {
    marginTop: 0,
    marginBottom: 0,
    flexShrink: 1,
  },
  groupTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  paymentTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  paymentSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  paymentStatus: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  welcomeCard: {
    marginBottom: spacing.md,
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  welcomeTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  welcomeText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  statValueLong: {
    fontSize: fontSize.lg,
  },
  incomeDetail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  rateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
  },
  rateCardMissing: {
    borderColor: colors.warning,
    backgroundColor: colors.warningMuted,
  },
  rateInfo: {
    flex: 1,
    minWidth: 0,
  },
  rateTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  rateMeta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.round,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  legendAll: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  legendAllActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  legendAllTextActive: {
    color: colors.onAccent,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.text,
  },
  propertyCard: {
    marginBottom: spacing.sm,
    borderWidth: 1.5,
  },
  propertyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  propertyInfo: {
    flex: 1,
    minWidth: 0,
  },
  propertyTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  propertyTenant: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.round,
  },
  statusPillText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.onAccent,
  },
  propertyFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  propertyNotes: {
    flex: 1,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  propertyOwed: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  propertyRent: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
}));
