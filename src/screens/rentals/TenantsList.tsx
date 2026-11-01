import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { FlatList, Text, View } from 'react-native';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import SearchLauncher from '../../components/SearchSheet';
import { useData } from '../../context/DataContext';
import { compareTitles } from '../../utils/text';
import FAB, { FAB_CLEARANCE } from '../../components/FAB';
import { fontSize, radius, spacing } from '../../theme';
import { makeStyles, useTheme } from '../../context/ThemeContext';

export default function TenantsList() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { tenants, contractsForTenant } = useData();
  const navigation = useNavigation<any>();
  const sorted = [...tenants].sort((a, b) => compareTitles(a.name, b.name));

  return (
    <>
      {tenants.length ? <SearchLauncher scope="inquilinos" /> : null}
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="Sin inquilinos"
            message="Agregá tu primer inquilino para vincularlo a un contrato."
          />
        }
        renderItem={({ item }) => {
          const activeContracts = contractsForTenant(item.id).filter((c) => c.status === 'activo');
          return (
            <Card
              style={styles.card}
              onPress={() => navigation.navigate('TenantDetail', { tenantId: item.id })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                {item.phone ? (
                  <View style={styles.row}>
                    <Ionicons name="call-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.rowText}>{item.phone}</Text>
                  </View>
                ) : null}
                <Text style={styles.contractsText}>
                  {activeContracts.length === 0
                    ? 'Sin contrato activo'
                    : activeContracts.length === 1
                      ? '1 contrato activo'
                      : `${activeContracts.length} contratos activos`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Card>
          );
        }}
      />
      <FAB onPress={() => navigation.navigate('TenantForm')} />
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.round,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.primary,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  rowText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  contractsText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
}));
