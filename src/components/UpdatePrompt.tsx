// =====================================================================
// Aviso de versión nueva
// ---------------------------------------------------------------------
// Al abrir la app (o al volver a ella) se fija si hay una versión nueva. Si la hay, la baja y
// muestra un cartel con un solo botón, "Actualizar", que reinicia la app ya actualizada.
// Celular: actualizaciones de Expo (EAS Update). Web: compara con la última versión publicada.
// =====================================================================

import * as Updates from 'expo-updates';
import { useEffect, useRef, useState } from 'react';
import { AppState, Modal, Platform, Text, View } from 'react-native';
import { makeStyles } from '../context/ThemeContext';
import { fontSize, radius, spacing } from '../theme';
import Button from './Button';

// ── Constantes y funciones auxiliares ─────────────────────────────────

// No vuelve a preguntar al servidor más seguido que esto (al entrar y salir varias veces).
const CHECK_EVERY_MS = 5 * 60 * 1000;

// Nombre del archivo principal de la web ("index-<huella>.js"): cambia con cada versión publicada.
const BUNDLE_PATTERN = /index-[0-9a-f]+\.js/;

// Celular: true si bajó una versión nueva, lista para usar al reiniciar.
async function downloadNativeUpdate(): Promise<boolean> {
  if (__DEV__ || !Updates.isEnabled) return false;
  const check = await Updates.checkForUpdateAsync();
  if (!check.isAvailable) return false;
  const fetched = await Updates.fetchUpdateAsync();
  return fetched.isNew;
}

// Web: true si la página publicada ya usa otro archivo principal que el que está abierto.
async function webHasNewVersion(): Promise<boolean> {
  const current = Array.from(document.scripts)
    .map((s) => s.src.match(BUNDLE_PATTERN)?.[0])
    .find(Boolean);
  if (!current) return false;
  const response = await fetch(window.location.pathname, { cache: 'no-store' });
  const latest = (await response.text()).match(BUNDLE_PATTERN)?.[0];
  return Boolean(latest && latest !== current);
}

// ── Componente ────────────────────────────────────────────────────────

export default function UpdatePrompt() {
  const styles = useStyles();
  const [ready, setReady] = useState(false);
  const [applying, setApplying] = useState(false);
  const lastCheck = useRef(0);

  useEffect(() => {
    const check = () => {
      if (Date.now() - lastCheck.current < CHECK_EVERY_MS) return;
      lastCheck.current = Date.now();
      (Platform.OS === 'web' ? webHasNewVersion() : downloadNativeUpdate())
        .then((found) => found && setReady(true))
        // Sin conexión o sin servidor de actualizaciones: se prueba la próxima vez.
        .catch(() => undefined);
    };
    check();
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && check());
    return () => subscription.remove();
  }, []);

  const apply = () => {
    setApplying(true);
    if (Platform.OS === 'web') window.location.reload();
    else Updates.reloadAsync().catch(() => setApplying(false));
  };

  if (!ready) return null;

  // Sin "Cancelar" y sin cerrar con el botón atrás: la única opción es actualizar.
  return (
    <Modal transparent visible animationType="fade" onRequestClose={() => undefined}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityRole="alert">
          <Text style={styles.title}>Hay una nueva versión</Text>
          <Text style={styles.message}>Actualizá para seguir usando la app con los últimos cambios.</Text>
          <Button label={applying ? 'Actualizando…' : 'Actualizar'} onPress={apply} disabled={applying} />
        </View>
      </View>
    </Modal>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    lineHeight: 21,
    marginBottom: spacing.xl,
  },
}));
