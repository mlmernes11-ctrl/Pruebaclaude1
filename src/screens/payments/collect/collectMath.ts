// =====================================================================
// Registrar cobro: cálculos
// ---------------------------------------------------------------------
// Qué debe un contrato (saldo total y lo vencido, por moneda) y cómo se reparte un importe
// entre sus cargos: del que vence primero al último, como hace el banco con la tarjeta. Si un
// importe cubre cargos de varios conceptos (alquiler y expensas), se registra un cobro por
// concepto; lo que sobra queda como saldo a favor.
// =====================================================================

import { ChargeConcept, Contract, Currency, MoneyTotals, PaymentAllocation } from '../../../types';
import { addToTotals, emptyTotals } from '../../../utils/format';
import { allocateAmount, ChargeView, isOutstanding, roundMoney, sortOldestFirst } from '../../../utils/ledger';

// Qué importe se cobra: todo, solo lo vencido, un cargo puntual u otro importe.
export type AmountOption = 'total' | 'vencido' | 'cargo' | 'otro';

export interface Debt {
  // Cargos con saldo, del que vence primero al último.
  outstanding: ChargeView[];
  overdue: ChargeView[];
  totals: MoneyTotals;
  overdueTotals: MoneyTotals;
}

export function debtOf(contractViews: ChargeView[]): Debt {
  const outstanding = sortOldestFirst(contractViews.filter(isOutstanding));
  const overdue = outstanding.filter((v) => v.status === 'vencido');
  const totals = emptyTotals();
  const overdueTotals = emptyTotals();
  outstanding.forEach((v) => addToTotals(totals, v.balance, v.charge.currency));
  overdue.forEach((v) => addToTotals(overdueTotals, v.balance, v.charge.currency));
  return { outstanding, overdue, totals, overdueTotals };
}

// Un cobro a registrar (uno por concepto y moneda).
export interface PlannedPayment {
  concept: ChargeConcept;
  currency: Currency;
  amount: number;
  allocations: PaymentAllocation[];
}

export interface CollectionPlan {
  payments: PlannedPayment[];
  // A qué cargo va cada parte (para mostrarlo antes de confirmar).
  applied: { view: ChargeView; amount: number }[];
  credit: MoneyTotals;
}

// Concepto donde queda el saldo a favor de una moneda si sobra plata: el del alquiler si es la
// misma moneda; si no, expensas (lo único en pesos de un alquiler en dólares).
function creditConcept(contract: Contract, currency: Currency): ChargeConcept {
  return contract.currency === currency ? 'alquiler' : 'expensas';
}

// Reparte los importes de cada moneda: primero los cargos elegidos (si hay) y después el resto,
// del más viejo al más nuevo.
export function planCollection(
  contract: Contract,
  amounts: MoneyTotals,
  debt: Debt,
  priorityIds: string[] = [],
): CollectionPlan {
  const byKey = new Map<string, PlannedPayment>();
  const applied: CollectionPlan['applied'] = [];
  const credit = emptyTotals();
  const paymentFor = (concept: ChargeConcept, currency: Currency) => {
    const key = `${concept}|${currency}`;
    const existing = byKey.get(key);
    if (existing) return existing;
    const created: PlannedPayment = { concept, currency, amount: 0, allocations: [] };
    byKey.set(key, created);
    return created;
  };

  (['USD', 'ARS'] as Currency[]).forEach((currency) => {
    const amount = roundMoney(amounts[currency]);
    if (!(amount > 0)) return;
    const pool = debt.outstanding.filter((v) => v.charge.currency === currency);
    const priority = pool.filter((v) => priorityIds.includes(v.charge.id));
    const { allocations, unallocated } = allocateAmount(amount, priority, pool);
    allocations.forEach((a) => {
      const view = pool.find((v) => v.charge.id === a.chargeId)!;
      const payment = paymentFor(view.charge.concept, currency);
      payment.allocations.push(a);
      payment.amount = roundMoney(payment.amount + a.amount);
      applied.push({ view, amount: a.amount });
    });
    if (unallocated > 0) {
      const payment = paymentFor(creditConcept(contract, currency), currency);
      payment.amount = roundMoney(payment.amount + unallocated);
      addToTotals(credit, unallocated, currency);
    }
  });

  return { payments: [...byKey.values()], applied, credit };
}

// Número → texto editable, con hasta 2 decimales y sin separador de miles ("1551000", "1100.5").
export const toInput = (value: number) =>
  Number.isFinite(value) && value > 0 ? String(Math.round(value * 100) / 100) : '';
