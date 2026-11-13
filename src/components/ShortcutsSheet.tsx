// =====================================================================
// «Más»: todos los accesos directos
// ---------------------------------------------------------------------
// Hoja que se abre con «Más» en Inicio. Muestra todas las funciones en tres columnas: la
// primera fila (con fondo) es la que se ve en Inicio. Un toque abre la función. Manteniendo
// apretada una se entra a «Ordenar accesos»: vibra cortito, los íconos se balancean suave y se
// pueden arrastrar (el orden se guarda al soltar cada uno) hasta tocar «Listo». En el celular
// sale desde abajo; en la computadora, centrada (y se arrastra con el mouse).
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityActionEvent,
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles, useTheme } from '../context/ThemeContext';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { fontSize, radius, spacing } from '../theme';
import { SHORTCUT_CATALOG, ShortcutId, ShortcutInfo, SHORTCUTS_ON_HOME } from '../utils/shortcuts';

const INFO = new Map<ShortcutId, ShortcutInfo>(SHORTCUT_CATALOG.map((s) => [s.id, s]));

// Una columna por cada acceso de Inicio: la primera fila es justo lo que se ve ahí.
const COLUMNS = SHORTCUTS_ON_HOME;
const CELL_HEIGHT = 116;
// Cuánto hay que mantener apretado para empezar a mover, y cuánto se puede correr el dedo antes.
const HOLD_MS = 300;
const TAP_TOLERANCE = 8;
// El balanceo del modo ordenar: cuánto se inclinan (grados) y cuánto tarda una ida y vuelta.
const WIGGLE_DEGREES = 1.5;
const WIGGLE_MS = 420;
const useNative = Platform.OS !== 'web';

// La lista con un elemento movido de lugar.
function moved<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

interface Drag {
  from: number;
  to: number;
}

