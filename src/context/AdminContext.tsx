// =====================================================================
// Modo admin
// ---------------------------------------------------------------------
// Solo para la cuenta marcada como admin del servicio (tabla service_admins en Supabase).
// Con esa cuenta la app abre en el modo admin: un inicio aparte para mirar el uso de todas
// las cuentas. Desde su Menú se pasa a «Ver Locatia como usuario» (la app de siempre, con
// los datos propios) y desde el Menú de siempre se vuelve. La app recuerda cuál quedó.
// =====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const VIEW_KEY = 'locatia_modo_admin';
const adminKey = (userId: string) => `locatia_es_admin_${userId}`;

interface AdminContextValue {
  // La cuenta con sesión abierta es admin.
  isAdmin: boolean;
  // Se está viendo el modo admin (y no la app de siempre).
  adminView: boolean;
  setAdminView: (on: boolean) => void;
}

const AdminContext = createContext<AdminContextValue>({ isAdmin: false, adminView: false, setAdminView: () => undefined });

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { status, userId } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  // Por defecto, el admin entra al modo admin.
  const [viewAdmin, setViewAdmin] = useState(true);

  useEffect(() => {
    let active = true;
    setIsAdmin(false);
    if (status !== 'signedIn' || !userId) return undefined;
    (async () => {
      // Lo último que se supo, para abrir directo en admin sin esperar al servidor.
      const [cached, view] = await Promise.all([
        AsyncStorage.getItem(adminKey(userId)).catch(() => null),
        AsyncStorage.getItem(VIEW_KEY).catch(() => null),
      ]);
      if (!active) return;
      if (cached === '1') setIsAdmin(true);
      setViewAdmin(view !== '0');
      const { data, error } = await supabase.rpc('am_i_admin');
      if (!active || error) return;
      setIsAdmin(data === true);
      AsyncStorage.setItem(adminKey(userId), data === true ? '1' : '0').catch(() => undefined);
    })().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [status, userId]);

  const setAdminView = useCallback((on: boolean) => {
    setViewAdmin(on);
    AsyncStorage.setItem(VIEW_KEY, on ? '1' : '0').catch(() => undefined);
  }, []);

  const value = useMemo(
    () => ({ isAdmin, adminView: isAdmin && viewAdmin, setAdminView }),
    [isAdmin, viewAdmin, setAdminView],
  );
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export const useAdmin = () => useContext(AdminContext);
