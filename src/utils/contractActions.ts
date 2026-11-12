// =====================================================================
// Finalizar o eliminar un contrato
// ---------------------------------------------------------------------
// Finalizar es lo recomendado: conserva todo el historial y deja de generar liquidaciones.
// Eliminar borra el contrato con sus liquidaciones y pagos, así que pide confirmación.
// =====================================================================

import { showConfirm } from '../components/DialogHost';
import { Contract } from '../types';
import { todayISO } from './format';

// La fecha de fin al finalizar hoy: no antes del inicio ni después del fin pactado.
function finishedEndDate(contract: Contract): string {
  const today = todayISO();
  if (today < contract.startDate) return contract.startDate;
  return today < contract.endDate ? today : contract.endDate;
}

export function confirmFinishContract(
  contract: Contract,
  updateContract: (id: string, data: Partial<Contract>) => void,
) {
  showConfirm({
    title: '¿Finalizar contrato?',
    message: 'Termina hoy y se conserva todo su historial.',
    confirmLabel: 'Finalizar',
    onConfirm: () => updateContract(contract.id, { status: 'finalizado', endDate: finishedEndDate(contract) }),
  });
}

export function confirmDeleteContract(contract: Contract, deleteContract: (id: string) => void, onDeleted: () => void) {
  showConfirm({
    title: '¿Eliminar contrato?',
    message:
      'Se elimina el contrato con todo su historial de pagos y liquidaciones. Es una acción permanente e irreversible.',
    confirmLabel: 'Eliminar',
    destructive: true,
    onConfirm: () => {
      deleteContract(contract.id);
      onDeleted();
    },
  });
}
