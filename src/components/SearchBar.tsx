import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, TextInput, TouchableOpacity, View } from 'react-native';
import { makeStyles, useTheme } from '../context/ThemeContext';
import { fontSize, spacing } from '../theme';

// Inline search field (iOS style): filters the list below as you type.
export default function SearchBar({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.bar}>
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
    // Lets the field shrink on the web (inputs keep a native minimum width) so the clear button fits.
    minWidth: 0,
    paddingVertical: 9,
    fontSize: fontSize.md,
    color: colors.text,
  },
}));
