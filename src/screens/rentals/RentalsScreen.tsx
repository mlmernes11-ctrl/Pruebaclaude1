import { useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Screen from '../../components/Screen';
import SegmentedControl from '../../components/SegmentedControl';
import { makeStyles } from '../../context/ThemeContext';
import { fontSize, spacing } from '../../theme';
import ContractsList from './ContractsList';
import PropertiesList from './PropertiesList';
import TenantsList from './TenantsList';

export type RentalsView = 'propiedades' | 'inquilinos' | 'contratos';

const VIEWS: { value: RentalsView; label: string }[] = [
  { value: 'propiedades', label: 'Propiedades' },
  { value: 'inquilinos', label: 'Inquilinos' },
  { value: 'contratos', label: 'Contratos' },
];

// Properties, tenants and contracts share one tab; each view keeps its own search and + button.
export default function RentalsScreen() {
  const styles = useStyles();
  const route = useRoute<any>();
  const [view, setView] = useState<RentalsView>('propiedades');

  // The dashboard can open a specific view (e.g. "Contratos activos").
  useEffect(() => {
    const requested = route.params?.view as RentalsView | undefined;
    if (requested) setView(requested);
  }, [route.params]);

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Alquileres</Text>
      </View>
      <SegmentedControl options={VIEWS} value={view} onChange={setView} />
      {view === 'propiedades' ? <PropertiesList /> : null}
      {view === 'inquilinos' ? <TenantsList /> : null}
      {view === 'contratos' ? <ContractsList /> : null}
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
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
}));
