// =====================================================================
// Deslizar entre pestañas
// ---------------------------------------------------------------------
// En el celular, deslizar el dedo de costado en la primera pantalla de una pestaña pasa a la
// de al lado: Inicio ↔ Alquileres ↔ Cobros ↔ Menú. Funciona como hojas puestas una al lado de
// la otra: la pantalla sigue al dedo y la pestaña vecina va asomando; al soltar, termina de
// entrar (o vuelve, si el gesto fue cortito). Inicio es el borde izquierdo y Menú el derecho:
// más allá la pantalla no se mueve. Solo cuenta un gesto claramente horizontal,
// así no molesta al bajar por la lista. Solo en el celular: la app de Android y la web usada
// con el dedo; en la computadora (con mouse, o pantalla ancha con barra lateral) no se usa.
//
// Para que se vea la vecina mientras se arrastra, las pestañas quedan armadas a los costados
// (RootNavigator: sin desarmar las inactivas y con la animación de abajo), y las de al lado se
// preparan apenas se entra a una. En Android, la barra de pestañas igual ocultaba las inactivas
// hasta el final del cambio (se veía gris al arrastrar): lo corrige un parche chico en
// patches/@react-navigation+bottom-tabs, que se aplica solo al instalar (npm install).
// =====================================================================

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Animated, Dimensions, Easing, PanResponder, Platform, View } from 'react-native';
import { useIsDesktop } from '../hooks/useIsDesktop';

// Orden de las pestañas, de izquierda a derecha.
const TAB_ORDER = ['DashboardTab', 'RentalsTab', 'PaymentsTab', 'MenuTab'];

// Para cambiar de pestaña: correr el dedo una cuarta parte del ancho, o soltarlo con envión.
const SWITCH_SHARE = 0.25;
const SWITCH_VELOCITY = 0.35;
// Cuánto tarda en terminar de entrar la pestaña nueva (igual al tocar la barra de abajo).
const DURATION = 260;
const EASING = Easing.out(Easing.cubic);

const useNative = Platform.OS !== 'web';

// Pantalla táctil: la app, o la web en un celular o tablet (no con mouse).
const TOUCH =
  Platform.OS !== 'web' ||
  (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches);

// Qué pestaña se ve, con decimales mientras se arrastra o se anima (1.5 = mitad Alquileres y mitad
// Cobros). Cada pestaña se dibuja corrida (su lugar − pos) anchos de pantalla, así que todas se
// mueven juntas, siempre pegadas: nunca queda un hueco entre una pantalla y la otra, por rápido que
// se deslice. Lo mueven el dedo y el cambio de pestaña (deslizando o tocando la barra de abajo).
const pos = new Animated.Value(0);
const LAST = TAB_ORDER.length - 1;
// Adónde va (o dónde quedó) pos; null hasta que se abre la primera pestaña.
let posTarget: number | null = null;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// La pestaña que se ve ahora (posición en TAB_ORDER).
const focusedIndex = (tabs: any): number => {
  const state = tabs?.getState();
  return TAB_ORDER.indexOf(state?.routes[state.index]?.name);
};

function animateTo(index: number) {
  posTarget = index;
  Animated.timing(pos, { toValue: index, duration: DURATION, easing: EASING, useNativeDriver: useNative }).start();
}

// Cambió la pestaña: la primera vez se ubica sin animación; después, entra de costado (si el dedo ya
// la está llevando, no hace nada).
function slideTo(index: number) {
  if (index < 0 || index === posTarget) return;
  if (posTarget === null) {
    posTarget = index;
    pos.setValue(index);
    return;
  }
  animateTo(index);
}

// Cómo entran y salen las pestañas en el celular: corridas de costado, una al lado de la otra.
// (Para la barra de abajo de RootNavigator; tab es la pestaña.)
export function tabSlide(tab: string) {
  const mine = TAB_ORDER.indexOf(tab);
  return {
    transitionSpec: { animation: 'timing' as const, config: { duration: DURATION, easing: EASING } },
    sceneStyleInterpolator: ({ current }: { current: { progress: Animated.AnimatedInterpolation<number> } }) => {
      const width = Dimensions.get('window').width;
      const translateX =
        mine < 0
          ? current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [-width, 0, width] })
          : pos.interpolate({ inputRange: [0, LAST], outputRange: [mine * width, (mine - LAST) * width] });
      return { sceneStyle: { transform: [{ translateX }] } };
    },
  };
}

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

const isSideways = (g: { dx: number; dy: number }) => !blocked && Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 2;

export function SwipeBetweenTabs({ navigation, tab: myTab, children }: { navigation: any; tab: string; children: ReactNode }) {
  const desktop = useIsDesktop();
  const enabled = TOUCH && !desktop;
  const mine = TAB_ORDER.indexOf(myTab);
  const [focused, setFocused] = useState(() => focusedIndex(navigation.getParent()));

  useEffect(() => {
    const tabs = navigation.getParent();
    if (!tabs) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Al entrar a la app se preparan todas las pestañas, así cualquiera asoma al deslizar, por
    // rápido que se pase (preparar una que ya está armada no hace nada).
    const prepareNeighbors = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        TAB_ORDER.forEach((name, index) => {
          if (index !== mine) tabs.preload?.(name);
        });
      }, 150);
    };
    const update = () => {
      const index = focusedIndex(tabs);
      setFocused(index);
      slideTo(index);
      if (enabled && index === mine) prepareNeighbors();
    };
    update();
    const offState = tabs.addListener('state', update);
    const offFocus = navigation.addListener('focus', update);
    return () => {
      clearTimeout(timer);
      offState();
      offFocus();
    };
  }, [navigation, enabled, mine]);

  const responder = useMemo(() => {
    const tabs = () => navigation.getParent();
    // Dónde estaba pos al apoyar el dedo, y la pestaña de ese momento.
    let startPos = 0;
    let here = 0;
    return PanResponder.create({
      // Solo un gesto claramente de costado; uno vertical sigue siendo para bajar por la lista.
      // Se pregunta antes que a los botones y la lista de adentro (fase de captura), así un
      // deslizamiento que empieza sobre una tarjeta también cambia de pestaña.
      onMoveShouldSetPanResponderCapture: (_, g) => isSideways(g),
      onMoveShouldSetPanResponder: (_, g) => isSideways(g),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        here = focusedIndex(tabs());
        // Si todavía estaba entrando otra pestaña, se agarra desde donde iba.
        startPos = posTarget ?? here;
        pos.stopAnimation((value) => {
          startPos = value;
        });
      },
      onPanResponderMove: (_, g) => {
        if (here < 0) return;
        const width = Dimensions.get('window').width;
        // Hasta la vecina, y contra un borde (Inicio o Menú) la pantalla queda quieta.
        pos.setValue(clamp(startPos - g.dx / width, Math.max(0, here - 1), Math.min(LAST, here + 1)));
      },
      onPanResponderRelease: (_, g) => {
        if (here < 0) return;
        const width = Dimensions.get('window').width;
        // El envión cuenta solo si va para el mismo lado que el dedo.
        const flung = Math.abs(g.vx) > SWITCH_VELOCITY && Math.sign(g.vx) === Math.sign(g.dx);
        const far = Math.abs(g.dx) > width * SWITCH_SHARE && Math.sign(g.vx) !== -Math.sign(g.dx);
        const target = flung || far ? clamp(here + (g.dx < 0 ? 1 : -1), 0, LAST) : here;
        animateTo(target);
        if (target !== here) tabs()?.navigate(TAB_ORDER[target]);
      },
      onPanResponderTerminate: () => {
        if (here >= 0) animateTo(here);
      },
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
