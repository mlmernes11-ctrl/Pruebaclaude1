import { useNavigation, useRoute } from '@react-navigation/native';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { showConfirm } from '../../components/DialogHost';
import MoneyText from '../../components/MoneyText';
import Screen from '../../components/Screen';
import { CONCEPT_LABEL } from '../../constants';
import { unallocatedAmount, useData } from '../../context/DataContext';
import { colors, fontSize, spacing } from '../../theme';
import { formatDate, formatMoney, formatPeriod } from '../../utils/format';
import { smartGoBack } from '../../utils/navigation';

export default function PaymentDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { paymentId } = route.params;
  const { getPaymentById, getContractById, getPropertyById, getTenantById, charges, deletePayment } =
    useData();
  const payment = getPaymentById(paymentId);

  if (!payment) {
    return (
      <Screen>
        <Text style={styles.notFound}>Este pago ya no existe.</Text>
      </Screen>
    );
  }

  const contract = getContractById(payment.contractId);
  const property = getPropertyById(contract?.propertyId);
  const tenant = getTenantById(contract?.tenantId);
  const credit = unallocatedAmount(payment);

  const handleDelete = () => {
    showConfirm({
      title: 'Anular pago',
      message: 'Las liquidaciones que cubría este pago vuelven a figurar como deuda. ¿Continuar?',
      confirmLabel: 'Anular pago',
      destructive: true,
      onConfirm: () => {
        deletePayment(payment.id);
        smartGoBack(navigation, 'PaymentsList');
      },
    });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.title}>{property?.title ?? 'Propiedad'}</Text>
          <Text style={styles.meta}>{tenant?.name ?? 'Inquilino'}</Text>
          <View style={styles.amountRow}>
            <Text style={styles.label}>{CONCEPT_LABEL[payment.concept]}</Text>
            <MoneyText
              amount={payment.amount}
              currency={payment.currency}
              settledRate={payment.exchangeRate}
              style={styles.amount}
            />
          </View>
          <Detail label="Fecha" value={formatDate(payment.date)} />
          <Detail label="Método" value={payment.method ?? '-'} />
          {payment.notes ? <Detail label="Notas" value={payment.notes} /> : null}
        </Card>

        <Text style={styles.sectionTitle}>Liquidaciones que cubre</Text>
        <Card style={styles.card}>
          {payment.allocations.length === 0 ? (
            <Text style={styles.meta}>No se aplicó a ninguna liquidación.</Text>
          ) : (
            payment.allocations.map((allocation) => {
              const charge = charges.find((c) => c.id === allocation.chargeId);
              return (
                <View key={allocation.chargeId} style={styles.allocationRow}>
                  <Text
                    style={styles.allocationPeriod}
                    onPress={() => navigation.navigate('ChargeForm', { chargeId: allocation.chargeId })}
                  >
                    {charge ? formatPeriod(charge.period) : 'Liquidación eliminada'}
                  </Text>
                  <Text style={styles.allocationAmount}>
                    {formatMoney(allocation.amount, payment.currency)}
                  </Text>
                </View>
              );
            })
          )}
          {credit > 0 ? (
            <View style={styles.allocationRow}>
              <Text style={styles.creditText}>A favor del inquilino</Text>
              <Text style={styles.allocationAmount}>{formatMoney(credit, payment.currency)}</Text>
            </View>
          ) : null}
        </Card>

        <Button label="Anular pago" variant="danger" onPress={handleDelete} />
      </ScrollView>
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  notFound: {
    padding: spacing.lg,
    color: colors.textMuted,
  },
  card: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
  },
  meta: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  amount: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  allocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  allocationPeriod: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  allocationAmount: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  creditText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
});
