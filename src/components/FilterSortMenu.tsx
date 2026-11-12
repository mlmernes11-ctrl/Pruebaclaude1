// =====================================================================
// Filtrar y ordenar
// ---------------------------------------------------------------------
// Un solo botón que abre un menú chico con dos partes: qué mostrar y en qué orden. Si se elige
// algo distinto de lo normal, el botón se pinta para que se note que la lista está filtrada.
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { makeStyles, useTheme } from '../context/ThemeContext';
import { fontSize, radius, spacing } from '../theme';
import StatusDot, { DotTone } from './StatusDot';

// ── Tipos ─────────────────────────────────────────────────────────────

export interface MenuOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  dot?: DotTone;
}

const MENU_WIDTH = 280;
// Alto aproximado del menú abierto: si no entra abajo del botón, se abre hacia arriba.
const MENU_HEIGHT = 470;

// ── Componente ────────────────────────────────────────────────────────

export default function FilterSortMenu<F extends string, S extends string>({
  filters,
  filter,
  onFilter,
  sorts,
  sort,
  onSort,
}: {
  filters: MenuOption<F>[];
  filter: F;
  onFilter: (value: F) => void;
  sorts: MenuOption<S>[];
  sort: S;
  onSort: (value: S) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const trigger = useRef<View>(null);
  const [anchor, setAnchor] = useState<{ top?: number; bottom?: number; right: number }>();
  // Lo normal es la primera opción de cada parte; cualquier otra cosa pinta el botón.
  const active = filter !== filters[0]?.value || sort !== sorts[0]?.value;

  // El menú se abre justo debajo del botón (o arriba, si no entra), alineado a su borde derecho.
  const open = () =>
    trigger.current?.measureInWindow((x, y, w, h) => {
      const right = Math.max(spacing.sm, screenWidth - (x + w));
      const below = y + h + 6;
      setAnchor(
        below + MENU_HEIGHT <= screenHeight || y < screenHeight / 2
          ? { top: below, right }
          : { bottom: screenHeight - y + 6, right },
      );
    });
  const close = () => setAnchor(undefined);

  const section = <T extends string>(title: string, options: MenuOption<T>[], value: T, onChange: (v: T) => void) => (
    <>
      <Text style={styles.sectionTitle}>{title}</Text>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            style={styles.option}
            onPress={() => {
              onChange(option.value);
              close();
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <View style={styles.mark}>
              {selected ? (
                <Ionicons name="checkmark" size={18} color={colors.primary} />
              ) : option.dot ? (
                <StatusDot tone={option.dot} />
              ) : null}
            </View>
            <Text style={[styles.optionText, selected && styles.optionTextSelected]} numberOfLines={1}>
              {option.label}
            </Text>
            {option.count !== undefined ? <Text style={styles.count}>{option.count}</Text> : null}
          </TouchableOpacity>
        );
      })}
    </>
  );

  return (
    <>
      <View ref={trigger} collapsable={false}>
        <TouchableOpacity
          style={[styles.trigger, active && styles.triggerActive]}
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel="Filtrar y ordenar"
        >
          <Ionicons name="options-outline" size={16} color={active ? colors.white : colors.primary} />
          <Text style={[styles.triggerText, active && styles.triggerTextActive]}>Filtrar y ordenar</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={Boolean(anchor)} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          {anchor ? (
            <Pressable
              style={[
                styles.menu,
                anchor,
                { maxHeight: (anchor.top !== undefined ? screenHeight - anchor.top : screenHeight - (anchor.bottom ?? 0)) - spacing.lg },
              ]}
              onPress={() => {}}
            >
              <ScrollView bounces={false}>
                {section('Mostrar', filters, filter, onFilter)}
                <View style={styles.divider} />
                {section('Ordenar por', sorts, sort, onSort)}
              </ScrollView>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.round,
    backgroundColor: colors.primaryMuted,
  },
  triggerActive: {
    backgroundColor: colors.primarySolid,
  },
  triggerText: {
    fontSize: fontSize.sm + 1,
    fontWeight: '600',
    color: colors.primary,
  },
  triggerTextActive: {
    color: colors.white,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingBottom: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  sectionTitle: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  mark: {
    width: 20,
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  optionTextSelected: {
    fontWeight: '600',
  },
  count: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
}));
