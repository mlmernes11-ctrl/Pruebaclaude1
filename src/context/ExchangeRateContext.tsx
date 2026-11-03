// =====================================================================
// Cotización del dólar
// ---------------------------------------------------------------------
// Con una cuenta: la cotización del día (blue, oficial y MEP) la guarda el servidor una vez
// por día a las 11 h y es la misma para todos; acá se lee de la tabla exchange_rates. Qué dólar
// usa cada cuenta (o el valor manual) se guarda en su fila de "settings".
// En modo demo: se baja de DolarAPI y todo se guarda solo en el celular.
// Además, "en vivo" baja el valor de este momento sin cambiar el del día.
// =====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Currency } from '../types';
import { embeddedPreview } from '../utils/platform';
import type { DataMode } from './DataContext';

// ── Tipos y constantes ────────────────────────────────────────────────

// Qué dólar se usa: blue, oficial, bolsa (MEP) o un valor cargado a mano.
export type QuoteSource = 'blue' | 'oficial' | 'bolsa';
export type RateSource = QuoteSource | 'manual';

export interface Quote {
  compra: number;
  venta: number;
}
export type Quotes = Partial<Record<QuoteSource, Quote>>;

export const QUOTE_SOURCES: QuoteSource[] = ['blue', 'oficial', 'bolsa'];

// Nombre que ve el usuario para cada tipo de dólar.
export const RATE_SOURCE_LABEL: Record<RateSource, string> = {
  blue: 'Blue',
  oficial: 'Oficial',
  bolsa: 'MEP',
  manual: 'Manual',
};

// Modo demo: dónde se guarda en el celular. DolarAPI: de dónde se bajan los valores en vivo.
const STORAGE_KEY = 'gestion_alquileres_cotizacion_v1';
const QUOTES_URL = 'https://dolarapi.com/v1/dolares';

interface Preferences {
  source: RateSource;
  manualRate?: number;
}

interface ExchangeRateContextValue extends Preferences {
  // Cotización del día de cada tipo de dólar y de qué fecha es (AAAA-MM-DD).
  quotes: Quotes;
  quotesDate?: string;
  // Valor en uso (pesos por dólar), según el tipo elegido.
  rate?: number;
  fetching: boolean;
  lastError?: string;
  // Vuelve a leer la cotización del día.
  refreshQuotes: () => Promise<void>;
  // Baja el valor de este momento (no cambia el del día). Devuelve nada si no se pudo.
  fetchLiveQuotes: () => Promise<Quotes | undefined>;
  liveQuotes?: Quotes;
  liveAt?: string;
  setSource: (source: RateSource) => void;
  setManualRate: (rate: number) => void;
  // Valor de un tipo de dólar en particular (promedio entre compra y venta).
  rateFor: (source: QuoteSource, from?: Quotes) => number | undefined;
  toPesos: (amount: number, currency: Currency) => number | undefined;
}

const ExchangeRateContext = createContext<ExchangeRateContextValue | undefined>(undefined);

// ── Funciones auxiliares ──────────────────────────────────────────────

// Promedio entre compra y venta, que es el valor que usa la app.
export function quoteMidpoint(quote?: Quote): number | undefined {
  if (!quote) return undefined;
  return Math.round(((quote.compra + quote.venta) / 2) * 100) / 100;
}

