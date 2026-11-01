import { Charge, ChargeConcept, Contract, Payment, Property, Tenant } from '../types';
import { addMonthsToPeriod, currentPeriod, periodToDueDate } from './format';
import { generateId } from './id';

export interface SampleData {
  properties: Property[];
  tenants: Tenant[];
  contracts: Contract[];
  charges: Charge[];
  payments: Payment[];
}

export function buildSampleData(): SampleData {
  const now = new Date().toISOString();
  const thisPeriod = currentPeriod();
  const monthStart = (offset: number) => periodToDueDate(addMonthsToPeriod(thisPeriod, offset), 1);

  const property = (values: Omit<Property, 'id' | 'createdAt'>): Property => ({
    ...values,
    id: generateId(),
    createdAt: now,
  });

  const palermo = property({
    title: 'Depto Palermo 2B',
    address: 'Gorriti 4520 2°B, CABA',
    type: 'apartamento',
    rooms: 2,
    bathrooms: 1,
    area: 48,
    rentAmount: 550,
    rentCurrency: 'USD',
    expensasAmount: 95000,
    serviciosAmount: 40000,
    status: 'alquilada',
  });
  const urquiza = property({
    title: 'Casa Villa Urquiza',
    address: 'Bauness 2150, CABA',
    type: 'casa',
    rooms: 4,
    bathrooms: 2,
    area: 120,
    rentAmount: 1100,
    rentCurrency: 'USD',
    serviciosAmount: 80000,
    status: 'alquilada',
  });
  const cabildo = property({
    title: 'Local Av. Cabildo',
    address: 'Av. Cabildo 1890, CABA',
    type: 'local',
    bathrooms: 1,
    area: 60,
    rentAmount: 1500000,
    rentCurrency: 'ARS',
    expensasAmount: 70000,
    status: 'alquilada',
  });
  const caballito = property({
    title: 'Monoambiente Caballito',
    address: 'Av. Rivadavia 5100 6°A, CABA',
    type: 'apartamento',
    rooms: 1,
    bathrooms: 1,
    area: 30,
    rentAmount: 380,
    rentCurrency: 'USD',
    expensasAmount: 60000,
    status: 'disponible',
  });
  const microcentro = property({
    title: 'Oficina Microcentro',
    address: 'Florida 520 8°, CABA',
    type: 'oficina',
    bathrooms: 2,
    area: 85,
    rentAmount: 1000,
    rentCurrency: 'USD',
    expensasAmount: 150000,
    status: 'mantenimiento',
    notes: 'Pintura y arreglo de aire acondicionado antes de volver a publicar.',
  });

  const tenant = (values: Omit<Tenant, 'id' | 'createdAt'>): Tenant => ({
    ...values,
    id: generateId(),
    createdAt: now,
  });

  const lucia = tenant({
    name: 'Lucía Fernández',
    document: 'DNI 34.567.890',
    phone: '11 5555-1234',
    email: 'lucia.fernandez@example.com',
  });
  const martin = tenant({
    name: 'Martín Gómez',
    document: 'DNI 29.876.543',
    phone: '11 4444-5678',
    email: 'martin.gomez@example.com',
  });
  const espiga = tenant({
    name: 'Panadería La Espiga SRL',
    document: 'CUIT 30-71234567-8',
    phone: '11 3333-9012',
    notes: 'Contacto: Carlos Ibáñez (socio gerente).',
  });
  const sofia = tenant({
    name: 'Sofía Ruiz',
    document: 'DNI 38.112.233',
    phone: '11 2222-3456',
  });

  const contract = (values: Omit<Contract, 'id' | 'createdAt'>): Contract => ({
    ...values,
    id: generateId(),
    createdAt: now,
  });

  const contractPalermo = contract({
    propertyId: palermo.id,
    tenantId: lucia.id,
    startDate: monthStart(-8),
    endDate: monthStart(16),
    rentAmount: palermo.rentAmount,
    currency: palermo.rentCurrency,
    depositAmount: palermo.rentAmount,
    paymentDay: 5,
    status: 'activo',
  });
  const contractUrquiza = contract({
    propertyId: urquiza.id,
    tenantId: martin.id,
    startDate: monthStart(-14),
    endDate: monthStart(10),
    rentAmount: urquiza.rentAmount,
    currency: urquiza.rentCurrency,
    depositAmount: urquiza.rentAmount,
    paymentDay: 10,
    status: 'activo',
  });
  const contractCabildo = contract({
    propertyId: cabildo.id,
    tenantId: espiga.id,
    startDate: monthStart(-4),
    endDate: monthStart(32),
    rentAmount: cabildo.rentAmount,
    currency: cabildo.rentCurrency,
    depositAmount: cabildo.rentAmount * 2,
    paymentDay: 1,
    status: 'activo',
    notes: 'Uso comercial: panadería y café.',
  });
  const contractCaballito = contract({
    propertyId: caballito.id,
    tenantId: sofia.id,
    startDate: monthStart(-26),
    endDate: monthStart(-2),
    rentAmount: 350,
    currency: 'USD',
    paymentDay: 5,
    status: 'finalizado',
  });

  const charges: Charge[] = [];
  const payments: Payment[] = [];

  // paidAmount: undefined = unpaid, 'full' = paid in full on the due date, number = partial.
  const addCharge = (
    target: Contract,
    concept: ChargeConcept,
    amount: number,
    monthOffset: number,
    paidAmount?: 'full' | number,
    method = 'Transferencia',
  ) => {
    const period = addMonthsToPeriod(thisPeriod, monthOffset);
    const dueDate = periodToDueDate(period, target.paymentDay);
    const currency = concept === 'alquiler' ? target.currency : 'ARS';
    const charge: Charge = {
      id: generateId(),
      contractId: target.id,
      concept,
      period,
      amount,
      currency,
      dueDate,
      autoGenerated: true,
      createdAt: now,
    };
    charges.push(charge);
    if (paidAmount === undefined) return;
    const paid = paidAmount === 'full' ? amount : paidAmount;
    payments.push({
      id: generateId(),
      contractId: target.id,
      concept,
      date: dueDate,
      amount: paid,
      currency,
      method,
      allocations: [{ chargeId: charge.id, amount: paid }],
      createdAt: now,
    });
  };

  // Two months back everything is settled; last month has an unpaid charge and a partial
  // payment; the current month is open (pending or overdue depending on today's date).
  addCharge(contractPalermo, 'alquiler', palermo.rentAmount, -2, 'full');
  addCharge(contractPalermo, 'expensas', palermo.expensasAmount!, -2, 'full');
  addCharge(contractPalermo, 'servicios', palermo.serviciosAmount!, -2, 'full');
  addCharge(contractUrquiza, 'alquiler', urquiza.rentAmount, -2, 'full', 'Efectivo');
  addCharge(contractUrquiza, 'servicios', urquiza.serviciosAmount!, -2, 'full');
  addCharge(contractCabildo, 'alquiler', cabildo.rentAmount, -2, 'full');
  addCharge(contractCabildo, 'expensas', cabildo.expensasAmount!, -2, 'full');

  addCharge(contractPalermo, 'alquiler', palermo.rentAmount, -1, 'full');
  addCharge(contractPalermo, 'expensas', palermo.expensasAmount!, -1, 'full');
  addCharge(contractPalermo, 'servicios', palermo.serviciosAmount!, -1);
  addCharge(contractUrquiza, 'alquiler', urquiza.rentAmount, -1, 600, 'Efectivo');
  addCharge(contractUrquiza, 'servicios', urquiza.serviciosAmount!, -1, 'full');
  addCharge(contractCabildo, 'alquiler', cabildo.rentAmount, -1, 'full');
  addCharge(contractCabildo, 'expensas', cabildo.expensasAmount!, -1, 'full');

  addCharge(contractPalermo, 'alquiler', palermo.rentAmount, 0);
  addCharge(contractPalermo, 'expensas', palermo.expensasAmount!, 0);
  addCharge(contractPalermo, 'servicios', palermo.serviciosAmount!, 0);
  addCharge(contractUrquiza, 'alquiler', urquiza.rentAmount, 0);
  addCharge(contractUrquiza, 'servicios', urquiza.serviciosAmount!, 0);
  addCharge(contractCabildo, 'alquiler', cabildo.rentAmount, 0);
  addCharge(contractCabildo, 'expensas', cabildo.expensasAmount!, 0);

  // Next month's rent is always ahead of today, so the sample always shows upcoming charges.
  addCharge(contractPalermo, 'alquiler', palermo.rentAmount, 1);
  addCharge(contractUrquiza, 'alquiler', urquiza.rentAmount, 1);
  addCharge(contractCabildo, 'alquiler', cabildo.rentAmount, 1);

  return {
    properties: [palermo, urquiza, cabildo, caballito, microcentro],
    tenants: [lucia, martin, espiga, sofia],
    contracts: [contractPalermo, contractUrquiza, contractCabildo, contractCaballito],
    charges,
    payments,
  };
}
