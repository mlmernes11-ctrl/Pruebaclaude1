import { registerRootComponent } from 'expo';

import App from './App';
import { installPwaSupport } from './src/lib/pwa';

// Web: instalable como app (ver src/lib/pwa.ts).
installPwaSupport();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
