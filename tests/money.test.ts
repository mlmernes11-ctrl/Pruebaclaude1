/// <reference types="node" />
// =====================================================================
// Pruebas de los cálculos de plata
// ---------------------------------------------------------------------
// Reparto de un cobro, saldo a favor, cobros por concepto y moneda, "Actualizar importes",
// ajustes del alquiler y generación de cargos (incluida la renovación sin cobrar dos veces).
// Se corren con: npm test
// =====================================================================

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { planCollection, debtOf } from '../src/screens/payments/collect/collectMath';
import { ImportRow, planImportChange } from '../src/screens/imports/importsLogic';
import { Charge, Contract, Payment, Property } from '../src/types';
import { lastPassedAdjustmentPeriod, nextAdjustmentPeriod } from '../src/utils/adjustments';
import { buildMissingCharges } from '../src/utils/chargeGeneration';
import { addMonthsToPeriod, currentPeriod } from '../src/utils/format';
import { allocateAmount, applyCredits, buildLedger, roundMoney, unallocatedAmount, viewCharge } from '../src/utils/ledger';

// ── Datos de prueba ───────────────────────────────────────────────────

const PAST = '2020-01-05';
const FUTURE = '2099-01-05';

function charge(id: string, amount: number, extra: Partial<Charge> = {}): Charge {
  return {
    id,
    contractId: 'c1',
    concept: 'alquiler',
    period: '2026-10',
    amount,
    currency: 'ARS',
    dueDate: PAST,
    createdAt: '2026-01-01T00:00:00Z',
    ...extra,
  };
}

function payment(id: string, amount: number, allocations: { chargeId: string; amount: number }[], extra: Partial<Payment> = {}): Payment {
  return {
    id,
    contractId: 'c1',
    concept: 'alquiler',
    date: '2026-10-10',
    amount,
    currency: 'ARS',
    allocations,
    createdAt: '2026-10-10T00:00:00Z',
    ...extra,
  };
}

function contract(extra: Partial<Contract> = {}): Contract {
  return {
    id: 'c1',
    propertyId: 'p1',
    tenantId: 't1',
    startDate: '2024-01-01',
    endDate: '2099-01-01',
    rentAmount: 500000,
    currency: 'ARS',
    paymentDay: 5,
    status: 'activo',
    createdAt: '2024-01-01T00:00:00Z',
    ...extra,
  };
}

const property: Property = {
  id: 'p1',
  title: 'Carpeta 1',
  address: 'Calle 1',
  type: 'apartamento',
  rentCurrency: 'ARS',
  expensasAmount: 80000,
  status: 'alquilada',
  createdAt: '2024-01-01T00:00:00Z',
};

const views = (charges: Charge[], payments: Payment[] = []) => {
  const ledger = buildLedger(payments);
  return charges.map((c) => viewCharge(c, ledger));
};

// ── Estado de cada cargo ──────────────────────────────────────────────

describe('estado de un cargo', () => {
  it('pago parcial deja el saldo y sigue vencido', () => {
    const [v] = views([charge('a', 1000)], [payment('x', 400, [{ chargeId: 'a', amount: 400 }])]);
    assert.equal(v.paid, 400);
    assert.equal(v.balance, 600);
    assert.equal(v.status, 'vencido');
  });

  it('pagado completo queda pagado', () => {
    const [v] = views([charge('a', 1000)], [payment('x', 1000, [{ chargeId: 'a', amount: 1000 }])]);
    assert.equal(v.balance, 0);
    assert.equal(v.status, 'pagado');
  });

  it('sin pagar y con vencimiento futuro queda a vencer', () => {
    const [v] = views([charge('a', 1000, { dueDate: FUTURE })]);
    assert.equal(v.status, 'pendiente');
  });

  it('redondea centavos sin errores de coma', () => {
    assert.equal(roundMoney(0.1 + 0.2), 0.3);
    assert.equal(roundMoney(1100.005), 1100.01);
  });
});

// ── Reparto de un cobro ───────────────────────────────────────────────

describe('reparto de un cobro', () => {
  it('cubre primero los elegidos y después del más viejo al más nuevo; lo que sobra queda a favor', () => {
    const [oct, nov, dic] = views([
      charge('oct', 500, { dueDate: '2026-10-05' }),
      charge('nov', 500, { dueDate: '2026-11-05' }),
      charge('dic', 500, { dueDate: '2026-12-05' }),
    ]);
    const { allocations, unallocated } = allocateAmount(1200, [dic], [oct, nov, dic]);
    assert.deepEqual(allocations, [
      { chargeId: 'dic', amount: 500 },
      { chargeId: 'oct', amount: 500 },
      { chargeId: 'nov', amount: 200 },
    ]);
    assert.equal(unallocated, 0);
    assert.equal(allocateAmount(2000, [], [oct, nov, dic]).unallocated, 500);
  });

  it('lo no aplicado de un cobro es saldo a favor', () => {
    assert.equal(unallocatedAmount(payment('x', 1200, [{ chargeId: 'a', amount: 1000 }])), 200);
  });
});

// ── Saldo a favor ─────────────────────────────────────────────────────

