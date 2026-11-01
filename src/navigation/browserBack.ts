import { Platform } from 'react-native';

// On the web the browser's back button would leave the app. One extra history entry is kept
// while there is somewhere to go back to, and each back press is turned into an in-app back.
// Overlays (like the search sheet) register a handler so back closes them first.
let armed = false;
const handlers: (() => void)[] = [];

export function armBrowserHistory() {
  if (Platform.OS !== 'web' || armed) return;
  try {
    window.history.pushState({ appBack: true }, '');
    armed = true;
  } catch {
    // History may be unavailable in some embedded views; the in-app back still works.
  }
}

export function markBrowserHistoryPopped() {
  armed = false;
}

export function pushBackHandler(handler: () => void): () => void {
  handlers.push(handler);
  armBrowserHistory();
  return () => {
    const index = handlers.lastIndexOf(handler);
    if (index >= 0) handlers.splice(index, 1);
  };
}

// Runs and removes the newest overlay handler; false when no overlay is open.
export function runBackHandler(): boolean {
  const handler = handlers.pop();
  if (!handler) return false;
  handler();
  return true;
}
