// =====================================================================
// Punto de entrada de la app
// ---------------------------------------------------------------------
// Arma las capas que usa toda la app (tema, sesión, datos y cotización) y decide qué se ve:
// la pantalla de ingreso, el aviso de "sin acceso" o la app con sus datos.
// =====================================================================

import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DialogHost from './src/components/DialogHost';
import SyncBanner from './src/components/SyncBanner';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DataProvider } from './src/context/DataContext';
import { ExchangeRateProvider } from './src/context/ExchangeRateContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';
import AccessScreen from './src/screens/auth/AccessScreen';
import LoginScreen from './src/screens/auth/LoginScreen';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <Gate />
            <DialogHost />
            <ThemedStatusBar />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Con sesión → los datos de esa cuenta en Supabase; modo demo → datos de ejemplo del celular; si no, pantalla de ingreso.
function Gate() {
  const { status, userId } = useAuth();
  if (status === 'signedOut') return <LoginScreen />;
  if (status === 'demo' || status === 'signedIn') {
    const mode = status === 'demo' ? 'demo' : 'remote';
    // "key" hace que al cambiar de cuenta (o pasar a demo) todo arranque de cero.
    return (
      <DataProvider key={mode === 'demo' ? 'demo' : userId} mode={mode}>
        <ExchangeRateProvider key={mode === 'demo' ? 'demo' : userId} mode={mode} userId={userId}>
          <RootNavigator />
          <SyncBanner />
        </ExchangeRateProvider>
      </DataProvider>
    );
  }
  return <AccessScreen />;
}

function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}