describe('saldo a favor', () => {
  it('se aplica al próximo cargo del mismo contrato, concepto y moneda', () => {
    const charges = [charge('oct', 1000, { dueDate: '2026-10-05' }), charge('nov', 1000, { dueDate: '2026-11-05', period: '2026-11' })];
    const payments = [payment('x', 1300, [{ chargeId: 'oct', amount: 1000 }])];
    const updated = applyCredits(payments, charges)!;
    assert.deepEqual(updated[0].allocations, [
      { chargeId: 'oct', amount: 1000 },
      { chargeId: 'nov', amount: 300 },
    ]);
  });

  it('no se usa para otro concepto ni otra moneda', () => {
    const charges = [charge('exp', 1000, { concept: 'expensas' }), charge('usd', 100, { currency: 'USD' })];
    const payments = [payment('x', 1300, [])];
    assert.equal(applyCredits(payments, charges), undefined);
  });

  it('volver a aplicarlo no cambia nada (no cobra dos veces)', () => {
    const charges = [charge('oct', 1000), charge('nov', 1000, { period: '2026-11' })];
    const once = applyCredits([payment('x', 1500, [{ chargeId: 'oct', amount: 1000 }])], charges)!;
    assert.equal(applyCredits(once, charges), undefined);
  });
});

// ── Registrar cobro ───────────────────────────────────────────────────

describe('registrar cobro', () => {
  it('arma un cobro por concepto y moneda, y el sobrante en dólares queda en el alquiler', () => {
    const c = contract({ currency: 'USD' });
    const debt = debtOf(
      views([
        charge('alq', 650, { currency: 'USD', dueDate: '2026-10-05' }),
        charge('exp', 120000, { concept: 'expensas', dueDate: '2026-10-05' }),
      ]),
    );
    const plan = planCollection(c, { USD: 700, ARS: 120000 }, debt);
    const alquiler = plan.payments.find((p) => p.concept === 'alquiler')!;
    const expensas = plan.payments.find((p) => p.concept === 'expensas')!;
    assert.equal(alquiler.currency, 'USD');
    assert.equal(alquiler.amount, 700);
    assert.equal(expensas.amount, 120000);
    assert.equal(plan.credit.USD, 50);
    assert.equal(plan.credit.ARS, 0);
  });
});

// ── Actualizar importes ───────────────────────────────────────────────

describe('actualizar importes', () => {
  const row = (paid: number, amount = 80000): ImportRow => {
    const c = charge('exp', amount, { concept: 'expensas', dueDate: PAST });
    const [view] = views([c], paid ? [payment('x', paid, [{ chargeId: 'exp', amount: paid }], { concept: 'expensas' })] : []);
    return { view, contract: contract(), extra: 0, total: amount, automatic: false };
  };

  it('sin cobros: corrige el cargo', () => {
    assert.deepEqual(planImportChange(row(0), 95000), { charge: { amount: 95000, confirmed: true } });
  });

  it('mismo importe: solo lo marca como revisado', () => {
    assert.deepEqual(planImportChange(row(0), 80000), { charge: { confirmed: true } });
  });

  it('con cobros y sube: la diferencia va en un cargo aparte que nunca nace vencido', () => {
    const change = planImportChange(row(50000), 95000);
    assert.equal(change.extra?.amount, 15000);
    assert.equal(change.extra?.notes, 'Ajuste de expensas');
    assert.ok(change.extra!.dueDate >= new Date().toISOString().slice(0, 10));
  });

  it('con cobros y baja: no baja de lo ya cobrado', () => {
    assert.deepEqual(planImportChange(row(70000), 60000), { charge: { amount: 70000, confirmed: true } });
  });
});

// ── Ajustes del alquiler ──────────────────────────────────────────────

describe('ajustes del alquiler', () => {
  it('el próximo ajuste cuenta desde el último aplicado', () => {
    const c = contract({ adjustmentIndex: 'ipc', adjustmentMonths: 3, startDate: '2026-01-01', lastAdjustedPeriod: '2026-07' });
    assert.equal(nextAdjustmentPeriod(c), '2026-10');
  });

  it('no propone ajustes después del fin del contrato', () => {
    const c = contract({ adjustmentIndex: 'fijo', adjustmentMonths: 6, adjustmentPercent: 10, startDate: '2026-01-01', endDate: '2026-06-30' });
    assert.equal(nextAdjustmentPeriod(c), undefined);
  });

  it('al cargar un contrato viejo, los ajustes pasados se dan por aplicados', () => {
    const start = `${addMonthsToPeriod(currentPeriod(), -7)}-01`;
    assert.equal(lastPassedAdjustmentPeriod(start, 3), addMonthsToPeriod(currentPeriod(), -1));
  });
});

// ── Generación de cargos ──────────────────────────────────────────────

describe('generación de cargos', () => {
  const twoMonthsAgo = addMonthsToPeriod(currentPeriod(), -2);

  it('crea alquiler y expensas de cada mes desde el primero a cobrar', () => {
    const c = contract({ billingStartPeriod: twoMonthsAgo });
    const missing = buildMissingCharges([c], [property], []);
    assert.equal(missing.length, 6); // 3 meses × (alquiler + expensas)
    assert.ok(missing.every((m) => m.autoGenerated));
  });

  it('no repite un mes que ya tiene cargo', () => {
    const c = contract({ billingStartPeriod: twoMonthsAgo });
    const first = buildMissingCharges([c], [property], []);
    assert.equal(buildMissingCharges([c], [property], first).length, 0);
  });

  it('renovación: el contrato nuevo empieza después del último cargo del anterior', () => {
    const viejo = contract({ id: 'viejo', status: 'finalizado' });
    const viejos = buildMissingCharges([{ ...viejo, status: 'activo', billingStartPeriod: twoMonthsAgo }], [property], []);
    const ultimo = viejos.reduce((max, c) => (c.period > max ? c.period : max), '');
    const nuevo = contract({ id: 'nuevo', startDate: `${twoMonthsAgo}-01`, billingStartPeriod: addMonthsToPeriod(ultimo, 1) });
    const nuevos = buildMissingCharges([viejo, nuevo], [property], viejos);
    assert.equal(nuevos.length, 0);
  });

  it('un contrato finalizado no genera cargos', () => {
    assert.equal(buildMissingCharges([contract({ status: 'finalizado' })], [property], []).length, 0);
  });
});
