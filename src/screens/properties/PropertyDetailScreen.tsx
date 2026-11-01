import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Card from '../../components/Card';
import DetailRow, { detailValueStyle } from '../../components/DetailRow';
import { showAlert, showConfirm } from '../../components/DialogHost';
import MoneyText from '../../components/MoneyText';
import Screen from '../../components/Screen';
import SectionHeader from '../../components/SectionHeader';
import {
  CONTRACT_STATUS_LABEL,
  CONTRACT_STATUS_TONE,
  PROPERTY_STATUS_LABEL,
  PROPERTY_STATUS_TONE,
  PROPERTY_TYPE_LABEL,
} from '../../constants';
import { useData } from '../../context/DataContext';
import { colors, fontSize, spacing } from '../../theme';
import { formatDate, formatMoney, formatTotals } from '../../utils/format';
import { openInTab } from '../../utils/navigation';
import { contractEndBadge, PaymentBucket, summarizeProperty } from '../../utils/propertySummary';

export default function PropertyDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { propertyId } = route.params;
  const {
    getPropertyById,
    deleteProperty,
    contractsForProperty,
    getTenantById,
    contracts: allContracts,
    chargeViews,
    tenants,
  } = useData();
  const property = getPropertyById(propertyId);

  if (!property) {
    return (
      <Screen>
        <Text style={styles.notFound}>Propiedad no encontrada.</Text>
      </Screen>
    );
  }

  const contracts = contractsForProperty(property.id);
  const summary = summarizeProperty(property, allContracts, chargeViews, tenants);

  const handleDelete = () => {
    showConfirm({
      title: 'Eliminar propiedad',
      message: `¿Seguro que querés eliminar "${property.title}"?`,
      confirmLabel: 'Eliminar',
      destructive: true,
      onConfirm: () => {
        const result = deleteProperty(property.id);
        if (!result.ok) {
          showAlert('No se puede eliminar', result.reason ?? 'Operación no permitida');
          return;
        }
        navigation.goBack();
      },
    });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{property.title}</Text>
          <Badge label={PROPERTY_STATUS_LABEL[property.status]} tone={PROPERTY_STATUS_TONE[property.status]} />
        </View>
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={16} color={colors.textMuted} />
          <Text style={styles.address}>
            {property.neighborhood ? `${property.address} · ${property.neighborhood}` : property.address}
          </Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Detalles</Text>
          <DetailRow label="Tipo" value={PROPERTY_TYPE_LABEL[property.type]} />
          <DetailRow
            label="Alquiler mensual"
            value={
              <MoneyText
                amount={property.rentAmount}
                currency={property.rentCurrency}
                style={detailValueStyle}
              />
            }
          />
          {property.expensasAmount ? (
            <DetailRow label="Expensas mensuales" value={formatMoney(property.expensasAmount, 'ARS')} />
          ) : null}
          {property.serviciosAmount ? (
            <DetailRow label="Servicios mensuales" value={formatMoney(property.serviciosAmount, 'ARS')} />
          ) : null}
          {property.rooms ? <DetailRow label="Ambientes" value={String(property.rooms)} /> : null}
          {property.bathrooms ? <DetailRow label="Baños" value={String(property.bathrooms)} /> : null}
          {property.area ? <DetailRow label="Superficie" value={`${property.area} m²`} /> : null}
          {property.notes ? <DetailRow label="Notas" value={property.notes} /> : null}
        </Card>

        <SectionHeader title="Pagos" />
        <Card style={styles.card}>
          <View style={styles.paymentStats}>
            <PaymentStat label="Vencidas" bucket={summary.overdue} color={colors.danger} />
            <PaymentStat label="Por vencer" bucket={summary.pending} color={colors.warning} />
            <PaymentStat label="Pagadas" bucket={summary.paid} color={colors.success} />
          </View>
          {summary.activeContract ? (
            <Button
              label="Registrar pago"
              onPress={() =>
                openInTab(navigation, 'PaymentsTab', 'PaymentForm', { contractId: summary.activeContract!.id })
              }
              style={styles.collectButton}
            />
          ) : null}
          <Button
            label="Ver historial de pagos"
            variant="secondary"
            onPress={() => navigation.navigate('PropertyPayments', { propertyId: property.id })}
          />
        </Card>

        <SectionHeader
          title="Contratos"
          actionLabel="+ Nuevo contrato"
          onAction={() => openInTab(navigation, 'ContractsTab', 'ContractForm', { propertyId: property.id })}
        />
        {contracts.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>Esta propiedad no tiene contratos.</Text>
          </Card>
        ) : (
          contracts.map((contract) => {
            const tenant = getTenantById(contract.tenantId);
            const endBadge = contractEndBadge(contract);
            return (
              <Card
                key={contract.id}
                style={styles.contractCard}
                onPress={() => openInTab(navigation, 'ContractsTab', 'ContractDetail', { contractId: contract.id })}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.contractTenant}>{tenant?.name ?? 'Inquilino'}</Text>
                  <Badge
                    label={CONTRACT_STATUS_LABEL[contract.status]}
                    tone={CONTRACT_STATUS_TONE[contract.status]}
                  />
                </View>
                <View style={styles.contractFooter}>
                  <Text style={styles.contractDates}>
                    {formatDate(contract.startDate)} al {formatDate(contract.endDate)}
                  </Text>
                  {endBadge ? <Badge label={endBadge.label} tone={endBadge.tone} /> : null}
                </View>
              </Card>
            );
          })
        )}

        <View style={styles.actionsRow}>
          <Button
            label="Editar"
            variant="secondary"
            style={styles.actionButton}
            onPress={() => navigation.navigate('PropertyForm', { propertyId: property.id })}
          />
          <Button label="Eliminar" variant="dangerOutline" style={styles.actionButton} onPress={handleDelete} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function PaymentStat({
  label,
  bucket,
  color,
}: {
  label: string;
  bucket: PaymentBucket;
  color: string;
}) {
  return (
    <View style={styles.paymentStat}>
      <Text style={[styles.paymentStatCount, { color: bucket.count ? color : colors.textMuted }]}>
        {bucket.count}
      </Text>
      <Text style={styles.paymentStatLabel}>{label}</Text>
      {bucket.count ? <Text style={styles.paymentStatTotal}>{formatTotals(bucket.totals)}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  notFound: {
    padding: spacing.lg,
    color: colors.textMuted,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  address: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  card: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
  },
  contractCard: {
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  contractTenant: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  contractFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  contractDates: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  collectButton: {
    marginBottom: spacing.sm,
  },
  paymentStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  paymentStat: {
    flex: 1,
    alignItems: 'center',
  },
  paymentStatCount: {
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  paymentStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  paymentStatTotal: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
});
