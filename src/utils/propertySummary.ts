import { Contract, MoneyTotals, Payment, Property, Tenant } from '../types';
import { addToTotals, emptyTotals, parseLocalDate, startOfToday } from './format';
import { getPaymentStatus } from './payments';

export type AttentionLevel = 'danger' | 'warning' | 'ok' | 'idle';

export const CONTRACT_ENDING_SOON_DAYS = 60;

export interface PaymentBucket {
  count: number;
  totals: MoneyTotals;
}

export interface PropertySummary {
  property: Property;
  activeContract?: Contract;
  tenant?: Tenant;
  overdue: PaymentBucket;
  pending: PaymentBucket;
  paid: PaymentBucket;
  daysToContractEnd?: number;
  level: AttentionLevel;
  alerts: string[];
}

const LEVEL_ORDER: Record<AttentionLevel, number> = { danger: 0, warning: 1, ok: 2, idle: 3 };

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function bucket(): PaymentBucket {
  return { count: 0, totals: emptyTotals() };
}

export function summarizeProperty(
  property: Property,
  contracts: Contract[],
  payments: Payment[],
  tenants: Tenant[],
): PropertySummary {
  const propertyContracts = contracts.filter((c) => c.propertyId === property.id);
  const contractIds = new Set(propertyContracts.map((c) => c.id));
  const activeContract = propertyContracts.find((c) => c.status === 'activo');
  const tenant = tenants.find((t) => t.id === activeContract?.tenantId);

  const overdue = bucket();
  const pending = bucket();
  const paid = bucket();
  payments
    .filter((p) => contractIds.has(p.contractId))
    .forEach((payment) => {
      const status = getPaymentStatus(payment);
      const target = status === 'vencido' ? overdue : status === 'pendiente' ? pending : paid;
      target.count += 1;
      addToTotals(target.totals, payment.amount, payment.currency);
    });

  const daysToContractEnd = activeContract
    ? Math.round(
        (parseLocalDate(activeContract.endDate).getTime() - startOfToday().getTime()) / 86400000,
      )
    : undefined;

  const alerts: string[] = [];
  let level: AttentionLevel = activeContract ? 'ok' : 'idle';
  const raise = (next: AttentionLevel) => {
    if (LEVEL_ORDER[next] < LEVEL_ORDER[level]) level = next;
  };

  if (overdue.count) {
    alerts.push(plural(overdue.count, 'pago vencido', 'pagos vencidos'));
    raise('danger');
  }
  if (daysToContractEnd !== undefined && daysToContractEnd < 0) {
    alerts.push('Contrato vencido sin renovar');
    raise('danger');
  } else if (daysToContractEnd !== undefined && daysToContractEnd <= CONTRACT_ENDING_SOON_DAYS) {
    alerts.push(`Contrato vence en ${plural(daysToContractEnd, 'día', 'días')}`);
    raise('warning');
  }
  if (!alerts.length) {
    if (activeContract) alerts.push('Al día');
    else alerts.push(property.status === 'mantenimiento' ? 'En mantenimiento' : 'Sin contrato activo');
  }
  if (pending.count) {
    alerts.push(plural(pending.count, 'pago por vencer', 'pagos por vencer'));
  }

  return {
    property,
    activeContract,
    tenant,
    overdue,
    pending,
    paid,
    daysToContractEnd,
    level,
    alerts,
  };
}

export function sortByAttention(summaries: PropertySummary[]): PropertySummary[] {
  return [...summaries].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}
