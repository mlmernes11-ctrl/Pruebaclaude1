// =====================================================================
// Editar accesos directos
// ---------------------------------------------------------------------
// Hoja que se abre con el lápiz de los accesos de Inicio: se eligen hasta SHORTCUTS_MAX y se
// muestran en el orden en que se tocan. «Restablecer» vuelve a los de siempre.
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles, useTheme } from '../context/ThemeContext';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { fontSize, radius, spacing } from '../theme';
import { DEFAULT_SHORTCUTS, SHORTCUT_CATALOG, ShortcutId, SHORTCUTS_MAX } from '../utils/shortcuts';
import Button from './Button';

export default function ShortcutsEditor({
  visible,
  value,
  onSave,
  onClose,
}: {
  visible: boolean;
  value: ShortcutId[];
  onSave: (ids: ShortcutId[]) => void;
  onClose: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // En la computadora, ventana centrada; en el celular, hoja desde abajo.
  const desktop = useIsDesktop();
  const [chosen, setChosen] = useState<ShortcutId[]>(value);

  // Cada vez que se abre, arranca con lo que está en Inicio.
  useEffect(() => {
    if (visible) setChosen(value);
  }, [visible, value]);

  const full = chosen.length >= SHORTCUTS_MAX;
  const toggle = (id: ShortcutId) =>
    setChosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= SHORTCUTS_MAX ? prev : [...prev, id]));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, desktop && styles.backdropCentered]} onPress={onClose}>
        <Pressable
          style={[styles.sheet, desktop && styles.sheetCentered, { paddingBottom: (desktop ? 0 : insets.bottom) + spacing.lg }]}
          onPress={() => {}}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Accesos directos</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>
            Elegí hasta {SHORTCUTS_MAX}. Aparecen en Inicio en el orden en que los tocás.
            {full ? ' Para sumar otro, primero sacá uno.' : ''}
          </Text>
          <ScrollView style={styles.list}>
            {SHORTCUT_CATALOG.map((item) => {
              const position = chosen.indexOf(item.id);
              const selected = position >= 0;
              const disabled = !selected && full;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.row, disabled && styles.rowDisabled]}
                  onPress={() => toggle(item.id)}
                  disabled={disabled}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected, disabled }}
                  accessibilityLabel={item.label}
                >
                  <View style={styles.icon}>
                    <Ionicons name={item.icon} size={20} color={colors.primary} />
                  </View>
                  <View style={styles.texts}>
                    <Text style={styles.label}>{item.label}</Text>
                    <Text style={styles.detail}>{item.detail}</Text>
                  </View>
                  {selected ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{position + 1}</Text>
                    </View>
                  ) : (
                    <View style={styles.empty} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={styles.actions}>
            <Button label="Restablecer" variant="secondary" onPress={() => setChosen(DEFAULT_SHORTCUTS)} style={styles.action} />
            <Button
              label={chosen.length ? 'Listo' : 'Elegí al menos uno'}
              disabled={!chosen.length}
              onPress={() => {
                onSave(chosen);
                onClose();
              }}
              style={styles.action}
            />
          </View>
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
    maxHeight: '85%',
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
    justifyContent: 'space-between',
  },
  title: {
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
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowDisabled: {
    opacity: 0.4,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  detail: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 1,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: fontSize.sm,
  },
  empty: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border,
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
