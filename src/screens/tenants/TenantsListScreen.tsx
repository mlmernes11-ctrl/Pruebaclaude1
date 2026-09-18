import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import FAB from '../../components/FAB';
import Screen from '../../components/Screen';
import { useData } from '../../context/DataContext';
import { colors, fontSize, radius, spacing } from '../../theme';

export default function TenantsListScreen() {
  const { tenants, contractsForTenant } = useData();
  const navigation = useNavigation<any>();

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Inquilinos</Text>
      </View>
      <FlatList
        data={tenants}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="Sin inquilinos"
            message="Agrega tu primer inquilino para vincularlo a un contrato."
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
                  {activeContracts.length} contrato(s) activo(s)
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Card>
          );
        }}
      />
      <FAB onPress={() => navigation.navigate('TenantForm')} />
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
});
