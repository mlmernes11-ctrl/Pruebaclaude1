import { ContractStatus, Currency, PaymentConcept, PropertyStatus, PropertyType } from './types';

export const DEFAULT_RENT_CURRENCY: Currency = 'USD';

export const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: 'USD', label: 'Dólares (US$)' },
  { value: 'ARS', label: 'Pesos ($)' },
];

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  local: 'Local comercial',
  oficina: 'Oficina',
  terreno: 'Terreno',
  otro: 'Otro',
};

export const PROPERTY_TYPE_OPTIONS = Object.entries(PROPERTY_TYPE_LABEL).map(
  ([value, label]) => ({ value: value as PropertyType, label }),
);

export const PROPERTY_STATUS_LABEL: Record<PropertyStatus, string> = {
  disponible: 'Disponible',
  alquilada: 'Alquilada',
  mantenimiento: 'Mantenimiento',
};

export const PROPERTY_STATUS_OPTIONS = Object.entries(PROPERTY_STATUS_LABEL).map(
  ([value, label]) => ({ value: value as PropertyStatus, label }),
);

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  activo: 'Activo',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};

export const CONTRACT_STATUS_OPTIONS = Object.entries(CONTRACT_STATUS_LABEL).map(
  ([value, label]) => ({ value: value as ContractStatus, label }),
);

export const PAYMENT_METHOD_OPTIONS = [
  'Efectivo',
  'Transferencia',
  'Tarjeta',
  'Otro',
];

export const PAYMENT_CONCEPT_LABEL: Record<PaymentConcept, string> = {
  alquiler: 'Alquiler',
  expensas: 'Expensas',
  servicios: 'Servicios',
};

export const PAYMENT_CONCEPT_OPTIONS = Object.entries(PAYMENT_CONCEPT_LABEL).map(
  ([value, label]) => ({ value: value as PaymentConcept, label }),
);
