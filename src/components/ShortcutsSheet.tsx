// =====================================================================
// «Más»: todos los accesos directos
// ---------------------------------------------------------------------
// Hoja que se abre con «Más» en Inicio. Muestra todas las funciones (se abre cualquiera de un
// toque) y, con «Editar accesos directos», deja ordenarlas: las primeras SHORTCUTS_ON_HOME son
// las que se ven en Inicio. En el celular sale desde abajo; en la computadora, centrada.
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles, useTheme } from '../context/ThemeContext';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { fontSize, radius, spacing } from '../theme';
import { DEFAULT_ORDER, SHORTCUT_CATALOG, ShortcutId, ShortcutInfo, SHORTCUTS_ON_HOME } from '../utils/shortcuts';
import Button from './Button';

const INFO = new Map<ShortcutId, ShortcutInfo>(SHORTCUT_CATALOG.map((s) => [s.id, s]));

export default function ShortcutsSheet({
  visible,
  order,
  onOpen,
  onSave,
  onClose,
}: {
  visible: boolean;
  order: ShortcutId[];
  // Abre la función tocada (la hoja ya se cerró).
  onOpen: (id: ShortcutId) => void;
  onSave: (order: ShortcutId[]) => void;
  onClose: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const desktop = useIsDesktop();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ShortcutId[]>(order);

  // Cada vez que se abre, arranca mostrando todas, con el orden guardado.
  useEffect(() => {
    if (visible) {
      setEditing(false);
      setDraft(order);
    }
  }, [visible, order]);

  const move = (index: number, delta: number) =>
    setDraft((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const open = (id: ShortcutId) => {
    onClose();
    onOpen(id);
  };

  // — Todas las funciones —
  const all = (
    <>
      <Text style={styles.hint}>Tocá una para abrirla. Las tres primeras son las que ves en Inicio.</Text>
      <View style={styles.grid}>
        {order.map((id, index) => {
          const item = INFO.get(id)!;
          return (
            <TouchableOpacity
              key={id}
              style={styles.cell}
              onPress={() => open(id)}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <View style={styles.circle}>
                <Ionicons name={item.icon} size={22} color={colors.primary} />
                {index < SHORTCUTS_ON_HOME ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{index + 1}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.cellLabel} numberOfLines={2}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Button label="Editar accesos directos" variant="secondary" onPress={() => setEditing(true)} style={styles.footerButton} />
    </>
  );

  // — Ordenar —
  const sorter = (
    <>
      <Text style={styles.hint}>Las tres primeras aparecen en Inicio; las demás, en «Más». Cambiá el orden con las flechas.</Text>
      <ScrollView style={styles.list}>
        {draft.map((id, index) => {
          const item = INFO.get(id)!;
          return (
            <View key={id}>
              {index === 0 || index === SHORTCUTS_ON_HOME ? (
                <Text style={styles.group}>{index === 0 ? 'En Inicio' : 'En «Más»'}</Text>
              ) : null}
              <View style={styles.row}>
                <View style={styles.rowIcon}>
                  <Ionicons name={item.icon} size={20} color={colors.primary} />
                </View>
                <View style={styles.rowTexts}>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <Text style={styles.rowDetail}>{item.detail}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => move(index, -1)}
                  disabled={index === 0}
                  style={[styles.arrow, index === 0 && styles.arrowOff]}
                  accessibilityRole="button"
                  accessibilityLabel={`Subir ${item.label}`}
                >
                  <Ionicons name="chevron-up" size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => move(index, 1)}
                  disabled={index === draft.length - 1}
                  style={[styles.arrow, index === draft.length - 1 && styles.arrowOff]}
                  accessibilityRole="button"
                  accessibilityLabel={`Bajar ${item.label}`}
                >
                  <Ionicons name="chevron-down" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.actions}>
        <Button label="Restablecer" variant="secondary" onPress={() => setDraft(DEFAULT_ORDER)} style={styles.action} />
        <Button
          label="Listo"
          onPress={() => {
            onSave(draft);
            setEditing(false);
          }}
          style={styles.action}
        />
      </View>
    </>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, desktop && styles.backdropCentered]} onPress={onClose}>
        <Pressable
          style={[styles.sheet, desktop && styles.sheetCentered, { paddingBottom: (desktop ? 0 : insets.bottom) + spacing.lg }]}
          onPress={() => {}}
        >
          <View style={styles.header}>
            {editing ? (
              <TouchableOpacity onPress={() => setEditing(false)} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={8}>
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </TouchableOpacity>
            ) : null}
            <Text style={styles.title}>{editing ? 'Editar accesos directos' : 'Todos los accesos'}</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          {editing ? sorter : all}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdropCentered: {
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sheetCentered: {
    borderRadius: radius.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    lineHeight: 19,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.lg,
  },
  cell: {
    width: '25%',
    alignItems: 'center',
    gap: 6,
  },
  circle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  cellLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 15,
    paddingHorizontal: 2,
  },
  footerButton: {
    marginTop: spacing.xl,
  },
  list: {
    flexGrow: 0,
  },
  group: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTexts: {
    flex: 1,
  },
  rowLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  rowDetail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 1,
  },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryMuted,
  },
  arrowOff: {
    opacity: 0.3,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  action: {
    flex: 1,
  },
}));
