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
  dueDate: string;
  paidDate?: string;
  method?: string;
  notes?: string;
  createdAt: string;
}
