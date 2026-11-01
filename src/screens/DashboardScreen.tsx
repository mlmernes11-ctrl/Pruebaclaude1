import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import { showConfirm } from '../components/DialogHost';
import MoneyText from '../components/MoneyText';
import Screen from '../components/Screen';
import { PAYMENT_CONCEPT_LABEL, PROPERTY_STATUS_LABEL } from '../constants';
import { useData } from '../context/DataContext';
import { RATE_SOURCE_LABEL, useExchangeRate } from '../context/ExchangeRateContext';
import { colors, fontSize, radius, spacing } from '../theme';
import { MoneyTotals } from '../types';
import {
  formatDateTime,
  formatMoney,
  formatPeriod,
  formatTotals,
  totalsInPesos,
} from '../utils/format';
import { getPaymentStatus } from '../utils/payments';
import {
  AttentionLevel,
  PropertySummary,
  sortByAttention,
  summarizeProperty,
} from '../utils/propertySummary';

// Mixed-currency totals are shown in pesos when there is a rate, with the breakdown underneath.
function describeTotals(totals: MoneyTotals, rate?: number) {
  const pesos = totalsInPesos(totals, rate);
  if (!totals.USD) return { main: formatMoney(totals.ARS, 'ARS'), detail: undefined };
  if (pesos === undefined) return { main: formatTotals(totals), detail: undefined };
  return { main: `≈\u00A0${formatMoney(pesos, 'ARS')}`, detail: formatTotals(totals) };
}

