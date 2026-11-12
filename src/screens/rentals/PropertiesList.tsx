// =====================================================================
// Lista de propiedades (pestaña Alquileres)
// ---------------------------------------------------------------------
// La cartera: cada propiedad con su tipo, barrio e inquilino, y a la derecha el alquiler por mes
// y hasta cuándo va el contrato (o "Disponible"). El puntito en el ícono avisa cómo viene el
// cobro, igual que en el Inicio. Arriba: buscador y "Filtrar y ordenar".
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import EmptyState from '../../components/EmptyState';
import FilterSortMenu, { MenuOption } from '../../components/FilterSortMenu';
import SearchLauncher from '../../components/SearchSheet';
import StatusDot from '../../components/StatusDot';
import { PROPERTY_TYPE_ICON } from '../../constants';
import { useData } from '../../context/DataContext';
import { makeStyles, useTheme } from '../../context/ThemeContext';
import { useRefresh } from '../../hooks/useRefresh';
import { fontSize, radius, spacing } from '../../theme';
import { formatMoney, parseLocalDate } from '../../utils/format';
import { contractEndBadge, PropertySummary } from '../../utils/propertySummary';
import { COLLECTION_DOT } from '../../utils/status';
import { compareTitles } from '../../utils/text';

// ── Filtros y orden ───────────────────────────────────────────────────

export type PropertyFilterKey = 'todas' | 'alquiladas' | 'disponibles' | 'mora';
export type PropertySortKey = 'nombre' | 'barrio' | 'alquiler' | 'fin';

export function matchesFilter(summary: PropertySummary, filter: PropertyFilterKey): boolean {
  if (filter === 'alquiladas') return Boolean(summary.activeContract);
  if (filter === 'disponibles') return !summary.activeContract;
  if (filter === 'mora') return summary.collection === 'deuda';
  return true;
}

const SORTS: MenuOption<PropertySortKey>[] = [
  { value: 'nombre', label: 'Nombre' },
  { value: 'barrio', label: 'Barrio' },
  { value: 'alquiler', label: 'Alquiler más alto primero' },
  { value: 'fin', label: 'Contrato que termina antes' },
];

// Las libres van al final cuando se ordena por alquiler o por fin de contrato.
export function sortSummaries(summaries: PropertySummary[], sort: PropertySortKey, toPesos: (s: PropertySummary) => number) {
  const byName = (a: PropertySummary, b: PropertySummary) => compareTitles(a.property.title, b.property.title);
  const compare: Record<PropertySortKey, (a: PropertySummary, b: PropertySummary) => number> = {
    nombre: byName,
    barrio: (a, b) => (a.property.neighborhood ?? '').localeCompare(b.property.neighborhood ?? '', 'es') || byName(a, b),
    alquiler: (a, b) => toPesos(b) - toPesos(a) || byName(a, b),
    fin: (a, b) =>
      (a.activeContract?.endDate ?? '9999').localeCompare(b.activeContract?.endDate ?? '9999') || byName(a, b),
  };
  return [...summaries].sort(compare[sort]);
}

const EMPTY_MESSAGE: Record<PropertyFilterKey, string> = {
  todas: 'Tocá + para agregar tu primera propiedad.',
  alquiladas: 'Ninguna propiedad tiene contrato vigente.',
  disponibles: 'Todas las propiedades están alquiladas.',
  mora: 'No hay propiedades con cargos vencidos.',
};

// Tipo en pocas letras, para que entre el inquilino en la misma línea.
const TYPE_SHORT: Record<PropertySummary['property']['type'], string> = {
  apartamento: 'Depto',
  casa: 'Casa',
  local: 'Local',
  oficina: 'Oficina',
  terreno: 'Terreno',
  otro: 'Otro',
};

