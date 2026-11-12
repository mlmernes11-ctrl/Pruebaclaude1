// =====================================================================
// Pantalla: Ficha del contrato
// ---------------------------------------------------------------------
// Condiciones, propiedad e inquilino, y su cuenta corriente (cargos).
// =====================================================================

import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useLayoutEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Button from '../../components/Button';
import HeaderTextButton from '../../components/HeaderTextButton';
import ListRow from '../../components/ListRow';
import ListSection from '../../components/ListSection';
import Screen from '../../components/Screen';
import { CONCEPT_LABEL, CONTRACT_STATUS_LABEL } from '../../constants';
import { useData } from '../../context/DataContext';
import { makeStyles } from '../../context/ThemeContext';
import { fontSize, spacing } from '../../theme';
import { describeAdjustment, nextAdjustmentPeriod } from '../../utils/adjustments';
import {
  addToTotals, emptyTotals, formatDate, formatMoney, formatPeriod, formatPeriodShort, formatTotals,
} from '../../utils/format';
import { unallocatedAmount } from '../../utils/ledger';
import { openInTab } from '../../utils/navigation';
import { confirmDeleteContract, confirmFinishContract } from '../../utils/contractActions';
import { contractEndBadge } from '../../utils/propertySummary';
import { CHARGE_STATUS_DOT, CHARGE_VALUE_TONE, chargeProgress, chargeShownAmount } from '../../utils/status';
import { capitalize } from '../../utils/text';

// ── Pantalla ──────────────────────────────────────────────────────────

export default function ContractDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { contractId } = route.params;
  const { getContractById } = useData();
  const exists = Boolean(getContractById(contractId));

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerRight: exists
        ? () => <HeaderTextButton label="Editar" onPress={() => navigation.navigate('ContractForm', { contractId })} />
        : undefined,
    });
  }, [navigation, exists, contractId]);

  return (
    <Screen>
      <ContractDetail contractId={contractId} />
    </Screen>
  );
}

// Contenido de la ficha. En pantalla grande también se muestra como panel al costado de la
// lista ("embedded"); ahí no hay barra de arriba, así que el botón Editar va dentro.
export function ContractDetail({ contractId, embedded }: { contractId: string; embedded?: boolean }) {
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const {
    getContractById, getPropertyById, getTenantById, chargeViewsForContract, paymentsForContract, updateContract,
    deleteContract,
  } = useData();
  const contract = getContractById(contractId);

  if (!contract) return <Text style={styles.notFound}>Contrato no encontrado.</Text>;

  const property = getPropertyById(contract.propertyId);
  const tenant = getTenantById(contract.tenantId);
  const charges = chargeViewsForContract(contract.id);
  const end = contractEndBadge(contract);
  const adjustment = describeAdjustment(contract);
  const nextAdjustment = contract.status === 'activo' ? nextAdjustmentPeriod(contract) : undefined;
  const credit = emptyTotals();
  paymentsForContract(contract.id).forEach((p) => addToTotals(credit, unallocatedAmount(p), p.currency));
  const openPayments = (screen: string, params: object) => openInTab(navigation, 'PaymentsTab', screen, params);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {embedded ? (
        <View style={styles.embeddedBar}>
          <HeaderTextButton label="Editar" onPress={() => navigation.navigate('ContractForm', { contractId })} />
        </View>
      ) : null}
      <View style={styles.titleBlock}>
        <Text style={styles.title} accessibilityRole="header">
          {property?.title ?? 'Propiedad'}
        </Text>
        <Text style={styles.subtitle}>
          Contrato {CONTRACT_STATUS_LABEL[contract.status].toLowerCase()} · {tenant?.name ?? 'Inquilino'}
        </Text>
      </View>

      {contract.status === 'activo' ? (
        <Button
          label="Registrar cobro"
          onPress={() => openPayments('PaymentForm', { contractId: contract.id })}
          style={styles.primaryAction}
        />
      ) : null}

      <ListSection>
        <ListRow
          title="Propiedad"
          value={property?.title ?? 'Eliminada'}
          valueTone="muted"
          onPress={property ? () => navigation.navigate('PropertyDetail', { propertyId: property.id }) : undefined}
        />
        <ListRow
          title="Inquilino"
          value={tenant?.name ?? 'Eliminado'}
          valueTone="muted"
          onPress={tenant ? () => navigation.navigate('TenantDetail', { tenantId: tenant.id }) : undefined}
        />
      </ListSection>

      <ListSection header="Condiciones" footer={contract.notes ? `Notas: ${contract.notes}` : undefined}>
        <ListRow title="Inicio" value={formatDate(contract.startDate)} valueTone="muted" />
        <ListRow
          title="Fin"
          value={end ? `${formatDate(contract.endDate)} · ${end.label.toLowerCase()}` : formatDate(contract.endDate)}
          valueTone={end ? (end.tone === 'danger' ? 'danger' : 'warning') : 'muted'}
        />
        <ListRow title="Alquiler" value={formatMoney(contract.rentAmount, contract.currency)} valueTone="muted" />
        {adjustment ? (
          <ListRow
            title="Ajuste"
            subtitle={nextAdjustment ? `Próximo: ${formatPeriod(nextAdjustment)}` : 'Sin más ajustes antes del fin'}
            value={adjustment}
            valueTone="muted"
          />
        ) : null}
        {contract.depositAmount ? (
          <ListRow title="Depósito" value={formatMoney(contract.depositAmount, contract.currency)} valueTone="muted" />
        ) : null}
        <ListRow title="Vencimiento" value={`${contract.paymentDay} de cada mes`} valueTone="muted" />
      </ListSection>

      <ListSection
        header="Cuenta corriente"
        footer={credit.USD || credit.ARS ? `Saldo a favor del inquilino: ${formatTotals(credit)}` : undefined}
      >
        {charges.map((view) => (
          <ListRow
            key={view.charge.id}
            dot={CHARGE_STATUS_DOT[view.status]}
            title={`${CONCEPT_LABEL[view.charge.concept]} ${formatPeriodShort(view.charge.period)}`}
            subtitle={capitalize(chargeProgress(view))}
            value={formatMoney(chargeShownAmount(view), view.charge.currency)}
            valueTone={CHARGE_VALUE_TONE[view.status]}
            onPress={() => openPayments('ChargeForm', { chargeId: view.charge.id })}
          />
        ))}
        <ListRow
          title="Agregar cargo"
          icon="add-circle-outline"
          onPress={() => openPayments('ChargeForm', { contractId: contract.id })}
        />
      </ListSection>

      {/* Uno arriba del otro: primero lo recomendado (finalizar) y abajo lo irreversible. */}
      <View style={styles.endActions}>
        {contract.status === 'activo' ? (
          <Button
            label="Finalizar contrato"
            variant="secondary"
            onPress={() => confirmFinishContract(contract, updateContract)}
          />
        ) : null}
        <Button
          label="Eliminar contrato"
          variant="dangerOutline"
          onPress={() =>
            confirmDeleteContract(contract, deleteContract, () => {
              if (!embedded) navigation.goBack();
            })
          }
        />
      </View>
    </ScrollView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
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
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: 2,
  },
  primaryAction: {
    marginBottom: spacing.xl,
  },
  endActions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
}));
