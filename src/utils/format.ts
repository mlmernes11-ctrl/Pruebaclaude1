// =====================================================================
// Formatos de montos, fechas y meses
// ---------------------------------------------------------------------
// Convierte números y fechas a como se leen en Argentina ("$ 1.500.000", "10/11/2026",
// "Noviembre 2026") y lee los montos que escribe el usuario.
// =====================================================================

import { Currency, MoneyTotals } from '../types';

// ── Montos ────────────────────────────────────────────────────────────

// Nombres de los meses para mostrar períodos.
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Símbolo de cada moneda.
export const CURRENCY_SYMBOL: Record<Currency, string> = { USD: 'US$', ARS: '$' };

// "US$ 1.500" o "$ 1.500.000,50" (los centavos solo si hay).
export function formatMoney(amount: number, currency: Currency = 'ARS'): string {
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  const number = rounded.toLocaleString('es-AR', {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  // Espacio que no se corta: el símbolo queda pegado al número aunque el texto baje de línea.
  return `${CURRENCY_SYMBOL[currency]} ${number}`;
}

// Lee montos escritos a la argentina: "1.500.000", "1500,50" o "1500.50".
export function parseAmount(input: string): number | undefined {
  const clean = input.replace(/US\$|\$|\s/gi, '');
  if (!clean) return undefined;
  let normalized = clean;
  if (clean.includes(',')) normalized = clean.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(clean)) normalized = clean.replace(/\./g, '');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return undefined;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
}

// ── Totales por moneda ────────────────────────────────────────────────

// Totales separados por moneda: { USD, ARS }.
export function emptyTotals(): MoneyTotals {
  return { USD: 0, ARS: 0 };
}

export function addToTotals(totals: MoneyTotals, amount: number, currency: Currency) {
  totals[currency] += amount;
}

// ¿Hay algo de plata en alguna de las dos monedas?
export const hasMoney = (totals: MoneyTotals) => totals.USD > 0 || totals.ARS > 0;

// "US$ 1.650 + $ 405.000".
export function formatTotals(totals: MoneyTotals): string {
  const parts: string[] = [];
  if (totals.USD) parts.push(formatMoney(totals.USD, 'USD'));
  if (totals.ARS) parts.push(formatMoney(totals.ARS, 'ARS'));
  return parts.length ? parts.join(' + ') : formatMoney(0, 'ARS');
}

// Todo pasado a pesos con la cotización; nada si hay dólares y no hay cotización.
function totalsInPesos(totals: MoneyTotals, rate?: number): number | undefined {
  if (totals.USD && !rate) return undefined;
  return totals.ARS + totals.USD * (rate ?? 0);
}

// ── Fechas ────────────────────────────────────────────────────────────

// Una fecha 'AAAA-MM-DD' leída con new Date() queda en hora de Londres y en Argentina salta al día anterior; esto la lee en hora local.
export function parseLocalDate(iso: string): Date {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Fecha → 'AAAA-MM-DD' (el formato en que se guardan las fechas).
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

// 'AAAA-MM-DD' → "10/11/2026".
export function formatDate(iso?: string): string {
  if (!iso) return '-';
  const d = iso.length === 10 ? parseLocalDate(iso) : new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// "10/11": día y mes, para listas donde el año se sobreentiende.
export function formatDayMonth(iso?: string): string {
  return formatDate(iso).slice(0, 5);
}

// "10/11 14:30": día, mes y hora.
export function formatDateTime(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Períodos (meses "AAAA-MM") ────────────────────────────────────────

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// "dic 2026": mes corto para los subtítulos de las listas.
export function formatPeriodShort(period: string): string {
  const [year, month] = period.split('-').map(Number);
  if (!year || !month) return period;
  return `${MONTHS_SHORT[month - 1]} ${year}`;
}

// "Noviembre 2026".
export function formatPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number);
  if (!year || !month) return period;
  return `${MONTHS[month - 1]} ${year}`;
}

// Hoy, como 'AAAA-MM-DD'.
export function todayISO(): string {
  return toISODate(new Date());
}

// Este mes, como 'AAAA-MM'.
export function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Vencimiento de un mes según el día de pago (del 1 al 28).
export function periodToDueDate(period: string, day: number): string {
  const [year, month] = period.split('-').map(Number);
  const safeDay = Math.min(Math.max(day, 1), 28);
  return toISODate(new Date(year, month - 1, safeDay));
}

// Suma (o resta) meses a un período: ('2026-11', 1) → '2026-12'.
export function addMonthsToPeriod(period: string, months: number): string {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(year, month - 1 + months, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Hoy a las 00:00, para comparar vencimientos.
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Totales con dos monedas ───────────────────────────────────────────

// Totales con dólares y pesos: si hay cotización se muestran en pesos, con el detalle abajo.
// approx=false saca el "≈" cuando la pantalla ya aclara que se usa la cotización de hoy.
export function describeTotals(
  totals: MoneyTotals,
  rate?: number,
  approx = true,
): { main: string; detail?: string } {
  const pesos = totalsInPesos(totals, rate);
  if (!totals.USD) return { main: formatMoney(totals.ARS, 'ARS') };
  if (pesos === undefined) return { main: formatTotals(totals) };
  return { main: `${approx ? '≈\u00A0' : ''}${formatMoney(pesos, 'ARS')}`, detail: formatTotals(totals) };
}
