import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import FAB from '../../components/FAB';
import MoneyText from '../../components/MoneyText';
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

export default function ContractsListScreen() {
  const { contracts, getPropertyById, getTenantById } = useData();
  const navigation = useNavigation<any>();

  const sorted = [...contracts].sort((a, b) => (a.startDate < b.startDate ? 1 : -1));

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Contratos</Text>
      </View>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="Sin contratos"
            message="Crea un contrato para vincular una propiedad con un inquilino."
          />
        }
        renderItem={({ item }) => {
          const property = getPropertyById(item.propertyId);
          const tenant = getTenantById(item.tenantId);
          return (
            <Card
              style={styles.card}
              onPress={() => navigation.navigate('ContractDetail', { contractId: item.id })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {property?.title ?? 'Propiedad'}
                </Text>
                <Badge label={CONTRACT_STATUS_LABEL[item.status]} tone={CONTRACT_TONE[item.status]} />
              </View>
              <Text style={styles.tenantText}>{tenant?.name ?? 'Inquilino'}</Text>
              <View style={styles.footerRow}>
                <Text style={styles.dateText}>
                  {formatDate(item.startDate)} - {formatDate(item.endDate)}
                </Text>
                <MoneyText amount={item.rentAmount} currency={item.currency} suffix="/mes" style={styles.rentText} />
              </View>
            </Card>
          );
        }}
      />
      <FAB onPress={() => navigation.navigate('ContractForm')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xxl * 2,
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
});
