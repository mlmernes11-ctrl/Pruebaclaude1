// =====================================================================
// Ajuste del alquiler
// ---------------------------------------------------------------------
// Cada contrato puede ajustarse cada tantos meses desde su inicio: por IPC, por ICL o un
// porcentaje fijo. El cálculo lo hace el servidor una vez por día (run_monthly_billing); acá
// están solo las fechas y los textos que muestra la app.
// =====================================================================

import { AdjustmentIndex, Contract } from '../types';
import { addMonthsToPeriod, currentPeriod } from './format';

export const ADJUSTMENT_LABEL: Record<AdjustmentIndex, string> = {
  ipc: 'IPC',
  icl: 'ICL',
  fijo: 'Porcentaje fijo',
};

// Cada cuántos meses se puede elegir en el formulario.
export const ADJUSTMENT_MONTH_OPTIONS = [3, 4, 6, 12];

// "IPC cada 3 meses" · "10 % cada 4 meses".
export function describeAdjustment(contract: Contract): string | undefined {
  const { adjustmentIndex, adjustmentMonths, adjustmentPercent } = contract;
  if (!adjustmentIndex || !adjustmentMonths) return undefined;
  const every = adjustmentMonths === 1 ? 'todos los meses' : `cada ${adjustmentMonths} meses`;
  if (adjustmentIndex === 'fijo') return `${String(adjustmentPercent ?? 0).replace('.', ',')} % ${every}`;
  return `${ADJUSTMENT_LABEL[adjustmentIndex]} ${every}`;
}

// El próximo mes en que se ajusta (AAAA-MM), si cae antes del fin del contrato.
export function nextAdjustmentPeriod(contract: Contract): string | undefined {
  if (!contract.adjustmentIndex || !contract.adjustmentMonths) return undefined;
  const base = contract.lastAdjustedPeriod ?? contract.startDate.slice(0, 7);
  const next = addMonthsToPeriod(base, contract.adjustmentMonths);
  return next <= contract.endDate.slice(0, 7) ? next : undefined;
}

// Al cargar o cambiar el ajuste de un contrato que ya viene de antes, el alquiler que se escribe
// es el de hoy (con los ajustes pasados ya incluidos). Devuelve el último mes de ajuste que ya
// pasó, para que el servidor aplique solo los que vienen.
export function lastPassedAdjustmentPeriod(startDate: string, months: number): string | undefined {
  const thisPeriod = currentPeriod();
  let last: string | undefined;
  for (let next = addMonthsToPeriod(startDate.slice(0, 7), months); next <= thisPeriod; next = addMonthsToPeriod(next, months)) {
    last = next;
  }
  return last;
}
