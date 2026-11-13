// =====================================================================
// Accesos directos de Inicio
// ---------------------------------------------------------------------
// Las funciones que se pueden poner arriba de Inicio (hasta SHORTCUTS_MAX) y cuáles van si no se
// eligió nada. Cada una abre la misma pantalla que está en su pestaña; qué hace cada una se
// define en DashboardScreen. Lo elegido se guarda en el dispositivo.
// =====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';

export type ShortcutId = 'cobro' | 'deuda' | 'contrato' | 'cargo' | 'propiedad' | 'masiva' | 'dolar' | 'historial';

export interface ShortcutInfo {
  id: ShortcutId;
  label: string;
  // Qué hace, para la lista de edición.
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const SHORTCUTS_MAX = 4;

// En el orden en que se ofrecen al editar.
export const SHORTCUT_CATALOG: ShortcutInfo[] = [
  { id: 'cobro', label: 'Registrar cobro', detail: 'Lo que te pagó un inquilino', icon: 'cash-outline' },
  { id: 'deuda', label: 'Recordar deuda', detail: 'WhatsApp con el detalle de lo que debe', icon: 'chatbubble-outline' },
  { id: 'contrato', label: 'Nuevo contrato', detail: 'Con su inquilino y condiciones', icon: 'document-text-outline' },
  { id: 'cargo', label: 'Agregar cargo', detail: 'Algo puntual que debe pagar el inquilino', icon: 'add-circle-outline' },
  { id: 'propiedad', label: 'Nueva propiedad', detail: 'Cargar una propiedad', icon: 'business-outline' },
  { id: 'masiva', label: 'Actualización masiva', detail: 'Alquileres, expensas y servicios del mes', icon: 'layers-outline' },
  { id: 'dolar', label: 'Cotización del dólar', detail: 'Ver o cambiar la cotización en uso', icon: 'trending-up-outline' },
  { id: 'historial', label: 'Historial por mes', detail: 'Cuánto se cobró cada mes', icon: 'time-outline' },
];

export const DEFAULT_SHORTCUTS: ShortcutId[] = ['cobro', 'deuda', 'contrato', 'cargo'];

const STORAGE_KEY = 'locatia_accesos_directos';
const KNOWN = new Set(SHORTCUT_CATALOG.map((s) => s.id));

// Los accesos elegidos (o los de siempre) y cómo cambiarlos.
export function useShortcuts(): [ShortcutId[], (ids: ShortcutId[]) => void] {
  const [ids, setIds] = useState<ShortcutId[]>(DEFAULT_SHORTCUTS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (!saved) return;
        const parsed = (JSON.parse(saved) as string[]).filter((id): id is ShortcutId => KNOWN.has(id as ShortcutId));
        if (parsed.length) setIds(parsed.slice(0, SHORTCUTS_MAX));
      })
      .catch(() => undefined);
  }, []);

  const save = useCallback((next: ShortcutId[]) => {
    setIds(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  return [ids, save];
}
