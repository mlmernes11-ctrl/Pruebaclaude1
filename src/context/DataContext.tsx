// =====================================================================
// Datos de la app (propiedades, inquilinos, contratos, cargos y cobros)
// ---------------------------------------------------------------------
// Este "contexto" guarda todos los datos en memoria y los comparte con todas las pantallas
// (cualquier pantalla los lee con useData()). También se encarga de:
//   - Cargarlos al abrir la app: de Supabase (cuenta real) o del celular (modo demo).
//   - Guardar cada cambio: en Supabase, o en el celular en modo demo.
//   - Generar solos los cargos de cada mes.
//   - Aplicar el saldo a favor de un inquilino a sus próximos cargos.
// =====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  describeRemoteError,
  diffData,
  hasChanges,
  isConflict,
  loadRemoteData,
  pushChanges,
  RemoteChanges,
  readAccountVersion,
  runAccountBilling,
} from '../lib/remoteStore';
import { AppData, Charge, Contract, Payment, Property, PropertyStatus, Tenant } from '../types';
import { buildMissingCharges, syncUnpaidAutoCharges } from '../utils/chargeGeneration';
import { todayISO } from '../utils/format';
import { generateId } from '../utils/id';
import { applyCredits, buildLedger, ChargeView, viewCharge } from '../utils/ledger';
import { buildSampleData } from '../utils/sampleData';

// ── Tipos y constantes ───────────────────────────────────────────────

// 'remote' = cuenta real (Supabase) · 'demo' = datos de ejemplo guardados solo en el celular.
export type DataMode = 'demo' | 'remote';

const EMPTY_DATA: AppData = { properties: [], tenants: [], contracts: [], charges: [], payments: [] };

// Dónde guarda el modo demo sus datos en el celular.
const STORAGE_KEY = 'gestion_alquileres_v1';
// Si lo guardado no se puede leer, se copia acá antes de reemplazarlo (para no perderlo).
const BACKUP_KEY = 'gestion_alquileres_v1_respaldo';

// Resultado de una acción que puede no estar permitida (por ejemplo, borrar algo con contratos).
type ActionResult = { ok: boolean; reason?: string };

// Todo lo que las pantallas pueden leer o hacer con los datos.
interface DataContextValue extends AppData {
  mode: DataMode;
  loading: boolean;

  // Cuenta real: si la primera carga falló (sin conexión), reload() vuelve a intentar.
  loadError?: string;
  reload: () => void;
  // Cuenta real: cambios que todavía no se pudieron guardar; retrySync() los vuelve a enviar.
  syncError?: string;
  retrySync: () => void;

  // Fecha de hoy. Cambia a la medianoche o al volver a la app, así los estados se actualizan.
  today: string;
  // Vuelve a leer la fecha de hoy (se usa al deslizar hacia abajo para actualizar).
  refreshToday: () => void;
  // Cuenta real: el servidor revisa lo automático y se vuelve a leer todo (deslizar hacia abajo).
  pullFromServer: () => Promise<void>;

  // Cada cargo (sin los anulados) con lo pagado, lo que falta y su estado.
  chargeViews: ChargeView[];

  // Altas, cambios y bajas.
  addProperty: (data: Omit<Property, 'id' | 'createdAt'>) => Property;
  updateProperty: (id: string, data: Partial<Property>) => void;
  deleteProperty: (id: string) => ActionResult;
  addTenant: (data: Omit<Tenant, 'id' | 'createdAt'>) => Tenant;
  updateTenant: (id: string, data: Partial<Tenant>) => void;
  deleteTenant: (id: string) => ActionResult;
  addContract: (data: Omit<Contract, 'id' | 'createdAt'>) => Contract;
  updateContract: (id: string, data: Partial<Contract>) => void;
  deleteContract: (id: string) => void;
  addCharge: (data: Omit<Charge, 'id' | 'createdAt'>) => Charge;
  updateCharge: (id: string, data: Partial<Charge>) => void;
  voidCharge: (id: string) => void;
  addPayment: (data: Omit<Payment, 'id' | 'createdAt'>) => Payment;
  deletePayment: (id: string) => void;

