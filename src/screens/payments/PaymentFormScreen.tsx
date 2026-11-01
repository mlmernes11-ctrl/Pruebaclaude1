import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { showAlert, showConfirm } from '../../components/DialogHost';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import OptionChips from '../../components/OptionChips';
import Screen from '../../components/Screen';
import SelectField from '../../components/SelectField';
import {
  CURRENCY_OPTIONS,
  DEFAULT_RENT_CURRENCY,
  PAYMENT_CONCEPT_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
} from '../../constants';
import { useData } from '../../context/DataContext';
import { useExchangeRate } from '../../context/ExchangeRateContext';
import { colors, fontSize, spacing } from '../../theme';
import { Currency, PaymentConcept } from '../../types';
import { CURRENCY_SYMBOL, formatMoney, todayISO } from '../../utils/format';
import { smartGoBack } from '../../utils/navigation';

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

function isValidPeriod(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

export default function PaymentFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const paymentId = route.params?.paymentId as string | undefined;
  const presetContractId = route.params?.contractId as string | undefined;
  const initialPeriod = route.params?.initialPeriod as string | undefined;
  const initialDueDate = route.params?.initialDueDate as string | undefined;
  const initialAmount = route.params?.initialAmount as string | undefined;

  const {
    payments,
    contracts,
    addPayment,
    updatePayment,
    deletePayment,
    getPropertyById,
    getTenantById,
  } = useData();
  const { rate } = useExchangeRate();
  const existing = payments.find((p) => p.id === paymentId);

  const currencyFor = (targetContractId: string, targetConcept: PaymentConcept): Currency => {
    if (targetConcept !== 'alquiler') return 'ARS';
    return contracts.find((c) => c.id === targetContractId)?.currency ?? DEFAULT_RENT_CURRENCY;
  };

  const [contractId, setContractId] = useState(existing?.contractId ?? presetContractId ?? '');
  const [concept, setConcept] = useState<PaymentConcept>(existing?.concept ?? 'alquiler');
  const [currency, setCurrency] = useState<Currency>(
    existing?.currency ?? currencyFor(presetContractId ?? '', 'alquiler'),
  );
  const [exchangeRateInput, setExchangeRateInput] = useState(
    existing?.exchangeRate ? String(existing.exchangeRate) : '',
  );
  const [period, setPeriod] = useState(existing?.period ?? initialPeriod ?? '');
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? initialDueDate ?? '');
  const [amount, setAmount] = useState(existing?.amount ? String(existing.amount) : initialAmount ?? '');
  const [isPaid, setIsPaid] = useState(Boolean(existing?.paidDate));
  const [paidDate, setPaidDate] = useState(existing?.paidDate ?? todayISO());
  const [method, setMethod] = useState(existing?.method ?? PAYMENT_METHOD_OPTIONS[0]);
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const contractOptions = contracts.map((c) => {
    const property = getPropertyById(c.propertyId);
    const tenant = getTenantById(c.tenantId);
    return {
      id: c.id,
      label: property?.title ?? 'Propiedad',
      subtitle: tenant?.name,
    };
  });

  const amountForConcept = (targetContractId: string, targetConcept: PaymentConcept) => {
    const contract = contracts.find((c) => c.id === targetContractId);
    if (!contract) return undefined;
    if (targetConcept === 'alquiler') return contract.rentAmount;
    const property = getPropertyById(contract.propertyId);
    return targetConcept === 'expensas' ? property?.expensasAmount : property?.serviciosAmount;
  };

  const handleSelectContract = (id: string) => {
    setContractId(id);
    if (!existing) {
      const suggested = amountForConcept(id, concept);
      if (suggested !== undefined) setAmount(String(suggested));
      setCurrency(currencyFor(id, concept));
    }
  };

  const handleSelectConcept = (value: PaymentConcept) => {
    setConcept(value);
    if (!existing) {
      const suggested = amountForConcept(contractId, value);
      setAmount(suggested !== undefined ? String(suggested) : '');
      setCurrency(currencyFor(contractId, value));
    }
  };

  const handleTogglePaid = () => {
    if (!isPaid && !exchangeRateInput && rate) setExchangeRateInput(String(rate));
    setIsPaid((prev) => !prev);
  };

  const parsedAmountPreview = Number(amount);
  const needsExchangeRate = isPaid && currency === 'USD';

  const handleSave = () => {
    if (!contractId) {
      showAlert('Falta el contrato', 'Selecciona el contrato asociado a este pago.');
      return;
    }
    if (!isValidPeriod(period)) {
      showAlert('Período inválido', 'Ingresa el período en formato AAAA-MM.');
      return;
    }
    if (!isValidDate(dueDate)) {
      showAlert('Fecha inválida', 'Ingresa la fecha de vencimiento en formato AAAA-MM-DD.');
      return;
    }
    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      showAlert('Monto inválido', 'Ingresa un monto válido.');
      return;
    }
    if (isPaid && !isValidDate(paidDate)) {
      showAlert('Fecha inválida', 'Ingresa la fecha de pago en formato AAAA-MM-DD.');
      return;
    }
    const parsedRate = exchangeRateInput ? Number(exchangeRateInput.replace(',', '.')) : undefined;
    if (needsExchangeRate && parsedRate !== undefined && (Number.isNaN(parsedRate) || parsedRate <= 0)) {
      showAlert('Cotización inválida', 'Ingresá cuántos pesos se pagaron por dólar, por ejemplo 1250.');
      return;
    }

    const payload = {
      contractId,
      concept,
      period,
      dueDate,
      amount: parsedAmount,
      currency,
      paidDate: isPaid ? paidDate : undefined,
      method: isPaid ? method : undefined,
      exchangeRate: needsExchangeRate ? parsedRate : undefined,
      notes: notes.trim() || undefined,
    };

    if (existing) {
      updatePayment(existing.id, payload);
    } else {
      addPayment(payload);
    }
    smartGoBack(navigation, 'PaymentsList');
  };

  const handleDelete = () => {
    if (!existing) return;
    showConfirm({
      title: 'Eliminar pago',
      message: '¿Seguro que deseas eliminar este registro de pago?',
      confirmLabel: 'Eliminar',
      destructive: true,
      onConfirm: () => {
        deletePayment(existing.id);
        smartGoBack(navigation, 'PaymentsList');
      },
    });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <SelectField
          label="Contrato"
          placeholder="Selecciona un contrato"
          required
          selectedId={contractId}
          onSelect={handleSelectContract}
          emptyMessage="No hay contratos. Crea uno primero."
          options={contractOptions}
        />
        <OptionChips
          label="Concepto"
          options={PAYMENT_CONCEPT_OPTIONS}
          value={concept}
          onChange={handleSelectConcept}
        />
        <Text style={styles.hint}>Período en formato AAAA-MM, fechas en formato AAAA-MM-DD</Text>
        <FormField label="Período" value={period} onChangeText={setPeriod} placeholder="2024-05" required />
        <FormField label="Fecha de vencimiento" value={dueDate} onChangeText={setDueDate} placeholder="2024-05-05" required />
        <OptionChips label="Moneda" options={CURRENCY_OPTIONS} value={currency} onChange={setCurrency} />
        <FormField
          label={`Monto (${CURRENCY_SYMBOL[currency]})`}
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          keyboardType="numeric"
          required
        />
        {currency === 'USD' && rate && parsedAmountPreview > 0 && !needsExchangeRate ? (
          <Text style={styles.estimate}>
            ≈ {formatMoney(parsedAmountPreview * rate, 'ARS')} con la cotización de hoy
          </Text>
        ) : null}

        <View style={styles.paidToggleRow}>
          <Text style={styles.paidLabel}>Marcar como pagado</Text>
          <Button
            label={isPaid ? 'Sí' : 'No'}
            variant={isPaid ? 'primary' : 'secondary'}
            onPress={handleTogglePaid}
            style={styles.paidToggleButton}
          />
        </View>

        {isPaid ? (
          <>
            <FormField label="Fecha de pago" value={paidDate} onChangeText={setPaidDate} placeholder="2024-05-05" required />
            {needsExchangeRate ? (
              <>
                <FormField
                  label="Cotización usada (pesos por dólar)"
                  value={exchangeRateInput}
                  onChangeText={setExchangeRateInput}
                  placeholder="Ej: 1250"
                  keyboardType="numeric"
                />
                {Number(exchangeRateInput) > 0 && parsedAmountPreview > 0 ? (
                  <Text style={styles.estimate}>
                    Equivale a {formatMoney(parsedAmountPreview * Number(exchangeRateInput), 'ARS')}
                  </Text>
                ) : null}
              </>
            ) : null}
            <OptionChips
              label="Método de pago"
              options={PAYMENT_METHOD_OPTIONS.map((m) => ({ value: m, label: m }))}
              value={method}
              onChange={setMethod}
            />
          </>
        ) : null}

        <FormField label="Notas" value={notes} onChangeText={setNotes} placeholder="Información adicional" multiline />

        <Button label={existing ? 'Guardar cambios' : 'Registrar pago'} onPress={handleSave} />
        {existing ? (
          <Button label="Eliminar pago" variant="danger" onPress={handleDelete} style={styles.deleteButton} />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: -spacing.sm,
  },
  estimate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  paidToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  paidLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  paidToggleButton: {
    minWidth: 80,
    paddingVertical: spacing.sm,
  },
  deleteButton: {
    marginTop: spacing.md,
  },
});
