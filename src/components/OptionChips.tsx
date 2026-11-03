// =====================================================================
// Opciones en botoncitos
// ---------------------------------------------------------------------
// Para elegir una opción entre pocas (moneda, tipo de propiedad, estado…).
// =====================================================================

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { fontSize, radius, spacing } from '../theme';
import { makeStyles } from '../context/ThemeContext';

// ── Constantes y funciones auxiliares ─────────────────────────────────

export interface Option<T extends string> {
  value: T;
  label: string;
}

// ── Componente ────────────────────────────────────────────────────────

export default function OptionChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.chip, active && styles.chipActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: 14,
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: radius.round,
    backgroundColor: colors.neutralMuted,
  },
  chipActive: {
    backgroundColor: colors.primaryMuted,
  },
  chipText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
}));
