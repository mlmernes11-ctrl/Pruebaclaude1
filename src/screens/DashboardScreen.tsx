// =====================================================================
// Pantalla: Inicio
// ---------------------------------------------------------------------
// Responde «¿qué hago hoy?». Franja azul con la fecha y el dólar; encima, los accesos
// directos: los tres primeros del orden elegido y «Más», que abre todos y deja ordenarlos.
// Debajo, «Tus alquileres»: quién debe y quién tiene un vencimiento cerca, en tarjetas que se
// abren con el detalle, «Cobrar» y «WhatsApp» (HomeCollections). Después, los otros pendientes
// (importes por revisar, contratos por renovar o ajustar) y los últimos cobros, con el acceso al
// historial completo. Lo que se abre desde acá (fichas, contratos, cobros) se queda en Inicio, así
// «atrás» vuelve acá. La cartera completa vive en Alquileres.
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import LargeTitleHeader, { BAND_OVERLAP, HeaderChip } from '../components/LargeTitleHeader';
import Screen from '../components/Screen';
import SectionHeader from '../components/SectionHeader';
import HomeCollections, { RecentPayments } from './HomeCollections';
import ShortcutsSheet from '../components/ShortcutsSheet';
import { useData } from '../context/DataContext';
import { RATE_SOURCE_LABEL, useExchangeRate } from '../context/ExchangeRateContext';
import { makeStyles, useTheme } from '../context/ThemeContext';
import { useRefresh } from '../hooks/useRefresh';
import { RevealProvider, useRevealScroll } from '../hooks/useRevealScroll';
import { fontSize, radius, spacing } from '../theme';
import { describeAdjustment, nextAdjustmentPeriod } from '../utils/adjustments';
import { addMonthsToPeriod, formatDayMonth, formatMoney, formatPeriod, parseLocalDate } from '../utils/format';
import { contractEndBadge, daysUntil, summarizeProperty } from '../utils/propertySummary';
import { SHORTCUT_CATALOG, ShortcutId, SHORTCUTS_ON_HOME, useShortcuts } from '../utils/shortcuts';
import { capitalize } from '../utils/text';
import { pendingImportsCount } from './imports/importsLogic';

// ── Constantes y funciones auxiliares ─────────────────────────────────


// "Jueves 12 de noviembre".
function longDate(iso: string): string {
  const text = parseLocalDate(iso).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  return capitalize(text.replace(',', ''));
}

interface PendingItem {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'warning' | 'info';
  onPress: () => void;
}

// ── Pantalla ──────────────────────────────────────────────────────────

