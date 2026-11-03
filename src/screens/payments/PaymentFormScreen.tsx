// =====================================================================
// Pantalla: Registrar pago
// ---------------------------------------------------------------------
// Uno o varios conceptos en un mismo recibo, con el reparto entre las liquidaciones adeudadas.
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
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
import { QuoteSource, Quotes, RATE_SOURCE_LABEL, RateSource, useExchangeRate } from '../../context/ExchangeRateContext';
import { makeStyles, useTheme } from '../../context/ThemeContext';
import { fontSize, radius, spacing } from '../../theme';
import { ChargeConcept, Currency, MoneyTotals } from '../../types';
import { CHARGE_CONCEPTS } from '../../utils/chargeGeneration';
import {
  addToTotals,
  CURRENCY_SYMBOL,
  currentPeriod,
  emptyTotals,
  formatDayMonth,
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

// Lo cargado para un concepto. "amount" es lo que se descuenta de la deuda (en la moneda de la
// liquidación). Si algo en dólares se paga en pesos, se completan además los pesos recibidos,
// la cotización y de dónde salió (blue, oficial, MEP o manual).
type Entry = {
  option: AmountOption;
  amount: string;
  payIn: Currency;
  pesos: string;
  rate: string;
  rateSource: RateSource;
};

// Número → texto editable, con hasta 2 decimales y sin separador de miles ("1551000", "1100.5").
const toInput = (value: number) => (Number.isFinite(value) && value > 0 ? String(Math.round(value * 100) / 100) : '');

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
  const { source: preferredSource, manualRate, rateFor, quotesDate, fetchLiveQuotes } = useExchangeRate();

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

  // Cotización inicial para pagar en pesos: la que usa la cuenta (o la manual).
  const startRate = (): { rate: string; rateSource: RateSource } =>
    preferredSource === 'manual'
      ? { rate: toInput(manualRate ?? 0), rateSource: 'manual' }
      : { rate: toInput(rateFor(preferredSource) ?? 0), rateSource: preferredSource };

  const defaultsFor = (targetContractId: string, targetConcept: ChargeConcept): Entry => {
    const { outstanding, reference, total } = debtFor(targetContractId, targetConcept);
    const base = { payIn: 'USD' as Currency, pesos: '', ...startRate() };
    if (reference) return { ...base, option: 'cuota', amount: String(reference.balance) };
    if (outstanding.length) return { ...base, option: 'total', amount: String(total) };
    return { ...base, option: 'otro', amount: '' };
  };

  const allDefaults = (targetContractId: string) =>
    Object.fromEntries(CHARGE_CONCEPTS.map((c) => [c, defaultsFor(targetContractId, c)])) as Record<
      ChargeConcept,
      Entry
    >;

  // — Lo que se va completando en el formulario —
  const [contractId, setContractId] = useState(presetContractId ?? '');
  const [selected, setSelected] = useState<ChargeConcept[]>([presetConcept ?? 'alquiler']);
  const [entries, setEntries] = useState<Record<ChargeConcept, Entry>>(() => allDefaults(presetContractId ?? ''));
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState(PAYMENT_METHOD_OPTIONS[1]);
  const [notes, setNotes] = useState('');

  const contract = getContractById(contractId);
  const currencyOf = (concept: ChargeConcept): Currency =>
    debtFor(contractId, concept).outstanding[0]?.charge.currency ??
    (concept === 'alquiler' ? (contract?.currency ?? DEFAULT_RENT_CURRENCY) : 'ARS');
  // Se paga en pesos solo algo que está en dólares.
  const paysInPesos = (concept: ChargeConcept) => currencyOf(concept) === 'USD' && entries[concept].payIn === 'ARS';

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

  const amountOf = (concept: ChargeConcept) => parseAmount(entries[concept].amount) ?? 0;
  // Total del recibo en lo que el inquilino entregó de verdad (pesos si pagó en pesos).
  const receiptTotals: MoneyTotals = emptyTotals();
  selected.forEach((c) =>
    paysInPesos(c)
      ? addToTotals(receiptTotals, parseAmount(entries[c].pesos) ?? 0, 'ARS')
      : addToTotals(receiptTotals, amountOf(c), currencyOf(c)),
  );

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
    const badPesos = selected.find(
      (c) => paysInPesos(c) && !((parseAmount(entries[c].pesos) ?? 0) > 0 && (parseAmount(entries[c].rate) ?? 0) > 0),
    );
    if (badPesos) {
      showAlert('Faltan datos del pago en pesos', 'Ingresá los pesos que entregó y la cotización (pesos por dólar).');
      return;
    }

    const receiptId = selected.length > 1 ? generateId() : undefined;
    selected.forEach((concept) => {
      const { outstanding, reference } = debtFor(contractId, concept);
      const entry = entries[concept];
      const priority = entry.option === 'cuota' && reference ? [reference] : outstanding;
      const amount = amountOf(concept);
      const currency = currencyOf(concept);
      const inPesos = paysInPesos(concept);
      addPayment({
        contractId,
        concept,
        date,
        amount,
        currency,
        method,
        exchangeRate: inPesos ? parseAmount(entry.rate) : undefined,
        paidAmount: inPesos ? parseAmount(entry.pesos) : undefined,
        paidCurrency: inPesos ? 'ARS' : undefined,
        rateSource: inPesos ? entry.rateSource : undefined,
        allocations: allocateAmount(amount, priority, outstanding).allocations,
        notes: notes.trim() || undefined,
        receiptId,
      });
    });
    smartGoBack(navigation, 'PaymentsList');
  };

  // — Dibujo de la pantalla —
  return (
    <Screen narrow>
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
                rateFor={rateFor}
                quotesDate={quotesDate}
                fetchLiveQuotes={fetchLiveQuotes}
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
// queda repartido entre las liquidaciones de ese concepto. Si está en dólares, se puede pagar en
// pesos: pesos recibidos ÷ cotización = dólares que se descuentan de la deuda.
function ConceptBlock({
  concept,
  currency,
  debt,
  entry,
  onChange,
  rateFor,
  quotesDate,
  fetchLiveQuotes,
}: {
  concept: ChargeConcept;
  currency: Currency;
  debt: { outstanding: ChargeView[]; reference?: ChargeView; total: number };
  entry: Entry;
  onChange: (entry: Entry) => void;
  rateFor: (source: QuoteSource, from?: Quotes) => number | undefined;
  quotesDate?: string;
  fetchLiveQuotes: () => Promise<Quotes | undefined>;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [liveLabel, setLiveLabel] = useState<string>();
  const { outstanding, reference, total } = debt;
  const overdue = outstanding.some((v) => v.status === 'vencido');
  const showTotal = outstanding.length > 0 && (!reference || outstanding.length > 1);
  const inPesos = currency === 'USD' && entry.payIn === 'ARS';
  const amount = parseAmount(entry.amount) ?? 0;
  const pesos = parseAmount(entry.pesos) ?? 0;
  const rate = parseAmount(entry.rate) ?? 0;
  const priority = entry.option === 'cuota' && reference ? [reference] : outstanding;
  const preview = amount > 0 ? allocateAmount(amount, priority, outstanding) : undefined;

  // — Cálculos del pago en pesos —
  // Con pesos y cotización, los dólares salen solos (y al revés para las opciones rápidas).
  const dollarsFrom = (pesosValue: number, rateValue: number) => (rateValue > 0 ? toInput(pesosValue / rateValue) : '');
  const pesosFrom = (dollars: number, rateValue: number) => toInput(dollars * rateValue);

  const choose = (option: AmountOption) => {
    const dollars = option === 'cuota' && reference ? reference.balance : option === 'total' ? total : 0;
    onChange({
      ...entry,
      option,
      amount: dollars ? String(dollars) : '',
      pesos: inPesos && dollars ? pesosFrom(dollars, rate) : inPesos ? '' : entry.pesos,
    });
  };

  const setPayIn = (payIn: Currency) =>
    onChange({ ...entry, payIn, pesos: payIn === 'ARS' && amount ? pesosFrom(amount, rate) : entry.pesos });

  const setPesos = (text: string) =>
    onChange({ ...entry, option: 'otro', pesos: text, amount: dollarsFrom(parseAmount(text) ?? 0, rate) });

  // Elegir blue, oficial o MEP llena la cotización con el valor del día.
  const setRateSource = (source: RateSource) => {
    setLiveLabel(undefined);
    if (source === 'manual') {
      onChange({ ...entry, rateSource: 'manual' });
      return;
    }
    const value = rateFor(source) ?? 0;
    onChange({
      ...entry,
      rateSource: source,
      rate: toInput(value),
      amount: pesos ? dollarsFrom(pesos, value) : entry.amount,
    });
  };

  // Tocar la cotización a mano la pasa a "Manual".
  const setRate = (text: string) => {
    setLiveLabel(undefined);
    const value = parseAmount(text) ?? 0;
    onChange({ ...entry, rateSource: 'manual', rate: text, amount: pesos ? dollarsFrom(pesos, value) : entry.amount });
  };

  // Tocar los dólares a mano recalcula la cotización (pesos ÷ dólares) y la pasa a "Manual".
  const setDollars = (text: string) => {
    const dollars = parseAmount(text) ?? 0;
    if (!inPesos) {
      onChange({ ...entry, amount: text });
      return;
    }
    setLiveLabel(undefined);
    onChange({
      ...entry,
      option: 'otro',
      amount: text,
      rateSource: 'manual',
      rate: pesos && dollars ? toInput(pesos / dollars) : entry.rate,
    });
  };

  // Valor de este momento para el tipo de dólar elegido (sin cambiar el del día).
  const useLive = async () => {
    const live = await fetchLiveQuotes();
    const source: QuoteSource = entry.rateSource === 'manual' ? 'blue' : entry.rateSource;
    const value = live ? rateFor(source, live) : undefined;
    if (!value) return;
    setLiveLabel(`${RATE_SOURCE_LABEL[source]} en vivo`);
    onChange({
      ...entry,
      rateSource: source,
      rate: toInput(value),
      amount: pesos ? dollarsFrom(pesos, value) : entry.amount,
    });
  };

  return (
    <View style={styles.block}>
      <View style={styles.blockHeader}>
        <Text style={styles.blockTitle}>{CONCEPT_LABEL[concept]}</Text>
        <Text style={[styles.blockDebt, overdue && { color: colors.danger }]}>
          {outstanding.length ? `Debe ${formatMoney(total, currency)}` : 'Sin deuda'}
        </Text>
      </View>

      {currency === 'USD' ? (
        <View style={styles.payInRow}>
          <Text style={styles.payInLabel}>Paga en</Text>
          {(['USD', 'ARS'] as Currency[]).map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() => setPayIn(option)}
              style={[styles.smallChip, entry.payIn === option && styles.smallChipActive]}
              accessibilityRole="radio"
              accessibilityState={{ selected: entry.payIn === option }}
            >
              <Text style={[styles.smallChipText, entry.payIn === option && styles.smallChipTextActive]}>
                {option === 'USD' ? 'Dólares' : 'Pesos'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

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

      {inPesos ? (
        <>
          <AmountInput label="Pesos que entregó ($)" value={entry.pesos} onChangeText={setPesos} />
          <View style={styles.rateBox}>
            <Text style={styles.payInLabel}>Cotización (pesos por dólar)</Text>
            <View style={styles.payInRow}>
              {(['blue', 'oficial', 'bolsa', 'manual'] as RateSource[]).map((option) => (
                <TouchableOpacity
                  key={option}
                  onPress={() => setRateSource(option)}
                  style={[styles.smallChip, entry.rateSource === option && styles.smallChipActive]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: entry.rateSource === option }}
                >
                  <Text style={[styles.smallChipText, entry.rateSource === option && styles.smallChipTextActive]}>
                    {RATE_SOURCE_LABEL[option]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <AmountInput label="Pesos por dólar ($)" value={entry.rate} onChangeText={setRate} />
            <TouchableOpacity onPress={useLive} accessibilityRole="button" style={styles.liveLink}>
              <Text style={styles.liveLinkText}>Usar el valor en vivo</Text>
            </TouchableOpacity>
          </View>
          <AmountInput label="Equivale a (US$)" value={entry.amount} onChangeText={setDollars} />
          {pesos > 0 && rate > 0 ? (
            <Text style={styles.conversion}>
              {formatMoney(pesos, 'ARS')} ÷ {formatMoney(rate, 'ARS')} ={' '}
              <Text style={styles.conversionStrong}>{formatMoney(amount, 'USD')}</Text>
              {'  ·  '}
              {liveLabel ??
                (entry.rateSource === 'manual'
                  ? 'cotización manual'
                  : `${RATE_SOURCE_LABEL[entry.rateSource]}${quotesDate ? ` del ${formatDayMonth(quotesDate)}` : ''}`)}
            </Text>
          ) : null}
        </>
      ) : (
        <AmountInput
          label={`Monto (${CURRENCY_SYMBOL[currency]})`}
          value={entry.amount}
          onChangeText={setDollars}
          accessibilityLabel={`Monto de ${CONCEPT_LABEL[concept].toLowerCase()}`}
        />
      )}

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

// Fila con una etiqueta y un monto para escribir.
function AmountInput({
  label,
  value,
  onChangeText,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  accessibilityLabel?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.amountRow}>
      <Text style={styles.amountLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
        style={styles.amountInput}
        accessibilityLabel={accessibilityLabel ?? label}
      />
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
  payInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  payInLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginRight: 4,
  },
  smallChip: {
    paddingHorizontal: spacing.md,
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.neutralTint,
  },
  smallChipActive: {
    backgroundColor: colors.primaryMuted,
  },
  smallChipText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
  smallChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  rateBox: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.neutralTint,
  },
  liveLink: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  liveLinkText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  conversion: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  conversionStrong: {
    fontWeight: '700',
    color: colors.text,
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
}));
