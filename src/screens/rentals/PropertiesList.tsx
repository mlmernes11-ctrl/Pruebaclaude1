// =====================================================================
// Lista de propiedades (pestaña Alquileres)
// ---------------------------------------------------------------------
// La cartera, una tarjeta por propiedad. Arriba: tipo, barrio, cómo viene el pago (debe, vence,
// al día), el alquiler por mes y hasta cuándo va el contrato (o "Disponible"). Abajo: el
// inquilino con WhatsApp y llamada a un toque. Arriba de todo: buscador y "Filtrar y ordenar".
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Linking, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import FilterSortMenu, { MenuOption } from '../../components/FilterSortMenu';
import SearchLauncher from '../../components/SearchSheet';
import { PROPERTY_TYPE_ICON } from '../../constants';
import { useData } from '../../context/DataContext';
import { makeStyles, useTheme } from '../../context/ThemeContext';
import { useRefresh } from '../../hooks/useRefresh';
import { fontSize, radius, spacing } from '../../theme';
import { formatMoney, parseLocalDate } from '../../utils/format';
import { contractEndBadge, PropertySummary } from '../../utils/propertySummary';
import { collectionBadge } from '../../utils/status';
import { compareTitles, initials } from '../../utils/text';
import { debtReminderText, openWhatsapp } from '../../utils/whatsapp';

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
  const { properties, chargeViews, today } = useData();
  const { refreshing, onRefresh } = useRefresh();
  const count = (key: PropertyFilterKey) => allSummaries.filter((s) => matchesFilter(s, key)).length;
  const filters: MenuOption<PropertyFilterKey>[] = [
    { value: 'todas', label: 'Todas', count: count('todas') },
    { value: 'alquiladas', label: 'Alquiladas', dot: 'success', count: count('alquiladas') },
    { value: 'disponibles', label: 'Disponibles', dot: 'empty', count: count('disponibles') },
    { value: 'mora', label: 'Vencidas', dot: 'danger', count: count('mora') },
  ];
  const activeFilter = filter !== 'todas' ? filters.find((f) => f.value === filter) : undefined;

  // Lo de la derecha: alquiler por mes y hasta cuándo, o la situación si está libre.
  const rightOf = (s: PropertySummary): { main: string; sub?: string; mainColor: string; subColor?: string } => {
    // Sin contrato, la etiqueta ya dice "Disponible" o "En mantenimiento": acá va el precio publicado.
    if (!s.activeContract) {
      return {
        main: s.property.rentAmount ? `${formatMoney(s.property.rentAmount, s.property.rentCurrency)}/mes` : 'Sin precio publicado',
        sub: s.collection === 'mantenimiento' ? undefined : 'Sin contrato',
        mainColor: s.property.rentAmount ? colors.text : colors.textMuted,
      };
    }
    const end = contractEndBadge(s.activeContract);
    return {
      main: `${formatMoney(s.activeContract.rentAmount, s.activeContract.currency)}/mes`,
      sub: end ? end.label.replace('Vence', 'Termina') : `Hasta ${monthYear(s.activeContract.endDate)}`,
      mainColor: colors.text,
      subColor: end ? (end.tone === 'danger' ? colors.danger : colors.warning) : undefined,
    };
  };

  // Si debe, el WhatsApp sale con el detalle de la deuda ya escrito.
  const whatsappText = (s: PropertySummary) => {
    if (s.collection !== 'deuda' || !s.activeContract) return undefined;
    const owed = chargeViews.filter((v) => v.charge.contractId === s.activeContract?.id && v.status !== 'pagado');
    return debtReminderText(s.tenant, s.property, owed);
  };

  // Debajo del nombre: tipo y barrio (y la dirección si está libre).
  const subtitleOf = (s: PropertySummary) =>
    s.activeContract
      ? [TYPE_SHORT[s.property.type], s.property.neighborhood].filter(Boolean).join(' · ')
      : [TYPE_SHORT[s.property.type], s.property.address, s.property.neighborhood].filter(Boolean).join(' · ');

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
      {/* Si hay un filtro puesto (a mano o desde Inicio), se ve y se quita de un toque. */}
      {activeFilter ? (
        <TouchableOpacity
          style={styles.filterChip}
          onPress={() => onFilter('todas')}
          accessibilityRole="button"
          accessibilityLabel={`Quitar el filtro ${activeFilter.label}`}
        >
          <Text style={styles.filterChipText}>
            Solo {activeFilter.label.toLowerCase()} · {summaries.length}
          </Text>
          <Ionicons name="close-circle" size={16} color={colors.primary} />
        </TouchableOpacity>
      ) : null}
      {summaries.length ? (
        <View style={styles.list}>
          {summaries.map((s) => {
            const right = rightOf(s);
            const badge = collectionBadge(s, today);
            const selected = s.property.id === selectedId;
            const tenant = s.activeContract ? s.tenant : undefined;
            const phone = tenant?.phone?.trim();
            return (
              <View key={s.property.id} style={[styles.card, selected && styles.cardSelected]}>
                <TouchableOpacity
                  activeOpacity={0.6}
                  style={styles.top}
                  onPress={() =>
                    onSelect ? onSelect(s.property.id) : navigation.navigate('PropertyDetail', { propertyId: s.property.id })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`${s.property.title}, ${badge.label}`}
                >
                  <View style={styles.photo}>
                    <Ionicons name={PROPERTY_TYPE_ICON[s.property.type] ?? 'cube-outline'} size={26} color={colors.primary} />
                  </View>
                  <View style={styles.texts}>
                    <View style={styles.line}>
                      <Text style={styles.title} numberOfLines={1}>
                        {s.property.title}
                      </Text>
                      <Badge label={badge.label} tone={badge.tone} />
                    </View>
                    <Text style={styles.subtitle} numberOfLines={1}>
                      {subtitleOf(s)}
                    </Text>
                    <View style={[styles.line, styles.money]}>
                      <Text style={[styles.valueMain, { color: right.mainColor }]} numberOfLines={1}>
                        {right.main}
                      </Text>
                      {right.sub ? (
                        <Text
                          style={[styles.valueSub, right.subColor ? { color: right.subColor, fontWeight: '600' } : null]}
                          numberOfLines={1}
                        >
                          {right.sub}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
                {tenant ? (
                  <View style={styles.tenant}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials(tenant.name)}</Text>
                    </View>
                    <Text style={styles.tenantName} numberOfLines={1}>
                      {tenant.name}
                    </Text>
                    <TouchableOpacity
                      style={[styles.contact, { backgroundColor: colors.successMuted }]}
                      onPress={() => openWhatsapp(phone, whatsappText(s))}
                      accessibilityRole="button"
                      accessibilityLabel={
                        s.collection === 'deuda' ? `Recordarle la deuda a ${tenant.name} por WhatsApp` : `Escribirle a ${tenant.name} por WhatsApp`
                      }
                    >
                      <Ionicons name="logo-whatsapp" size={18} color={colors.success} />
                    </TouchableOpacity>
                    {phone ? (
                      <TouchableOpacity
                        style={[styles.contact, { backgroundColor: colors.primaryMuted }]}
                        onPress={() => Linking.openURL(`tel:${phone}`).catch(() => undefined)}
                        accessibilityRole="button"
                        accessibilityLabel={`Llamar a ${tenant.name}`}
                      >
                        <Ionicons name="call-outline" size={18} color={colors.primary} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
              </View>
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
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 32,
    borderRadius: radius.round,
    backgroundColor: colors.primaryMuted,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  search: {
    flex: 1,
    marginHorizontal: 0,
    marginBottom: 0,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: colors.primary,
  },
  top: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  // Lugar de la foto: por ahora, el ícono del tipo de propiedad.
  photo: {
    width: 58,
    height: 58,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  money: {
    alignItems: 'baseline',
    marginTop: 2,
  },
  title: {
    flexShrink: 1,
    fontSize: fontSize.lg - 1,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  valueMain: {
    flexShrink: 1,
    fontSize: fontSize.md,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  valueSub: {
    flexShrink: 0,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  tenant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.primary,
  },
  tenantName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  contact: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
