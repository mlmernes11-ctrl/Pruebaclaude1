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
import { RATE_SOURCE_LABEL } from '../../context/ExchangeRateContext';
import { makeStyles } from '../../context/ThemeContext';
import { spacing } from '../../theme';
import { formatDate, formatMoney, formatPeriodShort } from '../../utils/format';
import { isOutstanding, unallocatedAmount } from '../../utils/ledger';
import { smartGoBack } from '../../utils/navigation';
import { openWhatsapp, receiptText } from '../../utils/whatsapp';

// ── Pantalla ──────────────────────────────────────────────────────────

export default function PaymentDetailScreen() {
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { paymentId } = route.params;
  const {
    getPaymentById, getContractById, getPropertyById, getTenantById, charges, payments, deletePayment,
    chargeViewsForContract,
  } = useData();
  const payment = getPaymentById(paymentId);

  if (!payment) {
    return (
      <Screen narrow>
        <Text style={styles.notFound}>Este cobro ya no existe.</Text>
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
      title: '¿Eliminar cobro?',
      message: 'La deuda que cubría vuelve a quedar pendiente. Es una acción permanente e irreversible.',
      confirmLabel: 'Eliminar',
      destructive: true,
      onConfirm: () => {
        deletePayment(payment.id);
        smartGoBack(navigation, 'PaymentsList');
      },
    });
  };

  return (
    <Screen narrow>
      <ScrollView contentContainerStyle={styles.content}>
        <StatusHero
          label={`${CONCEPT_LABEL[payment.concept]} · ${formatDate(payment.date)}`}
          value={formatMoney(payment.amount, payment.currency)}
          detail={
            payment.paidAmount && payment.paidCurrency && payment.exchangeRate
              ? `Pagó ${formatMoney(payment.paidAmount, payment.paidCurrency)} en pesos · ${
                  payment.rateSource ? RATE_SOURCE_LABEL[payment.rateSource] : 'cotización'
                } ${formatMoney(payment.exchangeRate, 'ARS')}`
              : payment.currency === 'USD' && payment.exchangeRate
                ? `= ${formatMoney(payment.amount * payment.exchangeRate, 'ARS')} a ${formatMoney(payment.exchangeRate, 'ARS')}`
                : undefined
          }
          style={styles.hero}
        />

        <ListSection footer={payment.notes ? `Notas: ${payment.notes}` : undefined}>
          <ListRow title="Propiedad" value={property?.title ?? 'Propiedad'} valueTone="muted" />
          <ListRow title="Inquilino" value={tenant?.name ?? 'Inquilino'} valueTone="muted" />
          <ListRow title="Medio de pago" value={payment.method ?? '-'} valueTone="muted" />
        </ListSection>

        <ListSection header="Se aplicó a">
          {payment.allocations.length === 0 ? <ListRow title="No se aplicó a ningún cargo" /> : null}
          {payment.allocations.map((allocation) => {
            const charge = charges.find((c) => c.id === allocation.chargeId);
            return (
              <ListRow
                key={allocation.chargeId}
                title={charge ? `${CONCEPT_LABEL[charge.concept]} ${formatPeriodShort(charge.period)}` : 'Cargo eliminado'}
                value={formatMoney(allocation.amount, payment.currency)}
                valueTone="muted"
                onPress={charge ? () => navigation.navigate('ChargeForm', { chargeId: allocation.chargeId }) : undefined}
              />
            );
          })}
          {credit > 0 ? (
            <ListRow title="Saldo a favor" value={formatMoney(credit, payment.currency)} valueTone="primary" />
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
          <ListRow
            title="Enviar recibo por WhatsApp"
            icon="logo-whatsapp"
            onPress={() =>
              openWhatsapp(
                tenant?.phone,
                receiptText(
                  [payment, ...sameReceipt],
                  tenant,
                  property,
                  (chargeId) => charges.find((c) => c.id === chargeId)?.period,
                  contract ? chargeViewsForContract(contract.id).filter(isOutstanding) : [],
                ),
              )
            }
          />
        </ListSection>

        <ListSection>
          <ListRow title="Eliminar cobro" destructive onPress={handleDelete} />
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
