import { Charge, ChargeConcept, Contract, Payment, Property, Tenant } from '../types';
import { addMonthsToPeriod, currentPeriod, periodToDueDate, todayISO } from './format';
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
  const villaCrespo = property({
    title: 'PH Villa Crespo',
    address: 'Thames 980, CABA',
    type: 'casa',
    rooms: 3,
    bathrooms: 1,
    area: 75,
    rentAmount: 700,
    rentCurrency: 'USD',
    serviciosAmount: 30000,
    status: 'alquilada',
  });
  const belgrano = property({
    title: 'Depto Belgrano 5C',
    address: 'Av. Cabildo 2340 5°C, CABA',
    type: 'apartamento',
    rooms: 3,
    bathrooms: 2,
    area: 70,
    rentAmount: 650,
    rentCurrency: 'USD',
    expensasAmount: 120000,
    status: 'alquilada',
  });
  const sanTelmo = property({
    title: 'Local San Telmo',
    address: 'Defensa 1050, CABA',
    type: 'local',
    bathrooms: 1,
    area: 45,
    rentAmount: 1200000,
    rentCurrency: 'ARS',
    expensasAmount: 50000,
    status: 'alquilada',
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
  const valentina = tenant({
    name: 'Valentina Sosa',
    document: 'DNI 40.223.344',
    phone: '11 6666-7788',
    email: 'valentina.sosa@example.com',
  });
  const diego = tenant({
    name: 'Diego Herrera',
    document: 'DNI 31.445.566',
    phone: '11 7777-8899',
  });
  const estudioRuiz = tenant({
    name: 'Estudio Ruiz & Asociados',
    document: 'CUIT 30-70987654-3',
    phone: '11 4321-0000',
    notes: 'Contacto: Mariana Ruiz.',
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
  const contractVillaCrespo = contract({
    propertyId: villaCrespo.id,
    tenantId: valentina.id,
    startDate: monthStart(-10),
    endDate: monthStart(14),
    rentAmount: villaCrespo.rentAmount,
    currency: villaCrespo.rentCurrency,
    depositAmount: villaCrespo.rentAmount,
    paymentDay: 10,
    status: 'activo',
  });
  // Ends next month, so the dashboard also shows a contract about to expire.
  const contractBelgrano = contract({
    propertyId: belgrano.id,
    tenantId: diego.id,
    startDate: monthStart(-23),
    endDate: monthStart(1),
    rentAmount: belgrano.rentAmount,
    currency: belgrano.rentCurrency,
    depositAmount: belgrano.rentAmount,
    paymentDay: 5,
    status: 'activo',
  });
  const contractSanTelmo = contract({
    propertyId: sanTelmo.id,
    tenantId: estudioRuiz.id,
    startDate: monthStart(-6),
    endDate: monthStart(30),
    rentAmount: sanTelmo.rentAmount,
    currency: sanTelmo.rentCurrency,
    depositAmount: sanTelmo.rentAmount,
    paymentDay: 1,
    status: 'activo',
  });

  const charges: Charge[] = [];
  const payments: Payment[] = [];

  // paidAmount: undefined = unpaid, 'full' = paid in full, number = partial; paid on the due date or today if earlier.
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
      date: dueDate > todayISO() ? todayISO() : dueDate,
      amount: paid,
      currency,
      method,
      allocations: [{ chargeId: charge.id, amount: paid }],
      createdAt: now,
    });
  };

  // Each active contract shows a different collection state on any day of the month:
  // Palermo has only next month's rent pending, Urquiza owes money, Cabildo is fully paid.
  for (const offset of [-2, -1, 0]) {
    addCharge(contractPalermo, 'alquiler', palermo.rentAmount, offset, 'full');
    addCharge(contractPalermo, 'expensas', palermo.expensasAmount!, offset, 'full');
    addCharge(contractPalermo, 'servicios', palermo.serviciosAmount!, offset, 'full');
    addCharge(contractCabildo, 'alquiler', cabildo.rentAmount, offset, 'full');
    addCharge(contractCabildo, 'expensas', cabildo.expensasAmount!, offset, 'full');
  }
  addCharge(contractPalermo, 'alquiler', palermo.rentAmount, 1);

  addCharge(contractUrquiza, 'alquiler', urquiza.rentAmount, -2, 'full', 'Efectivo');
  addCharge(contractUrquiza, 'servicios', urquiza.serviciosAmount!, -2, 'full');
  addCharge(contractUrquiza, 'alquiler', urquiza.rentAmount, -1, 600, 'Efectivo');
  addCharge(contractUrquiza, 'servicios', urquiza.serviciosAmount!, -1, 'full');
  addCharge(contractUrquiza, 'alquiler', urquiza.rentAmount, 0);
  addCharge(contractUrquiza, 'servicios', urquiza.serviciosAmount!, 0);

  // Villa Crespo is fully paid, San Telmo only has next month pending, Belgrano owes expensas
  // and this month's rent.
  for (const offset of [-2, -1, 0]) {
    addCharge(contractVillaCrespo, 'alquiler', villaCrespo.rentAmount, offset, 'full');
    addCharge(contractVillaCrespo, 'servicios', villaCrespo.serviciosAmount!, offset, 'full');
    addCharge(contractSanTelmo, 'alquiler', sanTelmo.rentAmount, offset, 'full');
    addCharge(contractSanTelmo, 'expensas', sanTelmo.expensasAmount!, offset, 'full');
  }
  addCharge(contractSanTelmo, 'alquiler', sanTelmo.rentAmount, 1);

  addCharge(contractBelgrano, 'alquiler', belgrano.rentAmount, -2, 'full');
  addCharge(contractBelgrano, 'expensas', belgrano.expensasAmount!, -2, 'full');
  addCharge(contractBelgrano, 'alquiler', belgrano.rentAmount, -1, 'full');
  addCharge(contractBelgrano, 'expensas', belgrano.expensasAmount!, -1);
  addCharge(contractBelgrano, 'alquiler', belgrano.rentAmount, 0);
  addCharge(contractBelgrano, 'expensas', belgrano.expensasAmount!, 0);

  return {
    properties: [palermo, urquiza, cabildo, villaCrespo, belgrano, sanTelmo, caballito, microcentro],
    tenants: [lucia, martin, espiga, valentina, diego, estudioRuiz, sofia],
    contracts: [
      contractPalermo,
      contractUrquiza,
      contractCabildo,
      contractVillaCrespo,
      contractBelgrano,
      contractSanTelmo,
      contractCaballito,
    ],
    charges,
    payments,
  };
}
