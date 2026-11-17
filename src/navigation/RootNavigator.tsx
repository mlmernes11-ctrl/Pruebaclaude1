// =====================================================================
// Navegación
// ---------------------------------------------------------------------
// Las 3 pestañas de abajo (Inicio, Alquileres, Menú) y las pantallas que se abren dentro de cada
// una. Lo de cobros vive en Inicio («Tus alquileres», «Últimos cobros» y el historial) y en cada
// ficha. Lo que se abre desde una pestaña se queda en ella, así «atrás» vuelve a donde estabas.
// Para agregar una pantalla nueva, se registra acá.
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { createNavigationContainerRef, DarkTheme, DefaultTheme, getFocusedRouteNameFromRoute, NavigationContainer, StackActions } from '@react-navigation/native';
import { BottomTabBar, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Sidebar from '../components/Sidebar';
import { useData } from '../context/DataContext';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { armBrowserHistory, markBrowserHistoryPopped, runBackHandler } from './browserBack';
import { confirmLeaveForm, formScreen, formScreenOptions, hasUnsavedForm } from './formScreen';
import { resetOnTabLeave } from './resetOnTabLeave';
import { tabSlide } from './swipeTabs';
import { trackScreen } from '../lib/usage';

import DashboardScreen from '../screens/DashboardScreen';
import ExchangeRateScreen from '../screens/ExchangeRateScreen';
import MenuScreen from '../screens/MenuScreen';
import ImportsScreen from '../screens/imports/ImportsScreen';
import AccessScreen from '../screens/auth/AccessScreen';
import RentalsScreen from '../screens/rentals/RentalsScreen';
import PropertyFormScreen from '../screens/properties/PropertyFormScreen';
import PropertyDetailScreen from '../screens/properties/PropertyDetailScreen';
import HistoryScreen from '../screens/HistoryScreen';
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

// ── Pilas de pantallas de cada pestaña ──────────────────────────────

const Tab = createBottomTabNavigator();
const DashboardStack = createNativeStackNavigator();
// Pantallas de Inicio que ocupan todo (sin la barra de abajo, como la «Actividad» de las apps de
// pagos): el historial de cobros y lo que se abre desde ahí. Se vuelve con la flecha o con «atrás».
const FULL_SCREEN = new Set(['TodosCobros', 'PaymentDetail', 'ChargeForm', 'History', 'MonthDetail']);
const RentalsStack = createNativeStackNavigator();
const MenuStack = createNativeStackNavigator();

// La primera pantalla de cada pestaña vuelve a empezar al salir de ella (ver resetOnTabLeave).
const DashboardRoot = resetOnTabLeave(DashboardScreen as any, 'DashboardTab');
const RentalsRoot = resetOnTabLeave(RentalsScreen as any, 'RentalsTab', ['filter']);
const MenuRoot = resetOnTabLeave(MenuScreen as any, 'MenuTab');

// Formularios: avisan antes de perder lo cargado y en la computadora se abren al frente (ver formScreen).
const propertyFormTitle = (params: any) => (params?.propertyId ? 'Editar propiedad' : 'Nueva propiedad');
const tenantFormTitle = (params: any) => (params?.tenantId ? 'Editar inquilino' : 'Nuevo inquilino');
const contractFormTitle = (params: any) =>
  params?.contractId ? 'Editar contrato' : params?.renewFromId ? 'Renovar contrato' : 'Nuevo contrato';
const chargeFormTitle = (params: any) => (params?.chargeId ? 'Cargo' : 'Agregar cargo');
const importsTitle = () => 'Actualización masiva';
const paymentFormTitle = () => 'Registrar cobro';
const PropertyForm = formScreen(PropertyFormScreen as any, propertyFormTitle);
const TenantForm = formScreen(TenantFormScreen as any, tenantFormTitle);
const ContractForm = formScreen(ContractFormScreen as any, contractFormTitle);
const ChargeForm = formScreen(ChargeFormScreen as any, chargeFormTitle);
const PaymentForm = formScreen(PaymentFormScreen as any, paymentFormTitle);
const Imports = formScreen(ImportsScreen as any, importsTitle, { wide: true });

function useScreenOptions() {
  const { colors } = useTheme();
  return useMemo(
    () => ({
      // La barra de arriba es la misma franja azul de los títulos de las pestañas.
      headerStyle: { backgroundColor: colors.header },
      headerTitleStyle: { color: colors.onHeader, fontWeight: '600' as const, fontSize: 17 },
      headerTintColor: colors.onHeader,
      headerShadowVisible: false,
      contentStyle: { backgroundColor: colors.background },
    }),
    [colors],
  );
}

function DashboardStackNavigator() {
  const screenOptions = useScreenOptions();
  const desktop = useIsDesktop();
  return (
    <DashboardStack.Navigator screenOptions={screenOptions}>
      <DashboardStack.Screen
        name="Dashboard"
        component={DashboardRoot}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="ExchangeRate"
        component={ExchangeRateScreen}
        options={{ title: 'Cotización del dólar' }}
      />
      <DashboardStack.Screen name="Imports" component={Imports} options={formScreenOptions(desktop, importsTitle())} />
      {/* Los cobros: el historial completo (cobros y cargos, con buscador y filtros) y lo que se abre desde ahí. */}
      <DashboardStack.Screen name="TodosCobros" component={PaymentsListScreen} options={{ title: 'Historial de cobros' }} />
      <DashboardStack.Screen name="PaymentForm" component={PaymentForm} options={formScreenOptions(desktop, paymentFormTitle())} />
      <DashboardStack.Screen name="PaymentDetail" component={PaymentDetailScreen} options={{ title: 'Cobro' }} />
      <DashboardStack.Screen
        name="ChargeForm"
        component={ChargeForm}
        options={({ route }: any) => formScreenOptions(desktop, chargeFormTitle(route.params))}
      />
      <DashboardStack.Screen name="History" component={HistoryScreen} options={{ title: 'Historial por mes' }} />
      <DashboardStack.Screen
        name="MonthDetail"
        component={MonthDetailScreen}
        options={({ route }: any) => ({ title: formatPeriod(route.params.period) })}
      />
      {/* La ficha (y su contrato, inquilino y cuenta corriente) abierta desde Inicio se queda en Inicio. */}
      <DashboardStack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Propiedad' }} />
      <DashboardStack.Screen
        name="PropertyForm"
        component={PropertyForm}
        options={({ route }: any) => formScreenOptions(desktop, propertyFormTitle(route.params))}
      />
      <DashboardStack.Screen name="PropertyPayments" component={PaymentsListScreen} options={{ title: 'Cuenta corriente' }} />
      <DashboardStack.Screen name="ContractDetail" component={ContractDetailScreen} options={{ title: 'Contrato' }} />
      <DashboardStack.Screen
        name="ContractForm"
        component={ContractForm}
        options={({ route }: any) => formScreenOptions(desktop, contractFormTitle(route.params))}
      />
      <DashboardStack.Screen name="TenantDetail" component={TenantDetailScreen} options={{ title: 'Inquilino' }} />
      <DashboardStack.Screen
        name="TenantForm"
        component={TenantForm}
        options={({ route }: any) => formScreenOptions(desktop, tenantFormTitle(route.params))}
      />
    </DashboardStack.Navigator>
  );
}

// Propiedades, inquilinos y contratos viven en una sola pestaña ("Alquileres").
function RentalsStackNavigator() {
  const screenOptions = useScreenOptions();
  const desktop = useIsDesktop();
  return (
    <RentalsStack.Navigator screenOptions={screenOptions}>
      <RentalsStack.Screen name="Rentals" component={RentalsRoot} options={{ headerShown: false }} />
      <RentalsStack.Screen
        name="PropertyForm"
        component={PropertyForm}
        options={({ route }: any) => formScreenOptions(desktop, propertyFormTitle(route.params))}
      />
      <RentalsStack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Propiedad' }} />
      <RentalsStack.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: 'Historial por mes' }}
      />
      <RentalsStack.Screen
        name="MonthDetail"
        component={MonthDetailScreen}
        options={({ route }: any) => ({ title: formatPeriod(route.params.period) })}
      />
      <RentalsStack.Screen
        name="TenantForm"
        component={TenantForm}
        options={({ route }: any) => formScreenOptions(desktop, tenantFormTitle(route.params))}
      />
      <RentalsStack.Screen name="TenantDetail" component={TenantDetailScreen} options={{ title: 'Inquilino' }} />
      <RentalsStack.Screen
        name="ContractForm"
        component={ContractForm}
        options={({ route }: any) => formScreenOptions(desktop, contractFormTitle(route.params))}
      />
      <RentalsStack.Screen name="ContractDetail" component={ContractDetailScreen} options={{ title: 'Contrato' }} />
      <RentalsStack.Screen name="Imports" component={Imports} options={formScreenOptions(desktop, importsTitle())} />
      {/* Lo que se abre desde una ficha se queda en Alquileres: «atrás» vuelve a la ficha. */}
      <RentalsStack.Screen name="PropertyPayments" component={PaymentsListScreen} options={{ title: 'Cuenta corriente' }} />
      <RentalsStack.Screen name="PaymentForm" component={PaymentForm} options={formScreenOptions(desktop, paymentFormTitle())} />
      <RentalsStack.Screen name="PaymentDetail" component={PaymentDetailScreen} options={{ title: 'Cobro' }} />
      <RentalsStack.Screen
        name="ChargeForm"
        component={ChargeForm}
        options={({ route }: any) => formScreenOptions(desktop, chargeFormTitle(route.params))}
      />
    </RentalsStack.Navigator>
  );
}