export default function DashboardScreen() {
  const {
    stats,
    properties,
    tenants,
    payments,
    contracts,
    getPropertyById,
    getTenantById,
    loadSampleData,
    clearAllData,
  } = useData();
  const { rate, source: rateSource, updatedAt: rateUpdatedAt } = useExchangeRate();
  const navigation = useNavigation<any>();
  const isEmpty =
    properties.length === 0 && tenants.length === 0 && contracts.length === 0 && payments.length === 0;

  const income = describeTotals(stats.monthlyExpectedIncome, rate);
  const pending = describeTotals(stats.pendingAmount, rate);
  const overdue = describeTotals(stats.overdueAmount, rate);
  const summaries = sortByAttention(
    properties.map((p) => summarizeProperty(p, contracts, payments, tenants)),
  );

  const upcomingPayments = payments
    .filter((p) => getPaymentStatus(p) !== 'pagado')
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
    .slice(0, 5);

  const handleLoadSamples = () => {
    if (isEmpty) {
      loadSampleData();
      return;
    }
    showConfirm({
      title: 'Cargar datos de ejemplo',
      message: 'Esto reemplaza todo lo que tenés cargado por datos de ejemplo. ¿Continuar?',
      confirmLabel: 'Reemplazar',
      destructive: true,
      onConfirm: loadSampleData,
    });
  };

  const handleClearAll = () => {
    showConfirm({
      title: 'Borrar todo',
      message: 'Se eliminan todas las propiedades, inquilinos, contratos y pagos. No se puede deshacer.',
      confirmLabel: 'Borrar todo',
      destructive: true,
      onConfirm: clearAllData,
    });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Resumen</Text>
        <Text style={styles.subheader}>Vista general de tu cartera de alquileres</Text>

        {isEmpty ? (
          <Card style={styles.welcomeCard}>
            <Text style={styles.welcomeTitle}>¿Querés probar la app rápido?</Text>
            <Text style={styles.welcomeText}>
              Cargá 5 propiedades, 4 inquilinos, contratos y pagos de ejemplo para recorrer todas las
              pantallas sin cargar nada a mano.
            </Text>
            <Button label="Cargar datos de ejemplo" onPress={handleLoadSamples} />
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
            onPress={() => navigation.navigate('PropertiesTab')}
          />
          <StatCard
            icon="document-text-outline"
            label="Contratos activos"
            value={String(stats.activeContracts)}
            tone={colors.success}
            onPress={() => navigation.navigate('ContractsTab')}
          />
        </View>

        <Card style={styles.incomeCard}>
          <Text style={styles.incomeLabel}>Ingreso mensual esperado</Text>
          <Text style={styles.incomeValue}>{income.main}</Text>
          {income.detail ? <Text style={styles.incomeDetail}>{income.detail}</Text> : null}
          <View style={styles.incomeRow}>
            <View style={styles.incomeItem}>
              <View style={[styles.dot, { backgroundColor: colors.success }]} />
              <Text style={styles.incomeItemText}>
                {stats.rentedProperties} alquiladas
              </Text>
            </View>
            <View style={styles.incomeItem}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <Text style={styles.incomeItemText}>
                {stats.availableProperties} disponibles
              </Text>
            </View>
            <View style={styles.incomeItem}>
              <View style={[styles.dot, { backgroundColor: colors.warning }]} />
              <Text style={styles.incomeItemText}>
                {stats.maintenanceProperties} en mantenimiento
              </Text>
            </View>
          </View>
        </Card>

        <View style={styles.grid}>
          <StatCard
            icon="time-outline"
            label="Pagos por vencer"
            value={pending.main}
            sublabel={[`${stats.pendingCount} pagos`, pending.detail].filter(Boolean).join(' · ')}
            tone={colors.warning}
            onPress={() => navigation.navigate('PaymentsTab')}
          />
          <StatCard
            icon="alert-circle-outline"
            label="Pagos vencidos"
            value={overdue.main}
            sublabel={[`${stats.overdueCount} pagos`, overdue.detail].filter(Boolean).join(' · ')}
            tone={colors.danger}
            onPress={() => navigation.navigate('PaymentsTab')}
          />
        </View>

        {summaries.length ? (
          <>
            <Text style={styles.sectionTitle}>Estado por propiedad</Text>
            {summaries.map((summary) => (
              <PropertyStatusCard
                key={summary.property.id}
                summary={summary}
                onPress={() =>
                  navigation.navigate('PropertiesTab', {
                    screen: 'PropertyDetail',
                    params: { propertyId: summary.property.id },
                    initial: false,
                  })
                }
              />
            ))}
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Próximos cobros</Text>
        {upcomingPayments.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>No hay pagos pendientes registrados.</Text>
          </Card>
        ) : (
          upcomingPayments.map((payment) => {
            const contract = contracts.find((c) => c.id === payment.contractId);
            const property = getPropertyById(contract?.propertyId);
            const tenant = getTenantById(contract?.tenantId);
            const status = getPaymentStatus(payment);
            return (
              <Card key={payment.id} style={styles.paymentRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentTitle}>{property?.title ?? 'Propiedad'}</Text>
                  <Text style={styles.paymentSubtitle}>
                    {tenant?.name ?? 'Inquilino'} · {PAYMENT_CONCEPT_LABEL[payment.concept]} ·{' '}
                    {formatPeriod(payment.period)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <MoneyText amount={payment.amount} currency={payment.currency} style={styles.paymentAmount} />
                  <Text
                    style={[
                      styles.paymentStatus,
                      { color: status === 'vencido' ? colors.danger : colors.warning },
                    ]}
                  >
                    {status === 'vencido' ? 'Vencido' : 'Por vencer'}
                  </Text>
                </View>
              </Card>
            );
          })
        )}

        <Text style={styles.sectionTitle}>Datos de prueba</Text>
        <Card>
          <Text style={styles.testDataText}>
            Los datos se guardan solo en este dispositivo. Podés cargar ejemplos o empezar de cero.
          </Text>
          <View style={styles.testDataActions}>
            <Button
              label="Cargar ejemplos"
              variant="secondary"
              onPress={handleLoadSamples}
              style={styles.testDataButton}
            />
            <Button
              label="Borrar todo"
              variant="secondary"
              onPress={handleClearAll}
              disabled={isEmpty}
              style={styles.testDataButton}
            />
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const LEVEL_COLOR: Record<AttentionLevel, string> = {
  danger: colors.danger,
  warning: colors.warning,
  ok: colors.success,
  idle: colors.textMuted,
};

function PropertyStatusCard({ summary, onPress }: { summary: PropertySummary; onPress: () => void }) {
  const { property, activeContract, tenant, overdue, level, alerts } = summary;
  const rentAmount = activeContract?.rentAmount ?? property.rentAmount;
  const rentCurrency = activeContract?.currency ?? property.rentCurrency;
  const levelColor = LEVEL_COLOR[level];

  return (
    <Card style={styles.propertyCard} onPress={onPress}>
      <View style={styles.propertyHeader}>
        <View style={[styles.levelDot, { backgroundColor: levelColor }]} />
        <View style={styles.propertyInfo}>
          <Text style={styles.propertyTitle} numberOfLines={1}>
            {property.title}
          </Text>
          <Text style={styles.propertyTenant} numberOfLines={1}>
            {tenant ? tenant.name : PROPERTY_STATUS_LABEL[property.status]}
          </Text>
        </View>
        <MoneyText amount={rentAmount} currency={rentCurrency} suffix="/mes" style={styles.propertyRent} />
      </View>
      <Text style={[styles.propertyAlerts, { color: levelColor }]}>{alerts.join(' · ')}</Text>
      {overdue.count ? (
        <Text style={styles.propertyDebt}>Adeuda {formatTotals(overdue.totals)}</Text>
      ) : null}
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

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
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
  incomeLabel: {
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
  incomeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
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
  testDataText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  testDataActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  testDataButton: {
    flex: 1,
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
  propertyCard: {
    marginBottom: spacing.sm,
  },
  propertyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  levelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
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
  propertyRent: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  propertyAlerts: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginTop: spacing.sm,
    marginLeft: 18,
  },
  propertyDebt: {
    fontSize: fontSize.xs,
    color: colors.text,
    marginTop: 2,
    marginLeft: 18,
  },
});
