import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CONTRACT_STATUS_LABEL,
  CONTRACT_STATUS_TONE,
  PROPERTY_STATUS_LABEL,
  PROPERTY_STATUS_TONE,
  PROPERTY_TYPE_LABEL,
} from '../constants';
import { useData } from '../context/DataContext';
import { pushBackHandler } from '../navigation/browserBack';
import { colors, fontSize, radius, spacing } from '../theme';
import { formatDate } from '../utils/format';
import { FieldMatch, matchFields, SearchField, searchWords } from '../utils/search';
import Badge, { BadgeTone } from './Badge';
import HighlightText from './HighlightText';

export type SearchScope = 'propiedades' | 'inquilinos' | 'contratos';
type ScopeFilter = 'todo' | SearchScope;

const SCOPE_LABEL: Record<SearchScope, string> = {
  propiedades: 'Propiedades',
  inquilinos: 'Inquilinos',
  contratos: 'Contratos',
};

const SCOPE_ICON: Record<SearchScope, keyof typeof Ionicons.glyphMap> = {
  propiedades: 'business-outline',
  inquilinos: 'person-outline',
  contratos: 'document-text-outline',
};

const PLACEHOLDER: Record<SearchScope, string> = {
  propiedades: 'Buscar carpeta, calle, barrio, inquilino…',
  inquilinos: 'Buscar nombre, teléfono, DNI, carpeta…',
  contratos: 'Buscar carpeta, inquilino, calle, estado…',
};

interface SearchRecord {
  key: string;
  scope: SearchScope;
  fields: SearchField[];
  // Field indexes shown as the title and the subtitle; other matches are listed below.
  titleFields: number[];
  subtitleFields: number[];
  badge?: { label: string; tone: BadgeTone };
  open: () => void;
}

interface SearchResult {
  record: SearchRecord;
  matches: FieldMatch[];
}

const byTitle = (a: string, b: string) => a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });

// Search bar for list screens: tapping it slides up a full-screen search over everything.
export default function SearchLauncher({ scope }: { scope: SearchScope }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <TouchableOpacity
        style={styles.launcher}
        onPress={() => setOpen(true)}
        accessibilityRole="search"
        accessibilityLabel="Buscar"
      >
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <Text style={styles.launcherText} numberOfLines={1}>
          {PLACEHOLDER[scope]}
        </Text>
      </TouchableOpacity>
      {open ? <SearchSheet scope={scope} onClose={close} /> : null}
    </>
  );
}

