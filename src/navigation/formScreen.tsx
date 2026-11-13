// =====================================================================
// Formularios
// ---------------------------------------------------------------------
// Las pantallas donde se carga algo (propiedad, inquilino, contrato, cobro, cargo e importes).
//   - Saben si ya se escribió o eligió algo: los campos (FormField, OptionChips, SelectField,
//     DateField) lo avisan solos con useFormGuard(); cada formulario avisa lo demás.
//   - En el celular, si con un formulario empezado se toca otra pestaña, se pregunta antes de
//     borrarlo (confirmLeaveForm, desde RootNavigator).
//   - En la computadora se abren como una ventana al frente: el resto se oscurece y no se puede
//     tocar; se cierra con la X (o Escape), que también pregunta si había algo cargado.
// Cambiar de pestaña del navegador o recargar la página no pregunta nada.
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { NavigationContext, useIsFocused } from '@react-navigation/native';
import { ComponentType, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { showConfirm } from '../components/DialogHost';
import { makeStyles, useTheme } from '../context/ThemeContext';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { fontSize, radius, spacing } from '../theme';

// ── Formularios con cambios sin guardar ──────────────────────────────

// Claves de las pantallas de formulario abiertas que tienen algo cargado.
const dirtyForms = new Set<string>();

export function hasUnsavedForm(): boolean {
  return dirtyForms.size > 0;
}

// Pregunta antes de descartar lo cargado; si no había nada, sigue directo.
export function confirmLeaveForm(onLeave: () => void) {
  if (!hasUnsavedForm()) {
    onLeave();
    return;
  }
  showConfirm({
    title: '¿Salir sin guardar?',
    message: 'Se va a borrar lo que cargaste en este formulario.',
    confirmLabel: 'Salir sin guardar',
    cancelLabel: 'Seguir editando',
    destructive: true,
    onConfirm: () => {
      dirtyForms.clear();
      onLeave();
    },
  });
}

interface FormGuard {
  // Se escribió o eligió algo.
  markDirty: () => void;
  // Se guardó: ya no hay nada que perder.
  markSaved: () => void;
}

const NO_GUARD: FormGuard = { markDirty: () => undefined, markSaved: () => undefined };
const FormGuardContext = createContext<FormGuard>(NO_GUARD);

// Fuera de un formulario no hace nada.
export function useFormGuard(): FormGuard {
  return useContext(FormGuardContext);
}

// ── Pantalla de formulario ───────────────────────────────────────────

interface ScreenProps {
  navigation: any;
  route: any;
}

interface FormOptions {
  // Ventana más ancha en la computadora (por ejemplo, la tabla de importes).
  wide?: boolean;
}

// Opciones de navegación de un formulario: en la computadora se dibuja encima de la pantalla
// anterior, sin barra de arriba (la ventana trae su propio título y la X).
export function formScreenOptions(desktop: boolean, title: string) {
  return desktop
    ? {
        title,
        presentation: 'transparentModal' as const,
        headerShown: false,
        animation: 'fade' as const,
        // Sin fondo propio: detrás de la ventana se sigue viendo (oscurecida) la pantalla anterior.
        contentStyle: { backgroundColor: 'transparent' },
      }
    : { title };
}

export function formScreen<P extends ScreenProps>(
  Screen: ComponentType<P>,
  titleOf: (params: any) => string,
  { wide = false }: FormOptions = {},
) {
  function FormScreen(props: P) {
    const { navigation, route } = props;
    const styles = useStyles();
    const { colors } = useTheme();
    const desktop = useIsDesktop();
    const focused = useIsFocused();
    const key: string = route.key;
    const [title, setTitle] = useState(() => titleOf(route.params));

    const guard = useMemo<FormGuard>(
      () => ({ markDirty: () => dirtyForms.add(key), markSaved: () => dirtyForms.delete(key) }),
      [key],
    );
    useEffect(() => () => void dirtyForms.delete(key), [key]);

    // El formulario puede cambiar su título (Registrar cobro → Confirmar cobro): en la ventana
    // de la computadora se muestra arriba, junto a la X.
    const navigationForForm = useMemo(
      () => ({
        ...navigation,
        setOptions: (options: { title?: string }) => {
          if (typeof options.title === 'string') setTitle(options.title);
          navigation.setOptions(options);
        },
      }),
      [navigation],
    );

    const close = useCallback(() => {
      const leave = () => navigation.goBack();
      if (dirtyForms.has(key)) confirmLeaveForm(leave);
      else leave();
    }, [navigation, key]);

    const content = (
      <FormGuardContext.Provider value={guard}>
        <NavigationContext.Provider value={navigationForForm}>
          <Screen {...props} navigation={navigationForForm} />
        </NavigationContext.Provider>
      </FormGuardContext.Provider>
    );

    if (!desktop) return content;

    return (
      <Modal transparent visible={focused} animationType="fade" onRequestClose={close}>
        {/* El fondo oscuro tapa todo (también la barra lateral) y no responde a los toques. */}
        <View style={styles.backdrop}>
          <View style={[styles.window, wide && styles.windowWide]} accessibilityViewIsModal>
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
                {title}
              </Text>
              <TouchableOpacity
                onPress={close}
                style={styles.close}
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
                hitSlop={8}
              >
                <Ionicons name="close" size={22} color={colors.onHeader} />
              </TouchableOpacity>
            </View>
            <View style={styles.body}>{content}</View>
          </View>
        </View>
      </Modal>
    );
  }
  FormScreen.displayName = `FormScreen(${Screen.displayName ?? Screen.name ?? 'Screen'})`;
  return FormScreen;
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  backdrop: {
    flex: 1,
    // Más oscuro que el de los avisos: el formulario es lo único que se puede usar.
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  window: {
    width: '100%',
    maxWidth: 640,
    height: '100%',
    maxHeight: 860,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  windowWide: {
    maxWidth: 960,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    backgroundColor: colors.header,
  },
  title: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.onHeader,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.headerChip,
  },
  body: {
    flex: 1,
  },
}));
