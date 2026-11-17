// =====================================================================
// Modo admin: datos
// ---------------------------------------------------------------------
// Pide a Supabase los resúmenes de uso (funciones admin_* de la migración admin_usage; solo
// responden a la cuenta admin) y traduce los nombres de acciones y pantallas a palabras.
// =====================================================================

import { useFocusEffect } from '@react-navigation/native';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

// ── Período ───────────────────────────────────────────────────────────

export type Period = 1 | 7 | 30;
export const PERIOD_OPTIONS: { value: `${Period}`; label: string }[] = [
  { value: '1', label: '24 h' },
  { value: '7', label: '7 días' },
  { value: '30', label: '30 días' },
];

export const PeriodContext = createContext<{ period: Period; setPeriod: (p: Period) => void }>({
  period: 7,
  setPeriod: () => undefined,
});
export const usePeriod = () => useContext(PeriodContext);

// ── Lo que devuelve cada resumen ─────────────────────────────────────

export interface NameCount {
  name: string;
  count: number;
}

export interface Overview {
  accounts: number;
  activeAccounts: number;
  activeAccountsPrev: number;
  demoDevices: number;
  demoDevicesPrev: number;
  payments: number;
  paymentsPrev: number;
  minutesPerDay: number;
  minutesPerDayPrev: number;
  topActions: NameCount[];
  latestSignup: string | null;
}

export interface AccountRow {
  id: string;
  email: string | null;
  name: string | null;
  createdAt: string;
  lastSeen: string | null;
  actions: number;
  properties: number;
  payments: number;
}

export interface AccountsList {
  demoDevices: number;
  accounts: AccountRow[];
}

export interface AccountDetail {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  providers: string[];
  createdAt: string;
  confirmedAt: string | null;
  lastSignInAt: string | null;
  lastSeen: string | null;
  triedDemoFirst: boolean;
  counts: { properties: number; tenants: number; contracts: number; payments: number };
  daysActive: number;
  minutesPerDay: number;
  platforms: Record<string, number>;
  topActions: NameCount[];
  latest: { name: string; kind: string; at: string; platform: string | null }[];
}

export interface Usage {
  actions: NameCount[];
  screens: NameCount[];
  platforms: Record<string, number>;
  hours: Record<string, number>;
  sessions: number;
  minutes: number;
  funnel: { opened: number; triedDemo: number; signedUp: number; loaded: number; firstPayment: number };
}

// ── Pedir un resumen ─────────────────────────────────────────────────

// Lo pide al entrar a la pantalla y cuando cambia el período; refresh() para «deslizar para actualizar».
export function useAdminData<T>(fn: string, args: Record<string, unknown>) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const key = JSON.stringify(args);
  const latest = useRef(0);

  const load = useCallback(async () => {
    const ticket = ++latest.current;
    const { data: result, error: failure } = await supabase.rpc(fn, JSON.parse(key));
    if (ticket !== latest.current) return;
    if (failure) setError('No se pudieron traer los datos. Revisá la conexión y deslizá para actualizar.');
    else {
      setError(undefined);
      setData(result as T);
    }
  }, [fn, key]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load]),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load().catch(() => undefined);
    setRefreshing(false);
  }, [load]);

  return { data, error, refreshing, refresh };
}

// ── Palabras ──────────────────────────────────────────────────────────

export const ACTION_LABELS: Record<string, string> = {
  registrar_cobro: 'Registrar cobro',
  nuevo_contrato: 'Nuevo contrato',
  nueva_propiedad: 'Nueva propiedad',
  nuevo_inquilino: 'Nuevo inquilino',
  agregar_cargo: 'Agregar cargo',
  recordar_deuda: 'Recordar deuda',
  mandar_comprobante: 'Mandar recibo',
  actualizacion_masiva: 'Actualización masiva',
  ordenar_accesos: 'Ordenar accesos',
  abrir_manual: 'Abrir el manual',
  enviar_comentarios: 'Enviar comentarios',
  cargar_ejemplo: 'Cargar datos de ejemplo',
  abrir: 'Abrió la app',
};

// Pantallas de la app de siempre (nombres de RootNavigator). «PaymentsList» era la pestaña Cobros,
// que ya no está: queda con su nombre para leer los registros viejos.
export const SCREEN_LABELS: Record<string, string> = {
  Dashboard: 'Inicio',
  Rentals: 'Alquileres',
  Menu: 'Menú',
  TodosCobros: 'Historial de cobros',
  PropertyPayments: 'Cuenta corriente',
  PropertyDetail: 'Ficha de propiedad',
  PropertyForm: 'Formulario de propiedad',
  ContractDetail: 'Ficha de contrato',
  ContractForm: 'Formulario de contrato',
  TenantDetail: 'Ficha de inquilino',
  TenantForm: 'Formulario de inquilino',
  PaymentForm: 'Registrar cobro',
  PaymentDetail: 'Detalle de cobro',
  ChargeForm: 'Agregar cargo',
  ChargeDetail: 'Detalle de cargo',
  Imports: 'Actualización masiva',
  ExchangeRate: 'Cotización del dólar',
  History: 'Historial por mes',
  MonthDetail: 'Detalle del mes',
};
// Solo para nombrar registros viejos (no cuenta como pantalla «que nadie abrió»).
const OLD_SCREEN_LABELS: Record<string, string> = { PaymentsList: 'Cobros (pestaña vieja)' };

export const PLATFORM_LABELS: Record<string, string> = {
  android: 'Android',
  ios: 'iPhone',
  web: 'Web en el celular',
  computadora: 'Computadora',
  otro: 'Otro',
};

export const actionLabel = (name: string) => ACTION_LABELS[name] ?? name;
export const screenLabel = (name: string) => SCREEN_LABELS[name] ?? OLD_SCREEN_LABELS[name] ?? name;
export const platformLabel = (name: string) => PLATFORM_LABELS[name] ?? name;

// «hace 5 min», «hace 3 h», «ayer», «hace 12 días».
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'Nunca';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'Recién';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'Ayer' : `Hace ${days} días`;
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return 'Nunca';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function dateTime(iso: string): string {
  const d = new Date(iso);
  return `${shortDate(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Etiqueta de cada cuenta: Probando (menos de 7 días), Sin uso (más de 14 días quieta), Activa.
export type AccountState = 'Activa' | 'Probando' | 'Sin uso';
export function accountState(row: { createdAt: string; lastSeen: string | null }): AccountState {
  const now = Date.now();
  const day = 86_400_000;
  if (!row.lastSeen || now - new Date(row.lastSeen).getTime() > 14 * day) return 'Sin uso';
  if (now - new Date(row.createdAt).getTime() < 7 * day) return 'Probando';
  return 'Activa';
}

// «↑ 3», «↓ 2» o «igual» frente al período anterior.
export function delta(now: number, before: number): string {
  const diff = Math.round((now - before) * 10) / 10;
  if (diff > 0) return `↑ ${diff}`;
  if (diff < 0) return `↓ ${Math.abs(diff)}`;
  return 'igual';
}
