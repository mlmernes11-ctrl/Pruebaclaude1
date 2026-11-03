import { AppData, Charge, ChargeConcept, Contract, Payment, Property, Tenant } from '../types';
import { addMonthsToPeriod, currentPeriod, periodToDueDate, todayISO } from './format';
import { generateId } from './id';

export function buildSampleData(): AppData {
  const now = new Date().toISOString();
  const thisPeriod = currentPeriod();
  const monthStart = (offset: number) => periodToDueDate(addMonthsToPeriod(thisPeriod, offset), 1);

  const property = (values: Omit<Property, 'id' | 'createdAt'>): Property => ({
    ...values,
    id: generateId(),
    createdAt: now,
  });

  const c102 = property({
    title: 'Carpeta 102',
    address: 'Gorriti 4520 2°B',
    neighborhood: 'Palermo',
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
  const c37 = property({
    title: 'Carpeta 37',
    address: 'Bacacay 2150',
    neighborhood: 'Flores',
    type: 'casa',
    rooms: 4,
    bathrooms: 2,
    area: 120,
    rentAmount: 1100,
    rentCurrency: 'USD',
    serviciosAmount: 80000,
    status: 'alquilada',
  });
  const c83 = property({
    title: 'Carpeta 83',
    address: 'Av. Cabildo 1890',
    neighborhood: 'Belgrano',
    type: 'local',
    bathrooms: 1,
    area: 60,
    rentAmount: 1500000,
    rentCurrency: 'ARS',
    expensasAmount: 70000,
    status: 'alquilada',
  });
  const c15 = property({
    title: 'Carpeta 15',
    address: 'Yerbal 2980',
    neighborhood: 'Flores',
    type: 'casa',
    rooms: 3,
    bathrooms: 1,
    area: 75,
    rentAmount: 700,
    rentCurrency: 'USD',
    serviciosAmount: 30000,
    status: 'alquilada',
  });
  const c64 = property({
    title: 'Carpeta 64',
    address: 'Av. Cabildo 2340 5°C',
    neighborhood: 'Belgrano',
    type: 'apartamento',
    rooms: 3,
    bathrooms: 2,
    area: 70,
    rentAmount: 650,
    rentCurrency: 'USD',
    expensasAmount: 120000,
    status: 'alquilada',
  });
  const c120 = property({
    title: 'Carpeta 120',
    address: 'Av. Pueyrredón 450',
    neighborhood: 'Once',
    type: 'local',
    bathrooms: 1,
    area: 45,
    rentAmount: 1200000,
    rentCurrency: 'ARS',
    expensasAmount: 50000,
    status: 'alquilada',
  });
  const c9 = property({
    title: 'Carpeta 9',
    address: 'Av. Corrientes 2850 6°A',
    neighborhood: 'Once',
    type: 'apartamento',
    rooms: 1,
    bathrooms: 1,
    area: 30,
    rentAmount: 380,
    rentCurrency: 'USD',
    expensasAmount: 60000,
    status: 'disponible',
  });
  const c51 = property({
    title: 'Carpeta 51',
    address: 'Juramento 2100 8°',
    neighborhood: 'Belgrano',
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

  const contract102 = contract({
    propertyId: c102.id,
    tenantId: lucia.id,
    startDate: monthStart(-8),
    endDate: monthStart(16),
    rentAmount: c102.rentAmount,
    currency: c102.rentCurrency,
    depositAmount: c102.rentAmount,
    paymentDay: 5,
    status: 'activo',
  });
  const contract37 = contract({
    propertyId: c37.id,
    tenantId: martin.id,
    startDate: monthStart(-14),
    endDate: monthStart(10),
    rentAmount: c37.rentAmount,
    currency: c37.rentCurrency,
    depositAmount: c37.rentAmount,
    paymentDay: 10,
    status: 'activo',
  });
  const contract83 = contract({
    propertyId: c83.id,
    tenantId: espiga.id,
    startDate: monthStart(-4),
    endDate: monthStart(32),
    rentAmount: c83.rentAmount,
    currency: c83.rentCurrency,
    depositAmount: c83.rentAmount * 2,
    paymentDay: 1,
    status: 'activo',
    notes: 'Uso comercial: panadería y café.',
  });
  const contract15 = contract({
    propertyId: c15.id,
    tenantId: valentina.id,
    startDate: monthStart(-10),
    endDate: monthStart(14),
    rentAmount: c15.rentAmount,
    currency: c15.rentCurrency,
    depositAmount: c15.rentAmount,
    paymentDay: 10,
    status: 'activo',
  });
  // Ends next month, so the dashboard also shows a contract about to expire.
  const contract64 = contract({
    propertyId: c64.id,
    tenantId: diego.id,
    startDate: monthStart(-23),
    endDate: monthStart(1),
    rentAmount: c64.rentAmount,
    currency: c64.rentCurrency,
    depositAmount: c64.rentAmount,
    paymentDay: 5,
    status: 'activo',
  });
  const contract120 = contract({
    propertyId: c120.id,
    tenantId: estudioRuiz.id,
    startDate: monthStart(-6),
    endDate: monthStart(30),
    rentAmount: c120.rentAmount,
    currency: c120.rentCurrency,
    depositAmount: c120.rentAmount,
    paymentDay: 1,
    status: 'activo',
  });
  const contract9 = contract({
    propertyId: c9.id,
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

  // Each active contract shows a different collection state on any day of the month.
  // Fully paid: 83 and 15. Only next month pending: 102 and 120. With debt: 37 and 64.
  for (const offset of [-2, -1, 0]) {
    addCharge(contract102, 'alquiler', c102.rentAmount, offset, 'full');
    addCharge(contract102, 'expensas', c102.expensasAmount!, offset, 'full');
    addCharge(contract102, 'servicios', c102.serviciosAmount!, offset, 'full');
    addCharge(contract83, 'alquiler', c83.rentAmount, offset, 'full');
    addCharge(contract83, 'expensas', c83.expensasAmount!, offset, 'full');
    addCharge(contract15, 'alquiler', c15.rentAmount, offset, 'full');
    addCharge(contract15, 'servicios', c15.serviciosAmount!, offset, 'full');
    addCharge(contract120, 'alquiler', c120.rentAmount, offset, 'full');
    addCharge(contract120, 'expensas', c120.expensasAmount!, offset, 'full');
  }
  addCharge(contract102, 'alquiler', c102.rentAmount, 1);
  addCharge(contract120, 'alquiler', c120.rentAmount, 1);

  addCharge(contract37, 'alquiler', c37.rentAmount, -2, 'full', 'Efectivo');
  addCharge(contract37, 'servicios', c37.serviciosAmount!, -2, 'full');
  addCharge(contract37, 'alquiler', c37.rentAmount, -1, 600, 'Efectivo');
  addCharge(contract37, 'servicios', c37.serviciosAmount!, -1, 'full');
  addCharge(contract37, 'alquiler', c37.rentAmount, 0);
  addCharge(contract37, 'servicios', c37.serviciosAmount!, 0);

  addCharge(contract64, 'alquiler', c64.rentAmount, -2, 'full');
  addCharge(contract64, 'expensas', c64.expensasAmount!, -2, 'full');
  addCharge(contract64, 'alquiler', c64.rentAmount, -1, 'full');
  addCharge(contract64, 'expensas', c64.expensasAmount!, -1);
  addCharge(contract64, 'alquiler', c64.rentAmount, 0);
  addCharge(contract64, 'expensas', c64.expensasAmount!, 0);

  return {
    properties: [c102, c37, c83, c15, c64, c120, c9, c51],
    tenants: [lucia, martin, espiga, valentina, diego, estudioRuiz, sofia],
    contracts: [contract102, contract37, contract83, contract15, contract64, contract120, contract9],
    charges,
    payments,
  };
}
