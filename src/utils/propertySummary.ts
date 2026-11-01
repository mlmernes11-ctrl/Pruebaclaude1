import { Contract, MoneyTotals, Property, Tenant } from '../types';
import { addToTotals, emptyTotals, formatDate, parseLocalDate, startOfToday } from './format';
import { ChargeView } from './ledger';
import { plural } from './text';

// How the rent collection of a property stands; drives its color on the dashboard.
export type CollectionState = 'deuda' | 'por-vencer' | 'al-dia' | 'sin-contrato' | 'mantenimiento';

export const COLLECTION_ORDER: CollectionState[] = [
  'deuda',
  'por-vencer',
  'al-dia',
  'sin-contrato',
  'mantenimiento',
];

export const COLLECTION_LABEL: Record<CollectionState, string> = {
  deuda: 'Con deuda',
  'por-vencer': 'Pago por vencer',
  'al-dia': 'Al día',
  'sin-contrato': 'Sin contrato',
  mantenimiento: 'En mantenimiento',
};

export function collectionCountLabel(state: CollectionState, count: number): string {
  if (state === 'por-vencer') return `${count} ${count === 1 ? 'pago por vencer' : 'pagos por vencer'}`;
  return `${count} ${COLLECTION_LABEL[state].toLowerCase()}`;
}

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
  nextDueDate?: string;
  // Due date of the oldest unpaid overdue charge (how long the debt has been running).
  oldestOverdueDate?: string;
  daysToContractEnd?: number;
  collection: CollectionState;
  notes: string[];
}

export function daysUntil(iso: string): number {
  return Math.round((parseLocalDate(iso).getTime() - startOfToday().getTime()) / 86400000);
}

// Badge for active contracts that already ended or end within CONTRACT_ENDING_SOON_DAYS.
export function contractEndBadge(contract: Contract): { label: string; tone: 'warning' | 'danger' } | undefined {
  if (contract.status !== 'activo') return undefined;
  const days = daysUntil(contract.endDate);
  if (days < 0) return { label: 'Vencido', tone: 'danger' };
  if (days > CONTRACT_ENDING_SOON_DAYS) return undefined;
  return { label: days === 0 ? 'Vence hoy' : `Vence en ${plural(days, 'día', 'días')}`, tone: 'warning' };
}

function bucket(): PaymentBucket {
  return { count: 0, totals: emptyTotals() };
}

export function summarizeProperty(
  property: Property,
  contracts: Contract[],
  chargeViews: ChargeView[],
  tenants: Tenant[],
): PropertySummary {
  const propertyContracts = contracts.filter((c) => c.propertyId === property.id);
  const contractIds = new Set(propertyContracts.map((c) => c.id));
  const activeContract = propertyContracts.find((c) => c.status === 'activo');
  const tenant = tenants.find((t) => t.id === activeContract?.tenantId);

  const overdue = bucket();
  const pending = bucket();
  const paid = bucket();
  let nextDueDate: string | undefined;
  let oldestOverdueDate: string | undefined;
  chargeViews
    .filter((view) => contractIds.has(view.charge.contractId))
    .forEach((view) => {
      if (view.status === 'pagado') {
        paid.count += 1;
        addToTotals(paid.totals, view.paid, view.charge.currency);
        return;
      }
      if (view.status === 'pendiente' && (!nextDueDate || view.charge.dueDate < nextDueDate)) {
        nextDueDate = view.charge.dueDate;
      }
      if (view.status === 'vencido' && (!oldestOverdueDate || view.charge.dueDate < oldestOverdueDate)) {
        oldestOverdueDate = view.charge.dueDate;
      }
      const target = view.status === 'vencido' ? overdue : pending;
      target.count += 1;
      addToTotals(target.totals, view.balance, view.charge.currency);
    });

  const daysToContractEnd = activeContract ? daysUntil(activeContract.endDate) : undefined;

  let collection: CollectionState = 'al-dia';
  if (!activeContract) {
    collection = property.status === 'mantenimiento' ? 'mantenimiento' : 'sin-contrato';
  } else if (overdue.count) collection = 'deuda';
  else if (pending.count) collection = 'por-vencer';

  const notes: string[] = [];
  if (collection === 'sin-contrato') notes.push('Disponible para alquilar');
  if (collection === 'mantenimiento') notes.push(property.notes ?? 'No disponible por ahora');
  if (overdue.count) notes.push(plural(overdue.count, 'liquidación vencida', 'liquidaciones vencidas'));
  if (pending.count && nextDueDate) {
    notes.push(
      `${plural(pending.count, 'liquidación por vencer', 'liquidaciones por vencer')} · vence el ${formatDate(nextDueDate).slice(0, 5)}`,
    );
  }
  if (daysToContractEnd !== undefined && daysToContractEnd < 0) {
    notes.push('Contrato vencido sin renovar');
  } else if (daysToContractEnd !== undefined && daysToContractEnd <= CONTRACT_ENDING_SOON_DAYS) {
    notes.push(`Contrato vence en ${plural(daysToContractEnd, 'día', 'días')}`);
  }
  if (collection === 'al-dia' && notes.length === 0) notes.push('Todas las liquidaciones pagas');

  return {
    property,
    activeContract,
    tenant,
    overdue,
    pending,
    paid,
    nextDueDate,
    oldestOverdueDate,
    daysToContractEnd,
    collection,
    notes,
  };
}

export function sortByCollection(summaries: PropertySummary[]): PropertySummary[] {
  return [...summaries].sort(
    (a, b) => COLLECTION_ORDER.indexOf(a.collection) - COLLECTION_ORDER.indexOf(b.collection),
  );
}
