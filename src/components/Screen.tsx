// =====================================================================
// Contenedor de pantalla
// ---------------------------------------------------------------------
// Fondo y márgenes seguros (respeta la muesca y los bordes del celular).
// =====================================================================

import React from 'react';
import { View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { makeStyles } from '../context/ThemeContext';

// ── Componente ────────────────────────────────────────────────────────

export default function Screen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const styles = useStyles();
  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <View style={[styles.container, style]}>{children}</View>
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
}));
