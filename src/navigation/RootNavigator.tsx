import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
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
        options={({ route }: any) => ({
          title: route.params?.paymentId ? 'Editar pago' : 'Registrar pago',
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

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
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
