import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Card from '../../components/Card';
import DateField from '../../components/DateField';
import { showAlert } from '../../components/DialogHost';
import FormField from '../../components/FormField';
import OptionChips from '../../components/OptionChips';
import Screen from '../../components/Screen';
import SelectField from '../../components/SelectField';
import { CONCEPT_LABEL, DEFAULT_RENT_CURRENCY, PAYMENT_METHOD_OPTIONS } from '../../constants';
import { useData } from '../../context/DataContext';
import { useExchangeRate } from '../../context/ExchangeRateContext';
import { colors, fontSize, radius, spacing } from '../../theme';
import { ChargeConcept, Currency } from '../../types';
import { CHARGE_CONCEPTS } from '../../utils/chargeGeneration';
import { CURRENCY_SYMBOL, currentPeriod, formatMoney, formatPeriod, todayISO } from '../../utils/format';
import {
  allocateAmount,
  CHARGE_STATUS_LABEL,
  CHARGE_STATUS_TONE,
  ChargeView,
  isOutstanding,
  sortOldestFirst,
  sumBalances,
} from '../../utils/ledger';
import { smartGoBack } from '../../utils/navigation';

type AmountOption = 'cuota' | 'total' | 'otro';

export default function PaymentFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const presetContractId = route.params?.contractId as string | undefined;
  const presetConcept = route.params?.concept as ChargeConcept | undefined;
  const presetChargeId = route.params?.chargeId as string | undefined;

  const { contracts, chargeViews, getContractById, getPropertyById, getTenantById, addPayment } =
    useData();
  const { rate } = useExchangeRate();

  // Debt of one contract and concept, plus the charge "Lo del mes" refers to.
  const debtFor = (targetContractId: string, targetConcept: ChargeConcept) => {
    const outstanding = sortOldestFirst(
      chargeViews.filter(
        (v) =>
          v.charge.contractId === targetContractId &&
          v.charge.concept === targetConcept &&
          isOutstanding(v),
      ),
    );
    const reference =
      outstanding.find((v) => v.charge.id === presetChargeId) ??
      outstanding.find((v) => v.charge.period === currentPeriod());
    return { outstanding, reference, total: sumBalances(outstanding) };
  };

  const defaultsFor = (targetContractId: string, targetConcept: ChargeConcept) => {
    const { outstanding, reference, total } = debtFor(targetContractId, targetConcept);
    if (reference) return { option: 'cuota' as AmountOption, amount: String(reference.balance) };
    if (outstanding.length) return { option: 'total' as AmountOption, amount: String(total) };
    return { option: 'otro' as AmountOption, amount: '' };
  };

  const initialContractId = presetContractId ?? '';
  const initialConcept = presetConcept ?? 'alquiler';
  const initialDefaults = defaultsFor(initialContractId, initialConcept);

  const [contractId, setContractId] = useState(initialContractId);
  const [concept, setConcept] = useState<ChargeConcept>(initialConcept);
  const [option, setOption] = useState<AmountOption>(initialDefaults.option);
  const [amount, setAmount] = useState(initialDefaults.amount);
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState(PAYMENT_METHOD_OPTIONS[1]);
  const [exchangeRateInput, setExchangeRateInput] = useState(rate ? String(rate) : '');
  const [notes, setNotes] = useState('');

  const contract = getContractById(contractId);
  const { outstanding, reference, total } = debtFor(contractId, concept);
  const currency: Currency =
    outstanding[0]?.charge.currency ??
    (concept === 'alquiler' ? contract?.currency ?? DEFAULT_RENT_CURRENCY : 'ARS');
  const showCuota = Boolean(reference);
  const showTotal = outstanding.length > 0 && (!reference || outstanding.length > 1);

  useEffect(() => {
    if (currency === 'USD' && !exchangeRateInput && rate) setExchangeRateInput(String(rate));
  }, [currency, rate, exchangeRateInput]);

  const resetAmount = (targetContractId: string, targetConcept: ChargeConcept) => {
    const defaults = defaultsFor(targetContractId, targetConcept);
    setOption(defaults.option);
    setAmount(defaults.amount);
  };

  const handleSelectContract = (id: string) => {
    setContractId(id);
    resetAmount(id, concept);
  };

  const handleSelectConcept = (value: ChargeConcept) => {
    setConcept(value);
    resetAmount(contractId, value);
  };

  const handleSelectOption = (value: AmountOption) => {
    setOption(value);
    if (value === 'cuota' && reference) setAmount(String(reference.balance));
    if (value === 'total') setAmount(String(total));
    if (value === 'otro') setAmount('');
  };

  const parsedAmount = Number(amount.replace(',', '.'));
  const priority = option === 'cuota' && reference ? [reference] : outstanding;
  const preview =
    parsedAmount > 0 ? allocateAmount(parsedAmount, priority, outstanding) : undefined;
  const parsedRate = Number(exchangeRateInput.replace(',', '.'));

  const conceptOptions = CHARGE_CONCEPTS.map((value) => {
    const count = contractId ? debtFor(contractId, value).outstanding.length : 0;
    return { value, label: count ? `${CONCEPT_LABEL[value]} · ${count}` : CONCEPT_LABEL[value] };
  });

  const contractOptions = contracts
    .slice()
    .sort((a, b) => (a.status === 'activo' ? 0 : 1) - (b.status === 'activo' ? 0 : 1))
    .map((c) => ({
      id: c.id,
      label: getPropertyById(c.propertyId)?.title ?? 'Propiedad',
      subtitle: getTenantById(c.tenantId)?.name,
    }));

  const handleSave = () => {
    if (!contract) {
      showAlert('Falta el contrato', 'Elegí a qué contrato corresponde el pago.');
      return;
    }
    if (!(parsedAmount > 0)) {
      showAlert('Monto inválido', 'Ingresá cuánto pagó.');
      return;
    }
    if (!date) {
      showAlert('Falta la fecha', 'Elegí la fecha del pago.');
      return;
    }
    if (currency === 'USD' && exchangeRateInput && !(parsedRate > 0)) {
      showAlert('Cotización inválida', 'Ingresá cuántos pesos se pagaron por dólar, por ejemplo 1250.');
      return;
    }

    addPayment({
      contractId,
      concept,
      date,
      amount: parsedAmount,
      currency,
      method,
      exchangeRate: currency === 'USD' && parsedRate > 0 ? parsedRate : undefined,
      allocations: preview?.allocations ?? [],
      notes: notes.trim() || undefined,
    });
    smartGoBack(navigation, 'PaymentsList');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SelectField
          label="Contrato"
          placeholder="Elegí un contrato"
          required
          selectedId={contractId}
          onSelect={handleSelectContract}
          emptyMessage="No hay contratos. Creá uno primero."
          options={contractOptions}
        />
        <OptionChips label="¿Qué paga?" options={conceptOptions} value={concept} onChange={handleSelectConcept} />

        {contract ? (
          <Card style={styles.debtCard}>
            <Text style={styles.debtTitle}>
              Deuda de {CONCEPT_LABEL[concept].toLowerCase()}:{' '}
              <Text style={styles.debtTotal}>{formatMoney(total, currency)}</Text>
            </Text>
            {outstanding.length === 0 ? (
              <Text style={styles.debtEmpty}>
                No hay liquidaciones pendientes. Si el inquilino adelanta, el monto queda a su favor.
              </Text>
            ) : (
              outstanding.map((view) => <DebtRow key={view.charge.id} view={view} />)
            )}
          </Card>
        ) : null}

        {contract ? (
          <View style={styles.options}>
            <Text style={styles.sectionLabel}>¿Cuánto paga?</Text>
            {showCuota && reference ? (
              <AmountChoice
                selected={option === 'cuota'}
                title={
                  reference.charge.period === currentPeriod()
                    ? `Lo del mes (${formatPeriod(reference.charge.period)})`
                    : `Liquidación de ${formatPeriod(reference.charge.period)}`
                }
                amount={formatMoney(reference.balance, currency)}
                onPress={() => handleSelectOption('cuota')}
              />
            ) : null}
            {showTotal ? (
              <AmountChoice
                selected={option === 'total'}
                title="Total adeudado"
                subtitle={outstanding.length > 1 ? `Incluye ${outstanding.length} liquidaciones` : undefined}
                amount={formatMoney(total, currency)}
                onPress={() => handleSelectOption('total')}
              />
            ) : null}
            <AmountChoice
              selected={option === 'otro'}
              title="Otro monto"
              subtitle="Pago parcial o adelanto"
              onPress={() => handleSelectOption('otro')}
            />
          </View>
        ) : null}

        <FormField
          label={`Monto pagado (${CURRENCY_SYMBOL[currency]})`}
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          keyboardType="numeric"
          required
        />

        {preview && contract ? (
          <View style={styles.preview}>
            <Text style={styles.previewTitle}>Se aplica a</Text>
            {preview.allocations.map((allocation) => {
              const view = outstanding.find((v) => v.charge.id === allocation.chargeId)!;
              const rest = Math.round((view.balance - allocation.amount) * 100) / 100;
              return (
                <View key={allocation.chargeId} style={styles.previewRow}>
                  <Ionicons
                    name={rest > 0 ? 'ellipse-outline' : 'checkmark-circle'}
                    size={16}
                    color={rest > 0 ? colors.warning : colors.success}
                  />
                  <Text style={styles.previewText}>
                    {formatPeriod(view.charge.period)}:{' '}
                    {rest > 0
                      ? `${formatMoney(allocation.amount, currency)}, quedan ${formatMoney(rest, currency)}`
                      : `queda saldada (${formatMoney(allocation.amount, currency)})`}
                  </Text>
                </View>
              );
            })}
            {preview.unallocated > 0 ? (
              <View style={styles.previewRow}>
                <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                <Text style={styles.previewText}>
                  {formatMoney(preview.unallocated, currency)} quedan a favor del inquilino
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <DateField label="Fecha del pago" value={date} onChange={setDate} required />
        <OptionChips
          label="Método de pago"
          options={PAYMENT_METHOD_OPTIONS.map((m) => ({ value: m, label: m }))}
          value={method}
          onChange={setMethod}
        />

        {currency === 'USD' ? (
          <>
            <FormField
              label="Cotización usada (pesos por dólar)"
              value={exchangeRateInput}
              onChangeText={setExchangeRateInput}
              placeholder="Ej: 1250"
              keyboardType="numeric"
            />
            {parsedRate > 0 && parsedAmount > 0 ? (
              <Text style={styles.equivalent}>
                Equivale a {formatMoney(parsedAmount * parsedRate, 'ARS')}
              </Text>
            ) : null}
          </>
        ) : null}

        <FormField label="Notas" value={notes} onChangeText={setNotes} placeholder="Información adicional" multiline />
        <Button label="Registrar pago" onPress={handleSave} />
      </ScrollView>
    </Screen>
  );
}

function DebtRow({ view }: { view: ChargeView }) {
  const { charge, balance, paid, status } = view;
  return (
    <View style={styles.debtRow}>
      <View style={styles.debtInfo}>
        <Text style={styles.debtPeriod}>{formatPeriod(charge.period)}</Text>
        {paid > 0 ? (
          <Text style={styles.debtMeta}>
            Pagó {formatMoney(paid, charge.currency)} de {formatMoney(charge.amount, charge.currency)}
          </Text>
        ) : null}
      </View>
      <View style={styles.debtRight}>
        <Text style={styles.debtAmount}>{formatMoney(balance, charge.currency)}</Text>
        <Badge label={CHARGE_STATUS_LABEL[status]} tone={CHARGE_STATUS_TONE[status]} />
      </View>
    </View>
  );
}

function AmountChoice({
  selected,
  title,
  subtitle,
  amount,
  onPress,
}: {
  selected: boolean;
  title: string;
  subtitle?: string;
  amount?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.choice, selected && styles.choiceSelected]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={20}
        color={selected ? colors.primary : colors.textMuted}
      />
      <View style={styles.choiceInfo}>
        <Text style={styles.choiceTitle}>{title}</Text>
        {subtitle ? <Text style={styles.choiceSubtitle}>{subtitle}</Text> : null}
      </View>
      {amount ? <Text style={styles.choiceAmount}>{amount}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  debtCard: {
    marginBottom: spacing.lg,
  },
  debtTitle: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  debtTotal: {
    fontWeight: '800',
  },
  debtEmpty: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  debtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  debtInfo: {
    flex: 1,
    minWidth: 0,
  },
  debtPeriod: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  debtMeta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  debtRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  debtAmount: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  options: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  choiceSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  choiceInfo: {
    flex: 1,
    minWidth: 0,
  },
  choiceTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  choiceSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  choiceAmount: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  preview: {
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  previewTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  equivalent: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
});
