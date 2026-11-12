// =====================================================================
// Barra de búsqueda
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleProp, TextInput, TouchableOpacity, View, ViewStyle } from 'react-native';
import { makeStyles, useTheme } from '../context/ThemeContext';
import { fontSize, spacing } from '../theme';

// ── Componente ────────────────────────────────────────────────────────

// Campo de búsqueda (estilo iOS): filtra la lista de abajo mientras escribís.
export default function SearchBar({
  value,
  onChangeText,
  placeholder,
  style,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[styles.bar, style]}>
      <Ionicons name="search" size={17} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
        style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
        accessibilityLabel="Buscar"
        accessibilityRole="search"
      />
      {value ? (
        <TouchableOpacity onPress={() => onChangeText('')} accessibilityLabel="Borrar búsqueda" hitSlop={8}>
          <Ionicons name="close-circle" size={17} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: colors.neutralMuted,
  },
  input: {
    flex: 1,
    // En la web el campo tiene un ancho mínimo propio; esto lo deja achicarse para que entre la ✕.
    minWidth: 0,
    paddingVertical: 9,
    fontSize: fontSize.md,
    color: colors.text,
  },
}));
