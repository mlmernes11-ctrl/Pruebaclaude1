import { useNavigation, useRoute } from '@react-navigation/native';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { showConfirm } from '../../components/DialogHost';
import ListRow from '../../components/ListRow';
import ListSection from '../../components/ListSection';
import Screen from '../../components/Screen';
import { CONCEPT_LABEL } from '../../constants';
import { useData } from '../../context/DataContext';
import { makeStyles } from '../../context/ThemeContext';
import { fontSize, radius, spacing } from '../../theme';
import { formatDate, formatMoney, formatPeriodShort } from '../../utils/format';
import { unallocatedAmount } from '../../utils/ledger';
import { smartGoBack } from '../../utils/navigation';

export default function PaymentDetailScreen() {
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { paymentId } = route.params;
  const { getPaymentById, getContractById, getPropertyById, getTenantById, charges, deletePayment } = useData();
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
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>
            {CONCEPT_LABEL[payment.concept]} · {formatDate(payment.date)}
          </Text>
          <Text style={styles.heroValue}>{formatMoney(payment.amount, payment.currency)}</Text>
          {payment.currency === 'USD' && payment.exchangeRate ? (
            <Text style={styles.heroDetail}>
              = {formatMoney(payment.amount * payment.exchangeRate, 'ARS')} a {formatMoney(payment.exchangeRate, 'ARS')}
            </Text>
          ) : null}
        </View>

        <ListSection footer={payment.notes ? `Notas: ${payment.notes}` : undefined}>
          <ListRow title="Propiedad" value={property?.title ?? 'Propiedad'} valueTone="muted" />
          <ListRow title="Inquilino" value={tenant?.name ?? 'Inquilino'} valueTone="muted" />
          <ListRow title="Método" value={payment.method ?? '-'} valueTone="muted" />
        </ListSection>

        <ListSection header="Liquidaciones que cubre">
          {payment.allocations.length === 0 ? <ListRow title="No se aplicó a ninguna liquidación" /> : null}
          {payment.allocations.map((allocation) => {
            const charge = charges.find((c) => c.id === allocation.chargeId);
            return (
              <ListRow
                key={allocation.chargeId}
                title={charge ? `${CONCEPT_LABEL[charge.concept]} ${formatPeriodShort(charge.period)}` : 'Liquidación eliminada'}
                value={formatMoney(allocation.amount, payment.currency)}
                valueTone="muted"
                onPress={charge ? () => navigation.navigate('ChargeForm', { chargeId: allocation.chargeId }) : undefined}
              />
            );
          })}
          {credit > 0 ? (
            <ListRow title="A favor del inquilino" value={formatMoney(credit, payment.currency)} valueTone="primary" />
          ) : null}
        </ListSection>

        <ListSection>
          <ListRow title="Anular pago" destructive onPress={handleDelete} />
        </ListSection>
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  notFound: {
    padding: spacing.lg,
    color: colors.textMuted,
  },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl - 4,
    marginBottom: spacing.xl,
  },
  heroLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroValue: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.8,
    color: colors.text,
    marginTop: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  heroDetail: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
}));
