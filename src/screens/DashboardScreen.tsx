// =====================================================================
// Pantalla: Inicio
// ---------------------------------------------------------------------
// Franja azul con la fecha y el dólar, "Pendientes" (desplegable) y todas las propiedades en
// una sola lista, cada una con el color de su estado y lo que debe (o "Al día").
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import FilterSortMenu, { MenuOption } from '../components/FilterSortMenu';
import LargeTitleHeader, { HeaderChip } from '../components/LargeTitleHeader';
import Screen from '../components/Screen';
import SectionHeader from '../components/SectionHeader';
import { useData } from '../context/DataContext';
import { RATE_SOURCE_LABEL, useExchangeRate } from '../context/ExchangeRateContext';
import { makeStyles, useTheme } from '../context/ThemeContext';
import { useRefresh } from '../hooks/useRefresh';
import { fontSize, radius, spacing } from '../theme';
import { PropertyType } from '../types';
import { describeAdjustment, nextAdjustmentPeriod } from '../utils/adjustments';
import {
  addMonthsToPeriod,
  formatDayMonth,
  formatMoney,
  formatPeriod,
  formatTotals,
  parseLocalDate,
} from '../utils/format';
import { openInTab } from '../utils/navigation';
import { CollectionState, contractEndBadge, daysUntil, PropertySummary, summarizeProperty } from '../utils/propertySummary';
import { capitalize, compareTitles, plural } from '../utils/text';
import { pendingImportsCount } from './imports/importsLogic';

// ── Constantes y funciones auxiliares ─────────────────────────────────

type FilterKey = 'todas' | 'deuda' | 'por-vencer' | 'al-dia' | 'disponibles';
type SortKey = 'estado' | 'nombre' | 'deuda' | 'barrio';

const SORTS: MenuOption<SortKey>[] = [
  { value: 'estado', label: 'Estado (lo urgente primero)' },
  { value: 'nombre', label: 'Nombre' },
  { value: 'deuda', label: 'Mayor deuda primero' },
  { value: 'barrio', label: 'Barrio' },
];

// Orden de los estados: primero lo que pide atención.
const STATE_ORDER: Record<CollectionState, number> = {
  deuda: 0,
  'por-vencer': 1,
  'al-dia': 2,
  mantenimiento: 3,
  'sin-contrato': 4,
};

const TYPE_ICON: Record<PropertyType, keyof typeof Ionicons.glyphMap> = {
  apartamento: 'business-outline',
  casa: 'home-outline',
  local: 'storefront-outline',
  oficina: 'briefcase-outline',
  terreno: 'map-outline',
  otro: 'cube-outline',
};

function matches(s: PropertySummary, filter: FilterKey): boolean {
  if (filter === 'todas') return true;
  if (filter === 'disponibles') return s.collection === 'sin-contrato' || s.collection === 'mantenimiento';
  return s.collection === filter;
}

// "Jueves 12 de noviembre".
function longDate(iso: string): string {
  const text = parseLocalDate(iso).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  return capitalize(text.replace(',', ''));
}

interface PendingItem {
  key: string;
  // Cómo se nombra en la línea de la barra cerrada ("Recordar deuda, cargar importes y 1 más").
  short: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'danger' | 'warning' | 'info';
  onPress: () => void;
}

