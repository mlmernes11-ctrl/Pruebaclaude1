// =====================================================================
// Accesos directos de Inicio
// ---------------------------------------------------------------------
// Todas las funciones que se pueden abrir desde Inicio, en el orden que eligió cada uno. Las
// primeras SHORTCUTS_ON_HOME se ven en Inicio; todas, al tocar «Más», donde se reordenan
// manteniendo apretado y arrastrando (ShortcutsSheet). El orden se guarda en el dispositivo.
// Qué abre cada una se define en DashboardScreen.
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

// Cuántos se ven en Inicio (el cuarto lugar es «Más»).
export const SHORTCUTS_ON_HOME = 3;

// En el orden de entrada.
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

const DEFAULT_ORDER: ShortcutId[] = SHORTCUT_CATALOG.map((s) => s.id);

const STORAGE_KEY = 'locatia_accesos_directos';
const KNOWN = new Set<string>(DEFAULT_ORDER);

// Un orden completo: lo guardado (sin repetidos ni desconocidos) y después lo que falte, en el
// orden de entrada. Así una función nueva aparece sola al final.
function completeOrder(saved: readonly string[]): ShortcutId[] {
  const kept = [...new Set(saved)].filter((id): id is ShortcutId => KNOWN.has(id));
  return [...kept, ...DEFAULT_ORDER.filter((id) => !kept.includes(id))];
}

// El orden elegido (o el de entrada) y cómo cambiarlo.
export function useShortcuts(): [ShortcutId[], (order: ShortcutId[]) => void] {
  const [order, setOrder] = useState<ShortcutId[]>(DEFAULT_ORDER);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved) setOrder(completeOrder(JSON.parse(saved) as string[]));
      })
      .catch(() => undefined);
  }, []);

  const save = useCallback((next: ShortcutId[]) => {
    const full = completeOrder(next);
    setOrder(full);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(full)).catch(() => undefined);
  }, []);

  return [order, save];
}
