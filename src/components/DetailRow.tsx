import React from 'react';
import { Text, View } from 'react-native';
import { fontSize, spacing } from '../theme';
import { makeStyles } from '../context/ThemeContext';

// Label on the left, value on the right; the value can be text or any element (e.g. MoneyText).
export default function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {typeof value === 'string' ? <Text style={styles.value}>{value}</Text> : value}
    </View>
  );
}

// Same text style as a row value, for elements passed as value (e.g. MoneyText).
export function useDetailValueStyle() {
  return useStyles().valueText;
}

const useStyles = makeStyles((colors) => ({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  valueText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  value: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
  },
}));
