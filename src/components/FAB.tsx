import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { radius } from '../theme';
import { makeStyles, useTheme } from '../context/ThemeContext';

// Bottom padding for lists under the button, so the last card can scroll clear of it.
export const FAB_CLEARANCE = 104;

export default function FAB({
  onPress,
  accessibilityLabel = 'Agregar',
}: {
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name="add" size={28} color={colors.white} />
    </TouchableOpacity>
  );
}

const useStyles = makeStyles((colors) => ({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: radius.round,
    backgroundColor: colors.primarySolid,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
}));
