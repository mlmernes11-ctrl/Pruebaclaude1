// =====================================================================
// Pantalla: Alquileres
// ---------------------------------------------------------------------
// Una sola lista: cada propiedad con su contrato vigente (inquilino y hasta cuándo) y cómo
// viene el cobro. Filtros arriba (Todas · Alquiladas · Disponibles · En mora). Los contratos y
// los inquilinos viven dentro de cada propiedad; el buscador los encuentra igual.
// En pantalla grande: la lista a la izquierda y la ficha de la propiedad a la derecha.
// =====================================================================

import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import LargeTitleHeader from '../../components/LargeTitleHeader';
import Screen from '../../components/Screen';
import SegmentedControl from '../../components/SegmentedControl';
import { useData } from '../../context/DataContext';
import { makeStyles } from '../../context/ThemeContext';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { radius, spacing } from '../../theme';
import { summarizeProperty } from '../../utils/propertySummary';
import { compareTitles } from '../../utils/text';
import { PropertyDetail } from '../properties/PropertyDetailScreen';
import PropertiesList, { PropertyFilterKey, matchesFilter } from './PropertiesList';

// ── Constantes ────────────────────────────────────────────────────────

const FILTERS: { value: PropertyFilterKey; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'alquiladas', label: 'Alquiladas' },
  { value: 'disponibles', label: 'Disponibles' },
  { value: 'mora', label: 'En mora' },
];

// ── Pantalla ──────────────────────────────────────────────────────────

export default function RentalsScreen() {
  const styles = useStyles();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const desktop = useIsDesktop();
  const { properties, contracts, chargeViews, tenants } = useData();
  const [filter, setFilter] = useState<PropertyFilterKey>('todas');
  const [selected, setSelected] = useState<string>();

  // El Inicio puede abrir la lista con un filtro (por ejemplo "Ver todas").
  useEffect(() => {
    const requested = route.params?.filter as PropertyFilterKey | undefined;
    if (requested) setFilter(requested);
  }, [route.params]);

  // Pantalla grande: si no se eligió nada (o lo elegido ya no está en la lista), la primera.
  const visible = [...properties]
    .sort((a, b) => compareTitles(a.title, b.title))
    .filter((p) => matchesFilter(summarizeProperty(p, contracts, chargeViews, tenants), filter));
  const selectedId = visible.some((p) => p.id === selected) ? selected : visible[0]?.id;

  const filters = (
    <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} style={desktop ? styles.segmentInline : undefined} />
  );

  return (
    <Screen topSafe>
      <LargeTitleHeader
        title="Alquileres"
        onAdd={() => navigation.navigate('PropertyForm')}
        addLabel="Nueva propiedad"
        middle={desktop ? filters : null}
      />
      {desktop ? null : filters}
      {desktop ? (
        <View style={styles.split}>
          <View style={styles.listColumn}>
            <PropertiesList filter={filter} onSelect={setSelected} selectedId={selectedId} />
          </View>
          <View style={styles.detailPanel}>
            {selectedId ? <PropertyDetail key={selectedId} propertyId={selectedId} embedded /> : null}
          </View>
        </View>
      ) : (
        <PropertiesList filter={filter} />
      )}
    </Screen>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  segmentInline: {
    marginHorizontal: 0,
    marginBottom: 0,
    width: 420,
  },
  split: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.lg,
  },
  listColumn: {
    width: 400,
  },
  detailPanel: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
}));
