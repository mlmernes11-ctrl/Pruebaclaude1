import { Ionicons } from '@expo/vector-icons';
import { createNavigationContainerRef, DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import { armBrowserHistory, markBrowserHistoryPopped, runBackHandler } from './browserBack';

import DashboardScreen from '../screens/DashboardScreen';
import ExchangeRateScreen from '../screens/ExchangeRateScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PropertiesListScreen from '../screens/properties/PropertiesListScreen';
import PropertyFormScreen from '../screens/properties/PropertyFormScreen';
import PropertyDetailScreen from '../screens/properties/PropertyDetailScreen';
import PropertyPaymentsScreen from '../screens/properties/PropertyPaymentsScreen';
import TenantsListScreen from '../screens/tenants/TenantsListScreen';
import TenantFormScreen from '../screens/tenants/TenantFormScreen';
import TenantDetailScreen from '../screens/tenants/TenantDetailScreen';
import ContractsListScreen from '../screens/contracts/ContractsListScreen';
import ContractFormScreen from '../screens/contracts/ContractFormScreen';
import ContractDetailScreen from '../screens/contracts/ContractDetailScreen';
import PaymentsListScreen from '../screens/payments/PaymentsListScreen';
import ChargeFormScreen from '../screens/payments/ChargeFormScreen';
import PaymentDetailScreen from '../screens/payments/PaymentDetailScreen';
import PaymentFormScreen from '../screens/payments/PaymentFormScreen';
import MonthDetailScreen from '../screens/payments/MonthDetailScreen';
import { formatPeriod } from '../utils/format';
import { makeStyles, useTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();
const DashboardStack = createNativeStackNavigator();
const PropertiesStack = createNativeStackNavigator();
const TenantsStack = createNativeStackNavigator();
const ContractsStack = createNativeStackNavigator();
const PaymentsStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();

function useScreenOptions() {
  const { colors } = useTheme();
  return useMemo(
    () => ({
      headerStyle: { backgroundColor: colors.surface },
      headerTitleStyle: { color: colors.text, fontWeight: '700' as const },
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

function PropertiesStackNavigator() {
  const screenOptions = useScreenOptions();
  return (
    <PropertiesStack.Navigator screenOptions={screenOptions}>
      <PropertiesStack.Screen
        name="PropertiesList"
        component={PropertiesListScreen}
        options={{ headerShown: false }}
      />
      <PropertiesStack.Screen
        name="PropertyForm"
        component={PropertyFormScreen}
        options={({ route }: any) => ({
          title: route.params?.propertyId ? 'Editar propiedad' : 'Nueva propiedad',
        })}
      />
      <PropertiesStack.Screen
        name="PropertyDetail"
        component={PropertyDetailScreen}
        options={{ title: 'Propiedad' }}
      />
      <PropertiesStack.Screen
        name="PropertyPayments"
        component={PropertyPaymentsScreen}
        options={{ title: 'Historial de pagos' }}
      />
      <PropertiesStack.Screen
        name="MonthDetail"
        component={MonthDetailScreen}
        options={({ route }: any) => ({ title: formatPeriod(route.params.period) })}
      />
    </PropertiesStack.Navigator>
  );
}

function TenantsStackNavigator() {
  const screenOptions = useScreenOptions();
  return (
    <TenantsStack.Navigator screenOptions={screenOptions}>
      <TenantsStack.Screen
        name="TenantsList"
        component={TenantsListScreen}
        options={{ headerShown: false }}
      />
      <TenantsStack.Screen
        name="TenantForm"
        component={TenantFormScreen}
        options={({ route }: any) => ({
          title: route.params?.tenantId ? 'Editar inquilino' : 'Nuevo inquilino',
        })}
      />
      <TenantsStack.Screen
        name="TenantDetail"
        component={TenantDetailScreen}
        options={{ title: 'Inquilino' }}
      />
    </TenantsStack.Navigator>
  );
}

function ContractsStackNavigator() {
  const screenOptions = useScreenOptions();
  return (
    <ContractsStack.Navigator screenOptions={screenOptions}>
      <ContractsStack.Screen
        name="ContractsList"
        component={ContractsListScreen}
        options={{ headerShown: false }}
      />
      <ContractsStack.Screen
        name="ContractForm"
        component={ContractFormScreen}
        options={({ route }: any) => ({
          title: route.params?.contractId ? 'Editar contrato' : 'Nuevo contrato',
        })}
      />
      <ContractsStack.Screen
        name="ContractDetail"
        component={ContractDetailScreen}
        options={{ title: 'Contrato' }}
      />
    </ContractsStack.Navigator>
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
        options={{ title: 'Registrar pago' }}
      />
      <PaymentsStack.Screen
        name="PaymentDetail"
        component={PaymentDetailScreen}
        options={{ title: 'Pago recibido' }}
      />
      <PaymentsStack.Screen
        name="ChargeForm"
        component={ChargeFormScreen}
        options={({ route }: any) => ({
          title: route.params?.chargeId ? 'Liquidación' : 'Nueva liquidación',
        })}
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

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  DashboardTab: 'home',
  PropertiesTab: 'business',
  TenantsTab: 'people',
  ContractsTab: 'document-text',
  PaymentsTab: 'cash',
  SettingsTab: 'settings',
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

export default function RootNavigator() {
  const { colors, scheme } = useTheme();
  const styles = useStyles();
  useBrowserBackButton();
  const insets = useSafeAreaInsets();
  const { loading } = useData();
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

  // Saved data loads in a moment; showing screens before that would flash empty states.
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
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          // Explicit height so labels are never clipped (the web build has no bottom inset).
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: 64 + insets.bottom,
            paddingTop: 4,
            paddingBottom: Math.max(insets.bottom, 6),
          },
          // Six tabs share the width: a compact label that may use the tab's side padding,
          // so "Propiedades" fits on 360px-wide phones without being cut.
          tabBarLabel: ({ color, children }) => (
            <Text numberOfLines={1} style={[styles.tabLabel, { color }]}>
              {children}
            </Text>
          ),
          tabBarIcon: ({ color }) => <Ionicons name={TAB_ICONS[route.name]} size={22} color={color} />,
        })}
      >
        <Tab.Screen name="DashboardTab" component={DashboardStackNavigator} options={{ title: 'Inicio' }} />
        <Tab.Screen
          name="PropertiesTab"
          component={PropertiesStackNavigator}
          options={{ title: 'Propiedades' }}
        />
        <Tab.Screen name="TenantsTab" component={TenantsStackNavigator} options={{ title: 'Inquilinos' }} />
        <Tab.Screen
          name="ContractsTab"
          component={ContractsStackNavigator}
          options={{ title: 'Contratos' }}
        />
        <Tab.Screen name="PaymentsTab" component={PaymentsStackNavigator} options={{ title: 'Pagos' }} />
        <Tab.Screen name="SettingsTab" component={SettingsStackNavigator} options={{ title: 'Ajustes' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const useStyles = makeStyles((colors) => ({
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: -0.2,
    // Stretch plus negative margins lets the label use the tab's 5px side padding.
    alignSelf: 'stretch',
    marginHorizontal: -5,
    // The web Text caps itself at 100% of the padded box; lift the cap so the margins count.
    maxWidth: 80,
    textAlign: 'center',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
}));
