import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, fontSize, spacing } from '../theme';

// Section title with an optional action on the right, both centered on the same line.
export default function SectionHeader({
  title,
  actionLabel,
  onAction,
  right,
  style,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {right}
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 32,
    marginBottom: spacing.sm,
  },
  title: {
    flexShrink: 1,
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  action: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.primary,
  },
});
