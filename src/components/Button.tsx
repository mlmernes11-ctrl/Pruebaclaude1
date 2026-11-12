// =====================================================================
// Botón
// ---------------------------------------------------------------------
// Botón grande de la app, con variantes: principal, secundario, peligro, etc.
// =====================================================================

import { ActivityIndicator, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { fontSize, Palette, spacing } from '../theme';
import { makeStyles, useTheme } from '../context/ThemeContext';

// ── Constantes y funciones auxiliares ─────────────────────────────────

// dangerOutline: acciones que borran algo, sin ser el botón más llamativo de la pantalla.
type Variant = 'primary' | 'secondary' | 'danger' | 'dangerOutline' | 'ghost';

// ── Componente ────────────────────────────────────────────────────────

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
  secondary: { bg: colors.primaryMuted, fg: colors.primary, border: colors.primaryMuted },
  danger: { bg: colors.dangerSolid, fg: colors.white, border: colors.dangerSolid },
  dangerOutline: { bg: colors.surface, fg: colors.danger, border: colors.surface },
  ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
});

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles(() => ({
  base: {
    borderRadius: 14,
    minHeight: 50,
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
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
}));
