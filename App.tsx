import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DialogHost from './src/components/DialogHost';
import { DataProvider } from './src/context/DataContext';
import { ExchangeRateProvider } from './src/context/ExchangeRateContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ExchangeRateProvider>
          <DataProvider>
            <RootNavigator />
            <DialogHost />
            <StatusBar style="dark" />
          </DataProvider>
        </ExchangeRateProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
