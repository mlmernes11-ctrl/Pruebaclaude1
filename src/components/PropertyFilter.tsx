// =====================================================================
// Filtro por propiedad
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Platform, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useData } from '../context/DataContext';
import { fontSize, radius, spacing } from '../theme';
import { matchFields, searchWords } from '../utils/search';
import { compareTitles } from '../utils/text';
import { makeStyles, useTheme } from '../context/ThemeContext';

// ── Constantes y funciones auxiliares ─────────────────────────────────

interface Option {
  id: string;
  title: string;
  subtitle: string;
  searchText: string;
}

// ── Componente ────────────────────────────────────────────────────────

// Filtro por propiedad: al tocarlo se abre una lista con buscador.
export default function PropertyFilter({
  value,
  onChange,
}: {
  value?: string;
  onChange: (propertyId?: string) => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { properties, contracts, getTenantById } = useData();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const options = useMemo<Option[]>(
    () =>
      properties
        .map((property) => {
          const active = contracts.find((c) => c.propertyId === property.id && c.status === 'activo');
          const tenant = getTenantById(active?.tenantId)?.name;
          const subtitle = [property.neighborhood, tenant ?? 'Sin contrato activo'].filter(Boolean).join(' · ');
          return {
            id: property.id,
            title: property.title,
            subtitle,
            searchText: [property.title, property.address, subtitle].join(' '),
          };
        })
        .sort((a, b) => compareTitles(a.title, b.title)),
    [properties, contracts, getTenantById],
  );

  const words = searchWords(query);
  const visible = words.length
    ? options.filter((o) => matchFields([{ label: '', value: o.searchText }], words))
    : options;
  const selected = options.find((o) => o.id === value);

  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const choose = (id?: string) => {
    onChange(id);
    close();
  };

  return (
    <>
      <View style={[styles.trigger, selected && styles.triggerActive]}>
        <TouchableOpacity
          style={styles.triggerMain}
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Propiedad: ${selected?.title ?? 'todas'}`}
        >
          <Ionicons name="business-outline" size={16} color={selected ? colors.primary : colors.textMuted} />
          <Text style={[styles.triggerText, selected && styles.triggerTextActive]} numberOfLines={1}>
            {selected ? selected.title : 'Todas las propiedades'}
          </Text>
          {selected ? null : <Ionicons name="chevron-down" size={16} color={colors.textMuted} />}
        </TouchableOpacity>
        {selected ? (
          <TouchableOpacity
            onPress={() => onChange(undefined)}
            style={styles.clear}
            accessibilityRole="button"
            accessibilityLabel="Ver todas las propiedades"
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={18} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Elegir propiedad</Text>
              <TouchableOpacity onPress={close} accessibilityLabel="Cerrar" hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.search}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar carpeta, dirección, barrio o inquilino"
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
                autoCorrect={false}
              />
              {query ? (
                <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Borrar búsqueda" hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
            <FlatList
              data={visible}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                words.length ? null : (
                  <OptionRow title="Todas las propiedades" selected={!value} onPress={() => choose(undefined)} />
                )
              }
              ListEmptyComponent={<Text style={styles.empty}>No hay propiedades que coincidan.</Text>}
              renderItem={({ item }) => (
                <OptionRow
                  title={item.title}
                  subtitle={item.subtitle}
                  selected={item.id === value}
                  onPress={() => choose(item.id)}
                />
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ── Partes de la pieza ────────────────────────────────────────────────

function OptionRow({
  title,
  subtitle,
  selected,
  onPress,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <TouchableOpacity
      style={styles.option}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <View style={styles.optionInfo}>
        <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>{title}</Text>
        {subtitle ? <Text style={styles.optionSubtitle}>{subtitle}</Text> : null}
      </View>
      {selected ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
    </TouchableOpacity>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 10,
    minHeight: 40,
    backgroundColor: colors.neutralMuted,
  },
  triggerActive: {
    backgroundColor: colors.primaryMuted,
  },
  triggerMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  triggerText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
  },
  triggerTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  clear: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '80%',
    paddingBottom: spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sheetTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.neutralTint,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    // En la web el campo tiene un ancho mínimo propio; esto lo deja achicarse para que entre la ✕.
    minWidth: 0,
    paddingVertical: 10,
    fontSize: fontSize.md,
    color: colors.text,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionInfo: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  optionTitleSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  optionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  empty: {
    padding: spacing.xl,
    textAlign: 'center',
    color: colors.textMuted,
  },
}));
