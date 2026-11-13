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
import { SwipeBetweenTabs } from './swipeTabs';

interface ScreenProps {
  navigation: any;
  route: any;
}

// Cuánto esperar después de salir para volver a armarla: que primero termine de irse de la
// pantalla, así rearmarla no frena la animación.
const RESET_DELAY = 400;

// Envuelve la primera pantalla de una pestaña. tab: el nombre de la pestaña (para deslizar).
// paramKeys: los datos que otras pantallas le pasan (filtros) y que hay que olvidar al salir.
export function resetOnTabLeave<P extends ScreenProps>(Screen: ComponentType<P>, tab: string, paramKeys: string[] = []) {
  function ResettingScreen(props: P) {
    const { navigation } = props;
    // Cambiar la clave vuelve a armar la pantalla desde cero.
    const [generation, setGeneration] = useState(0);

    useEffect(() => {
      const tabs = navigation.getParent();
      if (!tabs) return undefined;
      const reset = () => {
        if (paramKeys.length) navigation.setParams(Object.fromEntries(paramKeys.map((key) => [key, undefined])));
        setGeneration((g) => g + 1);
      };
      let timer: ReturnType<typeof setTimeout> | undefined;
      const offBlur = tabs.addListener('blur', () => {
        clearTimeout(timer);
        timer = setTimeout(reset, RESET_DELAY);
      });
      // Tocar la pestaña en la que ya estás también la limpia.
      // Con un formulario empezado, primero se pregunta (ver formScreen); acá no se toca nada.
      const offPress = tabs.addListener('tabPress', () => {
        if (tabs.isFocused() && !hasUnsavedForm()) reset();
      });
      return () => {
        clearTimeout(timer);
        offBlur();
        offPress();
      };
    }, [navigation]);

    // En el celular, además, se pasa a la pestaña de al lado deslizando (ver swipeTabs).
    return (
      <SwipeBetweenTabs navigation={navigation} tab={tab}>
        <Screen key={generation} {...props} />
      </SwipeBetweenTabs>
    );
  }
  ResettingScreen.displayName = `ResetOnTabLeave(${Screen.displayName ?? Screen.name ?? 'Screen'})`;
  return ResettingScreen;
}
