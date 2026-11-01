import { Currency, MoneyTotals } from '../types';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const CURRENCY_SYMBOL: Record<Currency, string> = { USD: 'US$', ARS: '$' };

export function formatMoney(amount: number, currency: Currency = 'ARS'): string {
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  const number = rounded.toLocaleString('es-AR', {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  // Non-breaking space keeps the symbol attached to the number when the text wraps.
  return `${CURRENCY_SYMBOL[currency]} ${number}`;
}

// Reads amounts the way they are written in Argentina: "1.500.000", "1500,50" or "1500.50".
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

export function emptyTotals(): MoneyTotals {
  return { USD: 0, ARS: 0 };
}

export function addToTotals(totals: MoneyTotals, amount: number, currency: Currency) {
  totals[currency] += amount;
}

export function formatTotals(totals: MoneyTotals): string {
  const parts: string[] = [];
  if (totals.USD) parts.push(formatMoney(totals.USD, 'USD'));
  if (totals.ARS) parts.push(formatMoney(totals.ARS, 'ARS'));
  return parts.length ? parts.join(' + ') : formatMoney(0, 'ARS');
}

export function totalsInPesos(totals: MoneyTotals, rate?: number): number | undefined {
  if (totals.USD && !rate) return undefined;
  return totals.ARS + totals.USD * (rate ?? 0);
}

// 'YYYY-MM-DD' strings parse as UTC midnight with new Date(), which shifts the day in UTC-3.
export function parseLocalDate(iso: string): Date {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

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

export function formatPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number);
  if (!year || !month) return period;
  return `${MONTHS[month - 1]} ${year}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function periodToDueDate(period: string, day: number): string {
  const [year, month] = period.split('-').map(Number);
  const safeDay = Math.min(Math.max(day, 1), 28);
  return toISODate(new Date(year, month - 1, safeDay));
}

export function addMonthsToPeriod(period: string, months: number): string {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(year, month - 1 + months, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Mixed-currency totals are shown in pesos when there is a rate, with the breakdown underneath.
export function describeTotals(
  totals: MoneyTotals,
  rate?: number,
): { main: string; detail?: string } {
  const pesos = totalsInPesos(totals, rate);
  if (!totals.USD) return { main: formatMoney(totals.ARS, 'ARS') };
  if (pesos === undefined) return { main: formatTotals(totals) };
  return { main: `≈\u00A0${formatMoney(pesos, 'ARS')}`, detail: formatTotals(totals) };
}
