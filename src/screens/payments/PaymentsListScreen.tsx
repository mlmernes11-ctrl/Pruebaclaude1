import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import FAB from '../../components/FAB';
import Screen from '../../components/Screen';
import { PAYMENT_CONCEPT_LABEL } from '../../constants';
import { useData } from '../../context/DataContext';
import { colors, fontSize, radius, spacing } from '../../theme';
import { formatCurrency, formatDate, formatPeriod } from '../../utils/format';
import { getPaymentStatus, PAYMENT_STATUS_LABEL } from '../../utils/payments';
import { PaymentStatus } from '../../types';

const PAYMENT_TONE = {
  pagado: 'success',
  pendiente: 'warning',
  vencido: 'danger',
} as const;

type FilterValue = 'todos' | PaymentStatus;

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'vencido', label: 'Vencidos' },
  { value: 'pagado', label: 'Pagados' },
];

export default function PaymentsListScreen() {
  const { payments, contracts, getPropertyById, getTenantById } = useData();
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState<FilterValue>('todos');

  const enriched = useMemo(
    () =>
      payments
        .map((payment) => ({ payment, status: getPaymentStatus(payment) }))
        .sort((a, b) => (a.payment.dueDate < b.payment.dueDate ? 1 : -1)),
    [payments],
  );

  const filtered =
    filter === 'todos' ? enriched : enriched.filter((item) => item.status === filter);

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Pagos</Text>
      </View>
      <View style={styles.filterRow}>
        {FILTERS.map((item) => {
          const active = item.value === filter;
          return (
            <TouchableOpacity
              key={item.value}
              onPress={() => setFilter(item.value)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.payment.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="cash-outline"
            title="Sin pagos"
            message="Los pagos que registres para tus contratos aparecerán aquí."
          />
        }
        renderItem={({ item }) => {
          const contract = contracts.find((c) => c.id === item.payment.contractId);
          const property = getPropertyById(contract?.propertyId);
          const tenant = getTenantById(contract?.tenantId);
          return (
            <Card
              style={styles.card}
              onPress={() => navigation.navigate('PaymentForm', { paymentId: item.payment.id })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {property?.title ?? 'Propiedad'}
                </Text>
                <Badge label={PAYMENT_STATUS_LABEL[item.status]} tone={PAYMENT_TONE[item.status]} />
              </View>
              <Text style={styles.tenantText}>
                {tenant?.name ?? 'Inquilino'} · {PAYMENT_CONCEPT_LABEL[item.payment.concept]}
              </Text>
              <View style={styles.footerRow}>
                <View>
                  <Text style={styles.periodText}>{formatPeriod(item.payment.period)}</Text>
                  <Text style={styles.dueText}>Vence: {formatDate(item.payment.dueDate)}</Text>
                </View>
                <Text style={styles.amountText}>{formatCurrency(item.payment.amount)}</Text>
              </View>
            </Card>
          );
        }}
      />
      <FAB onPress={() => navigation.navigate('PaymentForm')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
  },
  filterRow: {
    flexDirection: 'row',
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
    paddingBottom: spacing.xxl * 2,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  tenantText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  periodText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  dueText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  amountText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
});
