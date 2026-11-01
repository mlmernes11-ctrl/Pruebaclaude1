import { Contract, MoneyTotals, Property, Tenant } from '../types';
import { addToTotals, emptyTotals, formatDate, parseLocalDate, startOfToday } from './format';
import { ChargeView } from './ledger';

// How the rent collection of a property stands; drives its color on the dashboard.
export type CollectionState = 'deuda' | 'por-vencer' | 'al-dia' | 'sin-contrato';

export const COLLECTION_ORDER: CollectionState[] = ['deuda', 'por-vencer', 'al-dia', 'sin-contrato'];

export const COLLECTION_LABEL: Record<CollectionState, string> = {
  deuda: 'Con deuda',
  'por-vencer': 'Pago por vencer',
  'al-dia': 'Al día',
  'sin-contrato': 'Sin contrato',
};

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
  daysToContractEnd?: number;
  collection: CollectionState;
  notes: string[];
}

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
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
      const target = view.status === 'vencido' ? overdue : pending;
      target.count += 1;
      addToTotals(target.totals, view.balance, view.charge.currency);
    });

  const daysToContractEnd = activeContract
    ? Math.round(
        (parseLocalDate(activeContract.endDate).getTime() - startOfToday().getTime()) / 86400000,
      )
    : undefined;

  let collection: CollectionState = 'al-dia';
  if (!activeContract) collection = 'sin-contrato';
  else if (overdue.count) collection = 'deuda';
  else if (pending.count) collection = 'por-vencer';

  const notes: string[] = [];
  if (!activeContract) {
    notes.push(property.status === 'mantenimiento' ? 'En mantenimiento' : 'Disponible para alquilar');
  }
  if (overdue.count) notes.push(plural(overdue.count, 'cuota vencida', 'cuotas vencidas'));
  if (pending.count && nextDueDate) {
    notes.push(
      `${plural(pending.count, 'cuota por vencer', 'cuotas por vencer')} · vence el ${formatDate(nextDueDate).slice(0, 5)}`,
    );
  }
  if (daysToContractEnd !== undefined && daysToContractEnd < 0) {
    notes.push('Contrato vencido sin renovar');
  } else if (daysToContractEnd !== undefined && daysToContractEnd <= CONTRACT_ENDING_SOON_DAYS) {
    notes.push(`Contrato vence en ${plural(daysToContractEnd, 'día', 'días')}`);
  }
  if (collection === 'al-dia' && notes.length === 0) notes.push('Todas las cuotas pagas');

  return {
    property,
    activeContract,
    tenant,
    overdue,
    pending,
    paid,
    nextDueDate,
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
