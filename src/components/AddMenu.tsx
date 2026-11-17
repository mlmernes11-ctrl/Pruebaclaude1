// =====================================================================
// El «+» de Alquileres
// ---------------------------------------------------------------------
// Todo lo que se puede agregar: un cobro, un cargo, un contrato o una propiedad. En el celular,
// un botón redondo abajo a la derecha que se abre en abanico; en la compu, el botón «+ Agregar»
// de la franja azul abre un menú que cae desde ahí.
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles, useTheme } from '../context/ThemeContext';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { fontSize, radius, spacing } from '../theme';

export type AddOption = { id: string; label: string; detail: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void };

export default function AddMenu({
  visible,
  options,
  onClose,
}: {
  visible: boolean;
  options: AddOption[];
  onClose: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const desktop = useIsDesktop();
  const pick = (option: AddOption) => {
    onClose();
    option.onPress();
  };

  // En la compu: un menú que cae desde el botón «+ Agregar».
  if (desktop) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.clear} onPress={onClose}>
          <View style={[styles.dropdown, { top: insets.top + 124 }]}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[styles.dropRow, index > 0 && styles.separator]}
                onPress={() => pick(option)}
                accessibilityRole="menuitem"
              >
                <Ionicons name={option.icon} size={20} color={colors.primary} />
                <Text style={styles.dropText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    );
  }

  // En el celular: las opciones salen hacia arriba desde el botón redondo, con su nombre al lado.
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.dim, { paddingBottom: insets.bottom + 64 + spacing.lg }]} onPress={onClose}>
        <View style={styles.dial}>
          {options.map((option) => (
            <TouchableOpacity key={option.id} style={styles.dialRow} onPress={() => pick(option)} accessibilityRole="button">
              <Text style={styles.dialLabel}>{option.label}</Text>
              <View style={styles.dialIcon}>
                <Ionicons name={option.icon} size={22} color={colors.primary} />
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.fab} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar">
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

// El botón redondo de abajo a la derecha, cerrado.
export function AddFab({ onPress }: { onPress: () => void }) {
  const styles = useStyles();
  return (
    <TouchableOpacity
      style={[styles.fab, styles.fabFloating]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Agregar"
    >
      <Ionicons name="add" size={30} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  separator: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  clear: {
    flex: 1,
  },
  dropdown: {
    position: 'absolute',
    right: 40,
    width: 230,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  dropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
  },
  dropText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  dim: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingRight: spacing.lg,
  },
  dial: {
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  dialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dialLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  dialIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySolid,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabFloating: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
  },
}));
