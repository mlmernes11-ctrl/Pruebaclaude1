import { useNavigation, useRoute } from '@react-navigation/native';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import EmptyState from '../../components/EmptyState';
import ListRow from '../../components/ListRow';
import ListSection from '../../components/ListSection';
import Screen from '../../components/Screen';
import { DotTone } from '../../components/StatusDot';
import { CONCEPT_LABEL } from '../../constants';
import { useData } from '../../context/DataContext';
import { useExchangeRate } from '../../context/ExchangeRateContext';
import { makeStyles } from '../../context/ThemeContext';
import { fontSize, spacing } from '../../theme';
import { ChargeStatus, MoneyTotals } from '../../types';
import { describeTotals, formatDate, formatMoney } from '../../utils/format';
import { buildPeriodRow } from '../../utils/history';
import { openInTab } from '../../utils/navigation';
import { compareTitles, plural } from '../../utils/text';

const STATUS_DOT: Record<ChargeStatus, DotTone> = { vencido: 'danger', pendiente: 'warning', pagado: 'success' };

export default function MonthDetailScreen() {
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { period, propertyId } = route.params as { period: string; propertyId?: string };
  const { chargeViews, contracts, getContractById, getPropertyById, getTenantById } = useData();
  const { rate, toPesos } = useExchangeRate();

  const property = getPropertyById(propertyId);
  const contractIds = propertyId
    ? new Set(contracts.filter((c) => c.propertyId === propertyId).map((c) => c.id))
    : undefined;
  const items = chargeViews
    .filter((v) => v.charge.period === period && (!contractIds || contractIds.has(v.charge.contractId)))
    .map((view) => {
      const contract = getContractById(view.charge.contractId);
      return {
        view,
        propertyTitle: getPropertyById(contract?.propertyId)?.title ?? 'Propiedad',
        tenantName: getTenantById(contract?.tenantId)?.name ?? 'Inquilino',
      };
    })
    .sort((a, b) => compareTitles(a.propertyTitle, b.propertyTitle));
  const row = buildPeriodRow(
    items.map((i) => i.view),
    period,
    toPesos,
  );
  const unpaid: MoneyTotals = { USD: row.overdue.USD + row.pending.USD, ARS: row.overdue.ARS + row.pending.ARS };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          {property ? property.title : 'Todas las propiedades'} · {plural(items.length, 'liquidación', 'liquidaciones')}
        </Text>
        {items.length ? (
          <>
            <ListSection>
              <ListRow title="Liquidado" value={describeTotals(row.billed, rate).main} />
              <ListRow title="Cobrado" value={describeTotals(row.paid, rate).main} valueTone="muted" />
              <ListRow
                title="Sin cobrar"
                value={describeTotals(unpaid, rate).main}
                valueTone={row.overdueCount ? 'danger' : 'muted'}
              />
            </ListSection>
            <ListSection>
              {items.map(({ view, propertyTitle, tenantName }) => {
                const { charge, status, paid, balance, lastPaymentDate } = view;
                const when =
                  status === 'pagado' && lastPaymentDate
                    ? `pagada el ${formatDate(lastPaymentDate).slice(0, 5)}`
                    : paid > 0
                      ? `pagó ${formatMoney(paid, charge.currency)}`
                      : `vence el ${formatDate(charge.dueDate).slice(0, 5)}`;
                return (
                  <ListRow
                    key={charge.id}
                    dot={STATUS_DOT[status]}
                    title={propertyTitle}
                    subtitle={`${tenantName} · ${CONCEPT_LABEL[charge.concept]} · ${when}`}
                    value={formatMoney(status === 'pagado' ? charge.amount : balance, charge.currency)}
                    valueTone={status === 'vencido' ? 'danger' : status === 'pagado' ? 'muted' : 'default'}
                    onPress={() => openInTab(navigation, 'PaymentsTab', 'ChargeForm', { chargeId: charge.id })}
                  />
                );
              })}
            </ListSection>
          </>
        ) : (
          <View>
            <EmptyState icon="calendar-outline" title="Sin liquidaciones" message="No hay liquidaciones en este mes." />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginHorizontal: spacing.xs,
    marginBottom: spacing.md,
  },
}));
