// =====================================================================
// Sesión
// ---------------------------------------------------------------------
// Ingreso con mail y contraseña o con Google (Supabase), modo demo y cierre de sesión.
// Cada cuenta ve solo sus propios datos (lo controla la base con sus reglas de seguridad).
// =====================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { connectionErrorMessage } from '../utils/platform';

const DEMO_KEY = 'gestion_alquileres_modo_demo';

// En el celular, Google vuelve a la app por esta dirección (el "scheme" está en app.json).
const NATIVE_REDIRECT = 'auth-callback';

// signedIn = hay sesión (cada cuenta ve solo sus datos) · demo = datos de ejemplo del celular.
export type AuthStatus = 'loading' | 'signedOut' | 'demo' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  email?: string;
  userId?: string;
  signIn: (email: string, password: string) => Promise<string | undefined>;
  signUp: (email: string, password: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  // Devuelve un mensaje si no se pudo; si sale bien, la sesión llega sola.
  signInWithGoogle: () => Promise<string | undefined>;
  signOut: () => Promise<void>;
  enterDemo: () => Promise<void>;
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
  if (/provider is not enabled|unsupported provider/i.test(message)) return 'El ingreso con Google todavía no está activado.';
  if (/fetch|network/i.test(message)) return connectionErrorMessage();
  return 'No se pudo completar. Intentá de nuevo.';
}

// ── Proveedor de sesión ───────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [email, setEmail] = useState<string>();
  const [userId, setUserId] = useState<string>();

  // Al abrir: modo demo si quedó elegido; si no, la sesión guardada (si hay).
  useEffect(() => {
    let active = true;
    (async () => {
      const demo = await AsyncStorage.getItem(DEMO_KEY).catch(() => null);
      if (!active) return;
      if (demo === '1') {
        setStatus('demo');
        return;
      }
      // En la web, si se vuelve de Google, getSession() espera a que se complete el ingreso.
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const user = data.session?.user;
      setEmail(user?.email ?? undefined);
      setUserId(user?.id);
      setStatus(user ? 'signedIn' : 'signedOut');
    })();

    // Cualquier ingreso o salida (también el de Google) actualiza la pantalla.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setEmail(undefined);
        setUserId(undefined);
        setStatus((current) => (current === 'demo' ? current : 'signedOut'));
      }
      if (event === 'SIGNED_IN' && session?.user) {
        setEmail(session.user.email ?? undefined);
        setUserId(session.user.id);
        setStatus((current) => (current === 'demo' ? current : 'signedIn'));
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback<AuthContextValue['signIn']>(async (address, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: address.trim(), password });
    return error ? describeAuthError(error.message) : undefined;
  }, []);

  const signUp = useCallback<AuthContextValue['signUp']>(async (address, password) => {
    const { data, error } = await supabase.auth.signUp({ email: address.trim(), password });
    if (error) return { error: describeAuthError(error.message) };
    // Si Supabase pide confirmar el mail, no hay sesión hasta que se abre el enlace del correo.
    return data.session ? {} : { needsConfirmation: true };
  }, []);

  // Web: la página va a Google y vuelve sola. Celular: se abre Google en una ventana del
  // navegador y, al volver a la app, se canjea el código por la sesión.
  const signInWithGoogle = useCallback<AuthContextValue['signInWithGoogle']>(async () => {
    if (Platform.OS === 'web') {
      const redirectTo = window.location.origin + window.location.pathname;
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
      return error ? describeAuthError(error.message) : undefined;
    }
    const redirectTo = Linking.createURL(NATIVE_REDIRECT);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data.url) return describeAuthError(error?.message ?? '');
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return undefined; // la persona cerró la ventana
    const code = Linking.parse(result.url).queryParams?.code;
    if (typeof code !== 'string') return 'No se pudo completar el ingreso con Google.';
    const exchange = await supabase.auth.exchangeCodeForSession(code);
    return exchange.error ? describeAuthError(exchange.error.message) : undefined;
  }, []);

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
    () => ({ status, email, userId, signIn, signUp, signInWithGoogle, signOut, enterDemo }),
    [status, email, userId, signIn, signUp, signInWithGoogle, signOut, enterDemo],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
