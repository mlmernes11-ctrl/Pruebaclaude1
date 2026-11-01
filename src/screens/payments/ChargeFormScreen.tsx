import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Card from '../../components/Card';
import DateField, { MonthField } from '../../components/DateField';
import { showAlert, showConfirm } from '../../components/DialogHost';
import FormField from '../../components/FormField';
import MoneyText from '../../components/MoneyText';
import OptionChips from '../../components/OptionChips';
import Screen from '../../components/Screen';
import SelectField from '../../components/SelectField';
import { CONCEPT_LABEL, CONCEPT_OPTIONS, CURRENCY_OPTIONS } from '../../constants';
import { useData } from '../../context/DataContext';
import { colors, fontSize, spacing } from '../../theme';
import { ChargeConcept, Currency } from '../../types';
import { expectedCharge } from '../../utils/chargeGeneration';
import {
  CURRENCY_SYMBOL,
  currentPeriod,
  formatDate,
  formatMoney,
  formatPeriod,
  periodToDueDate,
} from '../../utils/format';
import { CHARGE_STATUS_LABEL, CHARGE_STATUS_TONE } from '../../utils/ledger';
import { smartGoBack } from '../../utils/navigation';

export default function ChargeFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const chargeId = route.params?.chargeId as string | undefined;
  const presetContractId = route.params?.contractId as string | undefined;

  const {
    contracts,
    getChargeView,
    getContractById,
    getPropertyById,
    getTenantById,
    addCharge,
    updateCharge,
    voidCharge,
    paymentsForCharge,
  } = useData();
  const existing = getChargeView(chargeId);
  const charge = existing?.charge;
  const hasPayments = (existing?.paid ?? 0) > 0;

  const [contractId, setContractId] = useState(charge?.contractId ?? presetContractId ?? '');
  const [concept, setConcept] = useState<ChargeConcept>(charge?.concept ?? 'alquiler');
  const [period, setPeriod] = useState(charge?.period ?? currentPeriod());
  const initialContract = getContractById(contractId);
  const [dueDate, setDueDate] = useState(
    charge?.dueDate ?? (initialContract ? periodToDueDate(period, initialContract.paymentDay) : ''),
  );
  const initialExpected = initialContract
    ? expectedCharge(initialContract, getPropertyById(initialContract.propertyId), concept)
    : undefined;
  const [currency, setCurrency] = useState<Currency>(
    charge?.currency ?? initialExpected?.currency ?? 'ARS',
  );
  const [amount, setAmount] = useState(
    charge ? String(charge.amount) : initialExpected ? String(initialExpected.amount) : '',
  );
  const [notes, setNotes] = useState(charge?.notes ?? '');

  const contract = getContractById(contractId);
  const property = getPropertyById(contract?.propertyId);
  const tenant = getTenantById(contract?.tenantId);
  const appliedPayments = charge ? paymentsForCharge(charge.id) : [];

  // New charges suggest the amount and due date the contract would bill.
  const suggest = (targetContractId: string, targetConcept: ChargeConcept, targetPeriod: string) => {
    if (charge) return;
    const target = getContractById(targetContractId);
    if (!target) return;
    const expected = expectedCharge(target, getPropertyById(target.propertyId), targetConcept);
    setCurrency(expected?.currency ?? (targetConcept === 'alquiler' ? target.currency : 'ARS'));
    setAmount(expected ? String(expected.amount) : '');
    setDueDate(periodToDueDate(targetPeriod, target.paymentDay));
  };

  const handleSave = () => {
    if (!contract) {
      showAlert('Falta el contrato', 'Elegí a qué contrato corresponde la cuota.');
      return;
    }
    const parsedAmount = Number(amount.replace(',', '.'));
    if (!(parsedAmount > 0)) {
      showAlert('Monto inválido', 'Ingresá el monto de la cuota.');
      return;
    }
    if (existing && parsedAmount < existing.paid) {
      showAlert(
        'Monto menor a lo cobrado',
        `Ya se cobraron ${formatMoney(existing.paid, existing.charge.currency)} de esta cuota.`,
      );
      return;
    }
    if (!dueDate) {
      showAlert('Falta el vencimiento', 'Elegí la fecha de vencimiento.');
      return;
    }

    const payload = {
      contractId,
      concept,
      period,
      dueDate,
      amount: parsedAmount,
      currency,
      notes: notes.trim() || undefined,
    };
    if (charge) updateCharge(charge.id, payload);
    else addCharge(payload);
    smartGoBack(navigation, 'PaymentsList');
  };

  const handleVoid = () => {
    if (!charge) return;
    showConfirm({
      title: 'Anular cuota',
      message: `La cuota de ${CONCEPT_LABEL[charge.concept].toLowerCase()} de ${formatPeriod(
        charge.period,
      )} deja de figurar como deuda y no se vuelve a generar.`,
      confirmLabel: 'Anular',
      destructive: true,
      onConfirm: () => {
        const result = voidCharge(charge.id);
        if (!result.ok) {
          showAlert('No se puede anular', result.reason ?? 'Operación no permitida');
          return;
        }
        smartGoBack(navigation, 'PaymentsList');
      },
    });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        {existing && charge ? (
          <Card style={styles.summary}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryTitle}>
                  {CONCEPT_LABEL[charge.concept]} · {formatPeriod(charge.period)}
                </Text>
                <Text style={styles.summaryMeta}>
                  {property?.title ?? 'Propiedad'} · {tenant?.name ?? 'Inquilino'}
                </Text>
              </View>
              <Badge label={CHARGE_STATUS_LABEL[existing.status]} tone={CHARGE_STATUS_TONE[existing.status]} />
            </View>
            <View style={styles.summaryAmounts}>
              <AmountLine label="Cuota" amount={charge.amount} currency={charge.currency} />
              <AmountLine label="Cobrado" amount={existing.paid} currency={charge.currency} />
              <AmountLine label="Resta" amount={existing.balance} currency={charge.currency} strong />
            </View>
            {appliedPayments.length ? (
              <View style={styles.applied}>
                <Text style={styles.appliedTitle}>Cobros aplicados</Text>
                {appliedPayments.map((payment) => {
                  const applied = payment.allocations.find((a) => a.chargeId === charge.id)!.amount;
                  return (
                    <Text
                      key={payment.id}
                      style={styles.appliedRow}
                      onPress={() => navigation.navigate('PaymentDetail', { paymentId: payment.id })}
                    >
                      {formatDate(payment.date)} · {payment.method ?? 'Sin método'} ·{' '}
                      {formatMoney(applied, charge.currency)}
                    </Text>
                  );
                })}
              </View>
            ) : null}
            {existing.balance > 0 ? (
              <Button
                label="Registrar cobro de esta cuota"
                onPress={() =>
                  navigation.navigate('PaymentForm', {
                    contractId: charge.contractId,
                    concept: charge.concept,
                    chargeId: charge.id,
                  })
                }
                style={styles.collect}
              />
            ) : null}
          </Card>
        ) : null}

        {!charge ? (
          <SelectField
            label="Contrato"
            placeholder="Elegí un contrato"
            required
            selectedId={contractId}
            onSelect={(id) => {
              setContractId(id);
              suggest(id, concept, period);
            }}
            emptyMessage="No hay contratos. Creá uno primero."
            options={contracts.map((c) => ({
              id: c.id,
              label: getPropertyById(c.propertyId)?.title ?? 'Propiedad',
              subtitle: getTenantById(c.tenantId)?.name,
            }))}
          />
        ) : null}

        {hasPayments ? (
          <Text style={styles.locked}>
            Como ya tiene cobros, el concepto y la moneda no se pueden cambiar.
          </Text>
        ) : (
          <OptionChips
            label="Concepto"
            options={CONCEPT_OPTIONS}
            value={concept}
            onChange={(value) => {
              setConcept(value);
              suggest(contractId, value, period);
            }}
          />
        )}
        <MonthField
          label="Período"
          value={period}
          onChange={(value) => {
            setPeriod(value);
            suggest(contractId, concept, value);
          }}
        />
        <DateField label="Vencimiento" value={dueDate} onChange={setDueDate} required />
        {!hasPayments ? (
          <OptionChips label="Moneda" options={CURRENCY_OPTIONS} value={currency} onChange={setCurrency} />
        ) : null}
        <FormField
          label={`Monto de la cuota (${CURRENCY_SYMBOL[currency]})`}
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          keyboardType="numeric"
          required
        />
        <FormField label="Notas" value={notes} onChangeText={setNotes} placeholder="Información adicional" multiline />

        <Button label={charge ? 'Guardar cambios' : 'Crear cuota'} onPress={handleSave} />
        {charge ? (
          <Button label="Anular cuota" variant="danger" onPress={handleVoid} style={styles.voidButton} />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function AmountLine({
  label,
  amount,
  currency,
  strong,
}: {
  label: string;
  amount: number;
  currency: Currency;
  strong?: boolean;
}) {
  return (
    <View style={styles.amountLine}>
      <Text style={styles.amountLabel}>{label}</Text>
      <MoneyText
        amount={amount}
        currency={currency}
        style={[styles.amountValue, strong && styles.amountStrong]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  summary: {
    marginBottom: spacing.xl,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  summaryInfo: {
    flex: 1,
    minWidth: 0,
  },
  summaryTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  summaryMeta: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  summaryAmounts: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  amountLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  amountLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  amountValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  amountStrong: {
    fontSize: fontSize.md,
    fontWeight: '800',
  },
  applied: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  appliedTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
  },
  appliedRow: {
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  collect: {
    marginTop: spacing.md,
  },
  locked: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  voidButton: {
    marginTop: spacing.md,
  },
});