function SearchSheet({ scope, onClose }: { scope: SearchScope; onClose: () => void }) {
  const navigation = useNavigation<any>();
  const { properties, tenants, contracts, getPropertyById, getTenantById } = useData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ScopeFilter>('todo');

  // The browser back button closes the sheet instead of leaving the screen.
  useEffect(() => pushBackHandler(onClose), [onClose]);

  const records = useMemo<SearchRecord[]>(() => {
    const go = (tab: string, screen: string, params: object) => () => {
      onClose();
      navigation.navigate(tab, { screen, params, initial: false });
    };

    const propertyRecords = properties.map<SearchRecord>((property) => {
      const active = contracts.find((c) => c.propertyId === property.id && c.status === 'activo');
      const tenant = getTenantById(active?.tenantId);
      return {
        key: `p-${property.id}`,
        scope: 'propiedades',
        fields: [
          { label: 'Carpeta', value: property.title },
          { label: 'Dirección', value: property.address },
          { label: 'Barrio', value: property.neighborhood },
          { label: 'Inquilino', value: tenant?.name },
          { label: 'Teléfono', value: tenant?.phone, digits: true },
          { label: 'Tipo', value: PROPERTY_TYPE_LABEL[property.type] },
          { label: 'Estado', value: PROPERTY_STATUS_LABEL[property.status] },
          { label: 'Notas', value: property.notes },
        ],
        titleFields: [0],
        subtitleFields: [1, 2],
        badge: { label: PROPERTY_STATUS_LABEL[property.status], tone: PROPERTY_STATUS_TONE[property.status] },
        open: go('PropertiesTab', 'PropertyDetail', { propertyId: property.id }),
      };
    });

    const tenantRecords = tenants.map<SearchRecord>((tenant) => {
      const own = contracts.filter((c) => c.tenantId === tenant.id);
      const ownProperties = own.map((c) => getPropertyById(c.propertyId)).filter(Boolean);
      const hasActive = own.some((c) => c.status === 'activo');
      return {
        key: `t-${tenant.id}`,
        scope: 'inquilinos',
        fields: [
          { label: 'Nombre', value: tenant.name },
          { label: 'Teléfono', value: tenant.phone, digits: true },
          { label: 'Carpeta', value: ownProperties.map((p) => p!.title).join(', ') },
          { label: 'Documento', value: tenant.document, digits: true },
          { label: 'Email', value: tenant.email },
          { label: 'Dirección', value: ownProperties.map((p) => p!.address).join(', ') },
          { label: 'Notas', value: tenant.notes },
        ],
        titleFields: [0],
        subtitleFields: [1, 2],
        badge: hasActive ? undefined : { label: 'Sin contrato activo', tone: 'neutral' },
        open: go('TenantsTab', 'TenantDetail', { tenantId: tenant.id }),
      };
    });

    const contractRecords = contracts.map<SearchRecord>((contract) => {
      const property = getPropertyById(contract.propertyId);
      const tenant = getTenantById(contract.tenantId);
      return {
        key: `c-${contract.id}`,
        scope: 'contratos',
        fields: [
          { label: 'Carpeta', value: property?.title ?? 'Propiedad' },
          { label: 'Inquilino', value: tenant?.name ?? 'Inquilino' },
          { label: 'Vigencia', value: `${formatDate(contract.startDate)} al ${formatDate(contract.endDate)}` },
          { label: 'Dirección', value: property?.address },
          { label: 'Barrio', value: property?.neighborhood },
          { label: 'Teléfono', value: tenant?.phone, digits: true },
          { label: 'Documento', value: tenant?.document, digits: true },
          { label: 'Estado', value: CONTRACT_STATUS_LABEL[contract.status] },
          { label: 'Moneda', value: contract.currency === 'USD' ? 'Dólares USD' : 'Pesos ARS' },
          { label: 'Notas', value: contract.notes },
        ],
        titleFields: [0, 1],
        subtitleFields: [2],
        badge: { label: CONTRACT_STATUS_LABEL[contract.status], tone: CONTRACT_STATUS_TONE[contract.status] },
        open: go('ContractsTab', 'ContractDetail', { contractId: contract.id }),
      };
    });

    return [...propertyRecords, ...tenantRecords, ...contractRecords];
  }, [properties, tenants, contracts, getPropertyById, getTenantById, navigation, onClose]);

  const words = searchWords(query);
  const results = useMemo(() => {
    const grouped: Record<SearchScope, SearchResult[]> = { propiedades: [], inquilinos: [], contratos: [] };
    if (!words.length) return grouped;
    records.forEach((record) => {
      const matches = matchFields(record.fields, words);
      if (matches) grouped[record.scope].push({ record, matches });
    });
    // Matches in the name first, then in order of carpeta / name.
    (Object.keys(grouped) as SearchScope[]).forEach((key) =>
      grouped[key].sort((a, b) => {
        const aTitle = a.matches.some((m) => a.record.titleFields.includes(m.index)) ? 0 : 1;
        const bTitle = b.matches.some((m) => b.record.titleFields.includes(m.index)) ? 0 : 1;
        return aTitle - bTitle || byTitle(a.record.fields[0].value ?? '', b.record.fields[0].value ?? '');
      }),
    );
    return grouped;
    // words is derived from query
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, query]);

  // The section the search was opened from goes first.
  const order: SearchScope[] = [scope, ...(['propiedades', 'inquilinos', 'contratos'] as SearchScope[]).filter((s) => s !== scope)];
  const sections = order
    .filter((s) => filter === 'todo' || filter === s)
    .map((s) => ({ scope: s, data: results[s] }))
    .filter((section) => section.data.length > 0);
  const total = order.reduce((sum, s) => sum + results[s].length, 0);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.sheet} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.inputBox}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={PLACEHOLDER[scope]}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
              autoFocus
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {query ? (
              <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Borrar búsqueda" hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.cancel}>Cerrar</Text>
          </TouchableOpacity>
        </View>

        {words.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chips}
            keyboardShouldPersistTaps="handled"
          >
            {(['todo', ...order] as ScopeFilter[]).map((value) => {
              const active = value === filter;
              const count = value === 'todo' ? total : results[value].length;
              return (
                <TouchableOpacity
                  key={value}
                  onPress={() => setFilter(value)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {value === 'todo' ? 'Todo' : SCOPE_LABEL[value]} {count}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        <SectionList
          sections={sections}
          keyExtractor={(item) => item.record.key}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.list}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Ionicons name={SCOPE_ICON[section.scope]} size={14} color={colors.textMuted} />
              <Text style={styles.sectionTitle}>{SCOPE_LABEL[section.scope]}</Text>
            </View>
          )}
          renderItem={({ item }) => <ResultRow result={item} />}
          ListEmptyComponent={
            words.length ? (
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={32} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>Sin resultados para “{query.trim()}”</Text>
                <Text style={styles.emptyText}>Probá con otra parte del nombre, la calle o el número.</Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Buscá en propiedades, inquilinos y contratos</Text>
                <Text style={styles.emptyText}>
                  Escribí cualquier parte: un número de carpeta, una calle, un barrio, un nombre, un teléfono o un
                  DNI. Por ejemplo, “101” encuentra la carpeta 101, la calle 101 y los teléfonos que lo contengan.
                </Text>
              </View>
            )
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

function ResultRow({ result }: { result: SearchResult }) {
  const { record, matches } = result;
  const rangesFor = (index: number) => matches.find((m) => m.index === index)?.ranges ?? [];
  const shown = [...record.titleFields, ...record.subtitleFields];
  const extra = matches.filter((m) => !shown.includes(m.index)).slice(0, 3);

  const renderJoined = (indexes: number[], separator: string) =>
    indexes
      .filter((index) => record.fields[index].value)
      .map((index, position) => (
        <React.Fragment key={index}>
          {position > 0 ? separator : ''}
          <HighlightText text={record.fields[index].value!} ranges={rangesFor(index)} />
        </React.Fragment>
      ));

  return (
    <TouchableOpacity style={styles.result} onPress={record.open} accessibilityRole="button">
      <View style={styles.resultInfo}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle} numberOfLines={2}>
            {renderJoined(record.titleFields, ' · ')}
          </Text>
          {record.badge ? <Badge label={record.badge.label} tone={record.badge.tone} /> : null}
        </View>
        <Text style={styles.resultSubtitle} numberOfLines={2}>
          {renderJoined(record.subtitleFields, ' · ')}
        </Text>
        {extra.map((match) => (
          <Text key={match.index} style={styles.resultExtra} numberOfLines={2}>
            <Text style={styles.resultExtraLabel}>{match.field.label}: </Text>
            <HighlightText text={match.field.value!} ranges={match.ranges} />
          </Text>
        ))}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  launcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  launcherText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  inputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: fontSize.md,
    color: colors.text,
  },
  cancel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
  chipsScroll: {
    flexGrow: 0,
  },
  chips: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.primary,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  resultInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  resultTitle: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  resultSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  resultExtra: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  resultExtraLabel: {
    color: colors.textMuted,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
