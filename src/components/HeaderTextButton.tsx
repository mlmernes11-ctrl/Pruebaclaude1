// =====================================================================
// Botón de texto de la barra superior
// =====================================================================

import { Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// ── Componente ────────────────────────────────────────────────────────

// Botón de texto para la barra de arriba ("Editar"), como en iOS. Va en blanco sobre la franja
// azul; "inline" lo pinta del color de los enlaces para usarlo sobre fondo claro (panel lateral).
export default function HeaderTextButton({ label, onPress, inline }: { label: string; onPress: () => void; inline?: boolean }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} hitSlop={10} accessibilityRole="button" style={{ paddingHorizontal: 8 }}>
      <Text style={{ fontSize: 17, color: inline ? colors.primary : colors.onHeader }}>{label}</Text>
    </TouchableOpacity>
  );
}
