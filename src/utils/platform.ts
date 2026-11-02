import { Platform } from 'react-native';

// The web preview runs inside another page (claude.ai), which blocks requests to other sites.
export function embeddedPreview(): boolean {
  if (Platform.OS !== 'web') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}
