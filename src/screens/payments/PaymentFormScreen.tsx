// =====================================================================
// Pantalla: Registrar cobro
// ---------------------------------------------------------------------
// Como pagar la tarjeta en el banco, en tres pasos:
//   1. Importe: Saldo total (elegido de entrada), Solo lo vencido, Este cargo u Otro importe.
//      Medio de pago (recuerda el último) y fecha (hoy, salvo que se cambie).
//   2. Confirmar: a qué cargos se aplica, saldo a favor si sobra y el total.
//   3. Listo: cobro registrado, con el recibo para mandar por WhatsApp.
// Los cálculos están en collect/collectMath.ts y el pago de dólares en pesos en
// collect/PesosConverter.tsx.
// =====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import Button from '../../components/Button';
import DateField from '../../components/DateField';
import { showAlert } from '../../components/DialogHost';
import FormField from '../../components/FormField';
import ListRow from '../../components/ListRow';
import ListSection from '../../components/ListSection';
import OptionChips from '../../components/OptionChips';
import Screen from '../../components/Screen';
import SelectField from '../../components/SelectField';
import { CONCEPT_LABEL, PAYMENT_METHOD_OPTIONS } from '../../constants';
import { useData } from '../../context/DataContext';
import { QuoteSource, RATE_SOURCE_LABEL, RateSource, useExchangeRate } from '../../context/ExchangeRateContext';
import { makeStyles, useTheme } from '../../context/ThemeContext';
import { fontSize, radius, spacing } from '../../theme';
import { MoneyTotals, Payment } from '../../types';
import { emptyTotals, formatDate, formatMoney, formatPeriod, formatTotals, parseAmount, todayISO } from '../../utils/format';
import { generateId } from '../../utils/id';
import { isOutstanding, roundMoney } from '../../utils/ledger';
import { compareTitles } from '../../utils/text';
import { openWhatsapp, receiptText } from '../../utils/whatsapp';
import { AmountOption, debtOf, planCollection, toInput } from './collect/collectMath';
import PesosConverter, { AmountRow } from './collect/PesosConverter';

// ── Constantes ────────────────────────────────────────────────────────

type Step = 'importe' | 'confirmar' | 'listo';
const STEP_TITLE: Record<Step, string> = {
  importe: 'Registrar cobro',
  confirmar: 'Confirmar cobro',
  listo: 'Cobro registrado',
};
// El último medio de pago usado queda guardado en el dispositivo.
const LAST_METHOD_KEY = 'gestion_alquileres_ultimo_medio_de_pago';
const hasMoney = (t: MoneyTotals) => t.USD > 0 || t.ARS > 0;

// ── Pantalla ──────────────────────────────────────────────────────────

