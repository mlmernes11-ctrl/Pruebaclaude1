// =====================================================================
// Tarjeta
// ---------------------------------------------------------------------
// Caja blanca redondeada para agrupar contenido.
// =====================================================================

import React from 'react';
import { StyleProp, TouchableOpacity, View, ViewStyle } from 'react-native';
import { radius, spacing } from '../theme';
import { makeStyles } from '../context/ThemeContext';

// ── Componente ────────────────────────────────────────────────────────

export default function Card({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[styles.card, style]}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
}));
