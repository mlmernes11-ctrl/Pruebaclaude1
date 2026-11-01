import { DotTone } from '../../components/StatusDot';
import { CollectionState } from '../../utils/propertySummary';

// The same traffic light everywhere: red overdue, amber due soon, green up to date, ring = no tenant.
export const COLLECTION_DOT: Record<CollectionState, DotTone> = {
  deuda: 'danger',
  'por-vencer': 'warning',
  'al-dia': 'success',
  'sin-contrato': 'empty',
  mantenimiento: 'empty',
};
