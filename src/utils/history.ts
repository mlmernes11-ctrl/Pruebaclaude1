// =====================================================================
// Historial por mes
// ---------------------------------------------------------------------
// Agrupa los cargos por mes y calcula el importe, lo cobrado, lo que está en mora y lo a vencer,
// para la vista Historial y el detalle de cada mes.
// =====================================================================

import { Currency, MoneyTotals } from '../types';
import { addToTotals, emptyTotals } from './format';
import { ChargeView } from './ledger';

// Un mes (o el año entero) del historial.
export interface HistoryRow {
  period: string;
  count: number;
  billed: MoneyTotals;
  paid: MoneyTotals;
  overdue: MoneyTotals;
  pending: MoneyTotals;
  overdueCount: number;
  pendingCount: number;
  // Proporciones del importe para la barra (suman 1 cuando hay cargos).
  shares: { paid: number; overdue: number; pending: number };
  // false si no hay cotización: las proporciones se calculan por cantidad de cargos.
  sharesByAmount: boolean;
}

type ToPesos = (amount: number, currency: Currency) => number | undefined;

// Arma la fila de un grupo de cargos.
function buildRow(period: string, views: ChargeView[], toPesos: ToPesos): HistoryRow {
  const row: HistoryRow = {
    period,
    count: views.length,
    billed: emptyTotals(),
    paid: emptyTotals(),
    overdue: emptyTotals(),
    pending: emptyTotals(),
    overdueCount: 0,
    pendingCount: 0,
    shares: { paid: 0, overdue: 0, pending: 0 },
    sharesByAmount: true,
  };

  let weightTotal = 0;
  const weighted = { paid: 0, overdue: 0, pending: 0 };
  const averaged = { paid: 0, overdue: 0, pending: 0 };

  views.forEach((view) => {
    const { charge, status, balance } = view;
    const paid = Math.min(view.paid, charge.amount);
    addToTotals(row.billed, charge.amount, charge.currency);
    addToTotals(row.paid, paid, charge.currency);
    if (status === 'vencido') {
      row.overdueCount += 1;
      addToTotals(row.overdue, balance, charge.currency);
    } else if (status === 'pendiente') {
      row.pendingCount += 1;
      addToTotals(row.pending, balance, charge.currency);
    }

    const unpaidKey = status === 'vencido' ? 'overdue' : 'pending';
    averaged.paid += charge.amount ? paid / charge.amount : 0;
    if (status !== 'pagado') averaged[unpaidKey] += charge.amount ? balance / charge.amount : 0;

    const weight = toPesos(charge.amount, charge.currency);
    if (weight === undefined) {
      row.sharesByAmount = false;
      return;
    }
    weightTotal += weight;
    weighted.paid += toPesos(paid, charge.currency) ?? 0;
    if (status !== 'pagado') weighted[unpaidKey] += toPesos(balance, charge.currency) ?? 0;
  });

  if (row.count > 0) {
    if (row.sharesByAmount && weightTotal > 0) {
      row.shares = {
        paid: weighted.paid / weightTotal,
        overdue: weighted.overdue / weightTotal,
        pending: weighted.pending / weightTotal,
      };
    } else {
      row.sharesByAmount = false;
      row.shares = {
        paid: averaged.paid / row.count,
        overdue: averaged.overdue / row.count,
        pending: averaged.pending / row.count,
      };
    }
  }
  return row;
}

// ── Armado del historial ──────────────────────────────────────────────

// Cada cargo cuenta en el mes al que corresponde (su período), sin importar cuándo se pagó.
export function buildYearHistory(
  views: ChargeView[],
  year: number,
  toPesos: ToPesos,
): { months: HistoryRow[]; total: HistoryRow } {
  const prefix = `${year}-`;
  const inYear = views.filter((v) => v.charge.period.startsWith(prefix));
  const byPeriod = new Map<string, ChargeView[]>();
  inYear.forEach((v) => {
    const list = byPeriod.get(v.charge.period) ?? [];
    list.push(v);
    byPeriod.set(v.charge.period, list);
  });
  const months = [...byPeriod.keys()].sort().map((period) => buildRow(period, byPeriod.get(period)!, toPesos));
  return { months, total: buildRow(String(year), inYear, toPesos) };
}

// La fila de un solo mes (la usa el detalle del mes).
export function buildPeriodRow(views: ChargeView[], period: string, toPesos: ToPesos): HistoryRow {
  return buildRow(period, views.filter((v) => v.charge.period === period), toPesos);
}

// Primer y último año con cargos, para las flechas del selector de año.
export function yearRange(views: ChargeView[], currentYear: number): { min: number; max: number } {
  let min = currentYear;
  let max = currentYear;
  views.forEach((v) => {
    const year = Number(v.charge.period.slice(0, 4));
    if (year < min) min = year;
    if (year > max) max = year;
  });
  return { min, max };
}
