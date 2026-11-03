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
import { addToTotals, emptyTotals, formatDate, formatMoney, formatPeriodShort, formatTotals } from '../../utils/format';
import { unallocatedAmount } from '../../utils/ledger';
import { openInTab } from '../../utils/navigation';
import { contractEndBadge } from '../../utils/propertySummary';
import { CHARGE_STATUS_DOT, CHARGE_VALUE_TONE, chargeProgress, chargeShownAmount } from '../../utils/status';
import { capitalize } from '../../utils/text';

export default function ContractDetailScreen() {
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { contractId } = route.params;
  const { getContractById, getPropertyById, getTenantById, chargeViewsForContract, paymentsForContract } = useData();
  const contract = getContractById(contractId);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerRight: contract
        ? () => <HeaderTextButton label="Editar" onPress={() => navigation.navigate('ContractForm', { contractId })} />
        : undefined,
    });
  }, [navigation, contract, contractId]);

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
  const end = contractEndBadge(contract);
  const credit = emptyTotals();
  paymentsForContract(contract.id).forEach((p) => addToTotals(credit, unallocatedAmount(p), p.currency));
  const openPayments = (screen: string, params: object) => openInTab(navigation, 'PaymentsTab', screen, params);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
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
            label="Registrar pago"
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
          {contract.depositAmount ? (
            <ListRow title="Depósito" value={formatMoney(contract.depositAmount, contract.currency)} valueTone="muted" />
          ) : null}
          <ListRow title="Día de pago" value={`${contract.paymentDay} de cada mes`} valueTone="muted" />
        </ListSection>

        <ListSection
          header="Liquidaciones"
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
            title="Nueva liquidación manual"
            icon="add-circle-outline"
            onPress={() => openPayments('ChargeForm', { contractId: contract.id })}
          />
        </ListSection>
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
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: 2,
  },
  primaryAction: {
    marginBottom: spacing.xl,
  },
}));