  // Solo en modo demo: cargar los datos de ejemplo o borrar todo.
  loadSampleData: () => void;
  clearAllData: () => void;

  // Búsquedas frecuentes.
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

// ── Funciones auxiliares ─────────────────────────────────────────────

const byDueDateDesc = (a: ChargeView, b: ChargeView) =>
  a.charge.dueDate < b.charge.dueDate ? 1 : a.charge.dueDate > b.charge.dueDate ? -1 : 0;
const byDateDesc = (a: Payment, b: Payment) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);

// Lo guardado por el modo demo. Si no tiene la forma esperada (por ejemplo, porque lo guardó
// una versión muy vieja de la app), el modo demo vuelve a empezar con los datos de ejemplo.
function readDemoData(raw: string | null): AppData {
  if (!raw) return buildSampleData();
  const parsed = JSON.parse(raw);
  const valid = (Object.keys(EMPTY_DATA) as (keyof AppData)[]).every((key) => Array.isArray(parsed?.[key]));
  return valid ? (parsed as AppData) : buildSampleData();
}

// Una propiedad con un contrato activo pasa a "alquilada"; sin contrato, a "disponible".
// Las que están en mantenimiento no se tocan.
function syncPropertyOccupancy(properties: Property[], contracts: Contract[], affectedIds: string[]): Property[] {
  const ids = new Set(affectedIds);
  if (ids.size === 0) return properties;
  return properties.map((property) => {
    if (!ids.has(property.id) || property.status === 'mantenimiento') return property;
    const rented = contracts.some((c) => c.propertyId === property.id && c.status === 'activo');
    const status: PropertyStatus = rented ? 'alquilada' : 'disponible';
    return property.status === status ? property : { ...property, status };
  });
}

const newRecordFields = () => ({ id: generateId(), createdAt: new Date().toISOString() });

// ── Proveedor de datos ───────────────────────────────────────────────

// Cambios de la cuenta real que todavía no llegaron al servidor (por ejemplo, sin señal). Se
// guardan en el celular para no perderlos si se cierra la app, y se envían al volver a abrirla.
const PENDING_KEY_PREFIX = 'gestion_alquileres_sin_enviar_';

