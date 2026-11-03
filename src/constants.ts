// =====================================================================
// Catálogos y etiquetas
// ---------------------------------------------------------------------
// Los textos que ve el usuario para cada valor interno (tipos de propiedad, estados, monedas,
// conceptos y métodos de pago) y las opciones de los formularios.
// =====================================================================

import { ContractStatus, Currency, ChargeConcept, PropertyStatus, PropertyType } from './types';

// ── Monedas ───────────────────────────────────────────────────────────

// Moneda que se propone para un alquiler nuevo.
export const DEFAULT_RENT_CURRENCY: Currency = 'USD';

export const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: 'USD', label: 'Dólares (US$)' },
  { value: 'ARS', label: 'Pesos ($)' },
];

// ── Propiedades ───────────────────────────────────────────────────────

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  apartamento: 'Departamento',
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

// ── Contratos ─────────────────────────────────────────────────────────

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  activo: 'Activo',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};

export const CONTRACT_STATUS_OPTIONS = Object.entries(CONTRACT_STATUS_LABEL).map(
  ([value, label]) => ({ value: value as ContractStatus, label }),
);

// ── Pagos y liquidaciones ─────────────────────────────────────────────

export const PAYMENT_METHOD_OPTIONS = [
  'Efectivo',
  'Transferencia',
  'Tarjeta',
  'Otro',
];

export const CONCEPT_LABEL: Record<ChargeConcept, string> = {
  alquiler: 'Alquiler',
  expensas: 'Expensas',
  servicios: 'Servicios',
};

export const CONCEPT_OPTIONS = Object.entries(CONCEPT_LABEL).map(
  ([value, label]) => ({ value: value as ChargeConcept, label }),
);

// ── Colores de las etiquetas del buscador ─────────────────────────────

export const PROPERTY_STATUS_TONE = {
  disponible: 'info',
  alquilada: 'success',
  mantenimiento: 'neutral',
} as const;

export const CONTRACT_STATUS_TONE = {
  activo: 'success',
  finalizado: 'neutral',
  cancelado: 'danger',
} as const;
