// =====================================================================
// Resumen de cada propiedad
// ---------------------------------------------------------------------
// Junta en un solo lugar cómo está una propiedad: contrato activo, inquilino, deuda,
// próximo vencimiento y su estado de cobro (con deuda, por vencer, al día, etc.).
// =====================================================================

import { Contract, MoneyTotals, Property, Tenant } from '../types';
import { addToTotals, emptyTotals, parseLocalDate, startOfToday } from './format';
import { ChargeView } from './ledger';
import { plural } from './text';

// Cómo viene el cobro de una propiedad; define su color en las listas.
export type CollectionState = 'deuda' | 'por-vencer' | 'al-dia' | 'sin-contrato' | 'mantenimiento';

// Días antes del fin de un contrato en que se empieza a avisar.
export const CONTRACT_ENDING_SOON_DAYS = 60;

// Cantidad y total de un grupo de liquidaciones.
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
  nextDueDate?: string;
  // Vencimiento de la deuda más vieja (para saber hace cuánto está en mora).
  oldestOverdueDate?: string;
  collection: CollectionState;
}

// ── Contratos ─────────────────────────────────────────────────────────

// Días que faltan hasta una fecha (negativo si ya pasó).
export function daysUntil(iso: string): number {
  return Math.round((parseLocalDate(iso).getTime() - startOfToday().getTime()) / 86400000);
}

// Aviso para contratos activos que ya terminaron o terminan dentro de CONTRACT_ENDING_SOON_DAYS días.
export function contractEndBadge(contract: Contract): { label: string; tone: 'warning' | 'danger' } | undefined {
  if (contract.status !== 'activo') return undefined;
  const days = daysUntil(contract.endDate);
  if (days < 0) return { label: 'Vencido', tone: 'danger' };
  if (days > CONTRACT_ENDING_SOON_DAYS) return undefined;
  return { label: days === 0 ? 'Vence hoy' : `Vence en ${plural(days, 'día', 'días')}`, tone: 'warning' };
}

// ── Resumen de la propiedad ───────────────────────────────────────────

function bucket(): PaymentBucket {
  return { count: 0, totals: emptyTotals() };
}

// Arma el resumen de una propiedad con sus contratos y liquidaciones.
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
  let nextDueDate: string | undefined;
  let oldestOverdueDate: string | undefined;
  chargeViews
    .filter((view) => contractIds.has(view.charge.contractId))
    .forEach((view) => {
      if (view.status === 'pagado') return;
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

  let collection: CollectionState = 'al-dia';
  if (!activeContract) {
    collection = property.status === 'mantenimiento' ? 'mantenimiento' : 'sin-contrato';
  } else if (overdue.count) collection = 'deuda';
  else if (pending.count) collection = 'por-vencer';

  return {
    property,
    activeContract,
    tenant,
    overdue,
    pending,
    nextDueDate,
    oldestOverdueDate,
    collection,
  };
}
