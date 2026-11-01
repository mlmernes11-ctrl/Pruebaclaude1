import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React from 'react';
import { Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { showAlert, showConfirm } from '../../components/DialogHost';
import Screen from '../../components/Screen';
import SectionHeader from '../../components/SectionHeader';
import { CONTRACT_STATUS_LABEL, CONTRACT_STATUS_TONE } from '../../constants';
import { useData } from '../../context/DataContext';
import { fontSize, spacing } from '../../theme';
import { formatDate } from '../../utils/format';
import { openInTab } from '../../utils/navigation';
import { contractEndBadge } from '../../utils/propertySummary';
import { makeStyles, useTheme } from '../../context/ThemeContext';

// Argentine mobile numbers for WhatsApp links: country code 54 plus the 9 for mobiles.
function whatsappUrl(phone: string): string {
  let digits = phone.replace(/\D/g, '').replace(/^0/, '');
  if (!digits.startsWith('54')) digits = `549${digits}`;
  return `https://wa.me/${digits}`;
}

const openUrl = (url: string) => Linking.openURL(url).catch(() => undefined);

export default function TenantDetailScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
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
      message: `¿Seguro que querés eliminar a "${tenant.name}"?`,
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
          <Text style={styles.cardTitle}>Información de contacto</Text>
          {tenant.document ? <ContactRow icon="card-outline" value={tenant.document} /> : null}
          {tenant.phone ? (
            <ContactRow
              icon="call-outline"
              value={tenant.phone}
              onPress={() => openUrl(`tel:${tenant.phone!.replace(/[^\d+]/g, '')}`)}
              extra={
                <TouchableOpacity
                  style={styles.whatsapp}
                  onPress={() => openUrl(whatsappUrl(tenant.phone!))}
                  accessibilityRole="link"
                  accessibilityLabel="Escribir por WhatsApp"
                >
                  <Ionicons name="logo-whatsapp" size={14} color={colors.success} />
                  <Text style={styles.whatsappText}>WhatsApp</Text>
                </TouchableOpacity>
              }
            />
          ) : null}
          {tenant.email ? (
            <ContactRow icon="mail-outline" value={tenant.email} onPress={() => openUrl(`mailto:${tenant.email}`)} />
          ) : null}
          {tenant.notes ? <ContactRow icon="document-text-outline" value={tenant.notes} /> : null}
          {!tenant.document && !tenant.phone && !tenant.email && !tenant.notes ? (
            <Text style={styles.emptyText}>Sin información adicional.</Text>
          ) : null}
        </Card>

        <SectionHeader
          title="Contratos"
          actionLabel="+ Nuevo contrato"
          onAction={() => openInTab(navigation, 'ContractsTab', 'ContractForm', { tenantId: tenant.id })}
        />
        {contracts.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>Este inquilino no tiene contratos.</Text>
          </Card>
        ) : (
          contracts.map((contract) => {
            const property = getPropertyById(contract.propertyId);
            const endBadge = contractEndBadge(contract);
            return (
              <Card
                key={contract.id}
                style={styles.contractCard}
                onPress={() => openInTab(navigation, 'ContractsTab', 'ContractDetail', { contractId: contract.id })}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.contractProperty}>{property?.title ?? 'Propiedad'}</Text>
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
            onPress={() => navigation.navigate('TenantForm', { tenantId: tenant.id })}
          />
          <Button label="Eliminar" variant="dangerOutline" style={styles.actionButton} onPress={handleDelete} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function ContactRow({
  icon,
  value,
  onPress,
  extra,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onPress?: () => void;
  extra?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.detailRow}>
      <TouchableOpacity style={styles.detailMain} onPress={onPress} disabled={!onPress}>
        <Ionicons name={icon} size={16} color={onPress ? colors.primary : colors.textMuted} />
        <Text style={[styles.detailValue, onPress && styles.detailLink]}>{value}</Text>
      </TouchableOpacity>
      {extra}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
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
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  detailMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailValue: {
    flexShrink: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  detailLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  whatsapp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.successMuted,
  },
  whatsappText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.success,
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
}));
