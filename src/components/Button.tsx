import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { fontSize, Palette, radius, spacing } from '../theme';
import { makeStyles, useTheme } from '../context/ThemeContext';

// dangerOutline: destructive actions that should not be the most prominent button on screen.
type Variant = 'primary' | 'secondary' | 'danger' | 'dangerOutline' | 'ghost';

export default function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const variantStyle = variantStyles(colors)[variant];
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={disabled || loading}
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.base,
        { backgroundColor: variantStyle.bg, borderColor: variantStyle.border },
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.fg} />
      ) : (
        <Text style={[styles.label, { color: variantStyle.fg }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const variantStyles = (colors: Palette): Record<Variant, { bg: string; fg: string; border: string }> => ({
  primary: { bg: colors.primarySolid, fg: colors.white, border: colors.primarySolid },
  secondary: { bg: colors.surface, fg: colors.primary, border: colors.primary },
  danger: { bg: colors.dangerSolid, fg: colors.white, border: colors.dangerSolid },
  dangerOutline: { bg: colors.surface, fg: colors.danger, border: colors.danger },
  ghost: { bg: 'transparent', fg: colors.textMuted, border: 'transparent' },
});

const useStyles = makeStyles((colors) => ({
  base: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
}));
