import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Card from '../../components/Card';
import DetailRow, { useDetailValueStyle } from '../../components/DetailRow';
import { showConfirm } from '../../components/DialogHost';
import MoneyText from '../../components/MoneyText';
import Screen from '../../components/Screen';
import SectionHeader from '../../components/SectionHeader';
import { CONCEPT_LABEL, CONTRACT_STATUS_LABEL, CONTRACT_STATUS_TONE } from '../../constants';
import { useData } from '../../context/DataContext';
import { fontSize, spacing } from '../../theme';
import {
  addToTotals,
  emptyTotals,
  formatDate,
  formatMoney,
  formatPeriod,
  formatTotals,
} from '../../utils/format';
import { CHARGE_STATUS_LABEL, CHARGE_STATUS_TONE, unallocatedAmount } from '../../utils/ledger';
import { openInTab, smartGoBack } from '../../utils/navigation';
import { contractEndBadge } from '../../utils/propertySummary';
import { makeStyles, useTheme } from '../../context/ThemeContext';

export default function ContractDetailScreen() {
  const styles = useStyles();
  const detailValue = useDetailValueStyle();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { contractId } = route.params;
  const {
    getContractById,
    deleteContract,
    getPropertyById,
    getTenantById,
    chargeViewsForContract,
    paymentsForContract,
  } = useData();
  const contract = getContractById(contractId);

  if (!contract) {
    return (
      <Screen>
        <Text style={styles.notFound}>Contrato no encontrado.</Text>
      </Screen>
    );
  }

  const property = getPropertyById(contract.propertyId);
  const tenant = getTenantById(contract.tenantId);
  const charges = chargeViewsForContract(contract.id);
  const endBadge = contractEndBadge(contract);
  const credit = emptyTotals();
  paymentsForContract(contract.id).forEach((p) => addToTotals(credit, unallocatedAmount(p), p.currency));

  const handleDelete = () => {
    showConfirm({
      title: 'Eliminar contrato',
      message: 'También se eliminan sus liquidaciones y pagos registrados. ¿Continuar?',
      confirmLabel: 'Eliminar',
      destructive: true,
      onConfirm: () => {
        deleteContract(contract.id);
        smartGoBack(navigation, 'ContractsList');
      },
    });
  };

  const openPayments = (screen: string, params: object) => openInTab(navigation, 'PaymentsTab', screen, params);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{property?.title ?? 'Propiedad'}</Text>
          <Badge label={CONTRACT_STATUS_LABEL[contract.status]} tone={CONTRACT_STATUS_TONE[contract.status]} />
        </View>
        <Text style={styles.tenantText}>{tenant?.name ?? 'Inquilino'}</Text>

        <Card style={[styles.card, styles.linksCard]}>
          <LinkRow
            icon="business-outline"
            label="Propiedad"
            value={property ? [property.title, property.address].join(' · ') : 'Propiedad eliminada'}
            onPress={
              property
                ? () => openInTab(navigation, 'PropertiesTab', 'PropertyDetail', { propertyId: property.id })
                : undefined
            }
          />
          <View style={styles.linkDivider} />
          <LinkRow
            icon="person-outline"
            label="Inquilino"
            value={tenant ? [tenant.name, tenant.phone].filter(Boolean).join(' · ') : 'Inquilino eliminado'}
            onPress={
              tenant ? () => openInTab(navigation, 'TenantsTab', 'TenantDetail', { tenantId: tenant.id }) : undefined
            }
          />
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Detalles del contrato</Text>
            {endBadge ? <Badge label={endBadge.label} tone={endBadge.tone} /> : null}
          </View>
          <DetailRow label="Inicio" value={formatDate(contract.startDate)} />
          <DetailRow label="Fin" value={formatDate(contract.endDate)} />
          <DetailRow
            label="Alquiler mensual"
            value={
              <MoneyText amount={contract.rentAmount} currency={contract.currency} style={detailValue} />
            }
          />
          {contract.depositAmount ? (
            <DetailRow label="Depósito" value={formatMoney(contract.depositAmount, contract.currency)} />
          ) : null}
          <DetailRow label="Día de pago" value={`Día ${contract.paymentDay} de cada mes`} />
          {contract.notes ? <DetailRow label="Notas" value={contract.notes} /> : null}
        </Card>

        <SectionHeader
          title="Liquidaciones"
          actionLabel="+ Liquidación manual"
          onAction={() => openPayments('ChargeForm', { contractId: contract.id })}
        />
        <Button
          label="Registrar pago"
          onPress={() => openPayments('PaymentForm', { contractId: contract.id })}
          style={styles.collectButton}
        />
        {credit.USD || credit.ARS ? (
          <Text style={styles.creditText}>Saldo a favor del inquilino: {formatTotals(credit)}</Text>
        ) : null}
        {charges.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>
              Todavía no hay liquidaciones. Se generan solas cada mes mientras el contrato esté activo.
            </Text>
          </Card>
        ) : (
          charges.map((view) => (
            <Card
              key={view.charge.id}
              style={styles.paymentCard}
              onPress={() => openPayments('ChargeForm', { chargeId: view.charge.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentPeriod}>
                  {formatPeriod(view.charge.period)} · {CONCEPT_LABEL[view.charge.concept]}
                </Text>
                <Text style={styles.paymentDue}>
                  {view.paid > 0 && view.balance > 0
                    ? `Pagó ${formatMoney(view.paid, view.charge.currency)} de ${formatMoney(view.charge.amount, view.charge.currency)}`
                    : `Vence: ${formatDate(view.charge.dueDate)}`}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <MoneyText
                  amount={view.status === 'pagado' ? view.charge.amount : view.balance}
                  currency={view.charge.currency}
                  style={styles.paymentAmount}
                />
                <Badge label={CHARGE_STATUS_LABEL[view.status]} tone={CHARGE_STATUS_TONE[view.status]} />
              </View>
            </Card>
          ))
        )}

        <View style={styles.actionsRow}>
          <Button
            label="Editar"
            variant="secondary"
            style={styles.actionButton}
            onPress={() => navigation.navigate('ContractForm', { contractId: contract.id })}
          />
          <Button label="Eliminar" variant="dangerOutline" style={styles.actionButton} onPress={handleDelete} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function LinkRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <TouchableOpacity style={styles.linkRow} onPress={onPress} disabled={!onPress} accessibilityRole="button">
      <Ionicons name={icon} size={18} color={colors.primary} />
      <View style={styles.linkInfo}>
        <Text style={styles.linkLabel}>{label}</Text>
        <Text style={styles.linkValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </TouchableOpacity>
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
  tenantText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.lg,
  },
  linksCard: {
    paddingVertical: spacing.xs,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  linkInfo: {
    flex: 1,
    minWidth: 0,
  },
  linkLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  linkValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  linkDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  emptyText: {
    color: colors.textMuted,
  },
  collectButton: {
    marginBottom: spacing.md,
  },
  creditText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  paymentCard: {
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentPeriod: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  paymentDue: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
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
