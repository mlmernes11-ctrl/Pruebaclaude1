import { Payment, PaymentStatus } from '../types';
import { startOfToday } from './format';

export function getPaymentStatus(payment: Payment): PaymentStatus {
  if (payment.paidDate) return 'pagado';
  const due = new Date(payment.dueDate);
  return due < startOfToday() ? 'vencido' : 'pendiente';
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pagado: 'Pagado',
  pendiente: 'Pendiente',
  vencido: 'Vencido',
};
