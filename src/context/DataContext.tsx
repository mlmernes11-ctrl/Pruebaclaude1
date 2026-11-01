import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import {
  Charge,
  ChargeConcept,
  Contract,
  Currency,
  MoneyTotals,
  Payment,
  Property,
  PropertyStatus,
  Tenant,
} from '../types';
import { buildMissingCharges, syncUnpaidAutoCharges } from '../utils/chargeGeneration';
import { addToTotals, currentPeriod, emptyTotals, todayISO } from '../utils/format';
import { generateId } from '../utils/id';
import { applyCredits, buildLedger, ChargeView, viewCharge } from '../utils/ledger';
import { buildSampleData } from '../utils/sampleData';

const STORAGE_KEY = 'gestion_alquileres_v1';
// Unreadable saved data is copied here before anything new overwrites it.
const BACKUP_KEY = 'gestion_alquileres_v1_respaldo';

export interface StoredData {
  properties: Property[];
  tenants: Tenant[];
  contracts: Contract[];
  charges: Charge[];
  payments: Payment[];
}

const EMPTY_DATA: StoredData = {
  properties: [],
  tenants: [],
  contracts: [],
  charges: [],
  payments: [],
};

// Before charges and payments were split, each record was a charge with an optional paidDate.
interface LegacyPayment {
  id: string;
  contractId: string;
  concept?: ChargeConcept;
  period: string;
  amount: number;
  currency?: Currency;
  dueDate: string;
  paidDate?: string;
  method?: string;
  exchangeRate?: number;
  notes?: string;
  createdAt: string;
}

function syncPropertyOccupancy(
  properties: Property[],
  contracts: Contract[],
  affectedPropertyIds: string[],
): Property[] {
  const idsToSync = new Set(affectedPropertyIds);
  if (idsToSync.size === 0) return properties;

  return properties.map((property) => {
    if (!idsToSync.has(property.id) || property.status === 'mantenimiento') {
      return property;
    }
    const hasActiveContract = contracts.some(
      (c) => c.propertyId === property.id && c.status === 'activo',
    );
    const nextStatus: PropertyStatus = hasActiveContract ? 'alquilada' : 'disponible';
    return property.status === nextStatus ? property : { ...property, status: nextStatus };
  });
}

// Records saved before currencies existed were entered in pesos.
function normalizeStoredData(parsed: Record<string, unknown>): StoredData {
  const contracts = ((parsed.contracts as Contract[]) ?? []).map((c) => ({
    ...c,
    currency: c.currency ?? 'ARS',
  }));
  const base = {
    properties: ((parsed.properties as Property[]) ?? []).map((p) => ({
      ...p,
      rentCurrency: p.rentCurrency ?? 'ARS',
    })),
    tenants: (parsed.tenants as Tenant[]) ?? [],
    contracts,
  };

  if (Array.isArray(parsed.charges)) {
    return {
      ...base,
      charges: parsed.charges as Charge[],
      payments: ((parsed.payments as Payment[]) ?? []).map((p) => ({
        ...p,
        allocations: p.allocations ?? [],
      })),
    };
  }

  // Auto-billing starts this month for existing contracts, so no past debt appears out of nowhere.
  const migrationPeriod = currentPeriod();
  base.contracts = contracts.map((c) => ({
    ...c,
    billingStartPeriod: c.billingStartPeriod ?? migrationPeriod,
  }));
  const legacy = (parsed.payments as LegacyPayment[]) ?? [];
  const charges: Charge[] = legacy.map((p) => {
    const concept = p.concept ?? 'alquiler';
    const contractCurrency = contracts.find((c) => c.id === p.contractId)?.currency ?? 'ARS';
    return {
      id: p.id,
      contractId: p.contractId,
      concept,
      period: p.period,
      amount: p.amount,
      currency: p.currency ?? (concept === 'alquiler' ? contractCurrency : 'ARS'),
      dueDate: p.dueDate,
      notes: p.notes,
      createdAt: p.createdAt,
    };
  });
  const payments: Payment[] = [];
  legacy.forEach((p, index) => {
    if (!p.paidDate) return;
    const charge = charges[index];
    payments.push({
      id: generateId(),
      contractId: p.contractId,
      concept: charge.concept,
      date: p.paidDate,
      amount: p.amount,
      currency: charge.currency,
      method: p.method,
      exchangeRate: p.exchangeRate,
      allocations: [{ chargeId: charge.id, amount: p.amount }],
      createdAt: p.createdAt,
    });
  });
  return { ...base, charges, payments };
}

