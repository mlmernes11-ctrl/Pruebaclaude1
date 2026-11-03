// =====================================================================
// Botón de texto de la barra superior
// =====================================================================

import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// ── Componente ────────────────────────────────────────────────────────

// Botón de texto para la barra de arriba ("Editar"), como en iOS.
export default function HeaderTextButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} hitSlop={10} accessibilityRole="button" style={{ paddingHorizontal: 8 }}>
      <Text style={{ fontSize: 17, color: colors.primary }}>{label}</Text>
    </TouchableOpacity>
  );
}