export default function PaymentFormScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const presetContractId = route.params?.contractId as string | undefined;
  const presetChargeId = route.params?.chargeId as string | undefined;

  const { contracts, chargeViewsForContract, getContractById, getPropertyById, getTenantById, addPayment, charges } =
    useData();
  const { source: preferredSource, manualRate, rateFor, quotesDate, fetchLiveQuotes } = useExchangeRate();

  // — Contrato y saldo —
  const [contractId, setContractId] = useState(presetContractId ?? '');
  const contract = getContractById(contractId);
  const property = getPropertyById(contract?.propertyId);
  const tenant = getTenantById(contract?.tenantId);
  const contractViews = contractId ? chargeViewsForContract(contractId) : [];
  const debt = useMemo(() => debtOf(contractViews), [contractViews]);
  const presetCharge = debt.outstanding.find((v) => v.charge.id === presetChargeId);
  const showOverdueOption = debt.overdue.length > 0 && debt.overdue.length < debt.outstanding.length;

  // — Lo que se va completando —
  const firstOption = (): AmountOption => (presetCharge ? 'cargo' : debt.outstanding.length ? 'total' : 'otro');
  const [option, setOption] = useState<AmountOption>(firstOption);
  const [usdText, setUsdText] = useState('');
  const [arsText, setArsText] = useState('');
  const [chosen, setChosen] = useState<string[]>([]);
  const [choosing, setChoosing] = useState(false);
  const [inPesos, setInPesos] = useState(false);
  const [pesosText, setPesosText] = useState('');
  const startRate = preferredSource === 'manual' ? (manualRate ?? 0) : (rateFor(preferredSource) ?? 0);
  const [rateText, setRateText] = useState(toInput(startRate));
  const [rateSource, setRateSource] = useState<RateSource>(preferredSource);
  const [liveLabel, setLiveLabel] = useState<string>();
  const [method, setMethod] = useState(PAYMENT_METHOD_OPTIONS[1]);
  const [date, setDate] = useState(todayISO());
  const [editingDate, setEditingDate] = useState(false);
  const [notes, setNotes] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [step, setStep] = useState<Step>('importe');
  const [created, setCreated] = useState<Payment[]>([]);
  // Total cobrado, guardado al confirmar (después el saldo ya bajó y el importe se recalcula).
  const [doneLabel, setDoneLabel] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({ title: STEP_TITLE[step] });
  }, [navigation, step]);

  // El medio de pago que se usó la última vez.
  useEffect(() => {
    AsyncStorage.getItem(LAST_METHOD_KEY)
      .then((saved) => saved && PAYMENT_METHOD_OPTIONS.includes(saved) && setMethod(saved))
      .catch(() => undefined);
  }, []);

  // — Importe según la opción elegida —
  const amountsFor = (o: AmountOption): MoneyTotals => {
    if (o === 'total') return debt.totals;
    if (o === 'vencido') return debt.overdueTotals;
    if (o === 'cargo' && presetCharge) {
      const t = emptyTotals();
      t[presetCharge.charge.currency] = presetCharge.balance;
      return t;
    }
    return { USD: parseAmount(usdText) ?? 0, ARS: parseAmount(arsText) ?? 0 };
  };
  const amounts = amountsFor(option);
  const rate = parseAmount(rateText) ?? 0;
  const pesos = option === 'otro' ? (parseAmount(pesosText) ?? 0) : roundMoney(amounts.USD * rate);
  const showUsdField = contract?.currency === 'USD' || debt.totals.USD > 0;
  const priorityIds =
    option === 'cargo' && presetCharge ? [presetCharge.charge.id] : option === 'otro' ? chosen : [];
  const plan = contract ? planCollection(contract, amounts, debt, priorityIds) : undefined;

  // — Cambios —
  const selectContract = (id: string) => {
    setContractId(id);
    setOption(debtOf(chargeViewsForContract(id)).outstanding.length ? 'total' : 'otro');
    setUsdText('');
    setArsText('');
    setPesosText('');
    setChosen([]);
  };

  // "Otro importe" arranca vacío, como en el banco.
  const chooseOption = (o: AmountOption) => {
    setOption(o);
    if (o === 'otro') {
      setUsdText('');
      setArsText('');
      setPesosText('');
    }
  };

  // Pasar a "Otro importe" conservando lo que ya se veía (al tocar los pesos o los dólares).
  const switchToCustom = () => {
    if (option === 'otro') return;
    setUsdText(toInput(amounts.USD));
    setArsText(toInput(amounts.ARS));
    setPesosText(toInput(pesos));
    setOption('otro');
  };

  // Pesos que entrega → dólares (pesos ÷ cotización).
  const changePesos = (text: string) => {
    switchToCustom();
    setPesosText(text);
    const value = parseAmount(text) ?? 0;
    setUsdText(rate > 0 ? toInput(value / rate) : '');
  };

  // Tocar los dólares a mano recalcula la cotización (pesos ÷ dólares) y la pasa a "Manual".
  const changeDollarsInPesos = (text: string) => {
    switchToCustom();
    setUsdText(text);
    const dollars = parseAmount(text) ?? 0;
    if (pesos > 0 && dollars > 0) {
      setRateText(toInput(pesos / dollars));
      setRateSource('manual');
      setLiveLabel(undefined);
    }
  };

  // Una cotización nueva: con "Otro importe" recalcula los dólares; si no, los pesos salen solos.
  const applyRate = (value: number, source: RateSource, label?: string) => {
    setRateText(toInput(value));
    setRateSource(source);
    setLiveLabel(label);
    if (option === 'otro' && pesos > 0 && value > 0) setUsdText(toInput(pesos / value));
  };
  const changeRateSource = (source: RateSource) =>
    source === 'manual'
      ? (setRateSource('manual'), setLiveLabel(undefined))
      : applyRate(rateFor(source) ?? 0, source);
  const changeRate = (text: string) => {
    setRateText(text);
    setRateSource('manual');
    setLiveLabel(undefined);
    const value = parseAmount(text) ?? 0;
    if (option === 'otro' && pesos > 0 && value > 0) setUsdText(toInput(pesos / value));
  };
  const useLive = async () => {
    const live = await fetchLiveQuotes();
    const source: QuoteSource = rateSource === 'manual' ? 'blue' : rateSource;
    const value = live ? rateFor(source, live) : undefined;
    if (value) applyRate(value, source, `${RATE_SOURCE_LABEL[source]} en vivo`);
  };

  const togglePesos = (value: boolean) => {
    setInPesos(value);
    if (value && option === 'otro' && amounts.USD > 0) setPesosText(toInput(amounts.USD * rate));
  };

  const toggleChosen = (id: string) =>
    setChosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // — Paso 1 → 2: validar —
  const goConfirm = () => {
    if (!contract) {
      showAlert('Falta el contrato', 'Elegí a qué contrato corresponde el cobro.');
      return;
    }
    if (!hasMoney(amounts)) {
      showAlert('Falta el importe', 'Ingresá cuánto entrega el inquilino.');
      return;
    }
    if (inPesos && amounts.USD > 0 && !(pesos > 0 && rate > 0)) {
      showAlert('Faltan datos del pago en pesos', 'Ingresá los pesos que entrega y la cotización.');
      return;
    }
    if (!date) {
      showAlert('Falta la fecha', 'Elegí la fecha del cobro.');
      return;
    }
    setStep('confirmar');
  };

  // — Paso 2 → 3: registrar un cobro por concepto (todos en el mismo recibo) —
  const confirm = () => {
    if (!contract || !plan) return;
    const receiptId = plan.payments.length > 1 ? generateId() : undefined;
    const payInPesos = inPesos && amounts.USD > 0 && rate > 0;
    const saved = plan.payments.map((p) =>
      addPayment({
        contractId: contract.id,
        concept: p.concept,
        date,
        amount: p.amount,
        currency: p.currency,
        method,
        exchangeRate: payInPesos && p.currency === 'USD' ? rate : undefined,
        paidAmount: payInPesos && p.currency === 'USD' ? roundMoney(p.amount * rate) : undefined,
        paidCurrency: payInPesos && p.currency === 'USD' ? 'ARS' : undefined,
        rateSource: payInPesos && p.currency === 'USD' ? rateSource : undefined,
        allocations: p.allocations,
        notes: notes.trim() || undefined,
        receiptId,
      }),
    );
    AsyncStorage.setItem(LAST_METHOD_KEY, method).catch(() => undefined);
    setDoneLabel(totalLabel);
    setCreated(saved);
    setStep('listo');
  };

  const contractOptions = contracts
    .slice()
    .sort(
      (a, b) =>
        Number(b.status === 'activo') - Number(a.status === 'activo') ||
        compareTitles(getPropertyById(a.propertyId)?.title ?? '', getPropertyById(b.propertyId)?.title ?? ''),
    )
    .map((c) => ({ id: c.id, label: getPropertyById(c.propertyId)?.title ?? 'Propiedad', subtitle: getTenantById(c.tenantId)?.name }));

  const totalLabel =
    inPesos && amounts.USD > 0 && pesos > 0
      ? `${formatTotals(amounts)} (los US$ pagados con ${formatMoney(pesos, 'ARS')})`
      : formatTotals(amounts);

  // ── Paso 3: listo ───────────────────────────────────────────────────
  if (step === 'listo') {
    const stillOwed = contractId ? chargeViewsForContract(contractId).filter(isOutstanding) : [];
    return (
      <Screen narrow>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.done}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
            <Text style={styles.doneTitle}>Cobro registrado</Text>
            <Text style={styles.doneAmount}>{doneLabel}</Text>
            <Text style={styles.doneDetail}>
              {[property?.title, tenant?.name].filter(Boolean).join(' · ')} · {method} · {formatDate(date)}
            </Text>
          </View>
          <Button
            label="Enviar recibo por WhatsApp"
            onPress={() =>
              openWhatsapp(
                tenant?.phone,
                receiptText(created, tenant, property, (id) => charges.find((c) => c.id === id)?.period, stillOwed),
              )
            }
          />
          <Button label="Listo" variant="secondary" onPress={() => navigation.goBack()} style={styles.secondButton} />
        </ScrollView>
      </Screen>
    );
  }

  // ── Paso 2: confirmar ───────────────────────────────────────────────
  if (step === 'confirmar' && plan) {
    return (
      <Screen narrow>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>Total a cobrar</Text>
            <Text style={styles.summaryValue}>{formatTotals(amounts)}</Text>
            {inPesos && amounts.USD > 0 ? (
              <Text style={styles.summaryDetail}>
                Los dólares se pagan con {formatMoney(pesos, 'ARS')} ·{' '}
                {liveLabel ?? (rateSource === 'manual' ? 'cotización manual' : RATE_SOURCE_LABEL[rateSource])}{' '}
                {formatMoney(rate, 'ARS')}
              </Text>
            ) : null}
          </View>

          <ListSection>
            <ListRow title="Propiedad" value={property?.title ?? '-'} valueTone="muted" chevron={false} />
            <ListRow title="Inquilino" value={tenant?.name ?? '-'} valueTone="muted" chevron={false} />
            <ListRow title="Medio de pago" value={method} valueTone="muted" chevron={false} />
            <ListRow title="Fecha" value={formatDate(date)} valueTone="muted" chevron={false} />
          </ListSection>

          <ListSection header="Se aplica a" footer={notes.trim() ? `Nota: ${notes.trim()}` : undefined}>
            {plan.applied.map(({ view, amount }) => (
              <ListRow
                key={view.charge.id}
                title={`${CONCEPT_LABEL[view.charge.concept]} ${formatPeriod(view.charge.period).toLowerCase()}`}
                subtitle={
                  amount < view.balance
                    ? `Pago parcial · queda ${formatMoney(roundMoney(view.balance - amount), view.charge.currency)}`
                    : view.status === 'vencido'
                      ? 'Vencido · queda saldado'
                      : 'Queda saldado'
                }
                value={formatMoney(amount, view.charge.currency)}
                chevron={false}
              />
            ))}
            {hasMoney(plan.credit) ? (
              <ListRow
                title="Saldo a favor"
                subtitle="Se usa solo para los próximos cargos"
                value={formatTotals(plan.credit)}
                valueTone="primary"
                chevron={false}
              />
            ) : null}
          </ListSection>

          <Button label="Confirmar cobro" onPress={confirm} />
          <Button label="Modificar" variant="secondary" onPress={() => setStep('importe')} style={styles.secondButton} />
        </ScrollView>
      </Screen>
    );
  }

  // ── Paso 1: importe ─────────────────────────────────────────────────
  return (
    <Screen narrow>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {presetContractId && contract ? (
          <View style={styles.who}>
            <Text style={styles.whoTitle}>{property?.title ?? 'Propiedad'}</Text>
            <Text style={styles.whoSubtitle}>{tenant?.name ?? 'Inquilino'}</Text>
          </View>
        ) : (
          <SelectField
            label="Contrato"
            placeholder="Elegí un contrato"
            required
            selectedId={contractId}
            onSelect={selectContract}
            emptyMessage="No hay contratos. Creá uno primero."
            options={contractOptions}
          />
        )}

        {contract ? (
          <>
            <View style={styles.balance}>
              <Text style={styles.balanceLabel}>Saldo total</Text>
              <Text style={[styles.balanceValue, debt.overdue.length > 0 && { color: colors.danger }]}>
                {hasMoney(debt.totals) ? formatTotals(debt.totals) : 'Sin saldo'}
              </Text>
              {debt.overdue.length ? (
                <Text style={styles.balanceDetail}>Vencido: {formatTotals(debt.overdueTotals)}</Text>
              ) : null}
            </View>

            {presetCharge ? (
              <Choice
                selected={option === 'cargo'}
                title={`Este cargo · ${CONCEPT_LABEL[presetCharge.charge.concept]} ${formatPeriod(presetCharge.charge.period).toLowerCase()}`}
                amount={formatMoney(presetCharge.balance, presetCharge.charge.currency)}
                onPress={() => chooseOption('cargo')}
              />
            ) : null}
            {debt.outstanding.length ? (
              <Choice
                selected={option === 'total'}
                title="Saldo total"
                subtitle={debt.overdue.length ? 'Lo vencido y lo del mes' : 'Lo del mes'}
                amount={formatTotals(debt.totals)}
                onPress={() => chooseOption('total')}
              />
            ) : null}
            {showOverdueOption ? (
              <Choice
                selected={option === 'vencido'}
                title="Solo lo vencido"
                amount={formatTotals(debt.overdueTotals)}
                onPress={() => chooseOption('vencido')}
              />
            ) : null}
            <Choice
              selected={option === 'otro'}
              title="Otro importe"
              subtitle={debt.outstanding.length ? 'Pago parcial o adelanto' : 'Si adelanta, queda como saldo a favor'}
              onPress={() => chooseOption('otro')}
            />

            {option === 'otro' ? (
              <View style={styles.custom}>
                {showUsdField && !inPesos ? (
                  <AmountRow label="Dólares (US$)" value={usdText} onChangeText={setUsdText} />
                ) : null}
                <AmountRow label="Pesos ($)" value={arsText} onChangeText={setArsText} />
                {debt.outstanding.length > 1 ? (
                  <TouchableOpacity onPress={() => setChoosing((v) => !v)} accessibilityRole="button">
                    <Text style={styles.link}>{choosing ? 'Ocultar cargos' : 'Elegir a qué cargos se aplica'}</Text>
                  </TouchableOpacity>
                ) : null}
                {choosing ? (
                  <View style={styles.chooser}>
                    {debt.outstanding.map((v) => {
                      const on = chosen.includes(v.charge.id);
                      return (
                        <TouchableOpacity
                          key={v.charge.id}
                          style={styles.chooserRow}
                          onPress={() => toggleChosen(v.charge.id)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: on }}
                        >
                          <Ionicons
                            name={on ? 'checkbox' : 'square-outline'}
                            size={20}
                            color={on ? colors.primary : colors.textMuted}
                          />
                          <Text style={styles.chooserText}>
                            {CONCEPT_LABEL[v.charge.concept]} {formatPeriod(v.charge.period).toLowerCase()}
                          </Text>
                          <Text style={styles.chooserAmount}>{formatMoney(v.balance, v.charge.currency)}</Text>
                        </TouchableOpacity>
                      );
                    })}
                    <Text style={styles.hint}>Lo elegido se cubre primero; si sobra, sigue por el cargo más viejo.</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {showUsdField && (amounts.USD > 0 || option === 'otro') ? (
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Paga los dólares en pesos</Text>
                <Switch
                  value={inPesos}
                  onValueChange={togglePesos}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  accessibilityLabel="Paga los dólares en pesos"
                />
              </View>
            ) : null}
            {inPesos && showUsdField ? (
              <PesosConverter
                pesos={option === 'otro' ? pesosText : toInput(pesos)}
                onPesos={changePesos}
                rate={rateText}
                onRate={changeRate}
                rateSource={rateSource}
                onRateSource={changeRateSource}
                dollars={option === 'otro' ? usdText : toInput(amounts.USD)}
                onDollars={changeDollarsInPesos}
                onLive={useLive}
                liveLabel={liveLabel}
                quotesDate={quotesDate}
              />
            ) : null}

            <View style={styles.section}>
              <OptionChips
                label="Medio de pago"
                options={PAYMENT_METHOD_OPTIONS.map((m) => ({ value: m, label: m }))}
                value={method}
                onChange={setMethod}
              />
              {editingDate ? (
                <DateField label="Fecha del cobro" value={date} onChange={setDate} required />
              ) : (
                <TouchableOpacity style={styles.inlineRow} onPress={() => setEditingDate(true)} accessibilityRole="button">
                  <Text style={styles.inlineLabel}>Fecha</Text>
                  <Text style={styles.inlineValue}>{date === todayISO() ? 'Hoy' : formatDate(date)}</Text>
                  <Text style={styles.link}>Cambiar</Text>
                </TouchableOpacity>
              )}
              {addingNote ? (
                <FormField label="Nota" value={notes} onChangeText={setNotes} placeholder="Información adicional" multiline />
              ) : (
                <TouchableOpacity onPress={() => setAddingNote(true)} accessibilityRole="button">
                  <Text style={styles.link}>Agregar nota</Text>
                </TouchableOpacity>
              )}
            </View>

            <Button label="Continuar" onPress={goConfirm} />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

// ── Partes de la pantalla ─────────────────────────────────────────────

// Una opción de importe (como "Pago total" / "Pago mínimo" / "Otro importe" en el banco).
function Choice({
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
  const styles = useStyles();
  const { colors } = useTheme();
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
        size={22}
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
    gap: spacing.md,
  },
  who: {
    paddingHorizontal: spacing.xs,
  },
  whoTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  whoSubtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: 2,
  },
  balance: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  balanceLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: colors.text,
    marginTop: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  balanceDetail: {
    fontSize: fontSize.sm,
    color: colors.danger,
    marginTop: 2,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  choiceSelected: {
    borderColor: colors.primary,
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
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  choiceAmount: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
    textAlign: 'right',
  },
  custom: {
    gap: spacing.sm,
  },
  chooser: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 2,
  },
  chooserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  chooserText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  chooserAmount: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  switchLabel: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  section: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  inlineLabel: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  inlineValue: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  link: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
    paddingVertical: spacing.xs,
  },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: colors.text,
    marginTop: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  summaryDetail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  done: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  doneTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  doneAmount: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  doneDetail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  secondButton: {
    marginTop: -spacing.xs,
  },
}));