interface DashboardStats {
  totalProperties: number;
  availableProperties: number;
  rentedProperties: number;
  maintenanceProperties: number;
  activeContracts: number;
  pendingCount: number;
  pendingAmount: MoneyTotals;
  overdueCount: number;
  overdueAmount: MoneyTotals;
  collectedThisMonth: MoneyTotals;
}

interface DataContextValue extends StoredData {
  loading: boolean;
  // Today's date; changes at midnight or when the app comes back, so statuses stay current.
  today: string;
  // Re-reads today's date (statuses, new month) — used by pull to refresh.
  refreshToday: () => void;
  stats: DashboardStats;
  chargeViews: ChargeView[];
  addProperty: (data: Omit<Property, 'id' | 'createdAt'>) => Property;
  updateProperty: (id: string, data: Partial<Property>) => void;
  deleteProperty: (id: string) => { ok: boolean; reason?: string };
  addTenant: (data: Omit<Tenant, 'id' | 'createdAt'>) => Tenant;
  updateTenant: (id: string, data: Partial<Tenant>) => void;
  deleteTenant: (id: string) => { ok: boolean; reason?: string };
  addContract: (data: Omit<Contract, 'id' | 'createdAt'>) => Contract;
  updateContract: (id: string, data: Partial<Contract>) => void;
  deleteContract: (id: string) => void;
  addCharge: (data: Omit<Charge, 'id' | 'createdAt'>) => Charge;
  updateCharge: (id: string, data: Partial<Charge>) => void;
  voidCharge: (id: string) => { ok: boolean; reason?: string };
  addPayment: (data: Omit<Payment, 'id' | 'createdAt'>) => Payment;
  deletePayment: (id: string) => void;
  loadSampleData: () => void;
  clearAllData: () => void;
  getPropertyById: (id?: string) => Property | undefined;
  getTenantById: (id?: string) => Tenant | undefined;
  getContractById: (id?: string) => Contract | undefined;
  getChargeView: (id?: string) => ChargeView | undefined;
  getPaymentById: (id?: string) => Payment | undefined;
  contractsForProperty: (propertyId: string) => Contract[];
  contractsForTenant: (tenantId: string) => Contract[];
  chargeViewsForContract: (contractId: string) => ChargeView[];
  chargeViewsForProperty: (propertyId: string) => ChargeView[];
  paymentsForContract: (contractId: string) => Payment[];
  paymentsForCharge: (chargeId: string) => Payment[];
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

const byDueDateDesc = (a: ChargeView, b: ChargeView) =>
  a.charge.dueDate < b.charge.dueDate ? 1 : a.charge.dueDate > b.charge.dueDate ? -1 : 0;

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<StoredData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState(todayISO);

