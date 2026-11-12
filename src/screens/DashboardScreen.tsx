// =====================================================================
// Pantalla: Inicio
// ---------------------------------------------------------------------
// Bloque grande con la mora (o "Todo al día"), el avance del mes y las propiedades que piden atención.
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import ListRow from '../components/ListRow';
import ListSection from '../components/ListSection';
import LargeTitleHeader from '../components/LargeTitleHeader';
import Screen from '../components/Screen';
import SectionHeader from '../components/SectionHeader';
import StatusDot from '../components/StatusDot';
import { CONCEPT_LABEL } from '../constants';
import { useData } from '../context/DataContext';
import { QUOTE_SOURCES, RATE_SOURCE_LABEL, useExchangeRate } from '../context/ExchangeRateContext';
import { makeStyles, useTheme } from '../context/ThemeContext';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useRefresh } from '../hooks/useRefresh';
import { fontSize, radius, spacing } from '../theme';
import { describeAdjustment, nextAdjustmentPeriod } from '../utils/adjustments';
import {
  addMonthsToPeriod,
  addToTotals,
  describeTotals,
  emptyTotals,
  formatDayMonth,
  formatMoney,
  formatPeriod,
  formatTotals,
} from '../utils/format';
import { buildPeriodRow } from '../utils/history';
import { openInTab } from '../utils/navigation';
import { contractEndBadge, daysUntil, summarizeProperty } from '../utils/propertySummary';
import { plural } from '../utils/text';
import { pendingImportsCount, totalImportsCount } from './imports/importsLogic';

// ── Pantalla ──────────────────────────────────────────────────────────

