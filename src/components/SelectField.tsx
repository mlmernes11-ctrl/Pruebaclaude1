// =====================================================================
// Campo de selección
// ---------------------------------------------------------------------
// Abre una lista desde abajo para elegir una opción (contrato, propiedad, inquilino).
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { fontSize, radius, spacing } from '../theme';
import { makeStyles, useTheme } from '../context/ThemeContext';
import { useFormGuard } from '../navigation/formScreen';

// ── Constantes y funciones auxiliares ─────────────────────────────────

export interface SelectOption {
  id: string;
  label: string;
  subtitle?: string;
}

// ── Componente ────────────────────────────────────────────────────────

export default function SelectField({
  label,
  placeholder,
  options,
  selectedId,
  onSelect,
  required,
  emptyMessage,
}: {
  label: string;
  placeholder: string;
  options: SelectOption[];
  selectedId?: string;
  onSelect: (id: string) => void;
  required?: boolean;
  emptyMessage?: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { markDirty } = useFormGuard();
  const [visible, setVisible] = useState(false);
  const selected = options.find((o) => o.id === selectedId);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TouchableOpacity style={styles.field} onPress={() => setVisible(true)} activeOpacity={0.7}>
        <Text style={selected ? styles.value : styles.placeholder}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            {options.length === 0 ? (
              <Text style={styles.emptyText}>{emptyMessage ?? 'No hay opciones disponibles'}</Text>
            ) : (
              <FlatList
                data={options}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.option}
                    onPress={() => {
                      markDirty();
                      onSelect(item.id);
                      setVisible(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionLabel}>{item.label}</Text>
                      {item.subtitle ? (
                        <Text style={styles.optionSubtitle}>{item.subtitle}</Text>
                      ) : null}
                    </View>
                    {item.id === selectedId ? (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textMuted,
    marginLeft: spacing.xs,
    marginBottom: 6,
  },
  required: {
    color: colors.danger,
  },
  field: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: {
    fontSize: fontSize.lg,
    color: colors.text,
  },
  placeholder: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
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
    maxHeight: '70%',
    paddingBottom: spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '600',
  },
  optionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyText: {
    padding: spacing.xl,
    textAlign: 'center',
    color: colors.textMuted,
  },
}));
