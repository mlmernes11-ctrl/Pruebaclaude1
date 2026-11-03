// =====================================================================
// Cotización del dólar
// ---------------------------------------------------------------------
// Descarga la cotización de DolarAPI (blue, oficial o MEP) o usa un valor cargado a mano,
// y la comparte con las pantallas para mostrar los dólares en pesos. Se guarda en el celular.
// =====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Currency } from '../types';
import { embeddedPreview } from '../utils/platform';

// Dónde se guarda la cotización en el celular y de dónde se descarga.
const STORAGE_KEY = 'gestion_alquileres_cotizacion_v1';
const QUOTES_URL = 'https://dolarapi.com/v1/dolares';

// ── Tipos ─────────────────────────────────────────────────────────────

// Qué dólar se usa: blue, oficial, bolsa (MEP) o un valor cargado a mano.
export type QuoteSource = 'blue' | 'oficial' | 'bolsa';
export type RateSource = QuoteSource | 'manual';

export interface Quote {
  compra: number;
  venta: number;
}

interface StoredExchange {
  source: RateSource;
  manualRate?: number;
  quotes: Partial<Record<QuoteSource, Quote>>;
  updatedAt?: string;
}

const DEFAULT_EXCHANGE: StoredExchange = { source: 'blue', quotes: {} };

// Nombre que ve el usuario para cada tipo de dólar.
export const RATE_SOURCE_LABEL: Record<RateSource, string> = {
  blue: 'Blue',
  oficial: 'Oficial',
  bolsa: 'MEP',
  manual: 'Manual',
};

// Promedio entre compra y venta, que es el valor que usa la app.
export function quoteMidpoint(quote?: Quote): number | undefined {
  if (!quote) return undefined;
  return Math.round(((quote.compra + quote.venta) / 2) * 100) / 100;
}

interface ExchangeRateContextValue extends StoredExchange {
  rate?: number;
  fetching: boolean;
  lastError?: string;
  refreshQuotes: () => Promise<void>;
  setSource: (source: RateSource) => void;
  setManualRate: (rate: number) => void;
  toPesos: (amount: number, currency: Currency) => number | undefined;
}

const ExchangeRateContext = createContext<ExchangeRateContextValue | undefined>(undefined);

// ── Descarga ──────────────────────────────────────────────────────────

// Lee la respuesta de DolarAPI y se queda con blue, oficial y MEP.
function parseQuotes(payload: unknown): Partial<Record<QuoteSource, Quote>> {
  const quotes: Partial<Record<QuoteSource, Quote>> = {};
  if (!Array.isArray(payload)) return quotes;
  for (const item of payload) {
    const casa = item?.casa;
    const compra = Number(item?.compra);
    const venta = Number(item?.venta);
    if ((casa === 'blue' || casa === 'oficial' || casa === 'bolsa') && compra > 0 && venta > 0) {
      quotes[casa as QuoteSource] = { compra, venta };
    }
  }
  return quotes;
}

// ── Proveedor de cotización ───────────────────────────────────────────

export function ExchangeRateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoredExchange>(DEFAULT_EXCHANGE);
  const [loaded, setLoaded] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [lastError, setLastError] = useState<string>();

  const refreshQuotes = useCallback(async () => {
    setFetching(true);
    try {
      const response = await fetch(QUOTES_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const quotes = parseQuotes(await response.json());
      if (Object.keys(quotes).length === 0) throw new Error('Respuesta sin cotizaciones');
      setState((prev) => ({ ...prev, quotes, updatedAt: new Date().toISOString() }));
      setLastError(undefined);
    } catch {
      setLastError(
        embeddedPreview()
          ? 'La versión de prueba no puede consultar la cotización en internet. Cargala a mano abajo; en la app instalada se actualiza sola.'
          : 'No se pudo actualizar la cotización. Revisá la conexión o cargala a mano.',
      );
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setState({ ...DEFAULT_EXCHANGE, ...(JSON.parse(raw) as StoredExchange) });
      } catch (e) {
        console.warn('No se pudo cargar la cotización guardada', e);
      } finally {
        setLoaded(true);
      }
      await refreshQuotes();
    })();
  }, [refreshQuotes]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((e) => {
      console.warn('No se pudo guardar la cotización', e);
    });
  }, [state, loaded]);

  const rate = state.source === 'manual' ? state.manualRate : quoteMidpoint(state.quotes[state.source]);

  const setSource = useCallback((source: RateSource) => {
    setState((prev) => ({ ...prev, source }));
  }, []);

  const setManualRate = useCallback((manualRate: number) => {
    setState((prev) => ({ ...prev, manualRate, source: 'manual' }));
  }, []);

  const toPesos = useCallback(
    (amount: number, currency: Currency) => {
      if (currency === 'ARS') return amount;
      return rate ? amount * rate : undefined;
    },
    [rate],
  );

  const value = useMemo<ExchangeRateContextValue>(
    () => ({
      ...state,
      rate,
      fetching,
      lastError,
      refreshQuotes,
      setSource,
      setManualRate,
      toPesos,
    }),
    [state, rate, fetching, lastError, refreshQuotes, setSource, setManualRate, toPesos],
  );

  return <ExchangeRateContext.Provider value={value}>{children}</ExchangeRateContext.Provider>;
}

// Para usar la cotización desde cualquier pantalla: const { rate } = useExchangeRate();
export function useExchangeRate(): ExchangeRateContextValue {
  const ctx = useContext(ExchangeRateContext);
  if (!ctx) throw new Error('useExchangeRate debe usarse dentro de ExchangeRateProvider');
  return ctx;
}
