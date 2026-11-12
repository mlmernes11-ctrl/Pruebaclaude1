// =====================================================================
// Mensajes por WhatsApp
// ---------------------------------------------------------------------
// Arma el enlace de WhatsApp (con el mensaje ya escrito) para recordar una deuda o mandar el
// comprobante de un pago. Si el inquilino no tiene teléfono cargado, WhatsApp abre igual y
// deja elegir el contacto.
// =====================================================================

import { Linking } from 'react-native';
import { CONCEPT_LABEL } from '../constants';
import { RATE_SOURCE_LABEL } from '../context/ExchangeRateContext';
import { Payment, Property, Tenant } from '../types';
import { addToTotals, emptyTotals, formatDate, formatMoney, formatPeriod, formatTotals } from './format';
import { ChargeView, sortOldestFirst } from './ledger';

// ── Enlace ────────────────────────────────────────────────────────────

// Celulares argentinos: código de país 54 más el 9 de los celulares.
export function whatsappUrl(phone?: string, text?: string): string {
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  if (!phone?.trim()) return `https://wa.me/${query}`;
  let digits = phone.replace(/\D/g, '').replace(/^0/, '');
  if (!digits.startsWith('54')) digits = `549${digits}`;
  return `https://wa.me/${digits}${query}`;
}

export function openWhatsapp(phone?: string, text?: string) {
  Linking.openURL(whatsappUrl(phone, text)).catch(() => undefined);
}

const firstName = (tenant?: Tenant) => tenant?.name.trim().split(/\s+/)[0] ?? '';

// ── Recordar deuda ────────────────────────────────────────────────────

// Lista lo que falta pagar (de la más vieja a la más nueva) con su vencimiento y el total.
export function debtReminderText(tenant: Tenant | undefined, property: Property | undefined, owed: ChargeView[]): string {
  const total = emptyTotals();
  const lines = sortOldestFirst(owed).map((view) => {
    addToTotals(total, view.balance, view.charge.currency);
    const when = view.status === 'vencido' ? `venció el ${formatDate(view.charge.dueDate)}` : `vence el ${formatDate(view.charge.dueDate)}`;
    return `• ${CONCEPT_LABEL[view.charge.concept]} ${formatPeriod(view.charge.period).toLowerCase()}: ${formatMoney(view.balance, view.charge.currency)} (${when})`;
  });
  return [
    `Hola${firstName(tenant) ? ` ${firstName(tenant)}` : ''}, te escribo por ${property?.title ?? 'el alquiler'}.`,
    'Te paso el detalle de lo pendiente:',
    '',
    ...lines,
    '',
    `Total: ${formatTotals(total)}`,
    '',
    'Cualquier duda avisame. ¡Gracias!',
  ].join('\n');
}

// ── Comprobante de pago ───────────────────────────────────────────────

// Un comprobante con todo lo cobrado en el mismo recibo (alquiler, expensas, etc.).
export function receiptText(
  payments: Payment[],
  tenant: Tenant | undefined,
  property: Property | undefined,
  periodOf: (chargeId: string) => string | undefined,
  stillOwed: ChargeView[],
): string {
  const first = payments[0];
  const total = emptyTotals();
  const lines = payments.map((p) => {
    addToTotals(total, p.amount, p.currency);
    const periods = [...new Set(p.allocations.map((a) => periodOf(a.chargeId)).filter(Boolean) as string[])]
      .sort()
      .map((period) => formatPeriod(period).toLowerCase());
    const rateName = ['dólar', p.rateSource ? RATE_SOURCE_LABEL[p.rateSource].toLowerCase() : ''].filter(Boolean).join(' ');
    const inPesos =
      p.paidAmount && p.paidCurrency === 'ARS' && p.exchangeRate
        ? ` (pagado ${formatMoney(p.paidAmount, 'ARS')}, ${rateName} ${formatMoney(p.exchangeRate, 'ARS')})`
        : '';
    return `• ${CONCEPT_LABEL[p.concept]}${periods.length ? ` ${periods.join(', ')}` : ''}: ${formatMoney(p.amount, p.currency)}${inPesos}`;
  });
  const owed = emptyTotals();
  stillOwed.forEach((v) => addToTotals(owed, v.balance, v.charge.currency));
  return [
    '*Comprobante de pago*',
    `Propiedad: ${property?.title ?? '-'}${property?.address ? ` (${property.address})` : ''}`,
    `Inquilino: ${tenant?.name ?? '-'}`,
    `Fecha: ${formatDate(first.date)}${first.method ? ` · ${first.method}` : ''}`,
    '',
    ...lines,
    '',
    `Total recibido: ${formatTotals(total)}`,
    owed.USD > 0 || owed.ARS > 0 ? `Queda pendiente: ${formatTotals(owed)}` : 'No queda nada pendiente. ¡Gracias!',
  ].join('\n');
}
