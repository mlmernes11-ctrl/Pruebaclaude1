// =====================================================================
// Pantalla: Alquileres
// ---------------------------------------------------------------------
// La cartera: una tarjeta por propiedad con su estado de pago, el alquiler, hasta cuándo va el
// contrato y el inquilino con su contacto. Buscador y "Filtrar y ordenar" arriba. Los contratos
// y los inquilinos viven dentro de cada propiedad; el buscador los encuentra igual.
// =====================================================================

import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import LargeTitleHeader from '../../components/LargeTitleHeader';
import Screen from '../../components/Screen';
import { useData } from '../../context/DataContext';
import { useExchangeRate } from '../../context/ExchangeRateContext';
import { PropertySummary, summarizeProperty } from '../../utils/propertySummary';
import { plural } from '../../utils/text';
import PropertiesList, { matchesFilter, PropertyFilterKey, PropertySortKey, sortSummaries } from './PropertiesList';

// ── Pantalla ──────────────────────────────────────────────────────────

export default function RentalsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { properties, contracts, chargeViews, tenants } = useData();
  const { toPesos } = useExchangeRate();
  const [filter, setFilter] = useState<PropertyFilterKey>('todas');
  const [sort, setSort] = useState<PropertySortKey>('nombre');

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

  const list = (
    <PropertiesList
      summaries={visible}
      allSummaries={all}
      filter={filter}
      onFilter={setFilter}
      sort={sort}
      onSort={setSort}
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
      {list}
    </Screen>
  );
}