// ── Pantalla ──────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { mode, properties, tenants, contracts, payments, chargeViews, loadSampleData, today } = useData();
  const { rate, source, toPesos } = useExchangeRate();
  const { refreshing, onRefresh } = useRefresh();
  const [pendingOpen, setPendingOpen] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('todas');
  const [sort, setSort] = useState<SortKey>('estado');
  const isEmpty = properties.length === 0 && tenants.length === 0 && contracts.length === 0 && payments.length === 0;

  const period = today.slice(0, 7);
  const monthName = formatPeriod(period).split(' ')[0];
  const summaries = properties.map((p) => summarizeProperty(p, contracts, chargeViews, tenants));
  const openProperty = (propertyId: string) => openInTab(navigation, 'RentalsTab', 'PropertyDetail', { propertyId });

  // — Pendientes: recordar deudas, cargar importes y contratos que terminan o se ajustan —
  const inDebt = summaries.filter((s) => s.collection === 'deuda');
  const pendingImports = pendingImportsCount(chargeViews, period);
  const pending: PendingItem[] = [];
  if (inDebt.length) {
    const names = inDebt.map((s) => s.property.title);
    pending.push({
      key: 'deuda',
      short: 'recordar deuda',
      title: `Recordar deuda a ${plural(inDebt.length, 'inquilino', 'inquilinos')}`,
      subtitle: `Por WhatsApp · ${names.length > 2 ? `${names.slice(0, 2).join(', ')} y ${names.length - 2} más` : names.join(' y ')}`,
      icon: 'logo-whatsapp',
      tone: 'danger',
      onPress: () =>
        inDebt.length === 1
          ? openProperty(inDebt[0].property.id)
          : navigation.navigate('RentalsTab', { screen: 'Rentals', params: { filter: 'mora' } }),
    });
  }
  if (pendingImports > 0) {
    pending.push({
      key: 'importes',
      short: 'cargar importes',
      title: `Cargar ${plural(pendingImports, 'importe', 'importes')} de ${monthName.toLowerCase()}`,
      subtitle: 'Expensas y servicios',
      icon: 'bar-chart-outline',
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
          short: 'renovar contrato',
          title: `Renovar contrato de ${title}`,
          subtitle: `${ended ? 'Terminó' : 'Termina'} el ${formatDayMonth(contract.endDate)}`,
          icon: 'calendar-outline',
          tone: 'warning',
          onPress: open,
        });
      }
      const adjust = nextAdjustmentPeriod(contract);
      if (adjust && adjust <= nextPeriod) {
        pending.push({
          key: `${contract.id}-ajuste`,
          short: 'ajustar alquiler',
          title: `Ajustar alquiler de ${title}`,
          subtitle: `${capitalize(formatPeriod(adjust).split(' ')[0])} · ${describeAdjustment(contract)}`,
          icon: 'trending-up-outline',
          tone: 'warning',
          onPress: open,
        });
      }
    });
  const shorts = [...new Set(pending.map((p) => p.short))];
  const preview = capitalize(
    shorts.length > 2 ? `${shorts.slice(0, 2).join(', ')} y ${shorts.length - 2} más` : shorts.join(' y '),
  );
  const toneColor = { danger: colors.danger, warning: colors.warning, info: colors.primary };
  const toneBg = { danger: colors.dangerMuted, warning: colors.warningMuted, info: colors.primaryMuted };

  // — Propiedades: filtro, orden y conteo de cada estado —
  const filters: MenuOption<FilterKey>[] = [
    { value: 'todas', label: 'Todas', count: summaries.length },
    { value: 'deuda', label: 'Vencidas', dot: 'danger', count: inDebt.length },
    { value: 'por-vencer', label: 'A vencer', dot: 'warning', count: summaries.filter((s) => matches(s, 'por-vencer')).length },
    { value: 'al-dia', label: 'Al día', dot: 'success', count: summaries.filter((s) => matches(s, 'al-dia')).length },
    { value: 'disponibles', label: 'Disponibles', dot: 'empty', count: summaries.filter((s) => matches(s, 'disponibles')).length },
  ];
  const debtInPesos = (s: PropertySummary) =>
    (toPesos(s.overdue.totals.USD, 'USD') ?? 0) + s.overdue.totals.ARS;
  const byState = (a: PropertySummary, b: PropertySummary) =>
    STATE_ORDER[a.collection] - STATE_ORDER[b.collection] ||
    (a.collection === 'deuda' ? (a.oldestOverdueDate ?? '').localeCompare(b.oldestOverdueDate ?? '') : 0) ||
    (a.collection === 'por-vencer' ? (a.nextDueDate ?? '').localeCompare(b.nextDueDate ?? '') : 0) ||
    compareTitles(a.property.title, b.property.title);
  const compare: Record<SortKey, (a: PropertySummary, b: PropertySummary) => number> = {
    estado: byState,
    nombre: (a, b) => compareTitles(a.property.title, b.property.title),
    deuda: (a, b) => debtInPesos(b) - debtInPesos(a) || byState(a, b),
    barrio: (a, b) =>
      (a.property.neighborhood ?? '').localeCompare(b.property.neighborhood ?? '', 'es') ||
      compareTitles(a.property.title, b.property.title),
  };
  const visible = summaries.filter((s) => matches(s, filter)).sort(compare[sort]);

  // Lo de la derecha de cada fila: lo que debe, lo que vence, "Al día" o "Disponible".
  const statusOf = (s: PropertySummary) => {
    switch (s.collection) {
      case 'deuda': {
        const days = Math.max(1, -daysUntil(s.oldestOverdueDate ?? today));
        return { color: colors.danger, bg: colors.dangerMuted, main: formatTotals(s.overdue.totals), sub: `Vencido hace ${plural(days, 'día', 'días')}` };
      }
      case 'por-vencer':
        return { color: colors.warning, bg: colors.warningMuted, main: formatTotals(s.pending.totals), sub: `Vence el ${formatDayMonth(s.nextDueDate)}` };
      case 'al-dia':
        return { color: colors.success, bg: colors.successMuted, main: 'Al día' };
      case 'mantenimiento':
        return { color: colors.textMuted, bg: colors.neutralMuted, main: 'En mantenimiento' };
      default:
        return { color: colors.textMuted, bg: colors.neutralMuted, main: 'Disponible', sub: 'Cargar contrato' };
    }
  };

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
          ) : null}

          {/* Pendientes: cerrado muestra cuántos hay; abierto, cada uno con su acción. */}
          {pending.length ? (
            <View style={styles.card}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.pendingBar}
                onPress={() => setPendingOpen((v) => !v)}
                accessibilityRole="button"
                accessibilityState={{ expanded: pendingOpen }}
              >
                <View style={[styles.circle, { backgroundColor: colors.primaryMuted }]}>
                  <Ionicons name="checkbox-outline" size={19} color={colors.primary} />
                </View>
                <View style={styles.texts}>
                  <Text style={styles.pendingTitle}>Pendientes</Text>
                  {pendingOpen ? null : (
                    <Text style={styles.subtitle} numberOfLines={1}>
                      {preview}
                    </Text>
                  )}
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pending.length}</Text>
                </View>
                <Ionicons name={pendingOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
              </TouchableOpacity>
              {pendingOpen
                ? pending.map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      activeOpacity={0.6}
                      style={[styles.row, styles.separator]}
                      onPress={item.onPress}
                      accessibilityRole="button"
                    >
                      <View style={[styles.circle, { backgroundColor: toneBg[item.tone] }]}>
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
                  ))
                : null}
            </View>
          ) : null}

          {summaries.length ? (
            <>
              <SectionHeader
                title="Propiedades"
                right={
                  <FilterSortMenu
                    filters={filters}
                    filter={filter}
                    onFilter={setFilter}
                    sorts={SORTS}
                    sort={sort}
                    onSort={setSort}
                  />
                }
              />
              <View style={styles.card}>
                {visible.length ? (
                  visible.map((s, index) => {
                    const status = statusOf(s);
                    const place = s.tenant?.name ?? 'Sin inquilino';
                    return (
                      <TouchableOpacity
                        key={s.property.id}
                        activeOpacity={0.6}
                        style={[styles.row, index > 0 && styles.separator]}
                        onPress={() => openProperty(s.property.id)}
                        accessibilityRole="button"
                      >
                        <View style={[styles.square, { backgroundColor: status.bg }]}>
                          <Ionicons name={TYPE_ICON[s.property.type] ?? 'cube-outline'} size={20} color={status.color} />
                        </View>
                        <View style={styles.texts}>
                          <Text style={styles.title} numberOfLines={1}>
                            {s.property.title}
                          </Text>
                          <Text style={styles.subtitle} numberOfLines={1}>
                            {[place, s.property.neighborhood].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                        <View style={styles.value}>
                          <Text style={[styles.valueMain, { color: status.color }]} numberOfLines={1}>
                            {status.main}
                          </Text>
                          {status.sub ? (
                            <Text
                              style={[
                                styles.valueSub,
                                { color: s.collection === 'sin-contrato' ? colors.primary : status.color },
                              ]}
                            >
                              {status.sub}
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={styles.empty}>No hay propiedades con ese filtro.</Text>
                )}
              </View>
            </>
          ) : null}
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  pendingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md + 2,
  },
  pendingTitle: {
    fontSize: fontSize.lg - 1,
    fontWeight: '700',
    color: colors.text,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    backgroundColor: colors.dangerSolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2,
    minHeight: 64,
  },
  separator: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  square: {
    width: 40,
    height: 40,
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
    fontSize: fontSize.lg - 1,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  value: {
    alignItems: 'flex-end',
    gap: 2,
    flexShrink: 1,
    maxWidth: '45%',
  },
  valueMain: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  valueSub: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textAlign: 'right',
  },
  empty: {
    padding: spacing.lg,
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
  },
}));
