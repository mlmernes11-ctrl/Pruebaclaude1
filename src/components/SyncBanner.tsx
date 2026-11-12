// =====================================================================
// Aviso de cambios sin guardar
// =====================================================================

import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '../context/DataContext';
import { makeStyles } from '../context/ThemeContext';
import { fontSize, radius, spacing } from '../theme';

// ── Componente ────────────────────────────────────────────────────────

// Aviso rojo cuando hay cambios que no llegaron al servidor; queda visible hasta que se guardan.
export default function SyncBanner() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { syncError, retrySync } = useData();
  if (!syncError) return null;
  return (
    <View style={[styles.banner, { top: insets.top + spacing.sm }]} accessibilityRole="alert">
      <View style={styles.texts}>
        <Text style={styles.title}>No se guardaron los últimos cambios</Text>
        <Text style={styles.detail}>{syncError}</Text>
      </View>
      <TouchableOpacity onPress={retrySync} style={styles.action} accessibilityRole="button">
        <Text style={styles.actionText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  banner: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSolid,
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.white,
  },
  detail: {
    fontSize: fontSize.sm,
    color: colors.white,
    marginTop: 2,
  },
  action: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  actionText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.white,
  },
}));
