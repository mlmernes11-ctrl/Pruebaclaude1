import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import EmptyState from '../../components/EmptyState';
import ListRow from '../../components/ListRow';
import ListSection from '../../components/ListSection';
import SearchLauncher from '../../components/SearchSheet';
import { CONTRACT_STATUS_LABEL } from '../../constants';
import { useData } from '../../context/DataContext';
import { makeStyles, useTheme } from '../../context/ThemeContext';
import { useRefresh } from '../../hooks/useRefresh';
import { spacing } from '../../theme';
import { formatDate, formatMoney } from '../../utils/format';
import { contractEndBadge } from '../../utils/propertySummary';
import { contractDot } from '../../utils/status';
import { compareTitles } from '../../utils/text';

export default function ContractsList() {
  const styles = useStyles();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { contracts, getPropertyById, getTenantById } = useData();
  const { refreshing, onRefresh } = useRefresh();

  // Active contracts first, then by carpeta.
  const sorted = [...contracts].sort(
    (a, b) =>
      Number(b.status === 'activo') - Number(a.status === 'activo') ||
      compareTitles(getPropertyById(a.propertyId)?.title ?? '', getPropertyById(b.propertyId)?.title ?? ''),
  );

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
    >
      {contracts.length ? <SearchLauncher scope="contratos" /> : null}
      {sorted.length ? (
        <View style={styles.body}>
          <ListSection>
            {sorted.map((contract) => {
              const end = contractEndBadge(contract);
              const term =
                contract.status !== 'activo'
                  ? CONTRACT_STATUS_LABEL[contract.status]
                  : end
                    ? end.label
                    : `Hasta ${formatDate(contract.endDate)}`;
              return (
                <ListRow
                  key={contract.id}
                  dot={contractDot(contract)}
                  title={getPropertyById(contract.propertyId)?.title ?? 'Propiedad'}
                  subtitle={`${getTenantById(contract.tenantId)?.name ?? 'Inquilino'} · ${term}`}
                  value={`${formatMoney(contract.rentAmount, contract.currency)}/mes`}
                  valueTone="muted"
                  onPress={() => navigation.navigate('ContractDetail', { contractId: contract.id })}
                />
              );
            })}
          </ListSection>
        </View>
      ) : (
        <EmptyState
          icon="document-text-outline"
          title="Sin contratos"
          message="Tocá + para vincular una propiedad con un inquilino."
        />
      )}
    </ScrollView>
  );
}

const useStyles = makeStyles(() => ({
  content: {
    paddingBottom: spacing.xxl,
  },
  body: {
    paddingHorizontal: spacing.lg,
  },
}));
