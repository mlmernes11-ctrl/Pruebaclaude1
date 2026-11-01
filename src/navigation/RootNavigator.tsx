import { Ionicons } from '@expo/vector-icons';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { colors } from '../theme';

import DashboardScreen from '../screens/DashboardScreen';
import ExchangeRateScreen from '../screens/ExchangeRateScreen';
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

const Tab = createBottomTabNavigator();
const DashboardStack = createNativeStackNavigator();
const PropertiesStack = createNativeStackNavigator();
const TenantsStack = createNativeStackNavigator();
const ContractsStack = createNativeStackNavigator();
const PaymentsStack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTitleStyle: { color: colors.text, fontWeight: '700' as const },
  headerTintColor: colors.primary,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};

function DashboardStackNavigator() {
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
    </PropertiesStack.Navigator>
  );
}

function TenantsStackNavigator() {
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
          title: route.params?.chargeId ? 'Cuota' : 'Nueva cuota',
        })}
      />
    </PaymentsStack.Navigator>
  );
}

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  DashboardTab: 'home',
  PropertiesTab: 'business',
  TenantsTab: 'people',
  ContractsTab: 'document-text',
  PaymentsTab: 'cash',
};

const navigationRef = createNavigationContainerRef();

// On the web the browser's back button would leave the app. One extra history entry is kept
// while there is somewhere to go back to, and each back press is turned into an in-app back.
let browserBackArmed = false;

function armBrowserBack() {
  if (Platform.OS !== 'web' || browserBackArmed || !navigationRef.canGoBack()) return;
  try {
    window.history.pushState({ appBack: true }, '');
    browserBackArmed = true;
  } catch {
    // History may be unavailable in some embedded views; the in-app back still works.
  }
}

function useBrowserBackButton() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onPopState = () => {
      browserBackArmed = false;
      if (navigationRef.isReady() && navigationRef.canGoBack()) navigationRef.goBack();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
}

export default function RootNavigator() {
  useBrowserBackButton();
  return (
    <NavigationContainer ref={navigationRef} onStateChange={armBrowserBack}>
      <Tab.Navigator
        backBehavior="history"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />
          ),
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
      </Tab.Navigator>
    </NavigationContainer>
  );
}