export default function DashboardScreen() {
  // Al abrir una tarjeta de «Tus alquileres», la pantalla se corre para que se vea entera.
  const revealer = useRevealScroll();
  const styles = useStyles();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { mode, properties, tenants, contracts, payments, chargeViews, loadSampleData, today } = useData();
  const { rate, source } = useExchangeRate();
  const { refreshing, onRefresh } = useRefresh();
  const isEmpty = properties.length === 0 && tenants.length === 0 && contracts.length === 0 && payments.length === 0;

  const period = today.slice(0, 7);
  const summaries = properties.map((p) => summarizeProperty(p, contracts, chargeViews, tenants));
  const openProperty = (propertyId: string) => navigation.navigate('PropertyDetail', { propertyId });
  // Los que deben: si es uno solo, «Recordar deuda» abre su ficha.
  const inDebt = summaries.filter((s) => s.collection === 'deuda');

  // — Otros pendientes: importes por cargar y contratos que terminan o se ajustan —
  const pendingImports = pendingImportsCount(chargeViews, period);
  const pending: PendingItem[] = [];
  if (pendingImports > 0) {
    pending.push({
      key: 'importes',
      title: 'Actualización masiva',
      subtitle: `${pendingImports} ${pendingImports === 1 ? 'importe' : 'expensas y servicios'} sin revisar`,
      icon: 'layers-outline',
      tone: 'info',
      onPress: () => navigation.navigate('Imports'),
    });
  }
  const nextPeriod = addMonthsToPeriod(period, 1);
  contracts
    .filter((c) => c.status === 'activo')
    .forEach((contract) => {
      const title = properties.find((p) => p.id === contract.propertyId)?.title ?? 'la propiedad';
      const open = () => navigation.navigate('ContractDetail', { contractId: contract.id });
      if (contractEndBadge(contract)) {
        const ended = daysUntil(contract.endDate) < 0;
        pending.push({
          key: `${contract.id}-fin`,
          title: 'Renovar contrato',
          subtitle: `${title} · ${ended ? 'terminó' : 'termina'} el ${formatDayMonth(contract.endDate)}`,
          icon: 'document-text-outline',
          tone: 'warning',
          onPress: open,
        });
      }
      const adjust = nextAdjustmentPeriod(contract);
      if (adjust && adjust <= nextPeriod) {
        pending.push({
          key: `${contract.id}-ajuste`,
          title: 'Ajustar alquiler',
          subtitle: `${title} · ${formatPeriod(adjust).split(' ')[0].toLowerCase()}, ${describeAdjustment(contract)}`,
          icon: 'trending-up-outline',
          tone: 'warning',
          onPress: open,
        });
      }
    });
  const toneColor = { warning: colors.warning, info: colors.primary };
  const toneBg = { warning: colors.warningMuted, info: colors.primaryMuted };

  // — Accesos directos: los tres primeros del orden elegido y «Más» con todas las funciones —
  const remind = () =>
    inDebt.length === 1
      ? openProperty(inDebt[0].property.id)
      : navigation.navigate('RentalsTab', { screen: 'Rentals', params: { filter: 'mora' } });
  const SHORTCUT_ACTIONS: Record<ShortcutId, () => void> = {
    cobro: () => navigation.navigate('PaymentForm'),
    deuda: remind,
    contrato: () => navigation.navigate('ContractForm'),
    cargo: () => navigation.navigate('ChargeForm'),
    propiedad: () => navigation.navigate('PropertyForm'),
    masiva: () => navigation.navigate('Imports'),
    dolar: () => navigation.navigate('ExchangeRate'),
    historial: () => navigation.navigate('History'),
  };
  const [shortcutOrder, setShortcutOrder] = useShortcuts();
  const [showingMore, setShowingMore] = useState(false);
  // Las tres primeras del orden elegido y, en el cuarto lugar, «Más» con todas.
  const shortcuts = [
    ...shortcutOrder
      .slice(0, SHORTCUTS_ON_HOME)
      .map((id) => ({ ...SHORTCUT_CATALOG.find((s) => s.id === id)!, onPress: SHORTCUT_ACTIONS[id] })),
    { id: 'mas', label: 'Más', icon: 'grid-outline' as const, onPress: () => setShowingMore(true) },
  ];

  // — Dibujo de la pantalla —
  return (
    <Screen topSafe>
      <ScrollView
        ref={revealer.ref}
        onScroll={revealer.onScroll}
        scrollEventThrottle={32}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
      >
        <RevealProvider value={revealer.reveal}>
        <LargeTitleHeader
          title="Inicio"
          eyebrow={longDate(today)}
          overlap={isEmpty ? 0 : BAND_OVERLAP}
          right={
            <HeaderChip
              label={rate ? `${RATE_SOURCE_LABEL[source]} ${formatMoney(rate, 'ARS')}` : 'Dólar'}
              accessibilityLabel="Cotización del dólar"
              onPress={() => navigation.navigate('ExchangeRate')}
            />
          }
        />

        <View style={styles.body}>
          {isEmpty && mode === 'remote' ? (
            <Card style={styles.welcome}>
              <Text style={styles.welcomeTitle}>Empezá por tu primera propiedad</Text>
              <Text style={styles.welcomeText}>
                Cargá la propiedad y después su contrato con el inquilino. Desde ahí la app genera sola los cargos de
                cada mes.
              </Text>
              <Button label="Agregar propiedad" onPress={() => navigation.navigate('PropertyForm')} />
            </Card>
          ) : isEmpty ? (
            <Card style={styles.welcome}>
              <Text style={styles.welcomeTitle}>¿Querés probar la app?</Text>
              <Text style={styles.welcomeText}>
                Cargá propiedades, inquilinos, contratos y cobros de ejemplo para recorrerla sin cargar nada a mano.
              </Text>
              <Button label="Cargar datos de ejemplo" onPress={loadSampleData} />
            </Card>
          ) : (
            <>
              {/* Accesos directos, montados sobre la franja azul. */}
              <View style={styles.shortcuts}>
                {shortcuts.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.shortcut}
                    activeOpacity={0.6}
                    onPress={s.onPress}
                    accessibilityRole="button"
                    accessibilityLabel={s.label}
                  >
                    <View style={styles.shortcutCircle}>
                      <Ionicons name={s.icon} size={22} color={colors.primary} />
                    </View>
                    <Text style={styles.shortcutLabel} numberOfLines={2}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <ShortcutsSheet
                visible={showingMore}
                order={shortcutOrder}
                onOpen={(id) => SHORTCUT_ACTIONS[id]()}
                onSave={setShortcutOrder}
                onClose={() => setShowingMore(false)}
              />

              {/* Tus alquileres: lo que se debe y lo que vence, en tarjetas que se abren. */}
              {summaries.length ? <HomeCollections /> : null}

              {/* Otros pendientes. */}
              {pending.length ? (
                <>
                  <SectionHeader title="Otros pendientes" />
                  <View style={styles.card}>
                    {pending.map((item, index) => (
                      <TouchableOpacity
                        key={item.key}
                        activeOpacity={0.6}
                        style={[styles.row, index > 0 && styles.separator]}
                        onPress={item.onPress}
                        accessibilityRole="button"
                      >
                        <View style={[styles.square, { backgroundColor: toneBg[item.tone] }]}>
                          <Ionicons name={item.icon} size={18} color={toneColor[item.tone]} />
                        </View>
                        <View style={styles.texts}>
                          <Text style={styles.title} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={styles.subtitle} numberOfLines={1}>
                            {item.subtitle}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.chevron} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : null}

              {/* Últimos cobros y el acceso al historial completo. */}
              {summaries.length ? <RecentPayments /> : null}
            </>
          )}
        </View>
        </RevealProvider>
      </ScrollView>
    </Screen>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  content: {
    paddingBottom: spacing.xxl,
  },
  body: {
    paddingHorizontal: spacing.lg,
  },
  welcome: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  welcomeTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  welcomeText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    lineHeight: 21,
  },
  shortcuts: {
    flexDirection: 'row',
    marginTop: -BAND_OVERLAP,
    marginBottom: spacing.lg,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.lg + 4,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  shortcut: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  shortcutCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 15,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.md + 2,
    minHeight: 60,
  },
  separator: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  square: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    flexShrink: 1,
    fontSize: fontSize.lg - 1,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    flexShrink: 1,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
}));
