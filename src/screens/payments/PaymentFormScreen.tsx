// =====================================================================
// Pantalla: Registrar pago
// ---------------------------------------------------------------------
// Uno o varios conceptos en un mismo recibo, con el reparto entre las liquidaciones adeudadas.
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Button from '../../components/Button';
import DateField from '../../components/DateField';
import { showAlert } from '../../components/DialogHost';
import FormField from '../../components/FormField';
import OptionChips from '../../components/OptionChips';
import Screen from '../../components/Screen';
import SelectField from '../../components/SelectField';
import { CONCEPT_LABEL, DEFAULT_RENT_CURRENCY, PAYMENT_METHOD_OPTIONS } from '../../constants';
import { useData } from '../../context/DataContext';
import { useExchangeRate } from '../../context/ExchangeRateContext';
import { makeStyles, useTheme } from '../../context/ThemeContext';
import { fontSize, radius, spacing } from '../../theme';
import { ChargeConcept, Currency, MoneyTotals } from '../../types';
import { CHARGE_CONCEPTS } from '../../utils/chargeGeneration';
import {
  addToTotals,
  CURRENCY_SYMBOL,
  currentPeriod,
  emptyTotals,
  formatMoney,
  formatPeriod,
  formatTotals,
  parseAmount,
  todayISO,
} from '../../utils/format';
import { generateId } from '../../utils/id';
import { allocateAmount, ChargeView, isOutstanding, sortOldestFirst, sumBalances } from '../../utils/ledger';
import { smartGoBack } from '../../utils/navigation';
import { compareTitles, plural } from '../../utils/text';

// ── Constantes y funciones auxiliares ─────────────────────────────────

type AmountOption = 'cuota' | 'total' | 'otro';
type Entry = { option: AmountOption; amount: string };

// ── Pantalla ──────────────────────────────────────────────────────────

