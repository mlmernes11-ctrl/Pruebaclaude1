import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { showAlert, showConfirm } from '../../components/DialogHost';
import MoneyText from '../../components/MoneyText';
import Screen from '../../components/Screen';
import {
  CONTRACT_STATUS_LABEL,
  PROPERTY_STATUS_LABEL,
  PROPERTY_TYPE_LABEL,
} from '../../constants';
import { useData } from '../../context/DataContext';
import { colors, fontSize, spacing } from '../../theme';
import { formatDate, formatMoney, formatTotals } from '../../utils/format';
import { PaymentBucket, summarizeProperty } from '../../utils/propertySummary';

const STATUS_TONE = {
  disponible: 'primary',
  alquilada: 'success',
  mantenimiento: 'warning',
} as const;

const CONTRACT_TONE = {
  activo: 'success',
  finalizado: 'neutral',
  cancelado: 'danger',
} as const;

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
    payments,
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
  const summary = summarizeProperty(property, allContracts, payments, tenants);

  const handleDelete = () => {
    showConfirm({
      title: 'Eliminar propiedad',
      message: `¿Seguro que deseas eliminar "${property.title}"?`,
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
          <Badge label={PROPERTY_STATUS_LABEL[property.status]} tone={STATUS_TONE[property.status]} />
        </View>
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={16} color={colors.textMuted} />
          <Text style={styles.address}>{property.address}</Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Detalles</Text>
          <DetailRow label="Tipo" value={PROPERTY_TYPE_LABEL[property.type]} />
          <DetailRow
            label="Alquiler mensual"
            value={
              <MoneyText
                amount={property.rentAmount}
                currency={property.rentCurrency}
                style={styles.detailValue}
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

        <Text style={styles.sectionTitle}>Pagos</Text>
        <Card style={styles.card}>
          <View style={styles.paymentStats}>
            <PaymentStat label="Vencidos" bucket={summary.overdue} color={colors.danger} />
            <PaymentStat label="Por vencer" bucket={summary.pending} color={colors.warning} />
            <PaymentStat label="Pagados" bucket={summary.paid} color={colors.success} />
          </View>
          <Button
            label="Ver historial de pagos"
            variant="secondary"
            onPress={() => navigation.navigate('PropertyPayments', { propertyId: property.id })}
          />
        </Card>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Contratos</Text>
          <Button
            label="+ Nuevo contrato"
            variant="ghost"
            onPress={() =>
              navigation.navigate('ContractsTab', {
                screen: 'ContractForm',
                params: { propertyId: property.id },
              })
            }
          />
        </View>
        {contracts.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>Esta propiedad no tiene contratos.</Text>
          </Card>
        ) : (
          contracts.map((contract) => {
            const tenant = getTenantById(contract.tenantId);
            return (
              <Card
                key={contract.id}
                style={styles.contractCard}
                onPress={() =>
                  navigation.navigate('ContractsTab', {
                    screen: 'ContractDetail',
                    params: { contractId: contract.id },
                  })
                }
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.contractTenant}>{tenant?.name ?? 'Inquilino'}</Text>
                  <Badge
                    label={CONTRACT_STATUS_LABEL[contract.status]}
                    tone={CONTRACT_TONE[contract.status]}
                  />
                </View>
                <Text style={styles.contractDates}>
                  {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                </Text>
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
          <Button label="Eliminar" variant="danger" style={styles.actionButton} onPress={handleDelete} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      {typeof value === 'string' ? <Text style={styles.detailValue}>{value}</Text> : value}
    </View>
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
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
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
