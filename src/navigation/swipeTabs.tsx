// =====================================================================
// Deslizar entre pestañas
// ---------------------------------------------------------------------
// En el celular, deslizar el dedo de costado en la primera pantalla de una pestaña pasa a la
// de al lado: Inicio ↔ Alquileres ↔ Cobros ↔ Menú. Funciona como hojas puestas una al lado de
// la otra: la pantalla sigue al dedo y la pestaña vecina va asomando; al soltar, termina de
// entrar (o vuelve, si el gesto fue cortito). Inicio es el borde izquierdo y Menú el derecho:
// más allá la pantalla apenas se estira y vuelve. Solo cuenta un gesto claramente horizontal,
// así no molesta al bajar por la lista. Solo en el celular: la app de Android y la web usada
// con el dedo; en la computadora (con mouse, o pantalla ancha con barra lateral) no se usa.
//
// Para que se vea la vecina mientras se arrastra, las pestañas quedan armadas a los costados
// (RootNavigator: sin desarmar las inactivas y con la animación de abajo), y las de al lado se
// preparan apenas se entra a una.
// =====================================================================

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Animated, Dimensions, Easing, PanResponder, Platform, View } from 'react-native';
import { useIsDesktop } from '../hooks/useIsDesktop';

// Orden de las pestañas, de izquierda a derecha.
export const TAB_ORDER = ['DashboardTab', 'RentalsTab', 'PaymentsTab', 'MenuTab'];

// Para cambiar de pestaña: correr el dedo una cuarta parte del ancho, o soltarlo con envión.
const SWITCH_SHARE = 0.25;
const SWITCH_VELOCITY = 0.35;
// Contra un borde (Inicio o Menú), la pantalla apenas se estira.
const EDGE_FOLLOW = 0.15;
// Cuánto tarda en terminar de entrar la pestaña nueva (igual al tocar la barra de abajo).
const DURATION = 260;
const EASING = Easing.out(Easing.cubic);

const useNative = Platform.OS !== 'web';

// Pantalla táctil: la app, o la web en un celular o tablet (no con mouse).
const TOUCH =
  Platform.OS !== 'web' ||
  (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches);

// Cuánto está corrido el dedo. Lo comparten la pestaña actual y sus dos vecinas, que se mueven juntas.
const drag = new Animated.Value(0);

// La pestaña que se ve ahora (posición en TAB_ORDER).
const focusedIndex = (tabs: any): number => {
  const state = tabs?.getState();
  return TAB_ORDER.indexOf(state?.routes[state.index]?.name);
};

// Cómo entran y salen las pestañas en el celular: corridas de costado, una al lado de la otra,
// y la actual y sus vecinas siguen al dedo. (Para la barra de abajo de RootNavigator; tab es la
// pestaña y tabs, la navegación de la barra.)
export function tabSlide(tab: string, tabs: any) {
  const mine = TAB_ORDER.indexOf(tab);
  return {
    transitionSpec: { animation: 'timing' as const, config: { duration: DURATION, easing: EASING } },
    sceneStyleInterpolator: ({ current }: { current: { progress: Animated.AnimatedInterpolation<number> } }) => {
      const width = Dimensions.get('window').width;
      const slide = current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [-width, 0, width] });
      // Las que están a más de una de distancia quedan quietas, fuera de la pantalla.
      const focused = focusedIndex(tabs);
      const follows = TOUCH && (focused < 0 || Math.abs(mine - focused) <= 1);
      return { sceneStyle: { transform: [{ translateX: follows ? Animated.add(slide, drag) : slide }] } };
    },
  };
}
// Después de soltar, el corrimiento vuelve a cero a la par de la animación de la pestaña nueva.
let finishPending = false;
const finishDrag = () => {
  if (!finishPending) return;
  finishPending = false;
  Animated.timing(drag, { toValue: 0, duration: DURATION, easing: EASING, useNativeDriver: useNative }).start();
};

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
  !blocked && Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 2;

export function SwipeBetweenTabs({ navigation, tab: myTab, children }: { navigation: any; tab: string; children: ReactNode }) {
  const desktop = useIsDesktop();
  const enabled = TOUCH && !desktop;
  const mine = TAB_ORDER.indexOf(myTab);
  const [focused, setFocused] = useState(() => focusedIndex(navigation.getParent()));

  useEffect(() => {
    const tabs = navigation.getParent();
    if (!enabled || !tabs) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Al entrar a esta pestaña se preparan las de al lado, así asoman al deslizar.
    const prepareNeighbors = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        for (const step of [-1, 1]) {
          const name = TAB_ORDER[mine + step];
          if (name) tabs.preload?.(name);
        }
      }, 400);
    };
    const update = () => {
      const index = focusedIndex(tabs);
      setFocused(index);
      if (index === mine) prepareNeighbors();
    };
    update();
    const offState = tabs.addListener('state', update);
    const offFocus = navigation.addListener('focus', update);
    // La pestaña nueva arranca su animación: el dedo suelta a la par.
    const offStart = tabs.addListener('transitionStart', finishDrag);
    return () => {
      clearTimeout(timer);
      offState();
      offFocus();
      offStart();
    };
  }, [navigation, enabled, mine]);

  const responder = useMemo(() => {
    const tabs = () => navigation.getParent();
    // La pestaña de al lado (1 = derecha, -1 = izquierda), si hay.
    const neighbor = (direction: number): string | undefined => {
      const index = focusedIndex(tabs());
      return index < 0 ? undefined : TAB_ORDER[index + direction];
    };
    const settle = () => Animated.spring(drag, { toValue: 0, useNativeDriver: useNative, bounciness: 2, speed: 16 }).start();
    return PanResponder.create({
      // Solo un gesto claramente de costado; uno vertical sigue siendo para bajar por la lista.
      // Se pregunta antes que a los botones y la lista de adentro (fase de captura), así un
      // deslizamiento que empieza sobre una tarjeta también cambia de pestaña.
      onMoveShouldSetPanResponderCapture: (_, g) => isSideways(g),
      onMoveShouldSetPanResponder: (_, g) => isSideways(g),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        finishPending = false;
        drag.stopAnimation();
      },
      onPanResponderMove: (_, g) => {
        const target = neighbor(g.dx < 0 ? 1 : -1);
        drag.setValue(target ? g.dx : g.dx * EDGE_FOLLOW);
      },
      onPanResponderRelease: (_, g) => {
        const target = neighbor(g.dx < 0 ? 1 : -1);
        const width = Dimensions.get('window').width;
        // El envión cuenta solo si va para el mismo lado que el dedo.
        const flung = Math.abs(g.vx) > SWITCH_VELOCITY && Math.sign(g.vx) === Math.sign(g.dx);
        const far = Math.abs(g.dx) > width * SWITCH_SHARE && Math.sign(g.vx) !== -Math.sign(g.dx);
        if (target && (flung || far)) {
          finishPending = true;
          tabs()?.navigate(target);
          // Por si la animación de la pestaña no avisa que empezó.
          setTimeout(finishDrag, 60);
        } else {
          settle();
        }
      },
      onPanResponderTerminate: settle,
    });
  }, [navigation]);

  if (!enabled) return <>{children}</>;
  // El gesto lo escucha solo la pestaña que se ve (lo que se mueve es la pestaña entera, ver tabSlide).
  return (
    <View style={{ flex: 1 }} {...(mine === focused ? responder.panHandlers : null)}>
      {children}
    </View>
  );
}
