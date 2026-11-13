// =====================================================================
// «Más»: todos los accesos directos
// ---------------------------------------------------------------------
// Hoja que se abre con «Más» en Inicio. Muestra todas las funciones en tres columnas: la
// primera fila es la que se ve en Inicio. Un toque abre la función; manteniendo apretada una y
// arrastrándola se cambia el orden, que se guarda al soltar. En el celular sale desde abajo;
// en la computadora, centrada (y se arrastra con el mouse).
// =====================================================================

import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityActionEvent,
  Animated,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles, useTheme } from '../context/ThemeContext';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { fontSize, radius, spacing } from '../theme';
import { DEFAULT_ORDER, SHORTCUT_CATALOG, ShortcutId, ShortcutInfo, SHORTCUTS_ON_HOME } from '../utils/shortcuts';

const INFO = new Map<ShortcutId, ShortcutInfo>(SHORTCUT_CATALOG.map((s) => [s.id, s]));

// Una columna por cada acceso de Inicio: la primera fila es justo lo que se ve ahí.
const COLUMNS = SHORTCUTS_ON_HOME;
const CELL_HEIGHT = 100;
// Cuánto hay que mantener apretado para empezar a mover, y cuánto se puede correr el dedo antes.
const HOLD_MS = 300;
const TAP_TOLERANCE = 8;

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
  const pan = useRef(new Animated.ValueXY()).current;
  const gridRef = useRef<View>(null);
  const origin = useRef({ x: 0, y: 0 });

  // Cada vez que se abre, arranca con el orden guardado.
  useEffect(() => {
    if (visible) setDraft(order);
  }, [visible, order]);

  // Lo que el arrastre necesita leer al momento (los gestos se arman una sola vez).
  const latest = useRef({ draft, gridWidth, drag, onOpen, onSave, onClose });
  latest.current = { draft, gridWidth, drag, onOpen, onSave, onClose };

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
          if (gesture.cancelled) return;
          gesture.active = true;
          const index = indexAt(x0, y0);
          setDrag({ from: index, to: index });
        }, HOLD_MS);
      },
      onPanResponderMove: (_, g) => {
        if (!gesture.active) {
          if (Math.abs(g.dx) > TAP_TOLERANCE || Math.abs(g.dy) > TAP_TOLERANCE) {
            gesture.cancelled = true;
            clearTimeout(gesture.timer);
          }
          return;
        }
        pan.setValue({ x: g.dx, y: g.dy });
        const to = indexAt(g.moveX, g.moveY);
        const current = latest.current.drag;
        if (current && current.to !== to) setDrag({ ...current, to });
      },
      onPanResponderRelease: (_, g) => {
        const wasTap = !gesture.active && !gesture.cancelled;
        finish(true);
        if (wasTap) open(latest.current.draft[indexAt(g.x0, g.y0)]);
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
  const changed = draft.some((id, i) => id !== DEFAULT_ORDER[i]);

  // Lectores de pantalla: abrir, o mover antes o después sin arrastrar.
  const onAction = (id: ShortcutId, event: AccessibilityActionEvent) => {
    const index = draft.indexOf(id);
    if (event.nativeEvent.actionName === 'activate') open(id);
    if (event.nativeEvent.actionName === 'moveEarlier' && index > 0) save(moved(draft, index, index - 1));
    if (event.nativeEvent.actionName === 'moveLater' && index < draft.length - 1) save(moved(draft, index, index + 1));
  };

  const cell = (id: ShortcutId, lifted = false) => {
    const item = INFO.get(id)!;
    return (
      <>
        <View style={[styles.circle, lifted && styles.circleLifted]}>
          <Ionicons name={item.icon} size={24} color={colors.primary} />
        </View>
        <Text style={styles.label} numberOfLines={2}>
          {item.label}
        </Text>
      </>
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
            <Text style={styles.title}>Todos los accesos</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>
            La primera fila es la que ves en Inicio. Tocá una para abrirla, o mantenela apretada y arrastrala para
            cambiar el orden.
          </Text>

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
                      {cell(id)}
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
                {cell(draft[drag.from], true)}
              </Animated.View>
            ) : null}
          </View>

          {changed ? (
            <TouchableOpacity onPress={() => save(DEFAULT_ORDER)} style={styles.reset} accessibilityRole="button">
              <Text style={styles.resetText}>Restablecer orden</Text>
            </TouchableOpacity>
          ) : null}
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
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    lineHeight: 19,
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
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
  reset: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  resetText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
}));
