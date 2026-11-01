export function smartGoBack(navigation: any, fallbackRouteName: string) {
  const canGoBackLocally = navigation.getState().routes.length > 1;
  if (canGoBackLocally) {
    navigation.goBack();
  } else {
    navigation.navigate(fallbackRouteName);
  }
}

// Opens a screen of another tab keeping that tab's list underneath, so back returns to it.
export function openInTab(navigation: any, tab: string, screen: string, params?: object) {
  navigation.navigate(tab, { screen, params, initial: false });
}
