// =====================================================================
// Contenedor de pantalla
// ---------------------------------------------------------------------
// Fondo y márgenes seguros (respeta la muesca y los bordes del celular). En pantalla grande
// el contenido va en una columna centrada: ancha para listas, angosta para formularios.
// =====================================================================

import React from 'react';
import { View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { makeStyles } from '../context/ThemeContext';
import { useIsDesktop } from '../hooks/useIsDesktop';

// ── Componente ────────────────────────────────────────────────────────

export default function Screen({
  children,
  style,
  narrow,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  // Formularios y fichas simples: columna más angosta en pantalla grande.
  narrow?: boolean;
}) {
  const styles = useStyles();
  const desktop = useIsDesktop();
  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <View
        style={[styles.container, desktop && styles.desktop, desktop && { maxWidth: narrow ? 720 : 1160 }, style]}
      >
        {children}
      </View>
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
  desktop: {
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
}));
