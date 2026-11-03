// =====================================================================
// Ayudas de navegación
// ---------------------------------------------------------------------
// Volver atrás de forma segura y abrir pantallas de otra pestaña.
// =====================================================================

export function smartGoBack(navigation: any, fallbackRouteName: string) {
  const canGoBackLocally = navigation.getState().routes.length > 1;
  if (canGoBackLocally) {
    navigation.goBack();
  } else {
    navigation.navigate(fallbackRouteName);
  }
}

// Abre una pantalla de otra pestaña dejando su lista debajo, así "atrás" vuelve a esa lista.
export function openInTab(navigation: any, tab: string, screen: string, params?: object) {
  navigation.navigate(tab, { screen, params, initial: false });
}
