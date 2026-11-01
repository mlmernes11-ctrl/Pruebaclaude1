import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Badge from '../../components/Badge';
import Card from '../../components/Card';
import EmptyState from '../../components/EmptyState';
import FAB from '../../components/FAB';
import MoneyText from '../../components/MoneyText';
import Screen from '../../components/Screen';
import { PROPERTY_STATUS_LABEL, PROPERTY_TYPE_LABEL } from '../../constants';
import { useData } from '../../context/DataContext';
import { colors, fontSize, spacing } from '../../theme';

const STATUS_TONE = {
  disponible: 'primary',
  alquilada: 'success',
  mantenimiento: 'warning',
} as const;

export default function PropertiesListScreen() {
  const { properties } = useData();
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');

  const filtered = properties.filter((p) =>
    `${p.title} ${p.address}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Propiedades</Text>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="business-outline"
            title="Sin propiedades"
            message="Agrega tu primera propiedad para comenzar a gestionar alquileres."
          />
        }
        renderItem={({ item }) => (
          <Card
            style={styles.card}
            onPress={() => navigation.navigate('PropertyDetail', { propertyId: item.id })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Badge label={PROPERTY_STATUS_LABEL[item.status]} tone={STATUS_TONE[item.status]} />
            </View>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={14} color={colors.textMuted} />
              <Text style={styles.address} numberOfLines={1}>
                {item.address}
              </Text>
            </View>
            <View style={styles.footerRow}>
              <Text style={styles.typeText}>{PROPERTY_TYPE_LABEL[item.type]}</Text>
              <MoneyText amount={item.rentAmount} currency={item.rentCurrency} suffix="/mes" style={styles.rentText} />
            </View>
          </Card>
        )}
      />
      <FAB onPress={() => navigation.navigate('PropertyForm')} />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  address: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  typeText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  rentText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.primary,
  },
});
