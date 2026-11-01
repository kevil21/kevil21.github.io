/** Registers the generated service worker on secure contexts, after load, never blocking first render. */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!window.isSecureContext) return;
  if (import.meta.env.DEV) return; // the worker is generated after the build
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((e: Error) => console.warn('[sw] registration failed:', e.message));
  });
}
