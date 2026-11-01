import { Payment, PaymentStatus } from '../types';
import { parseLocalDate, startOfToday } from './format';

export function getPaymentStatus(payment: Payment): PaymentStatus {
  if (payment.paidDate) return 'pagado';
  return parseLocalDate(payment.dueDate) < startOfToday() ? 'vencido' : 'pendiente';
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pagado: 'Pagado',
  pendiente: 'Pendiente',
  vencido: 'Vencido',
};
