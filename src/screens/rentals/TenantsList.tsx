// =====================================================================
// Lista de inquilinos
// =====================================================================

import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import EmptyState from '../../components/EmptyState';
import ListRow from '../../components/ListRow';
import ListSection from '../../components/ListSection';
import SearchLauncher from '../../components/SearchSheet';
import { useData } from '../../context/DataContext';
import { makeStyles, useTheme } from '../../context/ThemeContext';
import { useRefresh } from '../../hooks/useRefresh';
import { spacing } from '../../theme';
import { summarizeProperty } from '../../utils/propertySummary';
import { compareTitles } from '../../utils/text';
import { COLLECTION_DOT } from '../../utils/status';

// ── Pantalla ──────────────────────────────────────────────────────────

// En pantalla grande, "onSelect" muestra la ficha al costado en vez de abrir otra pantalla.
export default function TenantsList({ onSelect, selectedId }: { onSelect?: (id: string) => void; selectedId?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { tenants, contracts, properties, chargeViews } = useData();
  const { refreshing, onRefresh } = useRefresh();
  const sorted = [...tenants].sort((a, b) => compareTitles(a.name, b.name));

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
    >
      {tenants.length ? <SearchLauncher scope="inquilinos" /> : null}
      {sorted.length ? (
        <View style={styles.body}>
          <ListSection>
            {sorted.map((tenant) => {
              // El punto del inquilino sigue el estado de cobro de la propiedad que alquila.
              const active = contracts.find((c) => c.tenantId === tenant.id && c.status === 'activo');
              const property = properties.find((p) => p.id === active?.propertyId);
              const summary = property ? summarizeProperty(property, contracts, chargeViews, tenants) : undefined;
              return (
                <ListRow
                  key={tenant.id}
                  dot={summary ? COLLECTION_DOT[summary.collection] : 'empty'}
                  title={tenant.name}
                  subtitle={tenant.phone || tenant.email || 'Sin datos de contacto'}
                  value={property ? property.title : 'Sin contrato'}
                  valueTone="muted"
                  selected={tenant.id === selectedId}
                  onPress={() => (onSelect ? onSelect(tenant.id) : navigation.navigate('TenantDetail', { tenantId: tenant.id }))}
                />
              );
            })}
          </ListSection>
        </View>
      ) : (
        <EmptyState icon="people-outline" title="Sin inquilinos" message="Tocá + para agregar tu primer inquilino." />
      )}
    </ScrollView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles(() => ({
  content: {
    paddingBottom: spacing.xxl,
  },
  body: {
    paddingHorizontal: spacing.lg,
  },
}));
