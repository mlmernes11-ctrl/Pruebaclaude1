// =====================================================================
// Pantalla: Alquileres
// ---------------------------------------------------------------------
// Pestaña con tres vistas: propiedades, inquilinos y contratos.
// =====================================================================

import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import LargeTitleHeader from '../../components/LargeTitleHeader';
import Screen from '../../components/Screen';
import { useData } from '../../context/DataContext';
import { makeStyles } from '../../context/ThemeContext';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { radius, spacing } from '../../theme';
import { compareTitles } from '../../utils/text';
import { ContractDetail } from '../contracts/ContractDetailScreen';
import { PropertyDetail } from '../properties/PropertyDetailScreen';
import { TenantDetail } from '../tenants/TenantDetailScreen';
import SegmentedControl from '../../components/SegmentedControl';
import ContractsList from './ContractsList';
import PropertiesList from './PropertiesList';
import TenantsList from './TenantsList';

// ── Constantes y funciones auxiliares ─────────────────────────────────

export type RentalsView = 'propiedades' | 'inquilinos' | 'contratos';

const VIEWS: { value: RentalsView; label: string; form: string; addLabel: string }[] = [
  { value: 'propiedades', label: 'Propiedades', form: 'PropertyForm', addLabel: 'Nueva propiedad' },
  { value: 'inquilinos', label: 'Inquilinos', form: 'TenantForm', addLabel: 'Nuevo inquilino' },
  { value: 'contratos', label: 'Contratos', form: 'ContractForm', addLabel: 'Nuevo contrato' },
];

// ── Pantalla ──────────────────────────────────────────────────────────

// Propiedades, inquilinos y contratos comparten pestaña; "+" crea lo que muestra la vista actual.
export default function RentalsScreen() {
  const styles = useStyles();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const [view, setView] = useState<RentalsView>('propiedades');
  const current = VIEWS.find((v) => v.value === view)!;

  // El Inicio puede abrir una vista en particular (por ejemplo "Ver todas").
  useEffect(() => {
    const requested = route.params?.view as RentalsView | undefined;
    if (requested) setView(requested);
  }, [route.params]);

  // — Pantalla grande: lista a la izquierda y ficha de lo elegido a la derecha —
  const desktop = useIsDesktop();
  const { properties, tenants, contracts } = useData();
  const [selected, setSelected] = useState<Record<RentalsView, string | undefined>>({
    propiedades: undefined,
    inquilinos: undefined,
    contratos: undefined,
  });
  // Si no se eligió nada (o lo elegido se borró), se muestra el primero de la lista.
  const firstId = {
    propiedades: [...properties].sort((a, b) => compareTitles(a.title, b.title))[0]?.id,
    inquilinos: [...tenants].sort((a, b) => compareTitles(a.name, b.name))[0]?.id,
    // Mismo orden que la lista: primero los activos, después por carpeta.
    contratos: [...contracts].sort(
      (a, b) =>
        Number(b.status === 'activo') - Number(a.status === 'activo') ||
        compareTitles(
          properties.find((p) => p.id === a.propertyId)?.title ?? '',
          properties.find((p) => p.id === b.propertyId)?.title ?? '',
        ),
    )[0]?.id,
  }[view];
  const exists = {
    propiedades: properties.some((p) => p.id === selected.propiedades),
    inquilinos: tenants.some((t) => t.id === selected.inquilinos),
    contratos: contracts.some((c) => c.id === selected.contratos),
  }[view];
  const selectedId = exists ? selected[view] : firstId;
  const select = (id: string) => setSelected((prev) => ({ ...prev, [view]: id }));
  const listProps = desktop ? { onSelect: select, selectedId } : {};

  const list = (
    <>
      {view === 'propiedades' ? <PropertiesList {...listProps} /> : null}
      {view === 'inquilinos' ? <TenantsList {...listProps} /> : null}
      {view === 'contratos' ? <ContractsList {...listProps} /> : null}
    </>
  );

  return (
    <Screen topSafe>
      <LargeTitleHeader
        title="Alquileres"
        onAdd={() => navigation.navigate(current.form)}
        addLabel={current.addLabel}
        middle={desktop ? <SegmentedControl options={VIEWS} value={view} onChange={setView} style={styles.segmentInline} /> : null}
      />
      {desktop ? null : <SegmentedControl options={VIEWS} value={view} onChange={setView} />}
      {desktop ? (
        <View style={styles.split}>
          <View style={styles.listColumn}>{list}</View>
          <View style={styles.detailPanel}>
            {selectedId && view === 'propiedades' ? <PropertyDetail key={selectedId} propertyId={selectedId} embedded /> : null}
            {selectedId && view === 'inquilinos' ? <TenantDetail key={selectedId} tenantId={selectedId} embedded /> : null}
            {selectedId && view === 'contratos' ? <ContractDetail key={selectedId} contractId={selectedId} embedded /> : null}
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
  segmentInline: {
    marginHorizontal: 0,
    marginBottom: 0,
    width: 380,
  },
  split: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.lg,
  },
  listColumn: {
    width: 380,
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
