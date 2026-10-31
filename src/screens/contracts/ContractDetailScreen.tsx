import { useNavigation, useRoute } from '@react-navigation/native';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Screen from '../../components/Screen';
import { CONTRACT_STATUS_LABEL, PAYMENT_CONCEPT_LABEL } from '../../constants';
import { useData } from '../../context/DataContext';
import { colors, fontSize, spacing } from '../../theme';
import {
  addMonthsToPeriod,
  currentPeriod,
  formatCurrency,
  formatDate,
  formatPeriod,
  periodToDueDate,
} from '../../utils/format';
import { smartGoBack } from '../../utils/navigation';
import { getPaymentStatus, PAYMENT_STATUS_LABEL } from '../../utils/payments';

const CONTRACT_TONE = {
  activo: 'success',
  finalizado: 'neutral',
  cancelado: 'danger',
} as const;

const PAYMENT_TONE = {
  pagado: 'success',
  pendiente: 'warning',
  vencido: 'danger',
} as const;

export default function ContractDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { contractId } = route.params;
  const {
    getContractById,
    deleteContract,
    getPropertyById,
    getTenantById,
    paymentsForContract,
  } = useData();
  const contract = getContractById(contractId);

  if (!contract) {
    return (
      <Screen>
        <Text style={styles.notFound}>Contrato no encontrado.</Text>
      </Screen>
    );
  }

  const property = getPropertyById(contract.propertyId);
  const tenant = getTenantById(contract.tenantId);
  const payments = paymentsForContract(contract.id);

  const handleDelete = () => {
    Alert.alert(
      'Eliminar contrato',
      'Esto también eliminará los pagos asociados al contrato. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteContract(contract.id);
            smartGoBack(navigation, 'ContractsList');
          },
        },
      ],
    );
  };

  const handleAddPayment = () => {
    const lastPeriod = payments
      .filter((p) => p.concept === 'alquiler')
      .reduce<string | undefined>((max, p) => {
        if (!max || p.period > max) return p.period;
        return max;
      }, undefined);
    const nextPeriod = lastPeriod ? addMonthsToPeriod(lastPeriod, 1) : currentPeriod();
    const dueDate = periodToDueDate(nextPeriod, contract.paymentDay);

    navigation.navigate('PaymentsTab', {
      screen: 'PaymentForm',
      params: {
        contractId: contract.id,
        initialPeriod: nextPeriod,
        initialDueDate: dueDate,
        initialAmount: String(contract.rentAmount),
      },
    });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{property?.title ?? 'Propiedad'}</Text>
          <Badge label={CONTRACT_STATUS_LABEL[contract.status]} tone={CONTRACT_TONE[contract.status]} />
        </View>
        <Text style={styles.tenantText}>{tenant?.name ?? 'Inquilino'}</Text>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Detalles del contrato</Text>
          <DetailRow label="Inicio" value={formatDate(contract.startDate)} />
          <DetailRow label="Fin" value={formatDate(contract.endDate)} />
          <DetailRow label="Alquiler mensual" value={formatCurrency(contract.rentAmount)} />
          {contract.depositAmount ? (
            <DetailRow label="Depósito" value={formatCurrency(contract.depositAmount)} />
          ) : null}
          <DetailRow label="Día de pago" value={`Día ${contract.paymentDay} de cada mes`} />
          {contract.notes ? <DetailRow label="Notas" value={contract.notes} /> : null}
        </Card>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Pagos</Text>
          <Button label="+ Agregar pago" variant="ghost" onPress={handleAddPayment} />
        </View>
        {payments.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>Todavía no hay pagos registrados.</Text>
          </Card>
        ) : (
          payments.map((payment) => {
            const status = getPaymentStatus(payment);
            return (
              <Card
                key={payment.id}
                style={styles.paymentCard}
                onPress={() =>
                  navigation.navigate('PaymentsTab', {
                    screen: 'PaymentForm',
                    params: { paymentId: payment.id },
                  })
                }
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentPeriod}>
                    {formatPeriod(payment.period)} · {PAYMENT_CONCEPT_LABEL[payment.concept]}
                  </Text>
                  <Text style={styles.paymentDue}>Vence: {formatDate(payment.dueDate)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
                  <Badge label={PAYMENT_STATUS_LABEL[status]} tone={PAYMENT_TONE[status]} />
                </View>
              </Card>
            );
          })
        )}

        <View style={styles.actionsRow}>
          <Button
            label="Editar"
            variant="secondary"
            style={styles.actionButton}
            onPress={() => navigation.navigate('ContractForm', { contractId: contract.id })}
          />
          <Button label="Eliminar" variant="danger" style={styles.actionButton} onPress={handleDelete} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  tenantText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
  },
  emptyText: {
    color: colors.textMuted,
  },
  paymentCard: {
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentPeriod: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  paymentDue: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
});
