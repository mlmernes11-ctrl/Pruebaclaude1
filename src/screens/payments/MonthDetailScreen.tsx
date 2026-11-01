import { useNavigation, useRoute } from '@react-navigation/native';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import MoneyText from '../../components/MoneyText';
import Screen from '../../components/Screen';
import { CONCEPT_LABEL } from '../../constants';
import { useData } from '../../context/DataContext';
import { useExchangeRate } from '../../context/ExchangeRateContext';
import { colors, fontSize, spacing } from '../../theme';
import { MoneyTotals } from '../../types';
import { describeTotals, formatDate, formatMoney } from '../../utils/format';
import { buildPeriodRow } from '../../utils/history';
import { CHARGE_STATUS_LABEL, CHARGE_STATUS_TONE } from '../../utils/ledger';

export default function MonthDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { period, propertyId } = route.params as { period: string; propertyId?: string };
  const { chargeViews, contracts, getContractById, getPropertyById, getTenantById } = useData();
  const { rate, toPesos } = useExchangeRate();

  const property = getPropertyById(propertyId);
  const contractIds = propertyId
    ? new Set(contracts.filter((c) => c.propertyId === propertyId).map((c) => c.id))
    : undefined;
  const views = chargeViews
    .filter((v) => v.charge.period === period && (!contractIds || contractIds.has(v.charge.contractId)))
    .map((view) => {
      const contract = getContractById(view.charge.contractId);
      return {
        view,
        propertyTitle: getPropertyById(contract?.propertyId)?.title ?? 'Propiedad',
        tenantName: getTenantById(contract?.tenantId)?.name ?? 'Inquilino',
      };
    })
    .sort((a, b) => a.propertyTitle.localeCompare(b.propertyTitle, 'es', { numeric: true, sensitivity: 'base' }));
  const row = buildPeriodRow(
    views.map((v) => v.view),
    period,
    toPesos,
  );
  const unpaid: MoneyTotals = {
    USD: row.overdue.USD + row.pending.USD,
    ARS: row.overdue.ARS + row.pending.ARS,
  };

  return (
    <Screen>
      <FlatList
        data={views}
        keyExtractor={(item) => item.view.charge.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <Text style={styles.subtitle}>
              {property ? property.title : 'Todas las propiedades'} · {views.length}{' '}
              {views.length === 1 ? 'liquidación' : 'liquidaciones'}
            </Text>
            <Card style={styles.summary}>
              <SummaryLine label="Liquidado" text={describeTotals(row.billed, rate).main} strong />
              <SummaryLine label="Pagado" text={describeTotals(row.paid, rate).main} />
              <SummaryLine label="Sin pagar" text={describeTotals(unpaid, rate).main} />
            </Card>
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon="calendar-outline" title="Sin liquidaciones" message="No hay liquidaciones en este mes." />
        }
        renderItem={({ item }) => {
          const { view, propertyTitle, tenantName } = item;
          const { charge, status, paid, balance, lastPaymentDate } = view;
          return (
            <Card
              style={styles.card}
              onPress={() =>
                navigation.navigate('PaymentsTab', {
                  screen: 'ChargeForm',
                  params: { chargeId: charge.id },
                  initial: false,
                })
              }
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {propertyTitle}
                </Text>
                <Badge label={CHARGE_STATUS_LABEL[status]} tone={CHARGE_STATUS_TONE[status]} />
              </View>
              <Text style={styles.meta}>
                {tenantName} · {CONCEPT_LABEL[charge.concept]}
              </Text>
              <View style={styles.footer}>
                <Text style={styles.meta}>
                  {status === 'pagado' && lastPaymentDate
                    ? `Pagada el ${formatDate(lastPaymentDate)}`
                    : paid > 0
                      ? `Pagó ${formatMoney(paid, charge.currency)} de ${formatMoney(charge.amount, charge.currency)}`
                      : `Vence el ${formatDate(charge.dueDate)}`}
                </Text>
                <MoneyText
                  amount={status === 'pagado' ? charge.amount : balance}
                  currency={charge.currency}
                  style={styles.amount}
                />
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}

function SummaryLine({ label, text, strong }: { label: string; text: string; strong?: boolean }) {
  return (
    <View style={styles.summaryLine}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.summaryStrong]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  subtitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  summary: {
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  summaryStrong: {
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  card: {
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
    flexShrink: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  amount: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
});