export function DataProvider({
  children,
  mode,
  userId,
}: {
  children: React.ReactNode;
  mode: DataMode;
  userId?: string;
}) {
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [syncError, setSyncError] = useState<string>();
  const [reloadKey, setReloadKey] = useState(0);
  const [today, setToday] = useState(todayISO);

  // Cuenta real: lo que se sabe que tiene el servidor, y una fila de espera para que los
  // guardados salgan de a uno y en orden.
  const syncedRef = useRef<AppData>(EMPTY_DATA);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const dataRef = useRef<AppData>(EMPTY_DATA);
  dataRef.current = data;

  // ── Lectura del servidor (cuenta real) ─────────────────────────────

  // Vuelve a leer todo del servidor sin mostrar la ruedita. Va en la misma fila que los
  // guardados y solo reemplaza los datos si no hay cambios propios sin enviar, así nunca pisa
  // algo que todavía no se guardó.
  // Si el servidor cambió algo pero no se pudo releer (había cambios propios sin enviar), queda
  // pendiente y se relee después del próximo guardado.
  const staleRef = useRef(false);
  // Número de versión de la cuenta que corresponde a los datos que tiene la app (ver
  // readAccountVersion): si el del servidor es otro, alguien cambió algo.
  const versionRef = useRef<number | undefined>(undefined);
  const refreshFromServer = useCallback((): Promise<void> => {
    if (mode !== 'remote') return Promise.resolve();
    queueRef.current = queueRef.current.then(async () => {
      if (hasChanges(diffData(syncedRef.current, dataRef.current))) return;
      try {
        // La versión se lee antes que los datos: si algo cambia en el medio, la próxima
        // revisión lo ve distinto y vuelve a leer.
        const version = await readAccountVersion();
        const remote = await loadRemoteData();
        if (hasChanges(diffData(syncedRef.current, dataRef.current))) return;
        syncedRef.current = remote;
        versionRef.current = version;
        staleRef.current = false;
        setData(remote);
      } catch {
        // Sin conexión: se sigue con lo que hay y se reintenta la próxima vez.
      }
    });
    return queueRef.current;
  }, [mode]);

  // Lo automático de la cuenta (cargos del mes, ajustes y saldo a favor) lo hace el servidor.
  // Si cambió algo, se vuelve a leer. No se espera desde adentro de la fila de guardados: la
  // relectura se encola después.
  const runServerBilling = useCallback(async () => {
    const changed = await runAccountBilling().catch(() => 0);
    if (changed > 0) staleRef.current = true;
    if (staleRef.current) void refreshFromServer();
  }, [refreshFromServer]);

  // Deslizar hacia abajo para actualizar: el servidor revisa lo automático y se vuelve a leer todo.
  const pullFromServer = useCallback(async () => {
    if (mode !== 'remote') return;
    await runAccountBilling().catch(() => 0);
    await refreshFromServer();
  }, [mode, refreshFromServer]);

  // ── Carga inicial ──────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      if (mode === 'remote') {
        try {
          // Primero lo que quedó sin enviar la vez anterior; si no se puede, no se pierde.
          const pendingKey = PENDING_KEY_PREFIX + userId;
          const pending = await AsyncStorage.getItem(pendingKey).catch(() => null);
          if (pending) {
            try {
              await pushChanges(JSON.parse(pending) as RemoteChanges);
            } catch (e) {
              // Sin señal: se reintenta al volver a abrir. Si el servidor los rechaza (por ejemplo,
              // algo que ya se borró desde otro celular), se apartan para no trabar la app.
              if (/fetch|network|timeout/i.test(String((e as Error)?.message ?? e))) throw e;
              await AsyncStorage.setItem(`${pendingKey}_rechazados`, pending).catch(() => undefined);
            }
            await AsyncStorage.removeItem(pendingKey).catch(() => undefined);
          }
          const version = await readAccountVersion().catch(() => undefined);
          const remote = await loadRemoteData();
          if (!active) return;
          syncedRef.current = remote;
          versionRef.current = version;
          setData(remote);
          setLoadError(undefined);
          void runServerBilling();
        } catch (e) {
          if (active) setLoadError(describeRemoteError(e));
        } finally {
          if (active) setLoading(false);
        }
        return;
      }

      let raw: string | null = null;
      try {
        raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (active) setData(readDemoData(raw));
      } catch (e) {
        console.warn('No se pudo cargar la información guardada', e);
        if (raw) await AsyncStorage.setItem(BACKUP_KEY, raw).catch(() => undefined);
        if (active) setData(buildSampleData());
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [mode, reloadKey, runServerBilling, userId]);

  // ── Guardado ───────────────────────────────────────────────────────

  // Cuenta real: envía al servidor solo lo que cambió. Si falla, los cambios quedan
  // pendientes y se reintentan con el próximo cambio o con "Reintentar".
  const syncNow = useCallback(() => {
    queueRef.current = queueRef.current.then(async () => {
      const snapshot = dataRef.current;
      const changes = diffData(syncedRef.current, snapshot);
      if (!hasChanges(changes)) return;
      const pendingKey = PENDING_KEY_PREFIX + userId;
      // Se guardan antes de enviarlos: si se corta la señal o se cierra la app, quedan en el celular.
      await AsyncStorage.setItem(pendingKey, JSON.stringify(changes)).catch(() => undefined);
      try {
        await pushChanges(changes);
        syncedRef.current = snapshot;
        // Si mientras tanto hubo otro cambio, el próximo envío lo vuelve a guardar.
        await AsyncStorage.removeItem(pendingKey).catch(() => undefined);
        setSyncError(undefined);
        // Lo guardado puede pedir cargos nuevos (un contrato nuevo) o usar saldo a favor.
        void runServerBilling();
      } catch (e) {
        setSyncError(describeRemoteError(e));
        // El servidor ya tenía un cargo igual: se recarga lo del servidor.
        if (isConflict(e)) setReloadKey((k) => k + 1);
      }
    });
  }, [runServerBilling, userId]);

  // Cada vez que cambian los datos, se guardan (en el servidor o en el celular).
  useEffect(() => {
    if (loading || loadError) return;
    if (mode === 'remote') {
      syncNow();
      return;
    }
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch((e) => {
      console.warn('No se pudo guardar la información', e);
    });
  }, [data, loading, loadError, mode, syncNow]);

  // ── Tareas automáticas ─────────────────────────────────────────────

  // Si la app queda abierta de un día para otro (o se vuelve a ella días después), se
  // actualiza la fecha de hoy para recalcular vencimientos y meses nuevos.
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

  // Cuenta real: al volver a la app (o a la pestaña del navegador) se vuelve a leer lo del
  // servidor, que pudo cambiar desde otro dispositivo o por las tareas diarias. Como mucho una
  // vez cada 30 segundos.
  const lastRefreshRef = useRef(0);
  useEffect(() => {
    if (mode !== 'remote' || loading || loadError) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || Date.now() - lastRefreshRef.current < 30_000) return;
      lastRefreshRef.current = Date.now();
      void pullFromServer();
    });
    return () => subscription.remove();
  }, [mode, loading, loadError, pullFromServer]);

  // Cuenta real: cada 60 segundos, con la app a la vista y sin cambios propios sin enviar, se
  // pregunta al servidor si cambió algo (su número de versión). Solo si cambió se vuelve a leer
  // todo; la pantalla se actualiza sola, sin avisos.
  useEffect(() => {
    if (mode !== 'remote' || loading || loadError) return;
    const timer = setInterval(async () => {
      if (AppState.currentState !== 'active') return;
      if (hasChanges(diffData(syncedRef.current, dataRef.current))) return;
      const version = await readAccountVersion().catch(() => undefined);
      if (version !== undefined && version !== versionRef.current) void refreshFromServer();
    }, 60_000);
    return () => clearInterval(timer);
  }, [mode, loading, loadError, refreshFromServer]);

  // Modo demo (sin servidor): la app misma crea los cargos del mes y aplica el saldo a favor.
  // Con una cuenta real eso lo hace el servidor (ver runServerBilling).
  useEffect(() => {
    if (mode !== 'demo' || loading || loadError) return;
    if (buildMissingCharges(data.contracts, data.properties, data.charges).length === 0) return;
    setData((prev) => ({
      ...prev,
      charges: [...prev.charges, ...buildMissingCharges(prev.contracts, prev.properties, prev.charges)],
    }));
  }, [mode, loading, loadError, today, data.contracts, data.properties, data.charges]);

  useEffect(() => {
    if (mode !== 'demo' || loading || loadError || !applyCredits(data.payments, data.charges)) return;
    setData((prev) => ({ ...prev, payments: applyCredits(prev.payments, prev.charges) ?? prev.payments }));
  }, [mode, loading, loadError, data.payments, data.charges]);

  // ── Estado de cada cargo ─────────────────────────────────────

  // Cuánto se pagó de cada cargo, según los cobros registrados.
  const ledger = useMemo(() => buildLedger(data.payments), [data.payments]);

  const chargeViews = useMemo(
    () => data.charges.filter((c) => !c.voided).map((c) => viewCharge(c, ledger)),
    // "today" está para que los estados (vencida / por vencer) se recalculen al cambiar el día.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.charges, ledger, today],
  );

  // ── Propiedades ────────────────────────────────────────────────────

  const addProperty = useCallback<DataContextValue['addProperty']>((values) => {
    const property: Property = { ...values, ...newRecordFields() };
    setData((prev) => ({ ...prev, properties: [property, ...prev.properties] }));
    return property;
  }, []);

  // Si cambian las expensas o los servicios, los cargos impagos de este mes en adelante
  // toman el valor nuevo.
  const updateProperty = useCallback<DataContextValue['updateProperty']>((id, values) => {
    setData((prev) => {
      const properties = prev.properties.map((p) => (p.id === id ? { ...p, ...values } : p));
      const contractIds = new Set(prev.contracts.filter((c) => c.propertyId === id).map((c) => c.id));
      return {
        ...prev,
        properties,
        charges: syncUnpaidAutoCharges(prev.charges, prev.contracts, properties, buildLedger(prev.payments), contractIds),
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

  // ── Inquilinos ─────────────────────────────────────────────────────

  const addTenant = useCallback<DataContextValue['addTenant']>((values) => {
    const tenant: Tenant = { ...values, ...newRecordFields() };
    setData((prev) => ({ ...prev, tenants: [tenant, ...prev.tenants] }));
    return tenant;
  }, []);

  const updateTenant = useCallback<DataContextValue['updateTenant']>((id, values) => {
    setData((prev) => ({ ...prev, tenants: prev.tenants.map((t) => (t.id === id ? { ...t, ...values } : t)) }));
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

  // ── Contratos ──────────────────────────────────────────────────────

  const addContract = useCallback<DataContextValue['addContract']>((values) => {
    const contract: Contract = { ...values, ...newRecordFields() };
    setData((prev) => {
      const contracts = [contract, ...prev.contracts];
      return { ...prev, contracts, properties: syncPropertyOccupancy(prev.properties, contracts, [contract.propertyId]) };
    });
    return contract;
  }, []);

  // Si cambia el alquiler, los cargos impagos de este mes en adelante toman el valor nuevo.
  const updateContract = useCallback<DataContextValue['updateContract']>((id, values) => {
    setData((prev) => {
      const previousPropertyId = prev.contracts.find((c) => c.id === id)?.propertyId;
      const contracts = prev.contracts.map((c) => (c.id === id ? { ...c, ...values } : c));
      const affected = [previousPropertyId, values.propertyId].filter((v): v is string => Boolean(v));
      return {
        ...prev,
        contracts,
        properties: syncPropertyOccupancy(prev.properties, contracts, affected),
        charges: syncUnpaidAutoCharges(prev.charges, contracts, prev.properties, buildLedger(prev.payments), new Set([id])),
      };
    });
  }, []);

  // Borrar un contrato borra también sus cargos y cobros.
  const deleteContract = useCallback<DataContextValue['deleteContract']>((id) => {
    setData((prev) => {
      const removed = prev.contracts.find((c) => c.id === id);
      const contracts = prev.contracts.filter((c) => c.id !== id);
      return {
        ...prev,
        contracts,
        charges: prev.charges.filter((c) => c.contractId !== id),
        payments: prev.payments.filter((p) => p.contractId !== id),
        properties: removed ? syncPropertyOccupancy(prev.properties, contracts, [removed.propertyId]) : prev.properties,
      };
    });
  }, []);

  // ── Cargos ──────────────────────────────────────────────────

  const addCharge = useCallback<DataContextValue['addCharge']>((values) => {
    const charge: Charge = { ...values, ...newRecordFields() };
    setData((prev) => ({ ...prev, charges: [...prev.charges, charge] }));
    return charge;
  }, []);

  const updateCharge = useCallback<DataContextValue['updateCharge']>((id, values) => {
    setData((prev) => ({ ...prev, charges: prev.charges.map((c) => (c.id === id ? { ...c, ...values } : c)) }));
  }, []);

  // Eliminar un cargo no lo borra de la base: queda marcado como anulado para que la
  // generación mensual no lo vuelva a crear. Si tenía cobros, esa plata se desvincula y queda a
  // favor del inquilino (y se aplica sola a su próxima deuda del mismo concepto).
  const voidCharge = useCallback<DataContextValue['voidCharge']>((id) => {
    setData((prev) => ({
      ...prev,
      charges: prev.charges.map((c) => (c.id === id ? { ...c, voided: true } : c)),
      payments: prev.payments.map((p) =>
        p.allocations.some((a) => a.chargeId === id)
          ? { ...p, allocations: p.allocations.filter((a) => a.chargeId !== id) }
          : p,
      ),
    }));
  }, []);

  // ── Cobros ──────────────────────────────────────────────────────────

  const addPayment = useCallback<DataContextValue['addPayment']>((values) => {
    const payment: Payment = { ...values, ...newRecordFields() };
    setData((prev) => ({ ...prev, payments: [payment, ...prev.payments] }));
    return payment;
  }, []);

  const deletePayment = useCallback<DataContextValue['deletePayment']>((id) => {
    setData((prev) => ({ ...prev, payments: prev.payments.filter((p) => p.id !== id) }));
  }, []);

  // ── Modo demo ──────────────────────────────────────────────────────

  // Solo existen en modo demo: una cuenta real nunca se reemplaza ni se borra entera.
  const loadSampleData = useCallback(() => {
    if (mode === 'demo') setData(buildSampleData());
  }, [mode]);
  const clearAllData = useCallback(() => {
    if (mode === 'demo') setData(EMPTY_DATA);
  }, [mode]);

  // ── Búsquedas ──────────────────────────────────────────────────────

  const getPropertyById = useCallback((id?: string) => data.properties.find((p) => p.id === id), [data.properties]);
  const getTenantById = useCallback((id?: string) => data.tenants.find((t) => t.id === id), [data.tenants]);
  const getContractById = useCallback((id?: string) => data.contracts.find((c) => c.id === id), [data.contracts]);
  const getChargeView = useCallback((id?: string) => chargeViews.find((v) => v.charge.id === id), [chargeViews]);
  const getPaymentById = useCallback((id?: string) => data.payments.find((p) => p.id === id), [data.payments]);

  const contractsForProperty = useCallback(
    (propertyId: string) => data.contracts.filter((c) => c.propertyId === propertyId),
    [data.contracts],
  );
  const contractsForTenant = useCallback(
    (tenantId: string) => data.contracts.filter((c) => c.tenantId === tenantId),
    [data.contracts],
  );
  // Las listas de cargos y cobros van del más nuevo al más viejo.
  const chargeViewsForContract = useCallback(
    (contractId: string) => chargeViews.filter((v) => v.charge.contractId === contractId).sort(byDueDateDesc),
    [chargeViews],
  );
  const chargeViewsForProperty = useCallback(
    (propertyId: string) => {
      const contractIds = new Set(data.contracts.filter((c) => c.propertyId === propertyId).map((c) => c.id));
      return chargeViews.filter((v) => contractIds.has(v.charge.contractId)).sort(byDueDateDesc);
    },
    [data.contracts, chargeViews],
  );
  const paymentsForContract = useCallback(
    (contractId: string) => data.payments.filter((p) => p.contractId === contractId).sort(byDateDesc),
    [data.payments],
  );
  const paymentsForCharge = useCallback(
    (chargeId: string) =>
      data.payments.filter((p) => p.allocations.some((a) => a.chargeId === chargeId)).sort(byDateDesc),
    [data.payments],
  );

  // ── Lo que se comparte con las pantallas ───────────────────────────

  const value: DataContextValue = {
    ...data,
    mode,
    loading,
    loadError,
    reload: () => setReloadKey((k) => k + 1),
    syncError,
    retrySync: syncNow,
    today,
    refreshToday: () => setToday(todayISO()),
    pullFromServer,
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

// Para usar los datos desde cualquier pantalla: const { properties } = useData();
export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData debe usarse dentro de DataProvider');
  return ctx;
}
