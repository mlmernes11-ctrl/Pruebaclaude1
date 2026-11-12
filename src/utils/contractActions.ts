// =====================================================================
// Finalizar o eliminar un contrato
// ---------------------------------------------------------------------
// Finalizar es lo recomendado: conserva todo el historial y deja de generar liquidaciones.
// Eliminar borra el contrato con sus liquidaciones y pagos, así que antes se muestra qué se
// pierde (con los números reales) y se ofrece finalizar en su lugar.
// =====================================================================

import { showConfirm } from '../components/DialogHost';
import { Contract, MoneyTotals, Payment } from '../types';
import { addToTotals, emptyTotals, formatDate, formatTotals, todayISO } from './format';
import { ChargeView } from './ledger';

// ── Qué tiene registrado un contrato ──────────────────────────────────

interface ContractFootprint {
  charges: number;
  payments: number;
  collected: MoneyTotals;
  owed: MoneyTotals;
}

function footprint(charges: ChargeView[], payments: Payment[]): ContractFootprint {
  const collected = emptyTotals();
  const owed = emptyTotals();
  payments.forEach((p) => addToTotals(collected, p.amount, p.currency));
  charges.forEach((v) => addToTotals(owed, v.balance, v.charge.currency));
  return { charges: charges.length, payments: payments.length, collected, owed };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const hasMoney = (t: MoneyTotals) => t.USD > 0 || t.ARS > 0;

// La fecha de fin al finalizar hoy: no antes del inicio ni después del fin pactado.
export function finishedEndDate(contract: Contract): string {
  const today = todayISO();
  if (today < contract.startDate) return contract.startDate;
  return today < contract.endDate ? today : contract.endDate;
}

// ── Finalizar ─────────────────────────────────────────────────────────

export function confirmFinishContract(
  contract: Contract,
  updateContract: (id: string, data: Partial<Contract>) => void,
  onDone?: () => void,
) {
  const endDate = finishedEndDate(contract);
  showConfirm({
    title: 'Finalizar contrato',
    message:
      `El contrato termina el ${formatDate(endDate)}. Se deja de liquidar desde el mes que viene y la ` +
      'propiedad queda disponible. Todo el historial de liquidaciones y pagos se conserva, y si quedó ' +
      'deuda se puede seguir cobrando.',
    confirmLabel: 'Finalizar',
    onConfirm: () => {
      updateContract(contract.id, { status: 'finalizado', endDate });
      onDone?.();
    },
  });
}

// ── Eliminar ──────────────────────────────────────────────────────────

export function confirmDeleteContract(options: {
  contract: Contract;
  charges: ChargeView[];
  payments: Payment[];
  deleteContract: (id: string) => void;
  updateContract: (id: string, data: Partial<Contract>) => void;
  onDeleted: () => void;
  onFinished?: () => void;
}) {
  const { contract, charges, payments } = options;
  const info = footprint(charges, payments);
  const lost: string[] = [];
  if (info.charges) lost.push(plural(info.charges, 'liquidación', 'liquidaciones'));
  if (info.payments) {
    lost.push(`${plural(info.payments, 'pago', 'pagos')} (${formatTotals(info.collected)} cobrados)`);
  }
  const lines = [
    lost.length
      ? `Se van a borrar para siempre ${lost.join(' y ')}.`
      : 'Se va a borrar el contrato.',
    hasMoney(info.owed)
      ? `También se borra la deuda pendiente de ${formatTotals(info.owed)}: deja de existir y no se puede cobrar desde la app.`
      : '',
    'No se puede deshacer.',
    contract.status === 'activo'
      ? 'Si el contrato terminó, usá "Finalizar": conserva todo el historial.'
      : '',
  ].filter(Boolean);

  showConfirm({
    title: 'Eliminar contrato',
    message: lines.join('\n\n'),
    confirmLabel: 'Eliminar definitivamente',
    destructive: true,
    onConfirm: () => {
      options.deleteContract(contract.id);
      options.onDeleted();
    },
    alternative:
      contract.status === 'activo'
        ? {
            label: 'Finalizar en su lugar',
            onPress: () => {
              options.updateContract(contract.id, { status: 'finalizado', endDate: finishedEndDate(contract) });
              options.onFinished?.();
            },
          }
        : undefined,
  });
}
