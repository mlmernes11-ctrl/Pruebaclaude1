// =====================================================================
// Pantalla: Ficha de la propiedad
// ---------------------------------------------------------------------
// Estado de cobro, contrato vigente, accesos a cargos y cobros, detalles y contratos anteriores.
// =====================================================================

import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useLayoutEffect } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Button from '../../components/Button';
import HeaderTextButton from '../../components/HeaderTextButton';
import ListRow from '../../components/ListRow';
import ListSection from '../../components/ListSection';
import Screen from '../../components/Screen';
import StatusHero from '../../components/StatusHero';
import { CONTRACT_STATUS_LABEL, PROPERTY_TYPE_LABEL } from '../../constants';
import { useData } from '../../context/DataContext';
import { makeStyles, useTheme } from '../../context/ThemeContext';
import { fontSize, radius, spacing } from '../../theme';
import { Currency } from '../../types';
import { addMonthsToPeriod, currentPeriod, formatDate, formatMoney, formatPeriodShort, formatTotals } from '../../utils/format';
import { openInTab } from '../../utils/navigation';
import { contractEndBadge, daysUntil, PropertySummary, summarizeProperty } from '../../utils/propertySummary';
import { isOutstanding } from '../../utils/ledger';
import { debtReminderText, openWhatsapp } from '../../utils/whatsapp';
import { plural } from '../../utils/text';

// ── Constantes y funciones auxiliares ─────────────────────────────────

function heroFor(summary: PropertySummary, today: string) {
  const { collection, overdue, pending, nextDueDate, oldestOverdueDate, property } = summary;
  if (collection === 'deuda') {
    const days = Math.max(1, -daysUntil(oldestOverdueDate ?? today));
    return {
      tone: 'danger' as const,
      label: 'Con deuda',
      value: formatTotals(overdue.totals),
      detail: `${plural(overdue.count, 'cargo vencido', 'cargos vencidos')} · ${plural(days, 'día', 'días')} de mora`,
    };
  }
  if (collection === 'por-vencer') {
    return {
      tone: 'warning' as const,
      label: 'A vencer',
      value: formatTotals(pending.totals),
      detail: `Vence el ${formatDate(nextDueDate)}`,
    };
  }
  if (collection === 'al-dia') {
    return {
      tone: 'success' as const,
      label: 'Al día',
      value: 'Sin deuda',
      detail: 'Todos los cargos están pagos',
    };
  }
  if (collection === 'sin-contrato') {
    return { tone: 'empty' as const, label: 'Disponible', value: 'Sin inquilino', detail: 'Lista para alquilar' };
  }
  return { tone: 'empty' as const, label: 'En mantenimiento', value: 'No disponible', detail: property.notes };
}

// ── Pantalla ──────────────────────────────────────────────────────────

export default function PropertyDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { propertyId } = route.params;
  const { getPropertyById } = useData();
  const exists = Boolean(getPropertyById(propertyId));

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerRight: exists
        ? () => <HeaderTextButton label="Editar" onPress={() => navigation.navigate('PropertyForm', { propertyId })} />
        : undefined,
    });
  }, [navigation, exists, propertyId]);

  return (
    <Screen>
      <PropertyDetail propertyId={propertyId} />
    </Screen>
  );
}

