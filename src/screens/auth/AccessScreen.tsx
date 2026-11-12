// =====================================================================
// Pantalla: Acceso
// ---------------------------------------------------------------------
// Cargando, o "Sin conexión con el servidor" con un botón para reintentar.
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { makeStyles, useTheme } from '../../context/ThemeContext';
import { fontSize, spacing } from '../../theme';

// ── Pantalla ──────────────────────────────────────────────────────────

// Sin "onRetry": ruedita mientras se lee la sesión. Con "onRetry": no se pudieron cargar los datos.
export default function AccessScreen({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { signOut } = useAuth();

  if (!onRetry) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
        <Text style={styles.title}>Sin conexión con el servidor</Text>
        <Text style={styles.text}>{message ?? 'No se pudo conectar con el servidor. Revisá la conexión a internet.'}</Text>
        <Button label="Reintentar" onPress={onRetry} style={styles.button} />
        <Button label="Cerrar sesión" variant="secondary" onPress={signOut} style={styles.button} />
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  text: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
  button: {
    alignSelf: 'stretch',
  },
}));
