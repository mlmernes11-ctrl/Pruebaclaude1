export function smartGoBack(navigation: any, fallbackRouteName: string) {
  const canGoBackLocally = navigation.getState().routes.length > 1;
  if (canGoBackLocally) {
    navigation.goBack();
  } else {
    navigation.navigate(fallbackRouteName);
  }
}