export default function ShortcutsSheet({
  visible,
  order,
  onOpen,
  onSave,
  onClose,
}: {
  visible: boolean;
  order: ShortcutId[];
  // Abre la función tocada (la hoja ya se cerró).
  onOpen: (id: ShortcutId) => void;
  onSave: (order: ShortcutId[]) => void;
  onClose: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const desktop = useIsDesktop();
  const [draft, setDraft] = useState<ShortcutId[]>(order);
  const [gridWidth, setGridWidth] = useState(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  // «Ordenar accesos»: se entra manteniendo apretado y se sale con «Listo».
  const [editing, setEditing] = useState(false);
  const pan = useRef(new Animated.ValueXY()).current;
  const wiggle = useRef(new Animated.Value(0)).current;
  const strength = useRef(new Animated.Value(0)).current;
  const gridRef = useRef<View>(null);
  const origin = useRef({ x: 0, y: 0 });

  // Cada vez que se abre, arranca con el orden guardado.
  useEffect(() => {
    if (visible) setDraft(order);
    else setEditing(false);
  }, [visible, order]);

  // Balanceo suave mientras se ordena: arranca quieto y va tomando fuerza. Con «reducir
  // movimiento» activado en el celular, los íconos quedan quietos.
  useEffect(() => {
    if (!editing) {
      strength.setValue(0);
      return;
    }
    let loop: Animated.CompositeAnimation | undefined;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled || reduce) return;
        wiggle.setValue(0);
        loop = Animated.loop(Animated.timing(wiggle, { toValue: 1, duration: WIGGLE_MS, easing: Easing.linear, useNativeDriver: useNative }));
        loop.start();
        Animated.timing(strength, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: useNative }).start();
      });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [editing, wiggle, strength]);

  // Lo que el arrastre necesita leer al momento (los gestos se arman una sola vez).
  const latest = useRef({ draft, gridWidth, drag, editing, onOpen, onSave, onClose });
  latest.current = { draft, gridWidth, drag, editing, onOpen, onSave, onClose };

  const measure = () => gridRef.current?.measureInWindow((x, y) => (origin.current = { x, y }));

  const save = (next: ShortcutId[]) => {
    setDraft(next);
    latest.current.onSave(next);
  };

  const open = (id: ShortcutId) => {
    latest.current.onClose();
    latest.current.onOpen(id);
  };

  // — Mantener apretado y mover —
  const responder = useMemo(() => {
    const gesture = { timer: undefined as ReturnType<typeof setTimeout> | undefined, active: false, cancelled: false };
    const startDrag = (x: number, y: number) => {
      gesture.active = true;
      const index = indexAt(x, y);
      setDrag({ from: index, to: index });
      if (!latest.current.editing) {
        // Una vibración muy corta avisa que se entró a ordenar.
        Vibration.vibrate(12);
        setEditing(true);
      }
    };
    const indexAt = (pageX: number, pageY: number) => {
      const { gridWidth: width, draft: list } = latest.current;
      const col = Math.min(COLUMNS - 1, Math.max(0, Math.floor(((pageX - origin.current.x) / width) * COLUMNS)));
      const row = Math.max(0, Math.floor((pageY - origin.current.y) / CELL_HEIGHT));
      return Math.min(list.length - 1, row * COLUMNS + col);
    };
    const finish = (dropped: boolean) => {
      clearTimeout(gesture.timer);
      const current = latest.current.drag;
      if (gesture.active && current) {
        if (dropped && current.to !== current.from) save(moved(latest.current.draft, current.from, current.to));
        setDrag(null);
      }
      gesture.active = false;
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => gesture.active,
      // Mientras está apretado no se suelta (en la web, mantener apretado puede disparar una
      // selección de texto que si no cortaría el gesto).
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (_, g) => {
        measure();
        gesture.cancelled = false;
        gesture.active = false;
        pan.setValue({ x: 0, y: 0 });
        const x0 = g.x0;
        const y0 = g.y0;
        gesture.timer = setTimeout(() => {
          if (!gesture.cancelled) startDrag(x0, y0);
        }, HOLD_MS);
      },
      onPanResponderMove: (_, g) => {
        if (!gesture.active) {
          if (Math.abs(g.dx) > TAP_TOLERANCE || Math.abs(g.dy) > TAP_TOLERANCE) {
            clearTimeout(gesture.timer);
            // Ordenando, se arrastra enseguida, sin volver a esperar.
            if (latest.current.editing && !gesture.cancelled) startDrag(g.x0, g.y0);
            else gesture.cancelled = true;
          }
          if (!gesture.active) return;
        }
        pan.setValue({ x: g.dx, y: g.dy });
        const to = indexAt(g.moveX, g.moveY);
        const current = latest.current.drag;
        if (current && current.to !== to) setDrag({ ...current, to });
      },
      onPanResponderRelease: (_, g) => {
        const wasTap = !gesture.active && !gesture.cancelled;
        finish(true);
        // Mientras se ordena, un toque no abre nada (para no salir sin querer).
        if (wasTap && !latest.current.editing) open(latest.current.draft[indexAt(g.x0, g.y0)]);
      },
      onPanResponderTerminate: () => finish(false),
    });
    // Los gestos leen todo de `latest`, así que se arman una sola vez.
  }, []);

  // Cómo se ve mientras se arrastra: los demás corridos y el arrastrado siguiendo al dedo.
  const shown = drag ? moved(draft, drag.from, drag.to) : draft;
  const cellWidth = gridWidth / COLUMNS;
  const place = (index: number) => ({ left: (index % COLUMNS) * cellWidth, top: Math.floor(index / COLUMNS) * CELL_HEIGHT });
  const rows = Math.ceil(draft.length / COLUMNS);

  // Lectores de pantalla: abrir, o mover antes o después sin arrastrar.
  const onAction = (id: ShortcutId, event: AccessibilityActionEvent) => {
    const index = draft.indexOf(id);
    if (event.nativeEvent.actionName === 'activate') open(id);
    if (event.nativeEvent.actionName === 'moveEarlier' && index > 0) save(moved(draft, index, index - 1));
    if (event.nativeEvent.actionName === 'moveLater' && index < draft.length - 1) save(moved(draft, index, index + 1));
  };

  // Un vaivén con forma de ola: uno para cada lado, así los vecinos no se mueven iguales.
  const tilt = (index: number) => {
    const side = index % 2 ? -1 : 1;
    return Animated.multiply(
      wiggle.interpolate({
        inputRange: [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1],
        outputRange: [0, 0.71, 1, 0.71, 0, -0.71, -1, -0.71, 0].map((v) => v * side),
      }),
      strength,
    ).interpolate({ inputRange: [-1, 1], outputRange: [`-${WIGGLE_DEGREES}deg`, `${WIGGLE_DEGREES}deg`] });
  };

  const cell = (id: ShortcutId, index: number, lifted = false) => {
    const item = INFO.get(id)!;
    const moving = editing && !lifted;
    return (
      <Animated.View style={[styles.cellBody, moving && { transform: [{ rotate: tilt(index) }] }]}>
        <View style={[styles.circle, lifted && styles.circleLifted]}>
          <Ionicons name={item.icon} size={24} color={colors.primary} />
        </View>
        <Text style={styles.label} numberOfLines={2}>
          {item.label}
        </Text>
      </Animated.View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, desktop && styles.backdropCentered]} onPress={onClose}>
        <Pressable
          style={[styles.sheet, desktop && styles.sheetCentered, { paddingBottom: (desktop ? 0 : insets.bottom) + spacing.lg }]}
          onPress={() => {}}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{editing ? 'Ordenar accesos' : 'Todos los accesos'}</Text>
            {editing ? (
              <TouchableOpacity onPress={() => setEditing(false)} accessibilityRole="button" hitSlop={12}>
                <Text style={styles.done}>Listo</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>

          <View
            ref={gridRef}
            // En la web, el foco va a la grilla al apretarla; si no, el cambio de foco corta el gesto.
            focusable={Platform.OS === 'web'}
            style={[styles.grid, { height: rows * CELL_HEIGHT }, Platform.OS === 'web' && styles.noSelect]}
            onLayout={(e) => {
              setGridWidth(e.nativeEvent.layout.width);
              measure();
            }}
            {...responder.panHandlers}
          >
            {/* Fondo suave detrás de la primera fila: lo que se ve en Inicio. */}
            <View style={[styles.homeRow, { height: CELL_HEIGHT }]} pointerEvents="none" />
            {gridWidth
              ? shown.map((id, index) => (
                    // Las celdas no reciben el toque (lo maneja la grilla) y la que se arrastra no se
                    // desarma: queda invisible en su lugar nuevo, así el gesto no se corta.
                    <View
                      key={id}
                      pointerEvents="none"
                      style={[
                        styles.cell,
                        place(index),
                        { width: cellWidth, height: CELL_HEIGHT },
                        drag && index === drag.to ? styles.hiddenCell : null,
                      ]}
                      accessible
                      accessibilityRole="button"
                      accessibilityLabel={INFO.get(id)!.label}
                      accessibilityHint="Mantené apretado y arrastrá para cambiar el orden"
                      accessibilityActions={[
                        { name: 'activate', label: 'Abrir' },
                        { name: 'moveEarlier', label: 'Mover antes' },
                        { name: 'moveLater', label: 'Mover después' },
                      ]}
                      onAccessibilityAction={(event) => onAction(id, event)}
                    >
                      {cell(id, index)}
                    </View>
                  ))
              : null}
            {drag && gridWidth ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.cell,
                  place(drag.from),
                  { width: cellWidth, height: CELL_HEIGHT, transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: 1.08 }] },
                ]}
              >
                {cell(draft[drag.from], drag.from, true)}
              </Animated.View>
            ) : null}
          </View>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────

const useStyles = makeStyles((colors) => ({
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdropCentered: {
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sheetCentered: {
    borderRadius: radius.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  grid: {
    position: 'relative',
  },
  noSelect: {
    // En la web, mantener apretado no tiene que seleccionar el texto.
    userSelect: 'none',
  } as object,
  homeRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  hiddenCell: {
    opacity: 0,
  },
  cell: {
    position: 'absolute',
  },
  cellBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: spacing.md,
    gap: 6,
  },
  done: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.primary,
  },
  circle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleLifted: {
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 15,
    paddingHorizontal: spacing.xs,
  },
}));
