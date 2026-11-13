// =====================================================================
// Pantalla: Inicio
// ---------------------------------------------------------------------
// Responde «¿qué hago hoy?». Franja azul con la fecha y el dólar; encima, los cuatro accesos
// directos (registrar cobro, recordar deuda, nuevo contrato, expensas y servicios). Debajo, «Tus
// alquileres»: quién debe y quién tiene un vencimiento cerca, con nombre, monto y fecha, y
// cuántas propiedades están al día o sin alquilar. Al final, los otros pendientes (importes por
// cargar, contratos por renovar o ajustar). La cartera completa vive en Alquileres.
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import LargeTitleHeader, { HeaderChip } from '../components/LargeTitleHeader';
import Screen from '../components/Screen';
import SectionHeader from '../components/SectionHeader';
import { useData } from '../context/DataContext';
import { RATE_SOURCE_LABEL, useExchangeRate } from '../context/ExchangeRateContext';
import { makeStyles, useTheme } from '../context/ThemeContext';
import { useRefresh } from '../hooks/useRefresh';
import { fontSize, radius, spacing } from '../theme';
import { describeAdjustment, nextAdjustmentPeriod } from '../utils/adjustments';
import { addMonthsToPeriod, formatDayMonth, formatMoney, formatPeriod, formatTotals, parseLocalDate } from '../utils/format';
import { openInTab } from '../utils/navigation';
import { contractEndBadge, daysUntil, PropertySummary, summarizeProperty } from '../utils/propertySummary';
import { capitalize, compareTitles, initials, plural } from '../utils/text';
import { pendingImportsCount } from './imports/importsLogic';

// ── Constantes y funciones auxiliares ─────────────────────────────────

// Cuántas personas de cada grupo (vencidos, a vencer) se muestran antes de «Ver todos».
const MAX_PER_GROUP = 3;

