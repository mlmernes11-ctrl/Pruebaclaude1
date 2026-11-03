// =====================================================================
// Pantalla: Detalle de un pago
// ---------------------------------------------------------------------
// Monto, a qué liquidaciones se aplicó, lo que quedó a favor y la opción de anularlo.
// =====================================================================

import { useNavigation, useRoute } from '@react-navigation/native';
import React from 'react';
import { ScrollView, Text } from 'react-native';
import { showConfirm } from '../../components/DialogHost';
import ListRow from '../../components/ListRow';
import ListSection from '../../components/ListSection';
import Screen from '../../components/Screen';
import StatusHero from '../../components/StatusHero';
import { CONCEPT_LABEL } from '../../constants';
import { useData } from '../../context/DataContext';
import { makeStyles } from '../../context/ThemeContext';
import { spacing } from '../../theme';
import { formatDate, formatMoney, formatPeriodShort } from '../../utils/format';
import { unallocatedAmount } from '../../utils/ledger';
import { smartGoBack } from '../../utils/navigation';

// ── Pantalla ──────────────────────────────────────────────────────────

export default function PaymentDetailScreen() {
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { paymentId } = route.params;
  const { getPaymentById, getContractById, getPropertyById, getTenantById, charges, payments, deletePayment } = useData();
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
  const sameReceipt = payment.receiptId
    ? payments.filter((p) => p.receiptId === payment.receiptId && p.id !== payment.id)
    : [];

  const handleDelete = () => {
    showConfirm({
      title: 'Anular pago',
      message: sameReceipt.length
        ? `Se anula solo ${CONCEPT_LABEL[payment.concept].toLowerCase()}; lo demás del recibo queda registrado. Las liquidaciones que cubría vuelven a figurar como deuda. ¿Continuar?`
        : 'Las liquidaciones que cubría este pago vuelven a figurar como deuda. ¿Continuar?',
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
        <StatusHero
          label={`${CONCEPT_LABEL[payment.concept]} · ${formatDate(payment.date)}`}
          value={formatMoney(payment.amount, payment.currency)}
          detail={
            payment.currency === 'USD' && payment.exchangeRate
              ? `= ${formatMoney(payment.amount * payment.exchangeRate, 'ARS')} a ${formatMoney(payment.exchangeRate, 'ARS')}`
              : undefined
          }
          style={styles.hero}
        />

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

        {sameReceipt.length ? (
          <ListSection header="En el mismo recibo">
            {sameReceipt.map((p) => (
              <ListRow
                key={p.id}
                title={CONCEPT_LABEL[p.concept]}
                value={formatMoney(p.amount, p.currency)}
                valueTone="muted"
                onPress={() => navigation.push('PaymentDetail', { paymentId: p.id })}
              />
            ))}
          </ListSection>
        ) : null}

        <ListSection>
          <ListRow title="Anular pago" destructive onPress={handleDelete} />
        </ListSection>
      </ScrollView>
    </Screen>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

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
    marginBottom: spacing.xl,
  },
}));