function MenuStackNavigator() {
  const screenOptions = useScreenOptions();
  const desktop = useIsDesktop();
  return (
    <MenuStack.Navigator screenOptions={screenOptions}>
      <MenuStack.Screen name="Menu" component={MenuRoot} options={{ headerShown: false }} />
      <MenuStack.Screen
        name="ExchangeRate"
        component={ExchangeRateScreen}
        options={{ title: 'Cotización del dólar' }}
      />
      <MenuStack.Screen name="Imports" component={Imports} options={formScreenOptions(desktop, importsTitle())} />
    </MenuStack.Navigator>
  );
}

// ── Pestañas y botón "atrás" del navegador ───────────────────────────

// Ícono relleno para la pestaña activa y de contorno para las demás (como en iOS).
const TAB_ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  DashboardTab: ['home', 'home-outline'],
  RentalsTab: ['business', 'business-outline'],
  MenuTab: ['menu', 'menu-outline'],
};

const navigationRef = createNavigationContainerRef();

function armBrowserBack() {
  if (navigationRef.canGoBack()) armBrowserHistory();
}

const currentRouteName = () => (navigationRef.getCurrentRoute() as { name?: string } | undefined)?.name;

// Cada cambio de pantalla: el botón atrás del navegador y la anotación de uso (ver usage).
function onNavigationChange() {
  armBrowserBack();
  trackScreen(currentRouteName());
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
    <NavigationContainer
      ref={navigationRef}
      onReady={() => trackScreen(currentRouteName())}
      onStateChange={onNavigationChange}
      theme={navigationTheme}
    >
      <Tab.Navigator
        backBehavior="history"
        // En el celular las pestañas de al lado quedan armadas, así asoman al deslizar.
        detachInactiveScreens={desktop}
        tabBar={(props) => (desktop ? <Sidebar {...props} /> : <BottomTabBar {...props} />)}
        // Con un formulario empezado, tocar una pestaña pregunta antes de borrar lo cargado.
        screenListeners={({ navigation, route }) => ({
          tabPress: (e) => {
            if (!hasUnsavedForm()) return;
            e.preventDefault();
            confirmLeaveForm(() => {
              const state = navigation.getState();
              const current = state.routes[state.index];
              if (current.key !== route.key) navigation.navigate(route.name);
              else if (current.state?.key) navigation.dispatch({ ...StackActions.popToTop(), target: current.state.key });
            });
          },
        })}
        screenOptions={({ route }) => ({
          headerShown: false,
          // Al salir de una pestaña se cierran las pantallas que se abrieron en ella. En la
          // computadora, enseguida; en el celular, cuando la pestaña ya terminó de irse (ver
          // resetOnTabLeave): cerrarlas en plena animación hacía que la app se cerrara en Android.
          popToTopOnBlur: desktop,
          // En el celular, las pestañas están una al lado de la otra y la nueva entra de costado
          // (acompaña el deslizar entre pestañas, ver swipeTabs).
          ...(desktop ? { animation: 'none' as const } : { animation: 'shift' as const, ...tabSlide(route.name) }),
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
            ...(!desktop && route.name === 'DashboardTab' && FULL_SCREEN.has(getFocusedRouteNameFromRoute(route) ?? '')
              ? { display: 'none' as const }
              : null),
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={TAB_ICONS[route.name][focused ? 0 : 1]} size={25} color={color} />
          ),
        })}
      >
        <Tab.Screen name="DashboardTab" component={DashboardStackNavigator} options={{ title: 'Inicio' }} />
        <Tab.Screen name="RentalsTab" component={RentalsStackNavigator} options={{ title: 'Alquileres' }} />
        <Tab.Screen name="MenuTab" component={MenuStackNavigator} options={{ title: 'Menú' }} />
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
