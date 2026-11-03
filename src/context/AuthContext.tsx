// =====================================================================
// Sesión
// ---------------------------------------------------------------------
// Ingreso con mail y contraseña (Supabase), modo demo y cierre de sesión.
// Después de ingresar, verifica que sea la cuenta administradora antes de mostrar los datos.
// =====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { hasAdminAccess } from '../lib/remoteStore';
import { supabase } from '../lib/supabase';
import { connectionErrorMessage } from '../utils/platform';

const DEMO_KEY = 'gestion_alquileres_modo_demo';

// signedIn = la cuenta administradora; noAccess = una cuenta válida que no tiene permiso;
// offline = hay sesión pero no se pudo llegar al servidor para confirmar el acceso.
export type AuthStatus = 'loading' | 'signedOut' | 'demo' | 'checking' | 'noAccess' | 'offline' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  email?: string;
  userId?: string;
  signIn: (email: string, password: string) => Promise<string | undefined>;
  signUp: (email: string, password: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  enterDemo: () => Promise<void>;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Mensajes de error ─────────────────────────────────────────────────

// Los errores de Supabase, explicados con palabras de la app.
function describeAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Mail o contraseña incorrectos.';
  if (/email not confirmed/i.test(message)) return 'Confirmá tu mail desde el correo que te enviamos y volvé a ingresar.';
  if (/already registered|already exists/i.test(message)) return 'Ya existe una cuenta con ese mail. Ingresá con tu contraseña.';
  if (/password should be at least|weak password/i.test(message)) return 'La contraseña tiene que tener al menos 6 caracteres.';
  if (/rate limit|too many/i.test(message)) return 'Demasiados intentos. Esperá unos minutos y volvé a probar.';
  if (/fetch|network/i.test(message)) return connectionErrorMessage();
  return 'No se pudo completar. Intentá de nuevo.';
}

// ── Proveedor de sesión ───────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [email, setEmail] = useState<string>();
  const [userId, setUserId] = useState<string>();

  const verify = useCallback(async () => {
    setStatus('checking');
    try {
      setStatus((await hasAdminAccess()) ? 'signedIn' : 'noAccess');
    } catch {
      setStatus('offline');
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const demo = await AsyncStorage.getItem(DEMO_KEY).catch(() => null);
      if (!active) return;
      if (demo === '1') {
        setStatus('demo');
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const user = data.session?.user;
      setEmail(user?.email ?? undefined);
      setUserId(user?.id);
      if (user) await verify();
      else setStatus('signedOut');
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setEmail(undefined);
        setUserId(undefined);
        setStatus((current) => (current === 'demo' ? current : 'signedOut'));
      }
      if (event === 'SIGNED_IN' && session?.user) {
        setEmail(session.user.email ?? undefined);
        setUserId(session.user.id);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [verify]);

  const signIn = useCallback<AuthContextValue['signIn']>(
    async (address, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email: address.trim(), password });
      if (error) return describeAuthError(error.message);
      setEmail(data.user?.email ?? undefined);
      setUserId(data.user?.id);
      await verify();
      return undefined;
    },
    [verify],
  );

  const signUp = useCallback<AuthContextValue['signUp']>(
    async (address, password) => {
      const { data, error } = await supabase.auth.signUp({ email: address.trim(), password });
      if (error) return { error: describeAuthError(error.message) };
      // Si Supabase pide confirmar el mail, no hay sesión hasta que se abre el enlace del correo.
      if (!data.session) return { needsConfirmation: true };
      setEmail(data.user?.email ?? undefined);
      setUserId(data.user?.id);
      await verify();
      return {};
    },
    [verify],
  );

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(DEMO_KEY).catch(() => undefined);
    await supabase.auth.signOut().catch(() => undefined);
    setEmail(undefined);
    setUserId(undefined);
    setStatus('signedOut');
  }, []);

  const enterDemo = useCallback(async () => {
    await AsyncStorage.setItem(DEMO_KEY, '1').catch(() => undefined);
    setStatus('demo');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, email, userId, signIn, signUp, signOut, enterDemo, retry: verify }),
    [status, email, userId, signIn, signUp, signOut, enterDemo, verify],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
