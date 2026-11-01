import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import { showAlert } from '../components/DialogHost';
import FormField from '../components/FormField';
import OptionChips from '../components/OptionChips';
import Screen from '../components/Screen';
import {
  QuoteSource,
  quoteMidpoint,
  RATE_SOURCE_LABEL,
  RateSource,
  useExchangeRate,
} from '../context/ExchangeRateContext';
import { colors, fontSize, spacing } from '../theme';
import { formatDateTime, formatMoney, parseAmount } from '../utils/format';

const SOURCE_OPTIONS = (Object.keys(RATE_SOURCE_LABEL) as RateSource[]).map((value) => ({
  value,
  label: RATE_SOURCE_LABEL[value],
}));

const QUOTE_SOURCES: QuoteSource[] = ['blue', 'oficial', 'bolsa'];

export default function ExchangeRateScreen() {
  const {
    source,
    rate,
    quotes,
    updatedAt,
    manualRate,
    fetching,
    lastError,
    refreshQuotes,
    setSource,
    setManualRate,
  } = useExchangeRate();
  const [manualInput, setManualInput] = useState(manualRate ? String(manualRate) : '');

  const handleSaveManual = () => {
    const value = parseAmount(manualInput);
    if (!value) {
      showAlert('Cotización inválida', 'Ingresá cuántos pesos vale un dólar, por ejemplo 1250.');
      return;
    }
    setManualRate(value);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <Text style={styles.label}>Cotización en uso ({RATE_SOURCE_LABEL[source]})</Text>
          <Text style={styles.rate}>{rate ? `US$ 1 = ${formatMoney(rate, 'ARS')}` : 'Sin cotización'}</Text>
          <Text style={styles.meta}>
            {source === 'manual'
              ? 'Valor cargado a mano'
              : updatedAt
                ? `Actualizada el ${formatDateTime(updatedAt)} · promedio entre compra y venta`
                : 'Todavía no se pudo descargar'}
          </Text>
          {lastError ? <Text style={styles.error}>{lastError}</Text> : null}
          <Button
            label="Actualizar ahora"
            variant="secondary"
            onPress={refreshQuotes}
            loading={fetching}
            style={styles.refresh}
          />
        </Card>

        <OptionChips
          label="Cotización de referencia"
          options={SOURCE_OPTIONS}
          value={source}
          onChange={setSource}
        />

        <Card style={styles.card}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.cell, styles.cellName, styles.headerText]}>Dólar</Text>
            <Text style={[styles.cell, styles.headerText]}>Compra</Text>
            <Text style={[styles.cell, styles.headerText]}>Venta</Text>
            <Text style={[styles.cell, styles.headerText]}>Promedio</Text>
          </View>
          {QUOTE_SOURCES.map((key) => {
            const quote = quotes[key];
            return (
              <View key={key} style={styles.tableRow}>
                <Text style={[styles.cell, styles.cellName]}>{RATE_SOURCE_LABEL[key]}</Text>
                <Text style={styles.cell}>{quote ? formatMoney(quote.compra, 'ARS') : '-'}</Text>
                <Text style={styles.cell}>{quote ? formatMoney(quote.venta, 'ARS') : '-'}</Text>
                <Text style={[styles.cell, styles.cellStrong]}>
                  {quote ? formatMoney(quoteMidpoint(quote)!, 'ARS') : '-'}
                </Text>
              </View>
            );
          })}
          <Text style={styles.source}>Fuente: DolarAPI (dolarapi.com)</Text>
        </Card>

        <Text style={styles.sectionTitle}>Cotización manual</Text>
        <FormField
          label="Pesos por dólar"
          value={manualInput}
          onChangeText={setManualInput}
          placeholder="Ej: 1250"
          keyboardType="numeric"
        />
        <Button label="Usar este valor" onPress={handleSaveManual} />

        <Text style={styles.note}>
          Los montos en pesos que ves al lado de los alquileres en dólares son estimados con esta
          cotización. Cuando registrás un pago en dólares podés anotar la cotización exacta que se usó
          ese día.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  card: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  rate: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
  },
  meta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 4,
  },
  error: {
    fontSize: fontSize.xs,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  refresh: {
    marginTop: spacing.md,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeader: {
    paddingTop: 0,
  },
  headerText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  cell: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.text,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  cellName: {
    flex: 0.8,
    textAlign: 'left',
    fontWeight: '600',
  },
  cellStrong: {
    fontWeight: '700',
  },
  source: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  note: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: spacing.lg,
  },
});
