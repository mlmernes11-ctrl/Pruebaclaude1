import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import MoneyText from '../../components/MoneyText';
import OptionChips from '../../components/OptionChips';
import Screen from '../../components/Screen';
import { PAYMENT_CONCEPT_LABEL } from '../../constants';
import { useData } from '../../context/DataContext';
import { colors, fontSize, spacing } from '../../theme';
import { PaymentStatus } from '../../types';
import { formatDate, formatPeriod } from '../../utils/format';
import { getPaymentStatus, PAYMENT_STATUS_LABEL } from '../../utils/payments';

const PAYMENT_TONE = {
  pagado: 'success',
  pendiente: 'warning',
  vencido: 'danger',
} as const;

type FilterValue = 'todos' | PaymentStatus;

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'vencido', label: 'Vencidos' },
  { value: 'pendiente', label: 'Por vencer' },
  { value: 'pagado', label: 'Pagados' },
];

export default function PropertyPaymentsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { propertyId } = route.params;
  const { getPropertyById, paymentsForProperty, getContractById, getTenantById } = useData();
  const [filter, setFilter] = useState<FilterValue>('todos');
  const property = getPropertyById(propertyId);

  const rows = paymentsForProperty(propertyId)
    .map((payment) => ({ payment, status: getPaymentStatus(payment) }))
    .filter((row) => filter === 'todos' || row.status === filter);

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.payment.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>{property?.title ?? 'Propiedad'}</Text>
            <Text style={styles.subtitle}>Historial de pagos de todos sus contratos</Text>
            <OptionChips label="Mostrar" options={FILTERS} value={filter} onChange={setFilter} />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="Sin pagos"
            message={
              filter === 'todos'
                ? 'Todavía no hay pagos registrados para esta propiedad.'
                : 'No hay pagos con este estado.'
            }
          />
        }
        renderItem={({ item }) => {
          const { payment, status } = item;
          const tenant = getTenantById(getContractById(payment.contractId)?.tenantId);
          return (
            <Card
              style={styles.card}
              onPress={() =>
                navigation.navigate('PaymentsTab', {
                  screen: 'PaymentForm',
                  params: { paymentId: payment.id },
                })
              }
            >
              <View style={styles.row}>
                <View style={styles.info}>
                  <Text style={styles.period}>
                    {formatPeriod(payment.period)} · {PAYMENT_CONCEPT_LABEL[payment.concept]}
                  </Text>
                  <Text style={styles.meta}>{tenant?.name ?? 'Inquilino'}</Text>
                  <Text style={styles.meta}>
                    {payment.paidDate
                      ? `Pagado el ${formatDate(payment.paidDate)}${payment.method ? ` · ${payment.method}` : ''}`
                      : `Vence el ${formatDate(payment.dueDate)}`}
                  </Text>
                </View>
                <View style={styles.amountColumn}>
                  <MoneyText
                    amount={payment.amount}
                    currency={payment.currency}
                    settledRate={payment.paidDate ? payment.exchangeRate : undefined}
                    style={styles.amount}
                  />
                  <View style={styles.badge}>
                    <Badge label={PAYMENT_STATUS_LABEL[status]} tone={PAYMENT_TONE[status]} />
                  </View>
                </View>
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  period: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  amountColumn: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  badge: {
    marginTop: spacing.xs,
  },
});
