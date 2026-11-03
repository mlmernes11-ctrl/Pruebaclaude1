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
import { CollectionState, contractEndBadge } from './propertySummary';

// ── Liquidaciones ────────────────────────────────────────────────────

// Nombre del estado de una liquidación.
export const CHARGE_STATUS_LABEL: Record<ChargeStatus, string> = {
  vencido: 'Vencida',
  pendiente: 'Por vencer',
  pagado: 'Pagada',
};

// Punto de color al lado de cada liquidación en las listas.
export const CHARGE_STATUS_DOT: Record<ChargeStatus, DotTone> = {
  vencido: 'danger',
  pendiente: 'warning',
  pagado: 'success',
};

// Color de la etiqueta con el estado (en la ficha de la liquidación).
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

// Monto que se muestra de una liquidación: lo que falta pagar, o el total si ya está paga.
export function chargeShownAmount(view: ChargeView): number {
  return view.status === 'pagado' ? view.charge.amount : view.balance;
}

// Cómo va el pago, en pocas palabras: "pagada el 10/10", "pagó US$ 600 de US$ 1.100"
// o "vence el 10/11".
export function chargeProgress(view: ChargeView): string {
  const { charge } = view;
  if (view.status === 'pagado') return `pagada el ${formatDayMonth(view.lastPaymentDate)}`;
  if (view.paid > 0) {
    return `pagó ${formatMoney(view.paid, charge.currency)} de ${formatMoney(charge.amount, charge.currency)}`;
  }
  return `vence el ${formatDayMonth(charge.dueDate)}`;
}

// ── Propiedades ──────────────────────────────────────────────────────

// Punto de color de cada propiedad según cómo viene el cobro.
export const COLLECTION_DOT: Record<CollectionState, DotTone> = {
  deuda: 'danger',
  'por-vencer': 'warning',
  'al-dia': 'success',
  'sin-contrato': 'empty',
  mantenimiento: 'empty',
};

// ── Contratos ────────────────────────────────────────────────────────

// Punto de color de un contrato según su vigencia: rojo si terminó sin renovarse,
// ámbar si vence pronto, verde si está vigente, vacío si ya no está activo.
export function contractDot(contract: Contract): DotTone {
  if (contract.status !== 'activo') return 'empty';
  const end = contractEndBadge(contract);
  if (!end) return 'success';
  return end.tone === 'danger' ? 'danger' : 'warning';
}
