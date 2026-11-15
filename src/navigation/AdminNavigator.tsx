// =====================================================================
// Navegación del modo admin
// ---------------------------------------------------------------------
// Otro inicio, solo para mirar: Inicio (Resumen), Cuentas (con la ficha de cada una), Uso y
// Menú. Se ve como el resto de la app, con la franja de arriba azul noche y la etiqueta ADMIN.
// El período elegido (24 h, 7 días, 30 días) es el mismo en todas las pestañas.
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Sidebar from '../components/Sidebar';
import { useTheme } from '../context/ThemeContext';
import { useIsDesktop } from '../hooks/useIsDesktop';
import AdminAccountScreen from '../screens/admin/AdminAccountScreen';
import AdminAccountsScreen from '../screens/admin/AdminAccountsScreen';
import { Period, PeriodContext } from '../screens/admin/adminApi';
import AdminHomeScreen from '../screens/admin/AdminHomeScreen';
import AdminMenuScreen from '../screens/admin/AdminMenuScreen';
import AdminUsageScreen from '../screens/admin/AdminUsageScreen';

const Tab = createBottomTabNavigator();
const AccountsStack = createNativeStackNavigator();

const TAB_ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  AdminHomeTab: ['home', 'home-outline'],
  AdminAccountsTab: ['people', 'people-outline'],
  AdminUsageTab: ['stats-chart', 'stats-chart-outline'],
  AdminMenuTab: ['menu', 'menu-outline'],
};

// Cuentas: la lista y, encima, la ficha de la cuenta tocada (con flecha para volver).
function AccountsNavigator() {
  const { colors } = useTheme();
  return (
    <AccountsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.adminHeader },
        headerTintColor: colors.onHeader,
        headerShadowVisible: false,
        headerBackTitle: 'Cuentas',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AccountsStack.Screen name="AdminAccounts" component={AdminAccountsScreen} options={{ headerShown: false }} />
      <AccountsStack.Screen
        name="AdminAccount"
        component={AdminAccountScreen as any}
        options={({ route }: { route: { params?: { title?: string } } }) => ({ title: route.params?.title ?? 'Cuenta' })}
      />
    </AccountsStack.Navigator>
  );
}

export default function AdminNavigator() {
  const { colors, scheme } = useTheme();
  const desktop = useIsDesktop();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>(7);
  const periodValue = useMemo(() => ({ period, setPeriod }), [period]);

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = useMemo(
    () => ({ ...base, colors: { ...base.colors, background: colors.background, card: colors.surface, text: colors.text, border: colors.border, primary: colors.primary } }),
    [base, colors],
  );

  return (
    <PeriodContext.Provider value={periodValue}>
      <NavigationContainer theme={navigationTheme}>
        <Tab.Navigator
          tabBar={(props) => (desktop ? <Sidebar {...props} /> : <BottomTabBar {...props} />)}
          screenOptions={({ route }) => ({
            headerShown: false,
            popToTopOnBlur: true,
            tabBarPosition: desktop ? 'left' : 'bottom',
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarStyle: {
              backgroundColor: colors.tabBar,
              borderTopColor: colors.border,
              height: 64 + insets.bottom,
              paddingTop: 4,
              paddingBottom: Math.max(insets.bottom, 6),
            },
            tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
            tabBarIcon: ({ color, focused }) => <Ionicons name={TAB_ICONS[route.name][focused ? 0 : 1]} size={25} color={color} />,
          })}
        >
          <Tab.Screen name="AdminHomeTab" component={AdminHomeScreen} options={{ title: 'Inicio' }} />
          <Tab.Screen name="AdminAccountsTab" component={AccountsNavigator} options={{ title: 'Cuentas' }} />
          <Tab.Screen name="AdminUsageTab" component={AdminUsageScreen} options={{ title: 'Uso' }} />
          <Tab.Screen name="AdminMenuTab" component={AdminMenuScreen} options={{ title: 'Menú' }} />
        </Tab.Navigator>
      </NavigationContainer>
    </PeriodContext.Provider>
  );
}