// "Hasta 03/2028".
function monthYear(iso: string): string {
  const date = parseLocalDate(iso);
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

// ── Lista ─────────────────────────────────────────────────────────────

// En pantalla grande, "onSelect" muestra la ficha al costado en vez de abrir otra pantalla.
export default function PropertiesList({
  summaries,
  allSummaries,
  filter,
  onFilter,
  sort,
  onSort,
  onSelect,
  selectedId,
}: {
  // Las que se ven (ya filtradas y ordenadas) y todas (para contar cada filtro).
  summaries: PropertySummary[];
  allSummaries: PropertySummary[];
  filter: PropertyFilterKey;
  onFilter: (filter: PropertyFilterKey) => void;
  sort: PropertySortKey;
  onSort: (sort: PropertySortKey) => void;
  onSelect?: (id: string) => void;
  selectedId?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { properties } = useData();
  const { refreshing, onRefresh } = useRefresh();
  const count = (key: PropertyFilterKey) => allSummaries.filter((s) => matchesFilter(s, key)).length;
  const filters: MenuOption<PropertyFilterKey>[] = [
    { value: 'todas', label: 'Todas', count: count('todas') },
    { value: 'alquiladas', label: 'Alquiladas', dot: 'success', count: count('alquiladas') },
    { value: 'disponibles', label: 'Disponibles', dot: 'empty', count: count('disponibles') },
    { value: 'mora', label: 'Vencidas', dot: 'danger', count: count('mora') },
  ];

  // Lo de la derecha: alquiler por mes y hasta cuándo, o la situación si está libre.
  const rightOf = (s: PropertySummary): { main: string; sub?: string; mainColor: string; subColor?: string } => {
    if (s.collection === 'mantenimiento') return { main: 'En mantenimiento', mainColor: colors.textMuted };
    if (!s.activeContract) {
      const published = s.property.rentAmount ? `Publicada a ${formatMoney(s.property.rentAmount, s.property.rentCurrency)}` : undefined;
      return { main: 'Disponible', sub: published, mainColor: colors.primary };
    }
    const end = contractEndBadge(s.activeContract);
    return {
      main: `${formatMoney(s.activeContract.rentAmount, s.activeContract.currency)}/mes`,
      sub: end ? end.label.replace('Vence', 'Termina') : `Hasta ${monthYear(s.activeContract.endDate)}`,
      mainColor: colors.text,
      subColor: end ? (end.tone === 'danger' ? colors.danger : colors.warning) : undefined,
    };
  };

  // Debajo del nombre: tipo, barrio e inquilino (o la dirección si está libre).
  const subtitleOf = (s: PropertySummary) =>
    s.activeContract
      ? [TYPE_SHORT[s.property.type], s.property.neighborhood, s.tenant?.name].filter(Boolean).join(' · ')
      : [s.property.address, s.property.neighborhood].filter(Boolean).join(' · ');

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}
    >
      {properties.length ? (
        <View style={styles.tools}>
          <SearchLauncher scope="propiedades" style={styles.search} />
          <FilterSortMenu filters={filters} filter={filter} onFilter={onFilter} sorts={SORTS} sort={sort} onSort={onSort} />
        </View>
      ) : null}
      {summaries.length ? (
        <View style={styles.card}>
          {summaries.map((s, index) => {
            const right = rightOf(s);
            const selected = s.property.id === selectedId;
            return (
              <TouchableOpacity
                key={s.property.id}
                activeOpacity={0.6}
                style={[styles.row, index > 0 && styles.separator, selected && styles.rowSelected]}
                onPress={() =>
                  onSelect ? onSelect(s.property.id) : navigation.navigate('PropertyDetail', { propertyId: s.property.id })
                }
                accessibilityRole="button"
              >
                <View style={styles.square}>
                  <Ionicons name={PROPERTY_TYPE_ICON[s.property.type] ?? 'cube-outline'} size={20} color={colors.textMuted} />
                  <View style={styles.badge}>
                    <StatusDot tone={COLLECTION_DOT[s.collection]} size={10} />
                  </View>
                </View>
                <View style={styles.texts}>
                  <Text style={styles.title} numberOfLines={1}>
                    {s.property.title}
                  </Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {subtitleOf(s)}
                  </Text>
                </View>
                <View style={styles.value}>
                  <Text style={[styles.valueMain, { color: right.mainColor }]} numberOfLines={1}>
                    {right.main}
                  </Text>
                  {right.sub ? (
                    <Text style={[styles.valueSub, right.subColor ? { color: right.subColor, fontWeight: '600' } : null]}>
                      {right.sub}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  tools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  search: {
    flex: 1,
    marginHorizontal: 0,
    marginBottom: 0,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2,
    minHeight: 64,
  },
  rowSelected: {
    backgroundColor: colors.primaryMuted,
  },
  separator: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  square: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.neutralTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // El puntito de estado, apoyado en la esquina del ícono con un borde del color de la fila.
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    padding: 2,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: fontSize.lg - 1,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  value: {
    alignItems: 'flex-end',
    gap: 2,
    flexShrink: 1,
    maxWidth: '45%',
  },
  valueMain: {
    fontSize: fontSize.sm + 1,
    fontWeight: '600',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  valueSub: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'right',
  },
}));
