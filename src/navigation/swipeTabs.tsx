// =====================================================================
// Deslizar entre pestañas
// ---------------------------------------------------------------------
// En el celular, deslizar el dedo de costado en la primera pantalla de una pestaña pasa a la
// de al lado: Inicio ↔ Alquileres ↔ Cobros ↔ Menú. Inicio es el borde izquierdo y Menú el
// derecho: más allá la pantalla apenas se estira y vuelve. Mientras se arrastra, la pantalla
// sigue un poco al dedo. Solo cuenta un gesto claramente horizontal, así no molesta al bajar
// por la lista. En la computadora no se usa (está la barra lateral).
// =====================================================================

import { ReactNode, useMemo, useRef } from 'react';
import { Animated, PanResponder, Platform } from 'react-native';
import { useIsDesktop } from '../hooks/useIsDesktop';

// Orden de las pestañas, de izquierda a derecha.
export const TAB_ORDER = ['DashboardTab', 'RentalsTab', 'PaymentsTab', 'MenuTab'];

// Cuánto hay que correr el dedo (o qué tan rápido) para cambiar de pestaña.
const SWITCH_DISTANCE = 70;
const SWITCH_VELOCITY = 0.5;
// Cuánto sigue la pantalla al dedo: más hacia una pestaña vecina, poco contra un borde.
const FOLLOW = 0.35;
const EDGE_FOLLOW = 0.12;

const useNative = Platform.OS !== 'web';

// Un gesto que empieza sobre algo que se desliza de costado (una fila de filtros) es de esa fila.
let blocked = false;
export const keepSwipeInside = {
  onTouchStart: () => {
    blocked = true;
  },
  onTouchEnd: () => {
    blocked = false;
  },
  onTouchCancel: () => {
    blocked = false;
  },
};

const isSideways = (g: { dx: number; dy: number }) =>
  !blocked && Math.abs(g.dx) > 16 && Math.abs(g.dx) > Math.abs(g.dy) * 2;

export function SwipeBetweenTabs({ navigation, children }: { navigation: any; children: ReactNode }) {
  const desktop = useIsDesktop();
  const offset = useRef(new Animated.Value(0)).current;

  const responder = useMemo(() => {
    // La pestaña de al lado (1 = derecha, -1 = izquierda), si hay.
    const neighbor = (direction: number): string | undefined => {
      const state = navigation.getParent()?.getState();
      const current = state?.routes[state.index]?.name;
      const index = TAB_ORDER.indexOf(current);
      return index < 0 ? undefined : TAB_ORDER[index + direction];
    };
    const settle = () => Animated.spring(offset, { toValue: 0, useNativeDriver: useNative, bounciness: 4 }).start();
    return PanResponder.create({
      // Solo un gesto claramente de costado; uno vertical sigue siendo para bajar por la lista.
      // Se pregunta antes que a los botones y la lista de adentro (fase de captura), así un
      // deslizamiento que empieza sobre una tarjeta también cambia de pestaña.
      onMoveShouldSetPanResponderCapture: (_, g) => isSideways(g),
      onMoveShouldSetPanResponder: (_, g) => isSideways(g),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => {
        const target = neighbor(g.dx < 0 ? 1 : -1);
        offset.setValue(g.dx * (target ? FOLLOW : EDGE_FOLLOW));
      },
      onPanResponderRelease: (_, g) => {
        const target = neighbor(g.dx < 0 ? 1 : -1);
        if (target && (Math.abs(g.dx) > SWITCH_DISTANCE || Math.abs(g.vx) > SWITCH_VELOCITY)) {
          offset.setValue(0);
          navigation.getParent()?.navigate(target);
        } else {
          settle();
        }
      },
      onPanResponderTerminate: settle,
    });
  }, [navigation, offset]);

  if (desktop) return <>{children}</>;
  return (
    <Animated.View style={{ flex: 1, transform: [{ translateX: offset }] }} {...responder.panHandlers}>
      {children}
    </Animated.View>
  );
}
