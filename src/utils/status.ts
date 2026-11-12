// =====================================================================
// Colores y textos de estado (el "semáforo" de toda la app)
// ---------------------------------------------------------------------
// Rojo = en mora · ámbar = por vencer · verde = al día · círculo vacío = sin inquilino.
// Todo lo que decide qué color o etiqueta lleva algo vive acá, para que sea igual en todas
// las pantallas y se cambie en un solo lugar.
// =====================================================================

import { BadgeTone } from '../components/Badge';
import { ValueTone } from '../components/ListRow';
import { DotTone } from '../components/StatusDot';
import { ChargeStatus, Contract } from '../types';
import { formatDayMonth, formatMoney } from './format';
import { ChargeView } from './ledger';
import { contractEndBadge, daysUntil, PropertySummary } from './propertySummary';
import { plural } from './text';

// ── Cargos ────────────────────────────────────────────────────

// Nombre del estado de un cargo.
export const CHARGE_STATUS_LABEL: Record<ChargeStatus, string> = {
  vencido: 'Vencido',
  pendiente: 'A vencer',
  pagado: 'Pagado',
};

// Punto de color al lado de cada cargo en las listas.
export const CHARGE_STATUS_DOT: Record<ChargeStatus, DotTone> = {
  vencido: 'danger',
  pendiente: 'warning',
  pagado: 'success',
};

// Color de la etiqueta con el estado (en la ficha de el cargo).
export const CHARGE_STATUS_BADGE: Record<ChargeStatus, BadgeTone> = {
  vencido: 'danger',
  pendiente: 'warning',
  pagado: 'success',
};

// Color del monto a la derecha: rojo si está vencida, gris si ya se pagó.
export const CHARGE_VALUE_TONE: Record<ChargeStatus, ValueTone> = {
  vencido: 'danger',
  pendiente: 'default',
  pagado: 'muted',
};

// Monto que se muestra de un cargo: el saldo, o el total si ya está pago.
export function chargeShownAmount(view: ChargeView): number {
  return view.status === 'pagado' ? view.charge.amount : view.balance;
}

// Cómo va el cobro, en pocas palabras: "pagado el 10/10", "pago parcial: US$ 600 de US$ 1.100"
// o "vence el 10/11".
export function chargeProgress(view: ChargeView): string {
  const { charge } = view;
  if (view.status === 'pagado') return `pagado el ${formatDayMonth(view.lastPaymentDate)}`;
  if (view.paid > 0) {
    return `pago parcial: ${formatMoney(view.paid, charge.currency)} de ${formatMoney(charge.amount, charge.currency)}`;
  }
  return `vence el ${formatDayMonth(charge.dueDate)}`;
}

// ── Propiedades ──────────────────────────────────────────────────────

// Cómo viene el pago de una propiedad, en la etiqueta de color: "Debe 38 días", "Vence el 01/12",
// "Al día", "Disponible" o "En mantenimiento".
export function collectionBadge(summary: PropertySummary, today: string): { label: string; tone: BadgeTone } {
  switch (summary.collection) {
    case 'deuda': {
      const days = Math.max(1, -daysUntil(summary.oldestOverdueDate ?? today));
      return { label: `Debe ${plural(days, 'día', 'días')}`, tone: 'danger' };
    }
    case 'por-vencer':
      return { label: `Vence el ${formatDayMonth(summary.nextDueDate)}`, tone: 'warning' };
    case 'al-dia':
      return { label: 'Al día', tone: 'success' };
    case 'mantenimiento':
      return { label: 'En mantenimiento', tone: 'neutral' };
    default:
      return { label: 'Disponible', tone: 'primary' };
  }
}

// ── Contratos ────────────────────────────────────────────────────────

// Punto de color de un contrato según su vigencia: rojo si terminó sin renovarse,
// ámbar si vence pronto, verde si está vigente, vacío si ya no está activo.
export function contractDot(contract: Contract): DotTone {
  if (contract.status !== 'activo') return 'empty';
  const end = contractEndBadge(contract);
  if (!end) return 'success';
  return end.tone === 'danger' ? 'danger' : 'warning';
}
