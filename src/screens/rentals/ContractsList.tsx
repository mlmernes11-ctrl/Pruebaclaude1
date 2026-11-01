import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { FlatList, Text, View } from 'react-native';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import MoneyText from '../../components/MoneyText';
import SearchLauncher from '../../components/SearchSheet';
import { CONTRACT_STATUS_LABEL, CONTRACT_STATUS_TONE } from '../../constants';
import { useData } from '../../context/DataContext';
import FAB, { FAB_CLEARANCE } from '../../components/FAB';
import { fontSize, spacing } from '../../theme';
import { formatDate } from '../../utils/format';
import { contractEndBadge } from '../../utils/propertySummary';
import { compareTitles } from '../../utils/text';
import { makeStyles } from '../../context/ThemeContext';

export default function ContractsList() {
  const styles = useStyles();
  const { contracts, getPropertyById, getTenantById } = useData();
  const navigation = useNavigation<any>();

  // Active contracts first, then by carpeta.
  const sorted = [...contracts].sort(
    (a, b) =>
      Number(b.status === 'activo') - Number(a.status === 'activo') ||
      compareTitles(getPropertyById(a.propertyId)?.title ?? '', getPropertyById(b.propertyId)?.title ?? ''),
  );

  return (
    <>
      {contracts.length ? <SearchLauncher scope="contratos" /> : null}
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="Sin contratos"
            message="Creá un contrato para vincular una propiedad con un inquilino."
          />
        }
        renderItem={({ item }) => {
          const property = getPropertyById(item.propertyId);
          const tenant = getTenantById(item.tenantId);
          const endBadge = contractEndBadge(item);
          return (
            <Card
              style={styles.card}
              onPress={() => navigation.navigate('ContractDetail', { contractId: item.id })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {property?.title ?? 'Propiedad'}
                </Text>
                <Badge label={CONTRACT_STATUS_LABEL[item.status]} tone={CONTRACT_STATUS_TONE[item.status]} />
              </View>
              <Text style={styles.tenantText}>{tenant?.name ?? 'Inquilino'}</Text>
              <View style={styles.footerRow}>
                <View style={styles.dates}>
                  <Text style={styles.dateText}>
                    {formatDate(item.startDate)} al {formatDate(item.endDate)}
                  </Text>
                  {endBadge ? <Badge label={endBadge.label} tone={endBadge.tone} /> : null}
                </View>
                <MoneyText amount={item.rentAmount} currency={item.currency} suffix="/mes" style={styles.rentText} />
              </View>
            </Card>
          );
        }}
      />
      <FAB onPress={() => navigation.navigate('ContractForm')} />
    </>
  );
}

const useStyles = makeStyles((colors) => ({
  listContent: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: FAB_CLEARANCE,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  tenantText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  dates: {
    flexShrink: 1,
    gap: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  dateText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  rentText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.primary,
  },
}));
