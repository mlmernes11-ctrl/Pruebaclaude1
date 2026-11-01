import { Charge, ChargeStatus, Payment, PaymentAllocation } from '../types';
import { parseLocalDate, startOfToday } from './format';

const EPSILON = 0.005;

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface ChargePaymentInfo {
  paid: number;
  lastPaymentDate?: string;
  lastMethod?: string;
}

export interface ChargeView {
  charge: Charge;
  paid: number;
  balance: number;
  status: ChargeStatus;
  lastPaymentDate?: string;
  lastMethod?: string;
}

export const CHARGE_STATUS_LABEL: Record<ChargeStatus, string> = {
  pagado: 'Pagada',
  pendiente: 'Por vencer',
  vencido: 'Vencida',
};

export const CHARGE_STATUS_TONE = {
  pagado: 'success',
  pendiente: 'warning',
  vencido: 'danger',
} as const;

export function buildLedger(payments: Payment[]): Map<string, ChargePaymentInfo> {
  const ledger = new Map<string, ChargePaymentInfo>();
  [...payments]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .forEach((payment) => {
      payment.allocations.forEach((allocation) => {
        const info = ledger.get(allocation.chargeId) ?? { paid: 0 };
        info.paid = roundMoney(info.paid + allocation.amount);
        info.lastPaymentDate = payment.date;
        info.lastMethod = payment.method;
        ledger.set(allocation.chargeId, info);
      });
    });
  return ledger;
}

export function getChargeStatus(charge: Charge, balance: number): ChargeStatus {
  if (balance <= EPSILON) return 'pagado';
  return parseLocalDate(charge.dueDate) < startOfToday() ? 'vencido' : 'pendiente';
}

export function viewCharge(charge: Charge, ledger: Map<string, ChargePaymentInfo>): ChargeView {
  const info = ledger.get(charge.id);
  const paid = info?.paid ?? 0;
  const balance = Math.max(0, roundMoney(charge.amount - paid));
  return {
    charge,
    paid,
    balance,
    status: getChargeStatus(charge, balance),
    lastPaymentDate: info?.lastPaymentDate,
    lastMethod: info?.lastMethod,
  };
}

export function isOutstanding(view: ChargeView): boolean {
  return view.balance > EPSILON;
}

export function sortOldestFirst(views: ChargeView[]): ChargeView[] {
  return [...views].sort((a, b) =>
    a.charge.dueDate < b.charge.dueDate ? -1 : a.charge.dueDate > b.charge.dueDate ? 1 : 0,
  );
}

export function sumBalances(views: ChargeView[]): number {
  return roundMoney(views.reduce((sum, view) => sum + view.balance, 0));
}

// Applies an amount to the priority charges first, then to the rest; anything left is credit.
export function allocateAmount(
  amount: number,
  priority: ChargeView[],
  rest: ChargeView[],
): { allocations: PaymentAllocation[]; unallocated: number } {
  let remaining = roundMoney(amount);
  const allocations: PaymentAllocation[] = [];
  const used = new Set<string>();

  for (const view of [...priority, ...rest]) {
    if (remaining <= EPSILON) break;
    if (used.has(view.charge.id) || !isOutstanding(view)) continue;
    used.add(view.charge.id);
    const applied = roundMoney(Math.min(view.balance, remaining));
    allocations.push({ chargeId: view.charge.id, amount: applied });
    remaining = roundMoney(remaining - applied);
  }

  return { allocations, unallocated: remaining > EPSILON ? remaining : 0 };
}
