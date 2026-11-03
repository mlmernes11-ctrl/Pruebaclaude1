// =====================================================================
// Selector de vistas
// =====================================================================

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { makeStyles } from '../context/ThemeContext';
import { fontSize, spacing } from '../theme';

// ── Componente ────────────────────────────────────────────────────────

// Selector de vistas ("Recibidos | Liquidaciones | Historial"): se ve una a la vez.
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.segment} accessibilityRole="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.item, active && styles.itemActive]}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.text, active && styles.textActive]} numberOfLines={1}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  segment: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.neutralMuted,
    borderRadius: 9,
    padding: 2,
  },
  item: {
    flex: 1,
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: 7,
    alignItems: 'center',
  },
  itemActive: {
    backgroundColor: colors.segmentSelected,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  text: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.text,
  },
  textActive: {
    fontWeight: '600',
  },
}));
