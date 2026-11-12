// =====================================================================
// Punto de entrada de la app
// ---------------------------------------------------------------------
// Arma las capas que usa toda la app (tema, sesión, datos y cotización) y decide qué se ve:
// la pantalla de ingreso, el aviso de "sin acceso" o la app con sus datos.
// =====================================================================

import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DialogHost from './src/components/DialogHost';
import ErrorBoundary from './src/components/ErrorBoundary';
import SyncBanner from './src/components/SyncBanner';
import UpdatePrompt from './src/components/UpdatePrompt';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DataProvider } from './src/context/DataContext';
import { ExchangeRateProvider } from './src/context/ExchangeRateContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { installErrorReporting } from './src/lib/errorReporting';
import RootNavigator from './src/navigation/RootNavigator';
import AccessScreen from './src/screens/auth/AccessScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import NewPasswordScreen from './src/screens/auth/NewPasswordScreen';

// Los errores que nadie atrapó se anotan solos (ver errorReporting).
installErrorReporting();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <ErrorBoundary>
              <Gate />
            </ErrorBoundary>
            <DialogHost />
            <UpdatePrompt />
            <ThemedStatusBar />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Con sesión → los datos de esa cuenta en Supabase; modo demo → datos de ejemplo del celular; si no, pantalla de ingreso.
function Gate() {
  const { status, userId, recovering } = useAuth();
  if (status === 'signedOut') return <LoginScreen />;
  if (recovering) return <NewPasswordScreen />;
  if (status === 'demo' || status === 'signedIn') {
    const mode = status === 'demo' ? 'demo' : 'remote';
    // "key" hace que al cambiar de cuenta (o pasar a demo) todo arranque de cero.
    return (
      <DataProvider key={mode === 'demo' ? 'demo' : userId} mode={mode} userId={userId}>
        <ExchangeRateProvider key={mode === 'demo' ? 'demo' : userId} mode={mode} userId={userId}>
          <RootNavigator />
          <SyncBanner />
        </ExchangeRateProvider>
      </DataProvider>
    );
  }
  return <AccessScreen />;
}

// Dentro de la app la barra de arriba es azul: la hora y la batería van en blanco.
function ThemedStatusBar() {
  const { scheme } = useTheme();
  const { status } = useAuth();
  const inApp = status === 'demo' || status === 'signedIn';
  return <StatusBar style={inApp || scheme === 'dark' ? 'light' : 'dark'} />;
}
