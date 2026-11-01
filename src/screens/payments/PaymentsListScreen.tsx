import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import FAB from '../../components/FAB';
import MoneyText from '../../components/MoneyText';
import Screen from '../../components/Screen';
import { CONCEPT_LABEL } from '../../constants';
import { unallocatedAmount, useData } from '../../context/DataContext';
import { colors, fontSize, radius, spacing } from '../../theme';
import { ChargeStatus } from '../../types';
import { formatDate, formatMoney, formatPeriod } from '../../utils/format';
import { CHARGE_STATUS_LABEL, CHARGE_STATUS_TONE } from '../../utils/ledger';

type View_ = 'cuotas' | 'cobros';
type FilterValue = 'todos' | ChargeStatus;

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'todos', label: 'Todas' },
  { value: 'vencido', label: 'Vencidas' },
  { value: 'pendiente', label: 'Por vencer' },
  { value: 'pagado', label: 'Pagadas' },
];

export default function PaymentsListScreen() {
  const { chargeViews, payments, charges, getContractById, getPropertyById, getTenantById } = useData();
  const navigation = useNavigation<any>();
  const [view, setView] = useState<View_>('cuotas');
  const [filter, setFilter] = useState<FilterValue>('todos');

  const sortedCharges = useMemo(
    () =>
      [...chargeViews].sort((a, b) =>
        a.charge.dueDate < b.charge.dueDate ? 1 : a.charge.dueDate > b.charge.dueDate ? -1 : 0,
      ),
    [chargeViews],
  );
  const filteredCharges =
    filter === 'todos' ? sortedCharges : sortedCharges.filter((v) => v.status === filter);
  const sortedPayments = useMemo(
    () => [...payments].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [payments],
  );

  const describeContract = (contractId: string) => {
    const contract = getContractById(contractId);
    return {
      property: getPropertyById(contract?.propertyId)?.title ?? 'Propiedad',
      tenant: getTenantById(contract?.tenantId)?.name ?? 'Inquilino',
    };
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Pagos</Text>
      </View>
      <View style={styles.segment}>
        {(['cuotas', 'cobros'] as View_[]).map((value) => (
          <TouchableOpacity
            key={value}
            style={[styles.segmentItem, view === value && styles.segmentItemActive]}
            onPress={() => setView(value)}
          >
            <Text style={[styles.segmentText, view === value && styles.segmentTextActive]}>
              {value === 'cuotas' ? 'Cuotas' : 'Cobros recibidos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {view === 'cuotas' ? (
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
            data={filteredCharges}
            keyExtractor={(item) => item.charge.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <EmptyState
                icon="calendar-outline"
                title="Sin cuotas"
                message="Las cuotas de cada contrato activo se generan solas todos los meses."
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
        <FlatList
          data={sortedPayments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, styles.listTop]}
          ListEmptyComponent={
            <EmptyState
              icon="cash-outline"
              title="Sin cobros"
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
                    {periods.length ? `Cubre: ${periods.join(', ')}` : 'Sin cuotas aplicadas'}
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
      )}
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
  listTop: {
    paddingTop: spacing.xs,
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
