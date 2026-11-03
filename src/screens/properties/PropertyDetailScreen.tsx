import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useLayoutEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Button from '../../components/Button';
import HeaderTextButton from '../../components/HeaderTextButton';
import ListRow from '../../components/ListRow';
import ListSection from '../../components/ListSection';
import Screen from '../../components/Screen';
import StatusHero from '../../components/StatusHero';
import { CONTRACT_STATUS_LABEL, PROPERTY_TYPE_LABEL } from '../../constants';
import { useData } from '../../context/DataContext';
import { makeStyles } from '../../context/ThemeContext';
import { fontSize, spacing } from '../../theme';
import { formatDate, formatMoney, formatTotals } from '../../utils/format';
import { openInTab } from '../../utils/navigation';
import { contractEndBadge, daysUntil, PropertySummary, summarizeProperty } from '../../utils/propertySummary';
import { plural } from '../../utils/text';

function heroFor(summary: PropertySummary, today: string) {
  const { collection, overdue, pending, nextDueDate, oldestOverdueDate, property } = summary;
  if (collection === 'deuda') {
    const days = Math.max(1, -daysUntil(oldestOverdueDate ?? today));
    return {
      tone: 'danger' as const,
      label: 'Con deuda',
      value: formatTotals(overdue.totals),
      detail: `${plural(overdue.count, 'liquidación vencida', 'liquidaciones vencidas')} · ${plural(days, 'día', 'días')} de mora`,
    };
  }
  if (collection === 'por-vencer') {
    return {
      tone: 'warning' as const,
      label: 'Por vencer',
      value: formatTotals(pending.totals),
      detail: `Vence el ${formatDate(nextDueDate)}`,
    };
  }
  if (collection === 'al-dia') {
    return { tone: 'success' as const, label: 'Al día', value: 'Sin deuda', detail: 'Todas las liquidaciones están pagas' };
  }
  if (collection === 'sin-contrato') {
    return { tone: 'empty' as const, label: 'Disponible', value: 'Sin inquilino', detail: 'Lista para alquilar' };
  }
  return { tone: 'empty' as const, label: 'En mantenimiento', value: 'No disponible', detail: property.notes };
}

export default function PropertyDetailScreen() {
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { propertyId } = route.params;
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

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerRight: property
        ? () => <HeaderTextButton label="Editar" onPress={() => navigation.navigate('PropertyForm', { propertyId })} />
        : undefined,
    });
  }, [navigation, property, propertyId]);

  if (!property) {
    return (
      <Screen>
        <Text style={styles.notFound}>Propiedad no encontrada.</Text>
      </Screen>
    );
  }

  const summary = summarizeProperty(property, allContracts, chargeViews, tenants);
  const hero = heroFor(summary, today);
  const active = summary.activeContract;
  const tenant = summary.tenant;
  const endBadge = active ? contractEndBadge(active) : undefined;
  const propertyContracts = contractsForProperty(property.id);
  const pastContracts = propertyContracts.filter((c) => c.id !== active?.id);
  const contractIds = new Set(propertyContracts.map((c) => c.id));
  const chargeCount = chargeViewsForProperty(property.id).length;
  const paymentCount = payments.filter((p) => contractIds.has(p.contractId)).length;
  // The Pagos tab, already filtered to this property.
  const openPayments = (view: 'pagos' | 'liquidaciones') =>
    navigation.navigate('PaymentsTab', {
      screen: 'PaymentsList',
      params: { view, propertyId: property.id, filter: 'todos', month: 'todos' },
    });

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
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
                <Text style={styles.heroExtraLabel}>Por vencer</Text>
                <Text style={styles.heroExtraValue}>{formatTotals(summary.pending.totals)}</Text>
              </View>
              <Text style={styles.heroExtraNote}>Vence el {formatDate(summary.nextDueDate)}</Text>
            </View>
          ) : null}
        </StatusHero>

        {active ? (
          <Button
            label="Registrar pago"
            onPress={() => openInTab(navigation, 'PaymentsTab', 'PaymentForm', { contractId: active.id })}
            style={styles.primaryAction}
          />
        ) : (
          <View style={styles.heroGap} />
        )}

        <ListSection header="Contrato">
          {active ? (
            <ListRow
              title="Inquilino"
              value={tenant?.name ?? 'Inquilino'}
              valueTone="muted"
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
              value={`${formatMoney(active.rentAmount, active.currency)} · día ${active.paymentDay}`}
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

        <ListSection header="Pagos">
          <ListRow
            title="Liquidaciones"
            icon="document-text-outline"
            value={summary.overdue.count ? `${summary.overdue.count} en mora` : String(chargeCount)}
            valueTone={summary.overdue.count ? 'danger' : 'muted'}
            onPress={() => openPayments('liquidaciones')}
          />
          <ListRow
            title="Pagos recibidos"
            icon="wallet-outline"
            value={String(paymentCount)}
            valueTone="muted"
            onPress={() => openPayments('pagos')}
          />
          <ListRow
            title="Historial por mes"
            icon="time-outline"
            onPress={() => navigation.navigate('PropertyPayments', { propertyId: property.id })}
          />
        </ListSection>

        <ListSection header="Detalles" footer={property.notes ? `Notas: ${property.notes}` : undefined}>
          <ListRow title="Tipo" value={PROPERTY_TYPE_LABEL[property.type]} valueTone="muted" />
          <ListRow
            title="Alquiler publicado"
            value={formatMoney(property.rentAmount, property.rentCurrency)}
            valueTone="muted"
          />
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
          <ListSection header="Contratos anteriores">
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
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
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
  heroGap: {
    height: spacing.md,
  },
}));
