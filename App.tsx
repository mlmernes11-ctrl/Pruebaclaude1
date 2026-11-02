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
          <ExchangeRateProvider>
            <AuthProvider>
              <Gate />
              <DialogHost />
              <ThemedStatusBar />
            </AuthProvider>
          </ExchangeRateProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Signed-in administrator → data from Supabase; demo → sample data on this device; else sign in.
function Gate() {
  const { status, userId } = useAuth();
  if (status === 'signedOut') return <LoginScreen />;
  if (status === 'demo' || status === 'signedIn') {
    return (
      <DataProvider key={status === 'demo' ? 'demo' : userId} mode={status === 'demo' ? 'demo' : 'remote'}>
        <RootNavigator />
        <SyncBanner />
      </DataProvider>
    );
  }
  return <AccessScreen />;
}

function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}
