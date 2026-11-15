// =====================================================================
// Uso de la app (para el modo admin)
// ---------------------------------------------------------------------
// Anota qué se hace: abrir la app, cambiar de pantalla, terminar una acción y el tiempo de uso.
// Nunca nombres ni montos: solo el nombre de la acción o pantalla, la plataforma y si es el
// modo de ejemplo o una cuenta. Se juntan de a varias y se mandan cada tanto a la tabla
// usage_events de Supabase, que nadie puede leer salvo el admin (ver la migración admin_usage).
// No anota nada mientras se usa el modo admin, ni en la versión de prueba local.
// =====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { supabase } from './supabase';

const DEVICE_KEY = 'locatia_dispositivo';
// Cada cuánto se mandan las anotaciones juntadas y cada cuánto se suma un minuto de uso.
const FLUSH_MS = 15_000;
const TICK_SECONDS = 60;
// Si no hay conexión, se guardan como mucho estas (las más viejas se descartan).
const MAX_QUEUED = 200;

export type UsageMode = 'demo' | 'cuenta';
type Kind = 'open' | 'screen' | 'action' | 'time';

interface Row {
  user_id: string | null;
  device_id: string;
  session_id: string;
  mode: UsageMode;
  kind: Kind;
  name: string;
  seconds: number | null;
  platform: string;
  created_at: string;
}

const randomId = () => Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 8)).join('');

const sessionId = randomId();
let deviceId: string | undefined;
let context: { mode: UsageMode; userId?: string } | undefined;
let queue: Row[] = [];
let opened = false;
let lastScreen: string | undefined;
let started = false;

// La versión de prueba local (localhost) no anota nada, así las pruebas no ensucian los números.
const LOCAL_PREVIEW = Platform.OS === 'web' && typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
const ENABLED = !__DEV__ && !LOCAL_PREVIEW;

// android, web (celular o tablet) o computadora.
function platformName(): string {
  if (Platform.OS !== 'web') return Platform.OS;
  const fine = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches;
  return fine ? 'computadora' : 'web';
}

async function ensureDevice(): Promise<string> {
  if (deviceId) return deviceId;
  const saved = await AsyncStorage.getItem(DEVICE_KEY).catch(() => null);
  deviceId = saved ?? randomId();
  if (!saved) await AsyncStorage.setItem(DEVICE_KEY, deviceId).catch(() => undefined);
  return deviceId;
}

function push(kind: Kind, name: string, seconds: number | null = null) {
  if (!ENABLED || !context) return;
  queue.push({
    user_id: context.mode === 'cuenta' ? (context.userId ?? null) : null,
    device_id: deviceId ?? '',
    session_id: sessionId,
    mode: context.mode,
    kind,
    name: name.slice(0, 60),
    seconds,
    platform: platformName(),
    created_at: new Date().toISOString(),
  });
  if (queue.length > MAX_QUEUED) queue = queue.slice(-MAX_QUEUED);
}

async function flush() {
  if (!queue.length) return;
  const id = await ensureDevice();
  const rows = queue.map((row) => ({ ...row, device_id: row.device_id || id }));
  queue = [];
  const { error } = await supabase.from('usage_events').insert(rows);
  // Sin conexión: vuelven a la fila para el próximo intento.
  if (error) queue = [...rows, ...queue].slice(-MAX_QUEUED);
}

function start() {
  if (started || !ENABLED) return;
  started = true;
  setInterval(() => {
    flush().catch(() => undefined);
  }, FLUSH_MS);
  // Un minuto de uso por cada minuto con la app a la vista.
  setInterval(() => {
    if (AppState.currentState === 'active') push('time', 'uso', TICK_SECONDS);
  }, TICK_SECONDS * 1000);
  AppState.addEventListener('change', (state) => {
    if (state !== 'active') flush().catch(() => undefined);
  });
}

// Quién está usando la app: modo de ejemplo o una cuenta. undefined = no anotar (modo admin,
// pantalla de ingreso). La primera vez de cada sesión anota que se abrió la app.
export function setUsageContext(next: { mode: UsageMode; userId?: string } | undefined) {
  context = next;
  if (!next || !ENABLED) return;
  start();
  ensureDevice()
    .then(() => {
      if (!opened && context) {
        opened = true;
        push('open', 'abrir');
      }
    })
    .catch(() => undefined);
}

export function trackScreen(name: string | undefined) {
  if (!name || name === lastScreen) return;
  lastScreen = name;
  push('screen', name);
}

// Nombres de las acciones (el modo admin los muestra con las palabras de ACTION_LABELS).
export type UsageAction =
  | 'registrar_cobro'
  | 'nuevo_contrato'
  | 'nueva_propiedad'
  | 'nuevo_inquilino'
  | 'agregar_cargo'
  | 'recordar_deuda'
  | 'mandar_comprobante'
  | 'actualizacion_masiva'
  | 'ordenar_accesos'
  | 'abrir_manual'
  | 'enviar_comentarios'
  | 'cargar_ejemplo';

export function trackAction(name: UsageAction) {
  push('action', name);
}
