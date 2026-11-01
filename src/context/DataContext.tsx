import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Contract, MoneyTotals, Payment, Property, PropertyStatus, Tenant } from '../types';
import { addToTotals, emptyTotals } from '../utils/format';
import { generateId } from '../utils/id';
import { getPaymentStatus } from '../utils/payments';
import { buildSampleData } from '../utils/sampleData';

const STORAGE_KEY = 'gestion_alquileres_v1';

interface StoredData {
  properties: Property[];
  tenants: Tenant[];
  contracts: Contract[];
  payments: Payment[];
}

const EMPTY_DATA: StoredData = {
  properties: [],
  tenants: [],
  contracts: [],
  payments: [],
};

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
function normalizeStoredData(parsed: Partial<StoredData>): StoredData {
  const contracts = (parsed.contracts ?? []).map((c) => ({ ...c, currency: c.currency ?? 'ARS' }));
  return {
    properties: (parsed.properties ?? []).map((p) => ({
      ...p,
      rentCurrency: p.rentCurrency ?? 'ARS',
    })),
    tenants: parsed.tenants ?? [],
    contracts,
    payments: (parsed.payments ?? []).map((p) => {
      const concept = p.concept ?? 'alquiler';
      const contractCurrency = contracts.find((c) => c.id === p.contractId)?.currency ?? 'ARS';
      return {
        ...p,
        concept,
        currency: p.currency ?? (concept === 'alquiler' ? contractCurrency : 'ARS'),
      };
    }),
  };
}

interface DashboardStats {
  totalProperties: number;
  availableProperties: number;
  rentedProperties: number;
  maintenanceProperties: number;
  activeContracts: number;
  monthlyExpectedIncome: MoneyTotals;
  pendingCount: number;
  pendingAmount: MoneyTotals;
  overdueCount: number;
  overdueAmount: MoneyTotals;
  paidThisMonthAmount: MoneyTotals;
}

