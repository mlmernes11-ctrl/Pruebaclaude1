import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import LargeTitleHeader from '../../components/LargeTitleHeader';
import Screen from '../../components/Screen';
import SegmentedControl from '../../components/SegmentedControl';
import ContractsList from './ContractsList';
import PropertiesList from './PropertiesList';
import TenantsList from './TenantsList';

export type RentalsView = 'propiedades' | 'inquilinos' | 'contratos';

const VIEWS: { value: RentalsView; label: string; form: string; addLabel: string }[] = [
  { value: 'propiedades', label: 'Propiedades', form: 'PropertyForm', addLabel: 'Nueva propiedad' },
  { value: 'inquilinos', label: 'Inquilinos', form: 'TenantForm', addLabel: 'Nuevo inquilino' },
  { value: 'contratos', label: 'Contratos', form: 'ContractForm', addLabel: 'Nuevo contrato' },
];

// Properties, tenants and contracts share one tab; "+" creates whatever the current view lists.
export default function RentalsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const [view, setView] = useState<RentalsView>('propiedades');
  const current = VIEWS.find((v) => v.value === view)!;

  // The dashboard can open a specific view (e.g. "Ver todas").
  useEffect(() => {
    const requested = route.params?.view as RentalsView | undefined;
    if (requested) setView(requested);
  }, [route.params]);

  return (
    <Screen>
      <LargeTitleHeader title="Alquileres" onAdd={() => navigation.navigate(current.form)} addLabel={current.addLabel} />
      <SegmentedControl options={VIEWS} value={view} onChange={setView} />
      {view === 'propiedades' ? <PropertiesList /> : null}
      {view === 'inquilinos' ? <TenantsList /> : null}
      {view === 'contratos' ? <ContractsList /> : null}
    </Screen>
  );
}
