// =====================================================================
// Navegación
// ---------------------------------------------------------------------
// Las 4 pestañas de abajo (Inicio, Alquileres, Cobros, Menú) y las pantallas que se abren
// dentro de cada una. Para agregar una pantalla nueva, se registra acá.
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { createNavigationContainerRef, DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { BottomTabBar, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Sidebar from '../components/Sidebar';
import { useData } from '../context/DataContext';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { armBrowserHistory, markBrowserHistoryPopped, runBackHandler } from './browserBack';

import DashboardScreen from '../screens/DashboardScreen';
import ExchangeRateScreen from '../screens/ExchangeRateScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AccessScreen from '../screens/auth/AccessScreen';
import RentalsScreen from '../screens/rentals/RentalsScreen';
import PropertyFormScreen from '../screens/properties/PropertyFormScreen';
import PropertyDetailScreen from '../screens/properties/PropertyDetailScreen';
import PropertyPaymentsScreen from '../screens/properties/PropertyPaymentsScreen';
import TenantFormScreen from '../screens/tenants/TenantFormScreen';
import TenantDetailScreen from '../screens/tenants/TenantDetailScreen';
import ContractFormScreen from '../screens/contracts/ContractFormScreen';
import ContractDetailScreen from '../screens/contracts/ContractDetailScreen';
import PaymentsListScreen from '../screens/payments/PaymentsListScreen';
import ChargeFormScreen from '../screens/payments/ChargeFormScreen';
import PaymentDetailScreen from '../screens/payments/PaymentDetailScreen';
import PaymentFormScreen from '../screens/payments/PaymentFormScreen';
import MonthDetailScreen from '../screens/payments/MonthDetailScreen';
import { formatPeriod } from '../utils/format';
import { makeStyles, useTheme } from '../context/ThemeContext';

// ── Constantes y funciones auxiliares ─────────────────────────────────

// ── Pilas de pantallas de cada pestaña ──────────────────────────────

const Tab = createBottomTabNavigator();
const DashboardStack = createNativeStackNavigator();
const RentalsStack = createNativeStackNavigator();
const PaymentsStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();

function useScreenOptions() {
  const { colors } = useTheme();
  return useMemo(
    () => ({
      // La barra de arriba usa el mismo fondo gris que la pantalla, como en iOS.
      headerStyle: { backgroundColor: colors.background },
      headerTitleStyle: { color: colors.text, fontWeight: '600' as const, fontSize: 17 },
      headerTintColor: colors.primary,
      headerShadowVisible: false,
      contentStyle: { backgroundColor: colors.background },
    }),
    [colors],
  );
}

function DashboardStackNavigator() {
  const screenOptions = useScreenOptions();
  return (
    <DashboardStack.Navigator screenOptions={screenOptions}>
      <DashboardStack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="ExchangeRate"
        component={ExchangeRateScreen}
        options={{ title: 'Cotización del dólar' }}
      />
    </DashboardStack.Navigator>
  );
}

// Propiedades, inquilinos y contratos viven en una sola pestaña ("Alquileres").
function RentalsStackNavigator() {
  const screenOptions = useScreenOptions();
  return (
    <RentalsStack.Navigator screenOptions={screenOptions}>
      <RentalsStack.Screen name="Rentals" component={RentalsScreen} options={{ headerShown: false }} />
      <RentalsStack.Screen
        name="PropertyForm"
        component={PropertyFormScreen}
        options={({ route }: any) => ({
          title: route.params?.propertyId ? 'Editar propiedad' : 'Nueva propiedad',
        })}
      />
      <RentalsStack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Propiedad' }} />
      <RentalsStack.Screen
        name="PropertyPayments"
        component={PropertyPaymentsScreen}
        options={{ title: 'Historial por mes' }}
      />
      <RentalsStack.Screen
        name="MonthDetail"
        component={MonthDetailScreen}
        options={({ route }: any) => ({ title: formatPeriod(route.params.period) })}
      />
      <RentalsStack.Screen
        name="TenantForm"
        component={TenantFormScreen}
        options={({ route }: any) => ({
          title: route.params?.tenantId ? 'Editar inquilino' : 'Nuevo inquilino',
        })}
      />
      <RentalsStack.Screen name="TenantDetail" component={TenantDetailScreen} options={{ title: 'Inquilino' }} />
      <RentalsStack.Screen
        name="ContractForm"
        component={ContractFormScreen}
        options={({ route }: any) => ({
          title: route.params?.contractId ? 'Editar contrato' : 'Nuevo contrato',
        })}
      />
      <RentalsStack.Screen name="ContractDetail" component={ContractDetailScreen} options={{ title: 'Contrato' }} />
    </RentalsStack.Navigator>
  );
}

function PaymentsStackNavigator() {
  const screenOptions = useScreenOptions();
  return (
    <PaymentsStack.Navigator screenOptions={screenOptions}>
      <PaymentsStack.Screen
        name="PaymentsList"
        component={PaymentsListScreen}
        options={{ headerShown: false }}
      />
      <PaymentsStack.Screen
        name="PaymentForm"
        component={PaymentFormScreen}
        options={{ title: 'Registrar cobro' }}
      />
      <PaymentsStack.Screen
        name="PaymentDetail"
        component={PaymentDetailScreen}
        options={{ title: 'Cobro' }}
      />
      <PaymentsStack.Screen
        name="ChargeForm"
        component={ChargeFormScreen}
        options={({ route }: any) => ({
          title: route.params?.chargeId ? 'Cargo' : 'Agregar cargo',
        })}
      />
      <PaymentsStack.Screen
        name="History"
        component={PropertyPaymentsScreen}
        options={{ title: 'Historial por mes' }}
      />
      <PaymentsStack.Screen
        name="MonthDetail"
        component={MonthDetailScreen}
        options={({ route }: any) => ({ title: formatPeriod(route.params.period) })}
      />
    </PaymentsStack.Navigator>
  );
}

function SettingsStackNavigator() {
  const screenOptions = useScreenOptions();
  return (
    <SettingsStack.Navigator screenOptions={screenOptions}>
      <SettingsStack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
      <SettingsStack.Screen
        name="ExchangeRate"
        component={ExchangeRateScreen}
        options={{ title: 'Cotización del dólar' }}
      />
    </SettingsStack.Navigator>
  );
}

// ── Pestañas y botón "atrás" del navegador ───────────────────────────

// Ícono relleno para la pestaña activa y de contorno para las demás (como en iOS).
const TAB_ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  DashboardTab: ['home', 'home-outline'],
  RentalsTab: ['business', 'business-outline'],
  PaymentsTab: ['wallet', 'wallet-outline'],
  SettingsTab: ['menu', 'menu-outline'],
};

const navigationRef = createNavigationContainerRef();

function armBrowserBack() {
  if (navigationRef.canGoBack()) armBrowserHistory();
}

function useBrowserBackButton() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onPopState = () => {
      markBrowserHistoryPopped();
      if (runBackHandler()) {
        armBrowserBack();
        return;
      }
      if (navigationRef.isReady() && navigationRef.canGoBack()) navigationRef.goBack();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
}

// ── Componente ────────────────────────────────────────────────────────

// ── Navegación principal ─────────────────────────────────────────────

export default function RootNavigator() {
  const { colors, scheme } = useTheme();
  const styles = useStyles();
  useBrowserBackButton();
  const insets = useSafeAreaInsets();
  const { loading, loadError, reload } = useData();
  // Pantalla grande: barra lateral a la izquierda; celular: pestañas abajo.
  const desktop = useIsDesktop();
  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [colors, scheme]);

  // No se pudieron cargar los datos de la cuenta (sin conexión): se ofrece reintentar.
  if (!loading && loadError) return <AccessScreen message={loadError} onRetry={reload} />;

  // Mientras cargan los datos se muestra una ruedita, para no mostrar pantallas vacías un instante.
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} onStateChange={armBrowserBack} theme={navigationTheme}>
      <Tab.Navigator
        backBehavior="history"
        tabBar={(props) => (desktop ? <Sidebar {...props} /> : <BottomTabBar {...props} />)}
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarPosition: desktop ? 'left' : 'bottom',
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          // Alto fijo para que los nombres de las pestañas nunca se corten.
          tabBarStyle: {
            backgroundColor: colors.tabBar,
            borderTopColor: colors.border,
            height: 64 + insets.bottom,
            paddingTop: 4,
            paddingBottom: Math.max(insets.bottom, 6),
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={TAB_ICONS[route.name][focused ? 0 : 1]} size={25} color={color} />
          ),
        })}
      >
        <Tab.Screen name="DashboardTab" component={DashboardStackNavigator} options={{ title: 'Inicio' }} />
        <Tab.Screen name="RentalsTab" component={RentalsStackNavigator} options={{ title: 'Alquileres' }} />
        <Tab.Screen name="PaymentsTab" component={PaymentsStackNavigator} options={{ title: 'Cobros' }} />
        <Tab.Screen name="SettingsTab" component={SettingsStackNavigator} options={{ title: 'Menú' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
}));