// Un mismo recibo puede pagar varios conceptos: contrato, fecha y método se cargan una vez
// y cada concepto elegido (alquiler, expensas, servicios) lleva su propio monto.
export default function PaymentFormScreen() {
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const presetContractId = route.params?.contractId as string | undefined;
  const presetConcept = route.params?.concept as ChargeConcept | undefined;
  const presetChargeId = route.params?.chargeId as string | undefined;

  const { contracts, chargeViews, getContractById, getPropertyById, getTenantById, addPayment } = useData();
  const { rate } = useExchangeRate();

  // — Deuda del contrato elegido —
  // Deuda de un contrato y concepto, y cuál es la liquidación de "Lo del mes".
  const debtFor = (targetContractId: string, targetConcept: ChargeConcept) => {
    const outstanding = sortOldestFirst(
      chargeViews.filter(
        (v) => v.charge.contractId === targetContractId && v.charge.concept === targetConcept && isOutstanding(v),
      ),
    );
    const reference =
      outstanding.find((v) => v.charge.id === presetChargeId) ??
      outstanding.find((v) => v.charge.period === currentPeriod());
    return { outstanding, reference, total: sumBalances(outstanding) };
  };

  const defaultsFor = (targetContractId: string, targetConcept: ChargeConcept): Entry => {
    const { outstanding, reference, total } = debtFor(targetContractId, targetConcept);
    if (reference) return { option: 'cuota', amount: String(reference.balance) };
    if (outstanding.length) return { option: 'total', amount: String(total) };
    return { option: 'otro', amount: '' };
  };

  const allDefaults = (targetContractId: string) =>
    Object.fromEntries(CHARGE_CONCEPTS.map((c) => [c, defaultsFor(targetContractId, c)])) as Record<ChargeConcept, Entry>;

  // — Lo que se va completando en el formulario —
  const [contractId, setContractId] = useState(presetContractId ?? '');
  const [selected, setSelected] = useState<ChargeConcept[]>([presetConcept ?? 'alquiler']);
  const [entries, setEntries] = useState<Record<ChargeConcept, Entry>>(() => allDefaults(presetContractId ?? ''));
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState(PAYMENT_METHOD_OPTIONS[1]);
  const [exchangeRateInput, setExchangeRateInput] = useState(rate ? String(rate) : '');
  const [notes, setNotes] = useState('');

  const contract = getContractById(contractId);
  const currencyOf = (concept: ChargeConcept): Currency =>
    debtFor(contractId, concept).outstanding[0]?.charge.currency ??
    (concept === 'alquiler' ? (contract?.currency ?? DEFAULT_RENT_CURRENCY) : 'ARS');
  const anyDollars = selected.some((c) => currencyOf(c) === 'USD');

  useEffect(() => {
    if (anyDollars && !exchangeRateInput && rate) setExchangeRateInput(String(rate));
  }, [anyDollars, rate, exchangeRateInput]);

  // — Cambios en el formulario —
  const handleSelectContract = (id: string) => {
    setContractId(id);
    setEntries(allDefaults(id));
  };

  const toggleConcept = (concept: ChargeConcept) =>
    setSelected((prev) =>
      prev.includes(concept)
        ? prev.filter((c) => c !== concept)
        : CHARGE_CONCEPTS.filter((c) => c === concept || prev.includes(c)),
    );

  const setEntry = (concept: ChargeConcept, entry: Entry) => setEntries((prev) => ({ ...prev, [concept]: entry }));

  const parsedRate = parseAmount(exchangeRateInput) ?? 0;
  const amountOf = (concept: ChargeConcept) => parseAmount(entries[concept].amount) ?? 0;
  const receiptTotals: MoneyTotals = emptyTotals();
  selected.forEach((c) => addToTotals(receiptTotals, amountOf(c), currencyOf(c)));

  const contractOptions = contracts
    .slice()
    .sort(
      (a, b) =>
        Number(b.status === 'activo') - Number(a.status === 'activo') ||
        compareTitles(getPropertyById(a.propertyId)?.title ?? '', getPropertyById(b.propertyId)?.title ?? ''),
    )
    .map((c) => ({
      id: c.id,
      label: getPropertyById(c.propertyId)?.title ?? 'Propiedad',
      subtitle: getTenantById(c.tenantId)?.name,
    }));

  // — Guardar: valida y registra un pago por cada concepto elegido —
  const handleSave = () => {
    if (!contract) {
      showAlert('Falta el contrato', 'Elegí a qué contrato corresponde el pago.');
      return;
    }
    if (!selected.length) {
      showAlert('¿Qué paga?', 'Elegí si paga alquiler, expensas o servicios.');
      return;
    }
    const missing = selected.find((c) => !(amountOf(c) > 0));
    if (missing) {
      showAlert('Monto inválido', `Ingresá cuánto pagó de ${CONCEPT_LABEL[missing].toLowerCase()}.`);
      return;
    }
    if (!date) {
      showAlert('Falta la fecha', 'Elegí la fecha del pago.');
      return;
    }
    if (anyDollars && exchangeRateInput && !(parsedRate > 0)) {
      showAlert('Cotización inválida', 'Ingresá cuántos pesos se pagaron por dólar, por ejemplo 1.410.');
      return;
    }

    const receiptId = selected.length > 1 ? generateId() : undefined;
    selected.forEach((concept) => {
      const { outstanding, reference } = debtFor(contractId, concept);
      const entry = entries[concept];
      const priority = entry.option === 'cuota' && reference ? [reference] : outstanding;
      const amount = amountOf(concept);
      const currency = currencyOf(concept);
      addPayment({
        contractId,
        concept,
        date,
        amount,
        currency,
        method,
        exchangeRate: currency === 'USD' && parsedRate > 0 ? parsedRate : undefined,
        allocations: allocateAmount(amount, priority, outstanding).allocations,
        notes: notes.trim() || undefined,
        receiptId,
      });
    });
    smartGoBack(navigation, 'PaymentsList');
  };

  // — Dibujo de la pantalla —
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

        <Text style={styles.label}>¿Qué paga? Podés elegir varios</Text>
        <View style={styles.conceptRow}>
          {CHARGE_CONCEPTS.map((concept) => (
            <ConceptChip
              key={concept}
              label={CONCEPT_LABEL[concept]}
              count={contractId ? debtFor(contractId, concept).outstanding.length : 0}
              selected={selected.includes(concept)}
              onPress={() => toggleConcept(concept)}
            />
          ))}
        </View>

        {contract
          ? selected.map((concept) => (
              <ConceptBlock
                key={concept}
                concept={concept}
                currency={currencyOf(concept)}
                debt={debtFor(contractId, concept)}
                entry={entries[concept]}
                onChange={(entry) => setEntry(concept, entry)}
              />
            ))
          : null}

        {contract && selected.length > 1 ? (
          <View style={styles.receipt}>
            <Text style={styles.receiptLabel}>Total del recibo</Text>
            <Text style={styles.receiptValue}>{formatTotals(receiptTotals)}</Text>
            <Text style={styles.receiptDetail}>
              Se registran {plural(selected.length, 'pago', 'pagos')}:{' '}
              {selected.map((c) => CONCEPT_LABEL[c].toLowerCase()).join(', ')}
            </Text>
          </View>
        ) : null}

        <DateField label="Fecha del pago" value={date} onChange={setDate} required />
        <OptionChips
          label="Método de pago"
          options={PAYMENT_METHOD_OPTIONS.map((m) => ({ value: m, label: m }))}
          value={method}
          onChange={setMethod}
        />

        {anyDollars ? (
          <>
            <FormField
              label="Cotización usada (pesos por dólar)"
              value={exchangeRateInput}
              onChangeText={setExchangeRateInput}
              placeholder="Ej: 1.410"
              keyboardType="numeric"
            />
            {parsedRate > 0 && receiptTotals.USD > 0 ? (
              <Text style={styles.equivalent}>
                {formatMoney(receiptTotals.USD, 'USD')} equivalen a {formatMoney(receiptTotals.USD * parsedRate, 'ARS')}
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

// ── Partes de la pantalla ─────────────────────────────────────────────

function ConceptChip({
  label,
  count,
  selected,
  onPress,
}: {
  label: string;
  count: number;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={count ? `${label}, ${plural(count, 'deuda', 'deudas')}` : label}
    >
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={18}
        color={selected ? colors.primary : colors.textMuted}
      />
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      {count ? <Text style={[styles.chipCount, selected && styles.chipTextSelected]}>{count}</Text> : null}
    </TouchableOpacity>
  );
}

// Monto de un concepto: opciones rápidas ("Lo del mes", "Total adeudado", "Otro monto") y cómo
// queda repartido entre las liquidaciones de ese concepto.
function ConceptBlock({
  concept,
  currency,
  debt,
  entry,
  onChange,
}: {
  concept: ChargeConcept;
  currency: Currency;
  debt: { outstanding: ChargeView[]; reference?: ChargeView; total: number };
  entry: Entry;
  onChange: (entry: Entry) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { outstanding, reference, total } = debt;
  const overdue = outstanding.some((v) => v.status === 'vencido');
  const showTotal = outstanding.length > 0 && (!reference || outstanding.length > 1);
  const amount = parseAmount(entry.amount) ?? 0;
  const priority = entry.option === 'cuota' && reference ? [reference] : outstanding;
  const preview = amount > 0 ? allocateAmount(amount, priority, outstanding) : undefined;

  const choose = (option: AmountOption) => {
    if (option === 'cuota' && reference) onChange({ option, amount: String(reference.balance) });
    else if (option === 'total') onChange({ option, amount: String(total) });
    else onChange({ option, amount: '' });
  };

  return (
    <View style={styles.block}>
      <View style={styles.blockHeader}>
        <Text style={styles.blockTitle}>{CONCEPT_LABEL[concept]}</Text>
        <Text style={[styles.blockDebt, overdue && { color: colors.danger }]}>
          {outstanding.length ? `Debe ${formatMoney(total, currency)}` : 'Sin deuda'}
        </Text>
      </View>

      {reference ? (
        <AmountChoice
          selected={entry.option === 'cuota'}
          title={
            reference.charge.period === currentPeriod()
              ? `Lo del mes (${formatPeriod(reference.charge.period)})`
              : `Liquidación de ${formatPeriod(reference.charge.period)}`
          }
          amount={formatMoney(reference.balance, currency)}
          onPress={() => choose('cuota')}
        />
      ) : null}
      {showTotal ? (
        <AmountChoice
          selected={entry.option === 'total'}
          title="Total adeudado"
          subtitle={outstanding.length > 1 ? `Incluye ${outstanding.length} liquidaciones` : undefined}
          amount={formatMoney(total, currency)}
          onPress={() => choose('total')}
        />
      ) : null}
      <AmountChoice
        selected={entry.option === 'otro'}
        title="Otro monto"
        subtitle={outstanding.length ? 'Pago parcial o adelanto' : 'Si adelanta, queda a su favor'}
        onPress={() => choose('otro')}
      />

      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>Monto ({CURRENCY_SYMBOL[currency]})</Text>
        <TextInput
          value={entry.amount}
          onChangeText={(text) => onChange({ ...entry, amount: text })}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          style={styles.amountInput}
          accessibilityLabel={`Monto de ${CONCEPT_LABEL[concept].toLowerCase()}`}
        />
      </View>

      {preview ? (
        <View style={styles.preview}>
          {preview.allocations.map((allocation) => {
            const view = outstanding.find((v) => v.charge.id === allocation.chargeId)!;
            const rest = Math.round((view.balance - allocation.amount) * 100) / 100;
            return (
              <View key={allocation.chargeId} style={styles.previewRow}>
                <Ionicons
                  name={rest > 0 ? 'ellipse-outline' : 'checkmark-circle'}
                  size={15}
                  color={rest > 0 ? colors.warning : colors.success}
                />
                <Text style={styles.previewText}>
                  {formatPeriod(view.charge.period)}:{' '}
                  {rest > 0
                    ? `${formatMoney(allocation.amount, currency)}, quedan ${formatMoney(rest, currency)}`
                    : `queda saldada`}
                </Text>
              </View>
            );
          })}
          {preview.unallocated > 0 ? (
            <View style={styles.previewRow}>
              <Ionicons name="add-circle-outline" size={15} color={colors.primary} />
              <Text style={styles.previewText}>{formatMoney(preview.unallocated, currency)} quedan a su favor</Text>
            </View>
          ) : null}
        </View>
      ) : null}
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
  const { colors } = useTheme();
  const styles = useStyles();
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

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textMuted,
    marginLeft: spacing.xs,
    marginBottom: 6,
  },
  conceptRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    minHeight: 40,
    borderRadius: radius.round,
    backgroundColor: colors.neutralMuted,
  },
  chipSelected: {
    backgroundColor: colors.primaryMuted,
  },
  chipText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  chipCount: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
  },
  block: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  blockTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  blockDebt: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.neutralTint,
  },
  choiceSelected: {
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
    fontVariant: ['tabular-nums'],
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  amountLabel: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  amountInput: {
    flex: 1,
    minWidth: 0,
    textAlign: 'right',
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  preview: {
    gap: 4,
    marginTop: 2,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  receipt: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  receiptLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  receiptValue: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  receiptDetail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  equivalent: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
    marginLeft: spacing.xs,
  },
}));
