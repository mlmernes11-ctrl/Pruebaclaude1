// =====================================================================
// Pantalla: Alquileres
// ---------------------------------------------------------------------
// La cartera: una tarjeta por propiedad con su estado de pago, el alquiler, hasta cuándo va el
// contrato y el inquilino con su contacto. Buscador y "Filtrar y ordenar" arriba. Los contratos
// y los inquilinos viven dentro de cada propiedad; el buscador los encuentra igual.
// En pantalla grande: la lista a la izquierda y la ficha de la propiedad a la derecha.
// =====================================================================

import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import LargeTitleHeader from '../../components/LargeTitleHeader';
import Screen from '../../components/Screen';
import { useData } from '../../context/DataContext';
import { useExchangeRate } from '../../context/ExchangeRateContext';
import { makeStyles } from '../../context/ThemeContext';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { radius, spacing } from '../../theme';
import { PropertySummary, summarizeProperty } from '../../utils/propertySummary';
import { plural } from '../../utils/text';
import { PropertyDetail } from '../properties/PropertyDetailScreen';
import PropertiesList, { matchesFilter, PropertyFilterKey, PropertySortKey, sortSummaries } from './PropertiesList';

// ── Pantalla ──────────────────────────────────────────────────────────

export default function RentalsScreen() {
  const styles = useStyles();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const desktop = useIsDesktop();
  const { properties, contracts, chargeViews, tenants } = useData();
  const { toPesos } = useExchangeRate();
  const [filter, setFilter] = useState<PropertyFilterKey>('todas');
  const [sort, setSort] = useState<PropertySortKey>('nombre');
  const [selected, setSelected] = useState<string>();

  // El Inicio puede abrir la lista con un filtro (por ejemplo, las vencidas).
  useEffect(() => {
    const requested = route.params?.filter as PropertyFilterKey | undefined;
    if (requested) setFilter(requested);
  }, [route.params]);

  const all = properties.map((p) => summarizeProperty(p, contracts, chargeViews, tenants));
  const rentInPesos = (s: PropertySummary) =>
    s.activeContract ? (toPesos(s.activeContract.rentAmount, s.activeContract.currency) ?? 0) : -1;
  const visible = sortSummaries(all.filter((s) => matchesFilter(s, filter)), sort, rentInPesos);
  const rented = all.filter((s) => s.activeContract).length;
  // Pantalla grande: si no se eligió nada (o lo elegido ya no está en la lista), la primera.
  const selectedId = visible.some((s) => s.property.id === selected) ? selected : visible[0]?.property.id;

  const list = (
    <PropertiesList
      summaries={visible}
      allSummaries={all}
      filter={filter}
      onFilter={setFilter}
      sort={sort}
      onSort={setSort}
      onSelect={desktop ? setSelected : undefined}
      selectedId={desktop ? selectedId : undefined}
    />
  );

  return (
    <Screen topSafe>
      <LargeTitleHeader
        title="Alquileres"
        eyebrow={all.length ? `${plural(all.length, 'propiedad', 'propiedades')} · ${plural(rented, 'alquilada', 'alquiladas')}` : undefined}
        onAdd={() => navigation.navigate('PropertyForm')}
        addLabel="Nueva propiedad"
      />
      {desktop ? (
        <View style={styles.split}>
          <View style={styles.listColumn}>{list}</View>
          <View style={styles.detailPanel}>
            {selectedId ? <PropertyDetail key={selectedId} propertyId={selectedId} embedded /> : null}
          </View>
        </View>
      ) : (
        list
      )}
    </Screen>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
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
