// =====================================================================
// Lista de propiedades (pestaña Alquileres)
// ---------------------------------------------------------------------
// Cada propiedad con su punto de color, el inquilino del contrato vigente y hasta cuándo, y a
// la derecha lo que debe o el alquiler. Se puede filtrar por alquiladas, disponibles o en mora.
// =====================================================================

import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import EmptyState from '../../components/EmptyState';
import ListRow, { ValueTone } from '../../components/ListRow';
import ListSection from '../../components/ListSection';
import SearchLauncher from '../../components/SearchSheet';
import StatusDot, { DotTone } from '../../components/StatusDot';
import { useData } from '../../context/DataContext';
import { makeStyles, useTheme } from '../../context/ThemeContext';
import { useRefresh } from '../../hooks/useRefresh';
import { fontSize, spacing } from '../../theme';
import { formatDate, formatMoney, formatTotals } from '../../utils/format';
import { contractEndBadge, PropertySummary, summarizeProperty } from '../../utils/propertySummary';
import { COLLECTION_DOT } from '../../utils/status';
import { compareTitles } from '../../utils/text';

// ── Filtros ───────────────────────────────────────────────────────────

export type PropertyFilterKey = 'todas' | 'alquiladas' | 'disponibles' | 'mora';

export function matchesFilter(summary: PropertySummary, filter: PropertyFilterKey): boolean {
  if (filter === 'alquiladas') return Boolean(summary.activeContract);
  if (filter === 'disponibles') return !summary.activeContract;
  if (filter === 'mora') return summary.collection === 'deuda';
  return true;
}

const EMPTY_MESSAGE: Record<PropertyFilterKey, string> = {
  todas: 'Tocá + para agregar tu primera propiedad.',
  alquiladas: 'Ninguna propiedad tiene contrato vigente.',
  disponibles: 'Todas las propiedades están alquiladas.',
  mora: 'No hay propiedades en mora.',
};

const LEGEND: { tone: DotTone; label: string }[] = [
  { tone: 'danger', label: 'En mora' },
  { tone: 'warning', label: 'A vencer' },
  { tone: 'success', label: 'Al día' },
  { tone: 'empty', label: 'Disponible' },
];

// Rojo = saldo vencido; gris = dato de referencia (el alquiler o la situación de la propiedad).
function rightValue(summary: PropertySummary): { value: string; tone: ValueTone } {
  const { activeContract, collection, overdue } = summary;
  if (collection === 'deuda') return { value: formatTotals(overdue.totals), tone: 'danger' };
  if (collection === 'sin-contrato') return { value: 'Disponible', tone: 'primary' };
  if (collection === 'mantenimiento') return { value: 'En mantenimiento', tone: 'muted' };
  if (!activeContract) return { value: '', tone: 'muted' };
  return { value: `${formatMoney(activeContract.rentAmount, activeContract.currency)}/mes`, tone: 'muted' };
}

// Debajo del nombre: el inquilino y hasta cuándo (o la dirección si está libre).
function subtitleFor(summary: PropertySummary): string {
  const { property, activeContract, tenant } = summary;
  if (!activeContract) return [property.address, property.neighborhood].filter(Boolean).join(' · ');
  const end = contractEndBadge(activeContract);
  const until = end ? end.label.toLowerCase() : `hasta ${formatDate(activeContract.endDate)}`;
  return `${tenant?.name ?? 'Inquilino'} · ${until}`;
}

// ── Lista ─────────────────────────────────────────────────────────────

// En pantalla grande, "onSelect" muestra la ficha al costado en vez de abrir otra pantalla.
export default function PropertiesList({
  filter,
  onSelect,
  selectedId,
}: {
  filter: PropertyFilterKey;
  onSelect?: (id: string) => void;
  selectedId?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { properties, contracts, chargeViews, tenants } = useData();
  const { refreshing, onRefresh } = useRefresh();
  const summaries = [...properties]
    .sort((a, b) => compareTitles(a.title, b.title))
    .map((p) => summarizeProperty(p, contracts, chargeViews, tenants))
    .filter((s) => matchesFilter(s, filter));

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
    >
      {properties.length ? <SearchLauncher scope="propiedades" /> : null}
      {summaries.length ? (
        <View style={styles.body}>
          <ListSection
            footer={
              <View style={styles.legend}>
                {LEGEND.map((item) => (
                  <View key={item.label} style={styles.legendItem}>
                    <StatusDot tone={item.tone} size={8} />
                    <Text style={styles.legendText}>{item.label}</Text>
                  </View>
                ))}
              </View>
            }
          >
            {summaries.map((summary) => {
              const { value, tone } = rightValue(summary);
              const { property } = summary;
              return (
                <ListRow
                  key={property.id}
                  dot={COLLECTION_DOT[summary.collection]}
                  title={property.title}
                  subtitle={subtitleFor(summary)}
                  value={value}
                  valueTone={tone}
                  selected={property.id === selectedId}
                  onPress={() =>
                    onSelect ? onSelect(property.id) : navigation.navigate('PropertyDetail', { propertyId: property.id })
                  }
                />
              );
            })}
          </ListSection>
        </View>
      ) : (
        <EmptyState icon="business-outline" title="Sin propiedades" message={EMPTY_MESSAGE[filter]} />
      )}
    </ScrollView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  content: {
    paddingBottom: spacing.xxl,
  },
  body: {
    paddingHorizontal: spacing.lg,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    rowGap: 6,
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
}));
