import { Currency, MoneyTotals } from '../types';
import { addToTotals, emptyTotals } from './format';
import { ChargeView } from './ledger';

export interface HistoryRow {
  period: string;
  count: number;
  billed: MoneyTotals;
  paid: MoneyTotals;
  overdue: MoneyTotals;
  pending: MoneyTotals;
  overdueCount: number;
  pendingCount: number;
  // Fractions of what was billed, for the segmented bar (they add up to 1 when count > 0).
  shares: { paid: number; overdue: number; pending: number };
  // False when dollars could not be converted, so shares are averaged per liquidación.
  sharesByAmount: boolean;
}

type ToPesos = (amount: number, currency: Currency) => number | undefined;

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

// Each liquidación belongs to the month it bills (its period), whenever it was paid.
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

export function buildPeriodRow(views: ChargeView[], period: string, toPesos: ToPesos): HistoryRow {
  return buildRow(period, views.filter((v) => v.charge.period === period), toPesos);
}

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
