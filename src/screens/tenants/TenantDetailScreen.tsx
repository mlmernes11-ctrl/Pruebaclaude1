import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { showAlert, showConfirm } from '../../components/DialogHost';
import Screen from '../../components/Screen';
import { CONTRACT_STATUS_LABEL } from '../../constants';
import { useData } from '../../context/DataContext';
import { colors, fontSize, spacing } from '../../theme';
import { formatDate } from '../../utils/format';

const CONTRACT_TONE = {
  activo: 'success',
  finalizado: 'neutral',
  cancelado: 'danger',
} as const;

export default function TenantDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { tenantId } = route.params;
  const { getTenantById, deleteTenant, contractsForTenant, getPropertyById } = useData();
  const tenant = getTenantById(tenantId);

  if (!tenant) {
    return (
      <Screen>
        <Text style={styles.notFound}>Inquilino no encontrado.</Text>
      </Screen>
    );
  }

  const contracts = contractsForTenant(tenant.id);

  const handleDelete = () => {
    showConfirm({
      title: 'Eliminar inquilino',
      message: `¿Seguro que deseas eliminar a "${tenant.name}"?`,
      confirmLabel: 'Eliminar',
      destructive: true,
      onConfirm: () => {
        const result = deleteTenant(tenant.id);
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
        <Text style={styles.title}>{tenant.name}</Text>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Información de contacto</Text>
          {tenant.document ? <DetailRow icon="card-outline" value={tenant.document} /> : null}
          {tenant.phone ? <DetailRow icon="call-outline" value={tenant.phone} /> : null}
          {tenant.email ? <DetailRow icon="mail-outline" value={tenant.email} /> : null}
          {tenant.notes ? <DetailRow icon="document-text-outline" value={tenant.notes} /> : null}
          {!tenant.document && !tenant.phone && !tenant.email && !tenant.notes ? (
            <Text style={styles.emptyText}>Sin información adicional.</Text>
          ) : null}
        </Card>

        <Text style={styles.sectionTitle}>Contratos</Text>
        {contracts.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>Este inquilino no tiene contratos.</Text>
          </Card>
        ) : (
          contracts.map((contract) => {
            const property = getPropertyById(contract.propertyId);
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
                  <Text style={styles.contractProperty}>{property?.title ?? 'Propiedad'}</Text>
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
            onPress={() => navigation.navigate('TenantForm', { tenantId: tenant.id })}
          />
          <Button label="Eliminar" variant="danger" style={styles.actionButton} onPress={handleDelete} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function DetailRow({ icon, value }: { icon: keyof typeof Ionicons.glyphMap; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <Text style={styles.detailValue}>{value}</Text>
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
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.lg,
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
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  detailValue: {
    fontSize: fontSize.sm,
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
  contractProperty: {
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
});
