// =====================================================================
// Ayudas de navegación
// ---------------------------------------------------------------------
// Volver atrás de forma segura. (Lo que se abre desde una pestaña se queda en esa pestaña: cada
// pila registra las pantallas que necesita, ver RootNavigator.)
// =====================================================================

export function smartGoBack(navigation: any, fallbackRouteName: string) {
  const canGoBackLocally = navigation.getState().routes.length > 1;
  if (canGoBackLocally) {
    navigation.goBack();
  } else {
    navigation.navigate(fallbackRouteName);
  }
}
