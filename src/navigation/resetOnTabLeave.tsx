// =====================================================================
// Pestañas que vuelven a empezar
// ---------------------------------------------------------------------
// Al salir de una pestaña, su primera pantalla vuelve a como recién abierta: arriba de todo, sin
// filtros, búsquedas ni nada elegido. Lo mismo al tocar otra vez la pestaña en la que ya estás.
// Las pantallas que se abrieron encima se cierran solas (popToTopOnBlur, en RootNavigator).
// Lo que llega de otra pantalla (por ejemplo, Inicio abre Alquileres con las vencidas) se usa
// esa vez y se borra al salir, para que la próxima vez la pestaña abra sin filtro.
// =====================================================================

import { ComponentType, useEffect, useState } from 'react';
import { hasUnsavedForm } from './formScreen';

interface ScreenProps {
  navigation: any;
  route: any;
}

// Envuelve la primera pantalla de una pestaña. paramKeys: los datos que otras pantallas le pasan
// (filtros) y que hay que olvidar al salir.
export function resetOnTabLeave<P extends ScreenProps>(Screen: ComponentType<P>, paramKeys: string[] = []) {
  function ResettingScreen(props: P) {
    const { navigation } = props;
    // Cambiar la clave vuelve a armar la pantalla desde cero.
    const [generation, setGeneration] = useState(0);

    useEffect(() => {
      const tab = navigation.getParent();
      if (!tab) return undefined;
      const reset = () => {
        if (paramKeys.length) navigation.setParams(Object.fromEntries(paramKeys.map((key) => [key, undefined])));
        setGeneration((g) => g + 1);
      };
      const offBlur = tab.addListener('blur', reset);
      // Tocar la pestaña en la que ya estás también la limpia.
      // Con un formulario empezado, primero se pregunta (ver formScreen); acá no se toca nada.
      const offPress = tab.addListener('tabPress', () => {
        if (tab.isFocused() && !hasUnsavedForm()) reset();
      });
      return () => {
        offBlur();
        offPress();
      };
    }, [navigation]);

    return <Screen key={generation} {...props} />;
  }
  ResettingScreen.displayName = `ResetOnTabLeave(${Screen.displayName ?? Screen.name ?? 'Screen'})`;
  return ResettingScreen;
}