// Al abrir la app, lo primero que responde es: ¿alguien está atrasado con los pagos?
export default function DashboardScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { mode, properties, tenants, contracts, payments, chargeViews, loadSampleData, today } = useData();
  const { rate, source, toPesos, rateFor } = useExchangeRate();
  const { refreshing, onRefresh } = useRefresh();
  const desktop = useIsDesktop();
  const isEmpty = properties.length === 0 && tenants.length === 0 && contracts.length === 0 && payments.length === 0;

  // — Carpetas: con deuda, por vencer y sin pendientes —
  const summaries = properties.map((p) => summarizeProperty(p, contracts, chargeViews, tenants));
  const inDebt = summaries
    .filter((s) => s.collection === 'deuda')
    .sort((a, b) => (a.oldestOverdueDate ?? '').localeCompare(b.oldestOverdueDate ?? ''));
  const dueSoon = summaries
    .filter((s) => s.collection === 'por-vencer')
    .sort((a, b) => (a.nextDueDate ?? '').localeCompare(b.nextDueDate ?? ''));
  const settled = summaries.filter((s) => s.collection !== 'deuda' && s.collection !== 'por-vencer');
  const settledParts = [
    [settled.filter((s) => s.collection === 'al-dia').length, 'al día', 'al día'],
    [settled.filter((s) => s.collection === 'sin-contrato').length, 'disponible', 'disponibles'],
    [settled.filter((s) => s.collection === 'mantenimiento').length, 'en mantenimiento', 'en mantenimiento'],
  ] as const;

  // — Bloque grande: mora y avance del mes —
  // Total en mora: lo que falta pagar de todas las liquidaciones vencidas.
  const overdueTotals = emptyTotals();
  chargeViews
    .filter((v) => v.status === 'vencido')
    .forEach((v) => addToTotals(overdueTotals, v.balance, v.charge.currency));
  const hasOverdue = overdueTotals.USD > 0 || overdueTotals.ARS > 0;
  const overdue = describeTotals(overdueTotals, rate, false);
  const period = today.slice(0, 7);
  const month = buildPeriodRow(chargeViews, period, toPesos);
  const monthName = formatPeriod(period).split(' ')[0];
  const pendingImports = pendingImportsCount(chargeViews, period);
  const totalImports = totalImportsCount(chargeViews, period);
  const shares = month.shares;

  const openProperty = (propertyId: string) => openInTab(navigation, 'RentalsTab', 'PropertyDetail', { propertyId });
  const openOverdue = () =>
    navigation.navigate('PaymentsTab', {
      screen: 'PaymentsList',
      params: { mode: 'cargos', status: hasOverdue ? 'vencido' : 'pendiente' },
    });

  // — Avisos de contratos: los que vencen pronto y los que ajustan este mes o el que viene —
  const nextPeriod = addMonthsToPeriod(period, 1);
  const contractNotices = contracts
    .filter((c) => c.status === 'activo')
    .flatMap((contract) => {
      const property = properties.find((p) => p.id === contract.propertyId);
      const tenant = tenants.find((t) => t.id === contract.tenantId);
      const who = [property?.title ?? 'Propiedad', tenant?.name].filter(Boolean).join(' · ');
      const notices: { key: string; title: string; subtitle: string; tone: 'danger' | 'warning'; sort: string }[] = [];
      const end = contractEndBadge(contract);
      if (end) {
        notices.push({
          key: `${contract.id}-fin`,
          title: who,
          subtitle: `Contrato: ${end.label.toLowerCase()} (${formatDayMonth(contract.endDate)})`,
          tone: end.tone,
          sort: contract.endDate,
        });
      }
      const adjust = nextAdjustmentPeriod(contract);
      if (adjust && adjust <= nextPeriod) {
        notices.push({
          key: `${contract.id}-ajuste`,
          title: who,
          subtitle: `Ajusta en ${formatPeriod(adjust).split(' ')[0]} · ${describeAdjustment(contract)}`,
          tone: 'warning',
          sort: `${adjust}-01`,
        });
      }
      return notices.map((n) => ({ ...n, contractId: contract.id }));
    })
    .sort((a, b) => a.sort.localeCompare(b.sort));

  // Últimos pagos recibidos (en pantalla grande van al lado de las carpetas).
  const latestPayments = [...payments].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 5);

  // Mora y avance del mes: en el celular van en un mismo bloque; en pantalla grande, uno al lado del otro.
  const moraBlock = (
    <>
      <View style={styles.heroLabelRow}>
        <StatusDot tone={hasOverdue ? 'danger' : 'success'} halo />
        <Text style={[styles.heroLabel, { color: hasOverdue ? colors.danger : colors.success }]}>
          {hasOverdue ? 'En mora' : 'Sin mora'}
        </Text>
      </View>
      <Text style={[styles.heroValue, { color: hasOverdue ? colors.danger : colors.success }]}>
        {hasOverdue ? overdue.main : 'Todo al día'}
      </Text>
      <Text style={styles.heroDetail}>
        {hasOverdue
          ? [plural(inDebt.length, 'propiedad', 'propiedades'), overdue.detail].filter(Boolean).join(' · ')
          : 'No hay cargos vencidos'}
      </Text>
    </>
  );
  const monthBlock = (
    <>
      <View style={styles.monthRow}>
        <Text style={styles.monthName}>{monthName}</Text>
        {month.count ? <Text style={styles.monthPct}>{Math.round(shares.paid * 100)} % cobrado</Text> : null}
      </View>
      {month.count ? (
        <>
          {desktop ? <Text style={styles.monthBig}>{describeTotals(month.paid, rate, false).main}</Text> : null}
          <View style={styles.bar}>
            {[
              { key: 'paid', share: shares.paid, color: colors.chartPaid },
              { key: 'overdue', share: shares.overdue, color: colors.chartOverdue },
              { key: 'pending', share: shares.pending, color: colors.chartPending },
            ]
              .filter((part) => part.share > 0.001)
              .map((part) => (
                <View key={part.key} style={{ flex: part.share, backgroundColor: part.color }} />
              ))}
          </View>
          <Text style={styles.monthCaption}>
            {desktop
              ? `de ${describeTotals(month.billed, rate, false).main} del mes`
              : `${describeTotals(month.paid, rate, false).main} de ${describeTotals(month.billed, rate, false).main}`}
          </Text>
        </>
      ) : (
        <Text style={styles.monthCaption}>Todavía no hay cargos este mes.</Text>
      )}
    </>
  );

  // — Dibujo de la pantalla —
  return (
    <Screen topSafe>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
      >
        <LargeTitleHeader title="Inicio" />

        <View style={styles.body}>
          {/* Dólar del día siempre a la vista; el que usa la cuenta va resaltado. */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.dollar}
            onPress={() => navigation.navigate('ExchangeRate')}
            accessibilityRole="button"
            accessibilityLabel="Cotización del dólar"
          >
            {QUOTE_SOURCES.map((s) => {
              const value = rateFor(s);
              const inUse = s === source;
              return (
                <View key={s} style={styles.dollarItem}>
                  <Text style={[styles.dollarLabel, inUse && styles.dollarLabelInUse]}>
                    {RATE_SOURCE_LABEL[s]}
                    {inUse ? ' · en uso' : ''}
                  </Text>
                  <Text style={[styles.dollarValue, inUse && styles.dollarValueInUse]}>
                    {value ? formatMoney(value, 'ARS') : '—'}
                  </Text>
                </View>
              );
            })}
            {source === 'manual' && rate ? (
              <View style={styles.dollarItem}>
                <Text style={[styles.dollarLabel, styles.dollarLabelInUse]}>Manual · en uso</Text>
                <Text style={[styles.dollarValue, styles.dollarValueInUse]}>{formatMoney(rate, 'ARS')}</Text>
              </View>
            ) : null}
          </TouchableOpacity>

          {/* Aviso del mes: expensas y servicios sin revisar. Desaparece cuando están todos. */}
          {pendingImports > 0 ? (
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.imports}
              onPress={() => navigation.navigate('Imports')}
              accessibilityRole="button"
            >
              <View style={styles.importsIcon}>
                <Ionicons name="document-text-outline" size={22} color={colors.warning} />
              </View>
              <View style={styles.importsText}>
                <Text style={styles.importsLabel}>Importes de {monthName.toLowerCase()}</Text>
                <Text style={styles.importsTitle}>
                  Faltan {pendingImports} de {totalImports} por actualizar
                </Text>
                <Text style={styles.importsDetail}>Expensas y servicios del mes</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}

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
                Cargá propiedades, inquilinos, contratos y pagos de ejemplo para recorrerla sin cargar nada a mano.
              </Text>
              <Button label="Cargar datos de ejemplo" onPress={loadSampleData} />
            </Card>
          ) : (
            <View style={desktop ? styles.row : undefined}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.hero, desktop && styles.heroWide]}
                onPress={openOverdue}
                accessibilityRole="button"
              >
                {moraBlock}
                {desktop ? null : <View style={styles.divider} />}
                {desktop ? null : monthBlock}
              </TouchableOpacity>
              {desktop ? <View style={[styles.hero, styles.heroNarrow]}>{monthBlock}</View> : null}
            </View>
          )}

          {contractNotices.length ? (
            <>
              <SectionHeader title="Contratos" />
              <ListSection>
                {contractNotices.map((n) => (
                  <ListRow
                    key={n.key}
                    dot={n.tone}
                    title={n.title}
                    subtitle={n.subtitle}
                    onPress={() => openInTab(navigation, 'RentalsTab', 'ContractDetail', { contractId: n.contractId })}
                  />
                ))}
              </ListSection>
            </>
          ) : null}

          {summaries.length ? (
            <View style={desktop ? styles.row : undefined}>
              <View style={desktop ? styles.colWide : undefined}>
                <SectionHeader
                  title="Propiedades"
                  actionLabel="Ver todas"
                  onAction={() =>
                    navigation.navigate('RentalsTab', { screen: 'Rentals', params: { filter: 'todas' } })
                  }
                />
                <ListSection>
                  {inDebt.map((s) => (
                    <ListRow
                      key={s.property.id}
                      dot="danger"
                      title={s.property.title}
                      subtitle={`${s.tenant?.name ?? 'Sin inquilino'} · ${plural(
                        Math.max(1, -daysUntil(s.oldestOverdueDate ?? today)),
                        'día',
                        'días',
                      )} de mora`}
                      value={formatTotals(s.overdue.totals)}
                      valueTone="danger"
                      onPress={() => openProperty(s.property.id)}
                    />
                  ))}
                  {dueSoon.map((s) => (
                    <ListRow
                      key={s.property.id}
                      dot="warning"
                      title={s.property.title}
                      subtitle={`${s.tenant?.name ?? 'Sin inquilino'} · vence el ${formatDayMonth(s.nextDueDate)}`}
                      value={formatTotals(s.pending.totals)}
                      onPress={() => openProperty(s.property.id)}
                    />
                  ))}
                  {settled.length ? (
                    <ListRow
                      dot={settledParts[0][0] ? 'success' : 'empty'}
                      title={`${plural(settled.length, 'propiedad', 'propiedades')} sin pendientes`}
                      subtitle={settledParts
                        .filter(([count]) => count > 0)
                        .map(([count, one, many]) => `${count} ${count === 1 ? one : many}`)
                        .join(' · ')}
                      onPress={() =>
                        navigation.navigate('RentalsTab', { screen: 'Rentals', params: { filter: 'todas' } })
                      }
                    />
                  ) : null}
                </ListSection>
              </View>
              {desktop && latestPayments.length ? (
                <View style={styles.colNarrow}>
                  <SectionHeader
                    title="Últimos cobros"
                    actionLabel="Ver todos"
                    onAction={() =>
                      navigation.navigate('PaymentsTab', { screen: 'PaymentsList', params: { mode: 'cobros' } })
                    }
                  />
                  <ListSection>
                    {latestPayments.map((payment) => {
                      const contract = contracts.find((c) => c.id === payment.contractId);
                      const property = properties.find((pr) => pr.id === contract?.propertyId);
                      const tenant = tenants.find((t) => t.id === contract?.tenantId);
                      return (
                        <ListRow
                          key={payment.id}
                          title={`${property?.title ?? 'Propiedad'} · ${CONCEPT_LABEL[payment.concept]}`}
                          subtitle={`${tenant?.name ?? 'Inquilino'} · ${formatDayMonth(payment.date)}${payment.method ? ` · ${payment.method}` : ''}`}
                          value={formatMoney(payment.amount, payment.currency)}
                          onPress={() =>
                            openInTab(navigation, 'PaymentsTab', 'PaymentDetail', { paymentId: payment.id })
                          }
                        />
                      );
                    })}
                  </ListSection>
                </View>
              ) : null}
            </View>
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
  dollar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  dollarItem: {
    flex: 1,
    minWidth: 0,
  },
  dollarLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dollarLabelInUse: {
    color: colors.primary,
  },
  dollarValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  dollarValueInUse: {
    color: colors.text,
  },
  imports: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.warningMuted,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  importsIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importsText: {
    flex: 1,
    minWidth: 0,
  },
  importsLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.warning,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  importsTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  importsDetail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 1,
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
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl - 4,
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xl - 4,
    alignItems: 'flex-start',
  },
  heroWide: {
    flex: 1.5,
  },
  heroNarrow: {
    flex: 1,
  },
  colWide: {
    flex: 1.5,
    minWidth: 0,
  },
  colNarrow: {
    flex: 1,
    minWidth: 0,
  },
  monthBig: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: colors.text,
    marginTop: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  heroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroValue: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1,
    marginTop: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  heroDetail: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 18,
    marginBottom: spacing.lg,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  monthName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  monthPct: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  bar: {
    flexDirection: 'row',
    gap: 2,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: spacing.sm,
    backgroundColor: colors.neutralMuted,
  },
  monthCaption: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
}));
