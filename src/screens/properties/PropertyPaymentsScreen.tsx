import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import MoneyText from '../../components/MoneyText';
import OptionChips from '../../components/OptionChips';
import Screen from '../../components/Screen';
import YearHistory from '../../components/YearHistory';
import { CONCEPT_LABEL } from '../../constants';
import { useData } from '../../context/DataContext';
import { colors, fontSize, spacing } from '../../theme';
import { ChargeStatus } from '../../types';
import { formatDate, formatMoney, formatPeriod } from '../../utils/format';
import { CHARGE_STATUS_LABEL, CHARGE_STATUS_TONE } from '../../utils/ledger';

type FilterValue = 'todos' | ChargeStatus;

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'todos', label: 'Todas' },
  { value: 'vencido', label: 'Vencidas' },
  { value: 'pendiente', label: 'Por vencer' },
  { value: 'pagado', label: 'Pagadas' },
];

export default function PropertyPaymentsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { propertyId } = route.params;
  const { getPropertyById, chargeViewsForProperty, getContractById, getTenantById } = useData();
  const [filter, setFilter] = useState<FilterValue>('todos');
  const [year, setYear] = useState(() => new Date().getFullYear());
  const property = getPropertyById(propertyId);

  const views = chargeViewsForProperty(propertyId);
  const rows = views.filter(
    (view) => view.charge.period.startsWith(`${year}-`) && (filter === 'todos' || view.status === filter),
  );

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(view) => view.charge.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>{property?.title ?? 'Propiedad'}</Text>
            <Text style={styles.subtitle}>Liquidaciones y pagos de todos sus contratos</Text>
            <YearHistory
              views={views}
              year={year}
              onChangeYear={setYear}
              onPressMonth={(period) => navigation.navigate('MonthDetail', { period, propertyId })}
            />
            <Text style={styles.sectionTitle}>Liquidaciones de {year}</Text>
            <OptionChips label="Mostrar" options={FILTERS} value={filter} onChange={setFilter} />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="Sin liquidaciones"
            message={
              filter === 'todos'
                ? `No hay liquidaciones de esta propiedad en ${year}.`
                : 'No hay liquidaciones con este estado.'
            }
          />
        }
        renderItem={({ item }) => {
          const { charge, status, paid, balance, lastPaymentDate, lastMethod } = item;
          const tenant = getTenantById(getContractById(charge.contractId)?.tenantId);
          let detail = `Vence el ${formatDate(charge.dueDate)}`;
          if (status === 'pagado' && lastPaymentDate) {
            detail = `Pagada el ${formatDate(lastPaymentDate)}${lastMethod ? ` · ${lastMethod}` : ''}`;
          } else if (paid > 0) {
            detail = `Pagó ${formatMoney(paid, charge.currency)} · vence el ${formatDate(charge.dueDate)}`;
          }
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
              <View style={styles.row}>
                <View style={styles.info}>
                  <Text style={styles.period}>
                    {formatPeriod(charge.period)} · {CONCEPT_LABEL[charge.concept]}
                  </Text>
                  <Text style={styles.meta}>{tenant?.name ?? 'Inquilino'}</Text>
                  <Text style={styles.meta}>{detail}</Text>
                </View>
                <View style={styles.amountColumn}>
                  <MoneyText
                    amount={status === 'pagado' ? charge.amount : balance}
                    currency={charge.currency}
                    style={styles.amount}
                  />
                  <View style={styles.badge}>
                    <Badge label={CHARGE_STATUS_LABEL[status]} tone={CHARGE_STATUS_TONE[status]} />
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
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
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