  useEffect(() => {
    (async () => {
      let raw: string | null = null;
      try {
        raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setData(normalizeStoredData(JSON.parse(raw)));
      } catch (e) {
        console.warn('No se pudo cargar la información guardada', e);
        if (raw) await AsyncStorage.setItem(BACKUP_KEY, raw).catch(() => undefined);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // An app left open overnight (or reopened days later) recalculates due dates and new months.
  useEffect(() => {
    const refresh = () => setToday(todayISO());
    const timer = setInterval(refresh, 60_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch((e) => {
      console.warn('No se pudo guardar la información', e);
    });
  }, [data, loading]);

  // Creates this month's charges (and any missing month since the contract was loaded).
  useEffect(() => {
    if (loading) return;
    if (buildMissingCharges(data.contracts, data.properties, data.charges).length === 0) return;
    setData((prev) => ({
      ...prev,
      charges: [...prev.charges, ...buildMissingCharges(prev.contracts, prev.properties, prev.charges)],
    }));
  }, [loading, today, data.contracts, data.properties, data.charges]);

  // Money left in favor of a tenant pays their next charges automatically.
  useEffect(() => {
    if (loading || !applyCredits(data.payments, data.charges)) return;
    setData((prev) => ({ ...prev, payments: applyCredits(prev.payments, prev.charges) ?? prev.payments }));
  }, [loading, data.payments, data.charges]);

  const ledger = useMemo(() => buildLedger(data.payments), [data.payments]);

  const chargeViews = useMemo(
    () => data.charges.filter((c) => !c.voided).map((c) => viewCharge(c, ledger)),
    // today is a dependency so overdue statuses refresh when the date changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.charges, ledger, today],
  );

  const addProperty = useCallback<DataContextValue['addProperty']>((values) => {
    const property: Property = { ...values, id: generateId(), createdAt: new Date().toISOString() };
    setData((prev) => ({ ...prev, properties: [property, ...prev.properties] }));
    return property;
  }, []);

  const updateProperty = useCallback<DataContextValue['updateProperty']>((id, values) => {
    setData((prev) => {
      const properties = prev.properties.map((p) => (p.id === id ? { ...p, ...values } : p));
      const contractIds = new Set(prev.contracts.filter((c) => c.propertyId === id).map((c) => c.id));
      return {
        ...prev,
        properties,
        charges: syncUnpaidAutoCharges(
          prev.charges,
          prev.contracts,
          properties,
          buildLedger(prev.payments),
          contractIds,
        ),
      };
    });
  }, []);

  const deleteProperty = useCallback<DataContextValue['deleteProperty']>(
    (id) => {
      if (data.contracts.some((c) => c.propertyId === id)) {
        return { ok: false, reason: 'Esta propiedad tiene contratos asociados. Eliminalos primero.' };
      }
      setData((prev) => ({ ...prev, properties: prev.properties.filter((p) => p.id !== id) }));
      return { ok: true };
    },
    [data.contracts],
  );

  const addTenant = useCallback<DataContextValue['addTenant']>((values) => {
    const tenant: Tenant = { ...values, id: generateId(), createdAt: new Date().toISOString() };
    setData((prev) => ({ ...prev, tenants: [tenant, ...prev.tenants] }));
    return tenant;
  }, []);

  const updateTenant = useCallback<DataContextValue['updateTenant']>((id, values) => {
    setData((prev) => ({
      ...prev,
      tenants: prev.tenants.map((t) => (t.id === id ? { ...t, ...values } : t)),
    }));
  }, []);

  const deleteTenant = useCallback<DataContextValue['deleteTenant']>(
    (id) => {
      if (data.contracts.some((c) => c.tenantId === id)) {
        return { ok: false, reason: 'Este inquilino tiene contratos asociados. Eliminalos primero.' };
      }
      setData((prev) => ({ ...prev, tenants: prev.tenants.filter((t) => t.id !== id) }));
      return { ok: true };
    },
    [data.contracts],
  );

  const addContract = useCallback<DataContextValue['addContract']>((values) => {
    const contract: Contract = { ...values, id: generateId(), createdAt: new Date().toISOString() };
    setData((prev) => {
      const contracts = [contract, ...prev.contracts];
      return {
        ...prev,
        contracts,
        properties: syncPropertyOccupancy(prev.properties, contracts, [contract.propertyId]),
      };
    });
    return contract;
  }, []);

  const updateContract = useCallback<DataContextValue['updateContract']>((id, values) => {
    setData((prev) => {
      const previousPropertyId = prev.contracts.find((c) => c.id === id)?.propertyId;
      const contracts = prev.contracts.map((c) => (c.id === id ? { ...c, ...values } : c));
      const affected = [previousPropertyId, values.propertyId].filter((v): v is string => Boolean(v));
      return {
        ...prev,
        contracts,
        properties: syncPropertyOccupancy(prev.properties, contracts, affected),
        charges: syncUnpaidAutoCharges(
          prev.charges,
          contracts,
          prev.properties,
          buildLedger(prev.payments),
          new Set([id]),
        ),
      };
    });
  }, []);

  const deleteContract = useCallback<DataContextValue['deleteContract']>((id) => {
    setData((prev) => {
      const removed = prev.contracts.find((c) => c.id === id);
      const contracts = prev.contracts.filter((c) => c.id !== id);
      return {
        ...prev,
        contracts,
        charges: prev.charges.filter((c) => c.contractId !== id),
        payments: prev.payments.filter((p) => p.contractId !== id),
        properties: removed
          ? syncPropertyOccupancy(prev.properties, contracts, [removed.propertyId])
          : prev.properties,
      };
    });
  }, []);

  const addCharge = useCallback<DataContextValue['addCharge']>((values) => {
    const charge: Charge = { ...values, id: generateId(), createdAt: new Date().toISOString() };
    setData((prev) => ({ ...prev, charges: [...prev.charges, charge] }));
    return charge;
  }, []);

  const updateCharge = useCallback<DataContextValue['updateCharge']>((id, values) => {
    setData((prev) => ({
      ...prev,
      charges: prev.charges.map((c) => (c.id === id ? { ...c, ...values } : c)),
    }));
  }, []);

  const voidCharge = useCallback<DataContextValue['voidCharge']>(
    (id) => {
      if ((ledger.get(id)?.paid ?? 0) > 0) {
        return {
          ok: false,
          reason: 'Esta liquidación tiene pagos registrados. Anulá primero esos pagos.',
        };
      }
      setData((prev) => ({
        ...prev,
        charges: prev.charges.map((c) => (c.id === id ? { ...c, voided: true } : c)),
      }));
      return { ok: true };
    },
    [ledger],
  );

  const addPayment = useCallback<DataContextValue['addPayment']>((values) => {
    const payment: Payment = { ...values, id: generateId(), createdAt: new Date().toISOString() };
    setData((prev) => ({ ...prev, payments: [payment, ...prev.payments] }));
    return payment;
  }, []);

  const deletePayment = useCallback<DataContextValue['deletePayment']>((id) => {
    setData((prev) => ({ ...prev, payments: prev.payments.filter((p) => p.id !== id) }));
  }, []);

  const loadSampleData = useCallback(() => setData(buildSampleData()), []);
  const clearAllData = useCallback(() => setData(EMPTY_DATA), []);

  const getPropertyById = useCallback(
    (id?: string) => data.properties.find((p) => p.id === id),
    [data.properties],
  );
  const getTenantById = useCallback((id?: string) => data.tenants.find((t) => t.id === id), [data.tenants]);
  const getContractById = useCallback(
    (id?: string) => data.contracts.find((c) => c.id === id),
    [data.contracts],
  );
  const getChargeView = useCallback(
    (id?: string) => chargeViews.find((v) => v.charge.id === id),
    [chargeViews],
  );
  const getPaymentById = useCallback(
    (id?: string) => data.payments.find((p) => p.id === id),
    [data.payments],
  );
  const contractsForProperty = useCallback(
    (propertyId: string) => data.contracts.filter((c) => c.propertyId === propertyId),
    [data.contracts],
  );
  const contractsForTenant = useCallback(
    (tenantId: string) => data.contracts.filter((c) => c.tenantId === tenantId),
    [data.contracts],
  );
  const chargeViewsForContract = useCallback(
    (contractId: string) => chargeViews.filter((v) => v.charge.contractId === contractId).sort(byDueDateDesc),
    [chargeViews],
  );
  const chargeViewsForProperty = useCallback(
    (propertyId: string) => {
      const contractIds = new Set(
        data.contracts.filter((c) => c.propertyId === propertyId).map((c) => c.id),
      );
      return chargeViews.filter((v) => contractIds.has(v.charge.contractId)).sort(byDueDateDesc);
    },
    [data.contracts, chargeViews],
  );
  const paymentsForContract = useCallback(
    (contractId: string) =>
      data.payments
        .filter((p) => p.contractId === contractId)
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [data.payments],
  );
  const paymentsForCharge = useCallback(
    (chargeId: string) =>
      data.payments
        .filter((p) => p.allocations.some((a) => a.chargeId === chargeId))
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [data.payments],
  );

  const stats = useMemo<DashboardStats>(() => {
    const activeContracts = data.contracts.filter((c) => c.status === 'activo');
    const thisPeriod = today.slice(0, 7);

    let pendingCount = 0;
    const pendingAmount = emptyTotals();
    let overdueCount = 0;
    const overdueAmount = emptyTotals();
    const collectedThisMonth = emptyTotals();

    chargeViews.forEach((view) => {
      if (view.status === 'pendiente') {
        pendingCount += 1;
        addToTotals(pendingAmount, view.balance, view.charge.currency);
      } else if (view.status === 'vencido') {
        overdueCount += 1;
        addToTotals(overdueAmount, view.balance, view.charge.currency);
      }
    });
    data.payments
      .filter((p) => p.date.slice(0, 7) === thisPeriod)
      .forEach((p) => addToTotals(collectedThisMonth, p.amount, p.currency));

    return {
      totalProperties: data.properties.length,
      availableProperties: data.properties.filter((p) => p.status === 'disponible').length,
      rentedProperties: data.properties.filter((p) => p.status === 'alquilada').length,
      maintenanceProperties: data.properties.filter((p) => p.status === 'mantenimiento').length,
      activeContracts: activeContracts.length,
      pendingCount,
      pendingAmount,
      overdueCount,
      overdueAmount,
      collectedThisMonth,
    };
  }, [data.properties, data.contracts, data.payments, chargeViews, today]);

  const value: DataContextValue = {
    ...data,
    loading,
    today,
    refreshToday: () => setToday(todayISO()),
    stats,
    chargeViews,
    addProperty,
    updateProperty,
    deleteProperty,
    addTenant,
    updateTenant,
    deleteTenant,
    addContract,
    updateContract,
    deleteContract,
    addCharge,
    updateCharge,
    voidCharge,
    addPayment,
    deletePayment,
    loadSampleData,
    clearAllData,
    getPropertyById,
    getTenantById,
    getContractById,
    getChargeView,
    getPaymentById,
    contractsForProperty,
    contractsForTenant,
    chargeViewsForContract,
    chargeViewsForProperty,
    paymentsForContract,
    paymentsForCharge,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData debe usarse dentro de DataProvider');
  return ctx;
}
