import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { fontSize, radius, spacing } from '../theme';
import { makeStyles, useTheme } from '../context/ThemeContext';

export interface SortOption<T extends string> {
  value: T;
  label: string;
}

export default function SortMenu<T extends string>({
  options,
  value,
  onChange,
  compact,
}: {
  options: SortOption<T>[];
  value: T;
  onChange: (value: T) => void;
  // Icon-only trigger, for rows that also hold filters.
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, compact && styles.triggerCompact]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Ordenar: ${current?.label ?? ''}`}
      >
        <Ionicons name="swap-vertical" size={compact ? 18 : 14} color={compact ? colors.primary : colors.text} />
        {compact ? null : (
          <>
            <Text style={styles.triggerText}>{current?.label}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
          </>
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.title}>Ordenar por</Text>
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={styles.option}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {option.label}
                  </Text>
                  {selected ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : <View />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const useStyles = makeStyles((colors) => ({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    minHeight: 32,
    borderRadius: radius.round,
    backgroundColor: colors.neutralMuted,
  },
  triggerCompact: {
    width: 36,
    height: 36,
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  triggerText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
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
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  optionTextSelected: {
    fontWeight: '700',
    color: colors.primary,
  },
}));