// Baja de DolarAPI y se queda con blue, oficial y MEP.
async function downloadQuotes(): Promise<Quotes> {
  const response = await fetch(QUOTES_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = (await response.json()) as { casa?: string; compra?: number; venta?: number }[];
  const quotes: Quotes = {};
  for (const item of Array.isArray(payload) ? payload : []) {
    const casa = item?.casa as QuoteSource;
    const compra = Number(item?.compra);
    const venta = Number(item?.venta);
    if (QUOTE_SOURCES.includes(casa) && compra > 0 && venta > 0) quotes[casa] = { compra, venta };
  }
  if (Object.keys(quotes).length === 0) throw new Error('Respuesta sin cotizaciones');
  return quotes;
}

// La cotización más reciente guardada por el servidor (la del día, o la del último día con valor).
async function readDailyQuotes(): Promise<{ quotes: Quotes; date?: string }> {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('date, source, buy, sell')
    .order('date', { ascending: false })
    .limit(6);
  if (error) throw error;
  const quotes: Quotes = {};
  const date = data?.[0]?.date as string | undefined;
  (data ?? [])
    .filter((row) => row.date === date)
    .forEach((row) => {
      quotes[row.source as QuoteSource] = { compra: Number(row.buy), venta: Number(row.sell) };
    });
  return { quotes, date };
}

const errorMessage = () =>
  embeddedPreview()
    ? 'La versión de prueba no puede consultar la cotización en internet. Cargala a mano; en la app publicada se actualiza sola.'
    : 'No se pudo actualizar la cotización. Revisá la conexión o cargala a mano.';

// ── Proveedor de cotización ───────────────────────────────────────────

export function ExchangeRateProvider({
  children,
  mode,
  userId,
}: {
  children: React.ReactNode;
  mode: DataMode;
  userId?: string;
}) {
  const [prefs, setPrefs] = useState<Preferences>({ source: 'blue' });
  const [quotes, setQuotes] = useState<Quotes>({});
  const [quotesDate, setQuotesDate] = useState<string>();
  const [liveQuotes, setLiveQuotes] = useState<Quotes>();
  const [liveAt, setLiveAt] = useState<string>();
  const [loaded, setLoaded] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [lastError, setLastError] = useState<string>();

  // — Cotización del día —
  const refreshQuotes = useCallback(async () => {
    setFetching(true);
    try {
      if (mode === 'remote') {
        const daily = await readDailyQuotes();
        if (Object.keys(daily.quotes).length) {
          setQuotes(daily.quotes);
          setQuotesDate(daily.date);
          setLastError(undefined);
          return;
        }
      }
      // Modo demo, o el servidor todavía no guardó ningún día: se usa el valor en vivo.
      const live = await downloadQuotes();
      setQuotes(live);
      setQuotesDate(new Date().toISOString().slice(0, 10));
      setLastError(undefined);
    } catch {
      setLastError(errorMessage());
    } finally {
      setFetching(false);
    }
  }, [mode]);

  // — Valor en vivo (no cambia el del día) —
  const fetchLiveQuotes = useCallback(async () => {
    try {
      const live = await downloadQuotes();
      setLiveQuotes(live);
      setLiveAt(new Date().toISOString());
      return live;
    } catch {
      setLastError(errorMessage());
      return undefined;
    }
  }, []);

  // — Carga inicial: preferencia guardada y cotización del día —
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (mode === 'remote') {
          const { data } = await supabase.from('settings').select('rate_source, manual_rate').maybeSingle();
          if (active && data) {
            setPrefs({ source: data.rate_source as RateSource, manualRate: data.manual_rate ?? undefined });
          }
        } else {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          if (active && raw) {
            const saved = JSON.parse(raw) as Preferences & { quotes?: Quotes; updatedAt?: string };
            setPrefs({ source: saved.source ?? 'blue', manualRate: saved.manualRate });
            if (saved.quotes) setQuotes(saved.quotes);
            if (saved.updatedAt) setQuotesDate(saved.updatedAt.slice(0, 10));
          }
        }
      } catch (e) {
        console.warn('No se pudo cargar la preferencia de cotización', e);
      } finally {
        if (active) setLoaded(true);
      }
      if (active) await refreshQuotes();
    })();
    return () => {
      active = false;
    };
  }, [mode, refreshQuotes]);

  // — Guardar la preferencia (en la cuenta o en el celular) —
  const savePrefs = useCallback(
    (next: Preferences) => {
      if (mode === 'remote') {
        supabase
          .from('settings')
          .upsert(
            { user_id: userId, rate_source: next.source, manual_rate: next.manualRate ?? null, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' },
          )
          .then(({ error }) => error && console.warn('No se pudo guardar la preferencia de cotización', error));
      }
    },
    [mode, userId],
  );

  // Modo demo: todo queda en el celular, junto con la última cotización bajada.
  useEffect(() => {
    if (!loaded || mode !== 'demo') return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prefs, quotes, updatedAt: quotesDate })).catch(() => undefined);
  }, [loaded, mode, prefs, quotes, quotesDate]);

  const setSource = useCallback(
    (source: RateSource) => {
      setPrefs((prev) => {
        const next = { ...prev, source };
        savePrefs(next);
        return next;
      });
    },
    [savePrefs],
  );

  const setManualRate = useCallback(
    (manualRate: number) => {
      const next: Preferences = { source: 'manual', manualRate };
      setPrefs(next);
      savePrefs(next);
    },
    [savePrefs],
  );

  // — Valores derivados —
  const rateFor = useCallback(
    (source: QuoteSource, from?: Quotes) => quoteMidpoint((from ?? quotes)[source]),
    [quotes],
  );
  const rate = prefs.source === 'manual' ? prefs.manualRate : rateFor(prefs.source);

  const toPesos = useCallback(
    (amount: number, currency: Currency) => {
      if (currency === 'ARS') return amount;
      return rate ? amount * rate : undefined;
    },
    [rate],
  );

  const value = useMemo<ExchangeRateContextValue>(
    () => ({
      ...prefs,
      quotes,
      quotesDate,
      rate,
      fetching,
      lastError,
      refreshQuotes,
      fetchLiveQuotes,
      liveQuotes,
      liveAt,
      setSource,
      setManualRate,
      rateFor,
      toPesos,
    }),
    [prefs, quotes, quotesDate, rate, fetching, lastError, refreshQuotes, fetchLiveQuotes, liveQuotes, liveAt, setSource, setManualRate, rateFor, toPesos],
  );

  return <ExchangeRateContext.Provider value={value}>{children}</ExchangeRateContext.Provider>;
}

// Para usar la cotización desde cualquier pantalla: const { rate } = useExchangeRate();
export function useExchangeRate(): ExchangeRateContextValue {
  const ctx = useContext(ExchangeRateContext);
  if (!ctx) throw new Error('useExchangeRate debe usarse dentro de ExchangeRateProvider');
  return ctx;
}