// Contenido de la ficha. En pantalla grande también se muestra como panel al costado de la
// lista ("embedded"); ahí no hay barra de arriba, así que el botón Editar va dentro.
export function PropertyDetail({ propertyId, embedded }: { propertyId: string; embedded?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const {
    getPropertyById,
    contractsForProperty,
    getTenantById,
    contracts: allContracts,
    chargeViews,
    chargeViewsForProperty,
    payments,
    tenants,
    today,
  } = useData();
  const property = getPropertyById(propertyId);

  if (!property) return <Text style={styles.notFound}>Propiedad no encontrada.</Text>;

  // — Datos de la propiedad —
  const summary = summarizeProperty(property, allContracts, chargeViews, tenants);
  const hero = heroFor(summary, today);
  const active = summary.activeContract;
  const tenant = summary.tenant;
  const endBadge = active ? contractEndBadge(active) : undefined;
  const propertyContracts = contractsForProperty(property.id);
  const pastContracts = propertyContracts.filter((c) => c.id !== active?.id);
  const contractIds = new Set(propertyContracts.map((c) => c.id));
  const propertyCharges = chargeViewsForProperty(property.id);
  const chargeCount = propertyCharges.length;
  // Lo que debe el inquilino actual: vencido o por vencer de su contrato y de los anteriores con él
  // (si se renovó, la deuda del contrato viejo sigue siendo suya).
  const tenantContractIds = new Set(
    propertyContracts.filter((c) => active && c.tenantId === active.tenantId).map((c) => c.id),
  );
  const owed = propertyCharges
    .filter((v) => tenantContractIds.has(v.charge.contractId) && isOutstanding(v))
    .sort((a, b) => a.charge.dueDate.localeCompare(b.charge.dueDate));
  // "Registrar cobro" abre primero el contrato con la deuda más vieja; si no hay deuda, el vigente.
  const collectContractId = owed[0]?.charge.contractId ?? active?.id;
  // Últimos tres meses de importes (expensas, servicios y alquiler, con sus ajustes aparte).
  const importOf = (period: string, concept: 'expensas' | 'servicios' | 'alquiler') =>
    propertyCharges
      .filter((v) => v.charge.period === period && v.charge.concept === concept)
      .reduce((sum, v) => sum + v.charge.amount, 0);
  const recentImports = [0, -1, -2].map((offset) => {
    const period = addMonthsToPeriod(currentPeriod(), offset);
    const before = addMonthsToPeriod(period, -1);
    const expensas = importOf(period, 'expensas');
    const servicios = importOf(period, 'servicios');
    const alquiler = importOf(period, 'alquiler');
    const alquilerCurrency: Currency =
      propertyCharges.find((v) => v.charge.period === period && v.charge.concept === 'alquiler')?.charge.currency ?? 'ARS';
    const changed = (now: number, prev: number) => now > 0 && prev > 0 && now !== prev;
    return {
      period,
      expensas,
      servicios,
      alquiler,
      alquilerCurrency,
      expensasChanged: changed(expensas, importOf(before, 'expensas')),
      serviciosChanged: changed(servicios, importOf(before, 'servicios')),
      alquilerChanged: changed(alquiler, importOf(before, 'alquiler')),
    };
  });
  const paymentCount = payments.filter((p) => contractIds.has(p.contractId)).length;
  // Abre la pestaña Cobros ya filtrada por esta propiedad (todos sus cargos o todos sus cobros).
  const openPayments = (mode: 'cargos' | 'cobros') =>
    navigation.navigate('PaymentsTab', {
      screen: 'PaymentsList',
      params: { mode, propertyId: property.id },
    });

  // — Dibujo de la pantalla —
  return (
    <ScrollView contentContainerStyle={styles.content}>
      {embedded ? (
        <View style={styles.embeddedBar}>
          <HeaderTextButton inline label="Editar" onPress={() => navigation.navigate('PropertyForm', { propertyId })} />
        </View>
      ) : null}
      <View style={styles.titleBlock}>
        <Text style={styles.title} accessibilityRole="header">
          {property.title}
        </Text>
        <Text style={styles.address}>{[property.address, property.neighborhood].filter(Boolean).join(' · ')}</Text>
      </View>

      <StatusHero tone={hero.tone} label={hero.label} value={hero.value} detail={hero.detail}>
        {summary.collection === 'deuda' && summary.pending.count ? (
          <View style={styles.heroExtra}>
            <View style={styles.heroExtraRow}>
              <Text style={styles.heroExtraLabel}>A vencer</Text>
              <Text style={styles.heroExtraValue}>{formatTotals(summary.pending.totals)}</Text>
            </View>
            <Text style={styles.heroExtraNote}>Vence el {formatDate(summary.nextDueDate)}</Text>
          </View>
        ) : null}
      </StatusHero>

      {active ? (
        <View style={styles.primaryAction}>
          <Button
            label="Registrar cobro"
            onPress={() => openInTab(navigation, 'PaymentsTab', 'PaymentForm', { contractId: collectContractId })}
          />
          {owed.length ? (
            <Button
              label="Recordar deuda por WhatsApp"
              variant="secondary"
              onPress={() => openWhatsapp(tenant?.phone, debtReminderText(tenant, property, owed))}
              style={styles.secondaryAction}
            />
          ) : null}
        </View>
      ) : (
        <View style={styles.heroGap} />
      )}

      <ListSection header={active ? 'Contrato vigente' : 'Contrato'}>
        {active ? (
          <ListRow
            title="Inquilino"
            subtitle={[tenant?.name ?? 'Inquilino', tenant?.phone].filter(Boolean).join(' · ')}
            onPress={tenant ? () => navigation.navigate('TenantDetail', { tenantId: tenant.id }) : undefined}
          />
        ) : null}
        {active ? (
          <ListRow
            title="Vigencia"
            value={endBadge ? endBadge.label : `Hasta ${formatDate(active.endDate)}`}
            valueTone={endBadge ? (endBadge.tone === 'danger' ? 'danger' : 'warning') : 'muted'}
          />
        ) : null}
        {active ? (
          <ListRow
            title="Alquiler"
            value={`${formatMoney(active.rentAmount, active.currency)} · vence el ${active.paymentDay}`}
            valueTone="muted"
          />
        ) : null}
        {active ? (
          <ListRow
            title="Ver contrato"
            onPress={() => navigation.navigate('ContractDetail', { contractId: active.id })}
          />
        ) : (
          <ListRow
            title="Nuevo contrato"
            icon="add-circle-outline"
            onPress={() => navigation.navigate('ContractForm', { propertyId: property.id })}
          />
        )}
      </ListSection>

      <ListSection header="Cuenta corriente">
        <ListRow
          title="Cargos"
          icon="document-text-outline"
          value={summary.overdue.count ? `${summary.overdue.count} en mora` : String(chargeCount)}
          valueTone={summary.overdue.count ? 'danger' : 'muted'}
          onPress={() => openPayments('cargos')}
        />
        <ListRow
          title="Cobros"
          icon="wallet-outline"
          value={String(paymentCount)}
          valueTone="muted"
          onPress={() => openPayments('cobros')}
        />
        <ListRow
          title="Historial por mes"
          icon="time-outline"
          onPress={() => navigation.navigate('History', { propertyId: property.id })}
        />
      </ListSection>

      {recentImports.some((m) => m.expensas || m.servicios || m.alquiler) ? (
        <>
          <Text style={styles.importsHeader}>ÚLTIMOS IMPORTES</Text>
          <View style={styles.importsCard}>
            <View style={styles.importsRow}>
              {['Mes', 'Expensas', 'Servicios', 'Alquiler'].map((label, i) => (
                <Text key={label} style={[styles.importsHead, i === 3 && styles.importsRight]}>
                  {label}
                </Text>
              ))}
            </View>
            {recentImports.map((m) => (
              <View key={m.period} style={[styles.importsRow, styles.importsRowBorder]}>
                <Text style={styles.importsCell}>{formatPeriodShort(m.period)}</Text>
                <Text style={[styles.importsCell, m.expensasChanged && styles.importsChanged]}>
                  {m.expensas ? formatMoney(m.expensas, 'ARS') : '—'}
                </Text>
                <Text style={[styles.importsCell, m.serviciosChanged && styles.importsChanged]}>
                  {m.servicios ? formatMoney(m.servicios, 'ARS') : '—'}
                </Text>
                <Text style={[styles.importsCell, styles.importsRight, m.alquilerChanged && styles.importsChanged]}>
                  {m.alquiler ? formatMoney(m.alquiler, m.alquilerCurrency) : '—'}
                </Text>
              </View>
            ))}
            <TouchableOpacity
              style={[styles.importsRow, styles.importsRowBorder, styles.importsLink]}
              onPress={() => navigation.navigate('Imports')}
              accessibilityRole="button"
            >
              <Text style={styles.importsLinkText}>Actualizar importes</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.importsFoot}>En negrita, el importe que cambió respecto del mes anterior.</Text>
        </>
      ) : null}

      <ListSection header="Detalles" footer={property.notes ? `Notas: ${property.notes}` : undefined}>
        <ListRow title="Tipo" value={PROPERTY_TYPE_LABEL[property.type]} valueTone="muted" />
        {property.rentAmount ? (
          <ListRow
            title="Precio publicado"
            value={formatMoney(property.rentAmount, property.rentCurrency)}
            valueTone="muted"
          />
        ) : null}
        {property.expensasAmount ? (
          <ListRow title="Expensas" value={formatMoney(property.expensasAmount, 'ARS')} valueTone="muted" />
        ) : null}
        {property.serviciosAmount ? (
          <ListRow title="Servicios" value={formatMoney(property.serviciosAmount, 'ARS')} valueTone="muted" />
        ) : null}
        {property.rooms ? <ListRow title="Ambientes" value={String(property.rooms)} valueTone="muted" /> : null}
        {property.bathrooms ? <ListRow title="Baños" value={String(property.bathrooms)} valueTone="muted" /> : null}
        {property.area ? <ListRow title="Superficie" value={`${property.area} m²`} valueTone="muted" /> : null}
      </ListSection>

      {pastContracts.length ? (
        <ListSection header="Historial de contratos">
          {pastContracts.map((contract) => (
            <ListRow
              key={contract.id}
              title={getTenantById(contract.tenantId)?.name ?? 'Inquilino'}
              subtitle={`${formatDate(contract.startDate)} al ${formatDate(contract.endDate)}`}
              value={CONTRACT_STATUS_LABEL[contract.status]}
              valueTone="muted"
              onPress={() => navigation.navigate('ContractDetail', { contractId: contract.id })}
            />
          ))}
        </ListSection>
      ) : null}
    </ScrollView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  importsHeader: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  importsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  importsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  importsRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  importsHead: {
    flex: 1,
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
  },
  importsCell: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  importsChanged: {
    fontWeight: '700',
    color: colors.text,
  },
  importsRight: {
    textAlign: 'right',
  },
  importsLink: {
    justifyContent: 'space-between',
    minHeight: 48,
  },
  importsLinkText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
  importsFoot: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  embeddedBar: {
    alignItems: 'flex-end',
    marginBottom: -spacing.sm,
  },
  notFound: {
    padding: spacing.lg,
    color: colors.textMuted,
  },
  titleBlock: {
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.largeTitle,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.text,
  },
  address: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: 2,
  },
  heroExtra: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  heroExtraRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  heroExtraLabel: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  heroExtraValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  heroExtraNote: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  primaryAction: {
    marginBottom: spacing.xl,
  },
  secondaryAction: {
    marginTop: spacing.sm,
  },
  heroGap: {
    height: spacing.md,
  },
}));
