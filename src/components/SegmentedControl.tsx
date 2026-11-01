import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { makeStyles } from '../context/ThemeContext';
import { fontSize, radius, spacing } from '../theme';

// Row of mutually exclusive views ("Recibidos | Liquidaciones | Historial").
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

const useStyles = makeStyles((colors) => ({
  segment: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.neutralMuted,
    borderRadius: radius.md,
    padding: 3,
  },
  item: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  itemActive: {
    backgroundColor: colors.surface,
  },
  text: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
  },
  textActive: {
    color: colors.text,
  },
}));
