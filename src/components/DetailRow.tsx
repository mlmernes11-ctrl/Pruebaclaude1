import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../theme';

// Label on the left, value on the right; the value can be text or any element (e.g. MoneyText).
export default function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {typeof value === 'string' ? <Text style={styles.value}>{value}</Text> : value}
    </View>
  );
}

export const detailValueStyle = {
  fontSize: fontSize.sm,
  fontWeight: '600' as const,
  color: colors.text,
};

const styles = StyleSheet.create({
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
  value: {
    ...detailValueStyle,
    flexShrink: 1,
    textAlign: 'right',
  },
});