interface DataContextValue extends StoredData {
  loading: boolean;
  stats: DashboardStats;
  addProperty: (data: Omit<Property, 'id' | 'createdAt'>) => Property;
  updateProperty: (id: string, data: Partial<Property>) => void;
  deleteProperty: (id: string) => { ok: boolean; reason?: string };
  addTenant: (data: Omit<Tenant, 'id' | 'createdAt'>) => Tenant;
  updateTenant: (id: string, data: Partial<Tenant>) => void;
  deleteTenant: (id: string) => { ok: boolean; reason?: string };
  addContract: (data: Omit<Contract, 'id' | 'createdAt'>) => Contract;
  updateContract: (id: string, data: Partial<Contract>) => void;
  deleteContract: (id: string) => void;
  addPayment: (data: Omit<Payment, 'id' | 'createdAt'>) => Payment;
  updatePayment: (id: string, data: Partial<Payment>) => void;
  deletePayment: (id: string) => void;
  markPaymentPaid: (id: string, paidDate: string, method?: string) => void;
  loadSampleData: () => void;
  clearAllData: () => void;
  getPropertyById: (id?: string) => Property | undefined;
  getTenantById: (id?: string) => Tenant | undefined;
  getContractById: (id?: string) => Contract | undefined;
  contractsForProperty: (propertyId: string) => Contract[];
  contractsForTenant: (tenantId: string) => Contract[];
  paymentsForContract: (contractId: string) => Payment[];
  paymentsForProperty: (propertyId: string) => Payment[];
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<StoredData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setData(normalizeStoredData(JSON.parse(raw) as Partial<StoredData>));
        }
      } catch (e) {
        console.warn('No se pudo cargar la información guardada', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch((e) => {
      console.warn('No se pudo guardar la información', e);
    });
  }, [data, loading]);

  const addProperty = useCallback<DataContextValue['addProperty']>((values) => {
    const property: Property = {
      ...values,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setData((prev) => ({ ...prev, properties: [property, ...prev.properties] }));
    return property;
  }, []);

  const updateProperty = useCallback<DataContextValue['updateProperty']>((id, values) => {
    setData((prev) => ({
      ...prev,
      properties: prev.properties.map((p) => (p.id === id ? { ...p, ...values } : p)),
    }));
  }, []);

  const deleteProperty = useCallback<DataContextValue['deleteProperty']>(
    (id) => {
      const hasContracts = data.contracts.some((c) => c.propertyId === id);
      if (hasContracts) {
        return { ok: false, reason: 'Esta propiedad tiene contratos asociados. Elimínalos primero.' };
      }
      setData((prev) => ({ ...prev, properties: prev.properties.filter((p) => p.id !== id) }));
      return { ok: true };
    },
    [data.contracts],
  );

  const addTenant = useCallback<DataContextValue['addTenant']>((values) => {
    const tenant: Tenant = {
      ...values,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
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
      const hasContracts = data.contracts.some((c) => c.tenantId === id);
      if (hasContracts) {
        return { ok: false, reason: 'Este inquilino tiene contratos asociados. Elimínalos primero.' };
      }
      setData((prev) => ({ ...prev, tenants: prev.tenants.filter((t) => t.id !== id) }));
      return { ok: true };
    },
    [data.contracts],
  );

  const addContract = useCallback<DataContextValue['addContract']>((values) => {
    const contract: Contract = {
      ...values,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
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
      const affected = [previousPropertyId, values.propertyId].filter(
        (v): v is string => Boolean(v),
      );
      return {
        ...prev,
        contracts,
        properties: syncPropertyOccupancy(prev.properties, contracts, affected),
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
        payments: prev.payments.filter((p) => p.contractId !== id),
        properties: removed
          ? syncPropertyOccupancy(prev.properties, contracts, [removed.propertyId])
          : prev.properties,
      };
    });
  }, []);

  const addPayment = useCallback<DataContextValue['addPayment']>((values) => {
    const payment: Payment = {
      ...values,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setData((prev) => ({ ...prev, payments: [payment, ...prev.payments] }));
    return payment;
  }, []);

  const updatePayment = useCallback<DataContextValue['updatePayment']>((id, values) => {
    setData((prev) => ({
      ...prev,
      payments: prev.payments.map((p) => (p.id === id ? { ...p, ...values } : p)),
    }));
  }, []);

  const deletePayment = useCallback<DataContextValue['deletePayment']>((id) => {
    setData((prev) => ({ ...prev, payments: prev.payments.filter((p) => p.id !== id) }));
  }, []);

  const markPaymentPaid = useCallback<DataContextValue['markPaymentPaid']>(
    (id, paidDate, method) => {
      setData((prev) => ({
        ...prev,
        payments: prev.payments.map((p) => (p.id === id ? { ...p, paidDate, method } : p)),
      }));
    },
    [],
  );

  const loadSampleData = useCallback(() => setData(buildSampleData()), []);
  const clearAllData = useCallback(() => setData(EMPTY_DATA), []);

  const getPropertyById = useCallback(
    (id?: string) => data.properties.find((p) => p.id === id),
    [data.properties],
  );
  const getTenantById = useCallback(
    (id?: string) => data.tenants.find((t) => t.id === id),
    [data.tenants],
  );
  const getContractById = useCallback(
    (id?: string) => data.contracts.find((c) => c.id === id),
    [data.contracts],
  );
  const contractsForProperty = useCallback(
    (propertyId: string) => data.contracts.filter((c) => c.propertyId === propertyId),
    [data.contracts],
  );
  const contractsForTenant = useCallback(
    (tenantId: string) => data.contracts.filter((c) => c.tenantId === tenantId),
    [data.contracts],
  );
  const paymentsForContract = useCallback(
    (contractId: string) =>
      data.payments
        .filter((p) => p.contractId === contractId)
        .sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1)),
    [data.payments],
  );
  const paymentsForProperty = useCallback(
    (propertyId: string) => {
      const contractIds = new Set(
        data.contracts.filter((c) => c.propertyId === propertyId).map((c) => c.id),
      );
      return data.payments
        .filter((p) => contractIds.has(p.contractId))
        .sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1));
    },
    [data.contracts, data.payments],
  );

  const stats = useMemo<DashboardStats>(() => {
    const activeContracts = data.contracts.filter((c) => c.status === 'activo');
    const nowPeriod = new Date();
    const currentPeriodStr = `${nowPeriod.getFullYear()}-${String(nowPeriod.getMonth() + 1).padStart(2, '0')}`;

    let pendingCount = 0;
    const pendingAmount = emptyTotals();
    let overdueCount = 0;
    const overdueAmount = emptyTotals();
    const paidThisMonthAmount = emptyTotals();
    const monthlyExpectedIncome = emptyTotals();

    data.payments.forEach((payment) => {
      const status = getPaymentStatus(payment);
      if (status === 'pendiente') {
        pendingCount += 1;
        addToTotals(pendingAmount, payment.amount, payment.currency);
      } else if (status === 'vencido') {
        overdueCount += 1;
        addToTotals(overdueAmount, payment.amount, payment.currency);
      } else if (status === 'pagado' && payment.paidDate?.slice(0, 7) === currentPeriodStr) {
        addToTotals(paidThisMonthAmount, payment.amount, payment.currency);
      }
    });
    activeContracts.forEach((c) => addToTotals(monthlyExpectedIncome, c.rentAmount, c.currency));

    return {
      totalProperties: data.properties.length,
      availableProperties: data.properties.filter((p) => p.status === 'disponible').length,
      rentedProperties: data.properties.filter((p) => p.status === 'alquilada').length,
      maintenanceProperties: data.properties.filter((p) => p.status === 'mantenimiento').length,
      activeContracts: activeContracts.length,
      monthlyExpectedIncome,
      pendingCount,
      pendingAmount,
      overdueCount,
      overdueAmount,
      paidThisMonthAmount,
    };
  }, [data.properties, data.contracts, data.payments]);

  const value: DataContextValue = {
    ...data,
    loading,
    stats,
    addProperty,
    updateProperty,
    deleteProperty,
    addTenant,
    updateTenant,
    deleteTenant,
    addContract,
    updateContract,
    deleteContract,
    addPayment,
    updatePayment,
    deletePayment,
    markPaymentPaid,
    loadSampleData,
    clearAllData,
    getPropertyById,
    getTenantById,
    getContractById,
    contractsForProperty,
    contractsForTenant,
    paymentsForContract,
    paymentsForProperty,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData debe usarse dentro de DataProvider');
  return ctx;
}
