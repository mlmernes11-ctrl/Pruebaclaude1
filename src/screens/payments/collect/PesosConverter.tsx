// =====================================================================
// Registrar cobro: pagar los dólares en pesos
// ---------------------------------------------------------------------
// Pesos que entregó, cotización (Blue, Oficial, MEP o Manual, con el valor del día o en vivo) y
// los dólares que se descuentan del saldo: pesos ÷ cotización = dólares.
// Solo dibuja; los cálculos y las reglas (qué cambia a "Manual") los hace la pantalla.
// =====================================================================

import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { RATE_SOURCE_LABEL, RateSource } from '../../../context/ExchangeRateContext';
import { makeStyles, useTheme } from '../../../context/ThemeContext';
import { fontSize, radius, spacing } from '../../../theme';
import { formatDayMonth, formatMoney, parseAmount } from '../../../utils/format';

const SOURCES: RateSource[] = ['blue', 'oficial', 'bolsa', 'manual'];

export default function PesosConverter({
  pesos,
  onPesos,
  rate,
  onRate,
  rateSource,
  onRateSource,
  dollars,
  onDollars,
  onLive,
  liveLabel,
  quotesDate,
}: {
  pesos: string;
  onPesos: (text: string) => void;
  rate: string;
  onRate: (text: string) => void;
  rateSource: RateSource;
  onRateSource: (source: RateSource) => void;
  dollars: string;
  onDollars: (text: string) => void;
  onLive: () => void;
  liveLabel?: string;
  quotesDate?: string;
}) {
  const styles = useStyles();
  const pesosValue = parseAmount(pesos) ?? 0;
  const rateValue = parseAmount(rate) ?? 0;
  const dollarsValue = parseAmount(dollars) ?? 0;
  const origin =
    liveLabel ??
    (rateSource === 'manual'
      ? 'cotización manual'
      : `${RATE_SOURCE_LABEL[rateSource]}${quotesDate ? ` del ${formatDayMonth(quotesDate)}` : ''}`);

  return (
    <View style={styles.box}>
      <AmountRow label="Pesos que entrega ($)" value={pesos} onChangeText={onPesos} />
      <Text style={styles.caption}>Cotización (pesos por dólar)</Text>
      <View style={styles.chips}>
        {SOURCES.map((source) => (
          <TouchableOpacity
            key={source}
            onPress={() => onRateSource(source)}
            style={[styles.chip, rateSource === source && styles.chipActive]}
            accessibilityRole="radio"
            accessibilityState={{ selected: rateSource === source }}
          >
            <Text style={[styles.chipText, rateSource === source && styles.chipTextActive]}>
              {RATE_SOURCE_LABEL[source]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <AmountRow label="Pesos por dólar ($)" value={rate} onChangeText={onRate} />
      <TouchableOpacity onPress={onLive} accessibilityRole="button" style={styles.live}>
        <Text style={styles.liveText}>Usar el valor en vivo</Text>
      </TouchableOpacity>
      <AmountRow label="Equivale a (US$)" value={dollars} onChangeText={onDollars} />
      {pesosValue > 0 && rateValue > 0 ? (
        <Text style={styles.caption}>
          {formatMoney(pesosValue, 'ARS')} ÷ {formatMoney(rateValue, 'ARS')} ={' '}
          <Text style={styles.strong}>{formatMoney(dollarsValue, 'USD')}</Text> · {origin}
        </Text>
      ) : null}
    </View>
  );
}

// Fila con una etiqueta y un importe para escribir.
export function AmountRow({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
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
        accessibilityLabel={label}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  box: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.neutralTint,
  },
  caption: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  strong: {
    fontWeight: '700',
    color: colors.text,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: spacing.md,
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primaryMuted,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  live: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  liveText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
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
}));
