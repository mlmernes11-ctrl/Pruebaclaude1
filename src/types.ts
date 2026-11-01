export type Currency = 'USD' | 'ARS';

export type MoneyTotals = Record<Currency, number>;

export type PropertyType =
  | 'apartamento'
  | 'casa'
  | 'local'
  | 'oficina'
  | 'terreno'
  | 'otro';

export type PropertyStatus = 'disponible' | 'alquilada' | 'mantenimiento';

export interface Property {
  id: string;
  title: string;
  address: string;
  type: PropertyType;
  rooms?: number;
  bathrooms?: number;
  area?: number;
  rentAmount: number;
  rentCurrency: Currency;
  // Expensas and servicios are always billed in pesos.
  expensasAmount?: number;
  serviciosAmount?: number;
  status: PropertyStatus;
  notes?: string;
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt: string;
}

export type ContractStatus = 'activo' | 'finalizado' | 'cancelado';

export interface Contract {
  id: string;
  propertyId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  currency: Currency;
  depositAmount?: number;
  paymentDay: number;
  status: ContractStatus;
  notes?: string;
  createdAt: string;
}

export type PaymentStatus = 'pagado' | 'pendiente' | 'vencido';

export type PaymentConcept = 'alquiler' | 'expensas' | 'servicios';

export interface Payment {
  id: string;
  contractId: string;
  concept: PaymentConcept;
  period: string;
  amount: number;
  currency: Currency;
  dueDate: string;
  paidDate?: string;
  method?: string;
  // Pesos per dollar used when a dollar payment was settled.
  exchangeRate?: number;
  notes?: string;
  createdAt: string;
}
