// =====================================================================
// Cartel "Instalá Locatia"
// ---------------------------------------------------------------------
// Solo cuando se abre la web en el navegador (celular o computadora), nunca en la app instalada
// ni en el APK, y solo al abrir: si el navegador avisa que se puede instalar más tarde, ya no
// aparece. "Ahora no" lo cierra hasta la próxima vez que se abra.
// - Chrome y Edge (Android, Windows, Mac): botón "Instalar", que abre el instalador del navegador.
// - iPhone y iPad: Safari no tiene ese botón; el cartel explica cómo agregarla a la pantalla de inicio.
// =====================================================================

import { useEffect, useState } from 'react';
import { Image, Platform, Text, View, useWindowDimensions } from 'react-native';
import { makeStyles } from '../context/ThemeContext';
import { getInstallEvent, isInstalled, isIOS, onInstallEvent, openedAt } from '../lib/pwa';
import { fontSize, radius, spacing } from '../theme';
import Button from './Button';

const ICON = require('../../assets/icon.png');
// Si el navegador avisa que se puede instalar después de esto, ya no se muestra.
const ONLY_AT_OPEN_MS = 15_000;
// En el iPhone no hay aviso del navegador: se muestra apenas abre, con una pausa para que cargue.
const IOS_DELAY_MS = 1500;
// Con la barra de pestañas abajo (celular), el cartel va arriba de ella.
const TAB_BAR_SPACE = 76;

type Kind = 'install' | 'ios';

export default function InstallPrompt() {
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const [kind, setKind] = useState<Kind>();
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || isInstalled()) return;
    if (isIOS()) {
      const timer = setTimeout(() => setKind('ios'), IOS_DELAY_MS);
      return () => clearTimeout(timer);
    }
    const check = () => {
      if (!getInstallEvent()) setKind(undefined);
      else if (Date.now() - openedAt < ONLY_AT_OPEN_MS) setKind('install');
    };
    check();
    return onInstallEvent(check);
  }, []);

  if (!kind) return null;

  const install = async () => {
    const event = getInstallEvent();
    if (!event) return setKind(undefined);
    setInstalling(true);
    try {
      await event.prompt();
      await event.userChoice;
    } catch {
      // El navegador no lo dejó abrir: queda como si hubiera dicho "Ahora no".
    }
    setKind(undefined);
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: width < 768 ? TAB_BAR_SPACE : spacing.xl }]}>
      <View style={styles.card} accessibilityRole="alert">
        <View style={styles.top}>
          <Image source={ICON} style={styles.icon} accessibilityIgnoresInvertColors />
          <View style={styles.texts}>
            <Text style={styles.title}>Instalá Locatia</Text>
            <Text style={styles.message}>
              {kind === 'ios'
                ? 'Tocá el botón Compartir de Safari y después «Agregar a inicio». Queda como una app, con su ícono.'
                : 'Queda como una app en tu celular o tu computadora, con su ícono y en su propia ventana.'}
            </Text>
          </View>
        </View>
        <View style={styles.buttons}>
          {kind === 'ios' ? (
            <View style={styles.button}>
              <Button label="Entendido" variant="secondary" onPress={() => setKind(undefined)} />
            </View>
          ) : (
            <>
              <View style={styles.button}>
                <Button label="Ahora no" variant="ghost" onPress={() => setKind(undefined)} />
              </View>
              <View style={styles.button}>
                <Button label={installing ? 'Instalando…' : 'Instalar'} onPress={install} disabled={installing} />
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  wrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
  },
  top: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  texts: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  message: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 19,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  button: {
    minWidth: 120,
  },
}));