// Alto de la franja que queda debajo de la tarjeta de accesos.
const SHORTCUTS_OVERLAP = 36;

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
  const styles = useStyles();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { mode, properties, tenants, contracts, payments, chargeViews, loadSampleData, today } = useData();
  const { rate, source } = useExchangeRate();
  const { refreshing, onRefresh } = useRefresh();
  const isEmpty = properties.length === 0 && tenants.length === 0 && contracts.length === 0 && payments.length === 0;

  const period = today.slice(0, 7);
  const monthName = formatPeriod(period).split(' ')[0];
  const summaries = properties.map((p) => summarizeProperty(p, contracts, chargeViews, tenants));
  const openProperty = (propertyId: string) => openInTab(navigation, 'RentalsTab', 'PropertyDetail', { propertyId });

  // — Tus alquileres: primero los que deben (el atraso más viejo arriba), después los que vencen —
  const inDebt = summaries
    .filter((s) => s.collection === 'deuda')
    .sort((a, b) => (a.oldestOverdueDate ?? '').localeCompare(b.oldestOverdueDate ?? '') || compareTitles(a.property.title, b.property.title));
  const dueSoon = summaries
    .filter((s) => s.collection === 'por-vencer')
    .sort((a, b) => (a.nextDueDate ?? '').localeCompare(b.nextDueDate ?? '') || compareTitles(a.property.title, b.property.title));
  const upToDate = summaries.filter((s) => s.collection === 'al-dia').length;
  const unrented = summaries.filter((s) => s.collection === 'sin-contrato' || s.collection === 'mantenimiento').length;
  const shown = [...inDebt.slice(0, MAX_PER_GROUP), ...dueSoon.slice(0, MAX_PER_GROUP)];
  const hidden = inDebt.length + dueSoon.length - shown.length;

  // Monto y cuándo, en rojo si debe y en naranja si le vence pronto.
  const amountOf = (s: PropertySummary) => {
    if (s.collection === 'deuda') {
      const days = Math.max(1, -daysUntil(s.oldestOverdueDate ?? today));
      return { color: colors.danger, bg: colors.dangerMuted, main: formatTotals(s.overdue.totals), when: `hace ${plural(days, 'día', 'días')}` };
    }
    return { color: colors.warning, bg: colors.warningMuted, main: formatTotals(s.pending.totals), when: `vence el ${formatDayMonth(s.nextDueDate)}` };
  };

  // — Otros pendientes: importes por cargar y contratos que terminan o se ajustan —
  const pendingImports = pendingImportsCount(chargeViews, period);
  const pending: PendingItem[] = [];
  if (pendingImports > 0) {
    pending.push({
      key: 'importes',
      title: 'Actualizar expensas y servicios',
      subtitle: `${plural(pendingImports, 'importe', 'importes')} de ${monthName.toLowerCase()} sin revisar`,
      icon: 'receipt-outline',
      tone: 'info',
      onPress: () => navigation.navigate('Imports'),
    });
  }
  const nextPeriod = addMonthsToPeriod(period, 1);
  contracts
    .filter((c) => c.status === 'activo')
    .forEach((contract) => {
      const title = properties.find((p) => p.id === contract.propertyId)?.title ?? 'la propiedad';
      const open = () => openInTab(navigation, 'RentalsTab', 'ContractDetail', { contractId: contract.id });
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

  // — Accesos directos: lo que se hace todos los meses —
  const remind = () =>
    inDebt.length === 1
      ? openProperty(inDebt[0].property.id)
      : navigation.navigate('RentalsTab', { screen: 'Rentals', params: { filter: 'mora' } });
  const shortcuts: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }[] = [
    { label: 'Registrar cobro', icon: 'cash-outline', onPress: () => openInTab(navigation, 'PaymentsTab', 'PaymentForm') },
    { label: 'Recordar deuda', icon: 'chatbubble-outline', onPress: remind },
    { label: 'Nuevo contrato', icon: 'document-text-outline', onPress: () => openInTab(navigation, 'RentalsTab', 'ContractForm') },
    { label: 'Expensas y servicios', icon: 'receipt-outline', onPress: () => navigation.navigate('Imports') },
  ];

  // — Dibujo de la pantalla —
  return (
    <Screen topSafe>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
      >
        <LargeTitleHeader
          title="Inicio"
          eyebrow={longDate(today)}
          overlap={isEmpty ? 0 : SHORTCUTS_OVERLAP}
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
              <Button label="Agregar propiedad" onPress={() => openInTab(navigation, 'RentalsTab', 'PropertyForm')} />
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
                    key={s.label}
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

              {/* Tus alquileres: quién debe y quién vence, con monto y fecha. */}
              {summaries.length ? (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Tus alquileres</Text>
                    <Text style={styles.cardSummary}>
                      <Text style={{ color: colors.success, fontWeight: '700' }}>{upToDate}</Text> al día ·{' '}
                      <Text style={{ fontWeight: '700' }}>{unrented}</Text> sin alquilar
                    </Text>
                  </View>
                  {shown.length ? (
                    shown.map((s, index) => {
                      const amount = amountOf(s);
                      const place = [s.property.title, s.property.neighborhood].filter(Boolean).join(' · ');
                      return (
                        <TouchableOpacity
                          key={s.property.id}
                          activeOpacity={0.6}
                          style={[styles.row, index > 0 && styles.separator]}
                          onPress={() => openProperty(s.property.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`${s.tenant?.name ?? s.property.title}, ${amount.main}, ${amount.when}`}
                        >
                          <View style={[styles.avatar, { backgroundColor: amount.bg }]}>
                            <Text style={[styles.avatarText, { color: amount.color }]}>{initials(s.tenant?.name)}</Text>
                          </View>
                          <View style={styles.texts}>
                            <View style={styles.line}>
                              <Text style={styles.title} numberOfLines={1}>
                                {s.tenant?.name ?? s.property.title}
                              </Text>
                              <Text style={[styles.amount, { color: amount.color }]} numberOfLines={1}>
                                {amount.main}
                              </Text>
                            </View>
                            <View style={styles.line}>
                              <Text style={styles.subtitle} numberOfLines={1}>
                                {place}
                              </Text>
                              <Text style={[styles.when, { color: amount.color }]}>{amount.when}</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <View style={[styles.row, styles.calm]}>
                      <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                      <Text style={styles.calmText}>Nadie debe y no hay vencimientos cerca.</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.footer, styles.separator]}
                    onPress={() => navigation.navigate('RentalsTab', { screen: 'Rentals' })}
                    accessibilityRole="button"
                  >
                    <Text style={styles.footerText}>
                      {hidden > 0 ? `Ver los otros ${hidden} en Alquileres` : 'Ver todos los alquileres'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

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
            </>
          )}
        </View>
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
    marginTop: -SHORTCUTS_OVERLAP,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md + 2,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  cardSummary: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
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
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
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
  line: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flexShrink: 1,
    fontSize: fontSize.lg - 1,
    fontWeight: '600',
    color: colors.text,
  },
  amount: {
    flexShrink: 0,
    maxWidth: '62%',
    fontSize: fontSize.sm + 1,
    fontWeight: '700',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  subtitle: {
    flexShrink: 1,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  when: {
    flexShrink: 0,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  calm: {
    gap: spacing.sm,
  },
  calmText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  footer: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2,
  },
  footerText: {
    fontSize: fontSize.sm + 1,
    fontWeight: '700',
    color: colors.primary,
  },
}));
