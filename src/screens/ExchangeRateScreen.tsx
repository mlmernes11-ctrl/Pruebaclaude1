// =====================================================================
// Pantalla: Cotización del dólar
// ---------------------------------------------------------------------
// Elegir qué dólar usar, ver las cotizaciones del día o cargar un valor a mano.
// =====================================================================

import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import { showAlert } from '../components/DialogHost';
import FormField from '../components/FormField';
import OptionChips from '../components/OptionChips';
import Screen from '../components/Screen';
import { QUOTE_SOURCES, quoteMidpoint, RATE_SOURCE_LABEL, RateSource, useExchangeRate } from '../context/ExchangeRateContext';
import { fontSize, spacing } from '../theme';
import { formatDate, formatDateTime, formatMoney, parseAmount } from '../utils/format';
import { makeStyles } from '../context/ThemeContext';

// ── Constantes y funciones auxiliares ─────────────────────────────────

const SOURCE_OPTIONS = (Object.keys(RATE_SOURCE_LABEL) as RateSource[]).map((value) => ({
  value,
  label: RATE_SOURCE_LABEL[value],
}));

// ── Pantalla ──────────────────────────────────────────────────────────

export default function ExchangeRateScreen() {
  const styles = useStyles();
  const {
    source,
    rate,
    quotes,
    quotesDate,
    liveQuotes,
    liveAt,
    manualRate,
    fetching,
    lastError,
    refreshQuotes,
    fetchLiveQuotes,
    setSource,
    setManualRate,
  } = useExchangeRate();
  const [manualInput, setManualInput] = useState(manualRate ? String(manualRate) : '');
  const [loadingLive, setLoadingLive] = useState(false);

  const showLive = async () => {
    setLoadingLive(true);
    await fetchLiveQuotes();
    setLoadingLive(false);
  };

  const handleSaveManual = () => {
    const value = parseAmount(manualInput);
    if (!value) {
      showAlert('Cotización inválida', 'Ingresá cuántos pesos vale un dólar, por ejemplo 1250.');
      return;
    }
    setManualRate(value);
  };

  return (
    <Screen narrow>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <Text style={styles.label}>Cotización en uso ({RATE_SOURCE_LABEL[source]})</Text>
          <Text style={styles.rate}>{rate ? `US$ 1 = ${formatMoney(rate, 'ARS')}` : 'Sin cotización'}</Text>
          <Text style={styles.meta}>
            {source === 'manual'
              ? 'Valor cargado a mano'
              : quotesDate
                ? `Cotización del ${formatDate(quotesDate)} · promedio entre compra y venta`
                : 'Todavía no se pudo descargar'}
          </Text>
          {lastError ? <Text style={styles.error}>{lastError}</Text> : null}
          <Button
            label="Volver a leer la del día"
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
          {liveQuotes
            ? QUOTE_SOURCES.map((key) => {
                const quote = liveQuotes[key];
                return (
                  <View key={`live-${key}`} style={[styles.tableRow, styles.liveRow]}>
                    <Text style={[styles.cell, styles.cellName]}>{RATE_SOURCE_LABEL[key]} en vivo</Text>
                    <Text style={styles.cell}>{quote ? formatMoney(quote.compra, 'ARS') : '-'}</Text>
                    <Text style={styles.cell}>{quote ? formatMoney(quote.venta, 'ARS') : '-'}</Text>
                    <Text style={[styles.cell, styles.cellStrong]}>
                      {quote ? formatMoney(quoteMidpoint(quote)!, 'ARS') : '-'}
                    </Text>
                  </View>
                );
              })
            : null}
          <Text style={styles.source}>
            {liveAt ? `En vivo: consultado el ${formatDateTime(liveAt)}. ` : ''}
            La del día se guarda todos los días a las 11 h y es la misma para todos. Fuente: DolarAPI.
          </Text>
          <Button
            label={liveQuotes ? 'Actualizar valores en vivo' : 'Ver en tiempo real'}
            variant="ghost"
            onPress={showLive}
            loading={loadingLive}
          />
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
          cotización. Cuando registrás un pago de algo en dólares podés elegir que se pague en pesos y
          con qué cotización.
        </Text>
      </ScrollView>
    </Screen>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
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
  liveRow: {
    backgroundColor: colors.neutralTint,
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
}));
