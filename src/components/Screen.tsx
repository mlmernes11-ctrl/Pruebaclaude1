// =====================================================================
// Contenedor de pantalla
// ---------------------------------------------------------------------
// Fondo y márgenes seguros (respeta la muesca y los bordes del celular). En la computadora el
// contenido va en una columna centrada del ancho de un celular grande, así se ve igual que en el
// celular (mismas tarjetas y listas, sin tablas ni paneles aparte).
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
  topSafe,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  // Pantallas sin barra de arriba (las de cada pestaña): dejan libre la franja de la hora y la
  // batería del celular, para que el título no quede debajo.
  topSafe?: boolean;
}) {
  const styles = useStyles();
  const desktop = useIsDesktop();
  return (
    <SafeAreaView
      style={[styles.safe, topSafe && styles.safeHeader]}
      edges={topSafe ? ['top', 'left', 'right'] : ['left', 'right']}
    >
      <View
        style={[styles.container, desktop && styles.desktop, desktop && { maxWidth: 720 }, style]}
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
  // La franja de la hora y la batería sigue el azul del título.
  safeHeader: {
    backgroundColor: colors.header,
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
