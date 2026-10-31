interface OfflineState {
  version?: string; cache?: string; entries?: number; expectedEntries?: number;
  complete?: boolean; recent?: string[]; disabled?: boolean; error?: string;
}
export function initializeOffline() {
  const panel = document.querySelector<HTMLElement>('[data-offline-controls]');
  if (!panel || panel.dataset.ready) return;
  panel.dataset.ready = 'true'; panel.hidden = false;
  const build = document.querySelector<HTMLMetaElement>('meta[name="atlas-build"]')?.content ?? '';
  const text = document.querySelector<HTMLElement>('[data-offline-status]')!;
  const prompt = document.querySelector<HTMLElement>('[data-offline-update]')!;
  const observatory = document.querySelector<HTMLElement>('[data-offline-observatory]');
  let registration: ServiceWorkerRegistration | undefined;
  let offline: OfflineState = {};
  let phase = 'not registered'; let error: string | null = null;
  let refreshing = false; let cleared = false;
  function render() {
    const snapshot = { schemaVersion: 1, registration: phase, onlineHint: navigator.onLine, pageVersion: build,
      controlled: !!navigator.serviceWorker?.controller, updateWaiting: !!registration?.waiting,
      ...offline, error, fullOffline: 'unproven; model caches are separate' };
    text.textContent = error ?? (cleared ? 'Offline copies cleared. Model caches were not changed. Reload online to restore offline pages.' :
      offline.complete ? `Static snapshot ready · ${offline.entries} verified-at-install entries. ${navigator.onLine ? 'Network available (browser hint).' : 'Browser reports offline.'}` :
      `Offline pages: ${phase}. A complete download is required before offline use.`);
    prompt.hidden = !registration?.waiting || cleared;
    if (observatory) observatory.textContent = JSON.stringify(snapshot, null, 2);
    document.dispatchEvent(new CustomEvent('atlas:offline', { detail: snapshot }));
  }
  async function request(worker: ServiceWorker, type: string): Promise<OfflineState> {
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); reject(new Error('Offline worker did not respond')); }, 5000);
      channel.port1.onmessage = (event: MessageEvent<OfflineState>) => { clearTimeout(timer); channel.port1.close(); resolve(event.data); };
      worker.postMessage({ type, version: build }, [channel.port2]);
    });
  }
  async function measure() {
    if (cleared) return;
    try {
      const worker = navigator.serviceWorker.controller;
      if (worker) {
        offline = await request(worker, 'ATLAS_STATUS');
        if (offline.error) throw new Error(offline.error);
        if (offline.version && /^[a-f0-9]{64}$/.test(build) && offline.version !== build && !refreshing) {
          refreshing = true; location.reload(); return;
        }
      }
      render();
    } catch { error = 'Offline storage or registration is unavailable. The online portfolio still works.'; render(); }
  }
  render();
  if (!isSecureContext || !('serviceWorker' in navigator)) {
    phase = 'unsupported'; error = 'Offline installation requires HTTPS (or localhost) and service-worker support.'; render(); return;
  }
  if (!/^[a-f0-9]{64}$/.test(build)) { phase = 'development — build/preview required'; render(); return; }
  document.querySelector('[data-offline-refresh]')?.addEventListener('click', () => {
    registration?.waiting?.postMessage({ type: 'ATLAS_SKIP_WAITING' });
  });
  document.querySelector('[data-offline-check]')?.addEventListener('click', () => {
    void registration?.update().then(measure).catch(() => { error = 'Update check unavailable. Cached pages remain usable.'; render(); });
    void measure();
  });
  document.querySelector('[data-offline-clear]')?.addEventListener('click', () => {
    void (async () => {
      try {
        const worker = navigator.serviceWorker.controller ?? registration?.active;
        if (!worker) throw new Error('No active offline worker');
        await request(worker, 'ATLAS_CLEAR'); cleared = true; offline = {}; phase = 'cleared'; error = null; render();
      } catch { error = 'Could not clear offline copies. Browser storage may be denied.'; render(); }
    })();
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => { phase = 'active'; void measure(); });
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.source !== navigator.serviceWorker.controller) return;
    if (event.data?.type === 'ATLAS_CLEARED') { cleared = true; offline = {}; phase = 'cleared'; render(); }
    if (event.data?.type === 'ATLAS_ACTIVATED') void measure();
    if (event.data?.type === 'ATLAS_VERSION_CHECK') void registration?.update().catch(() => {});
  });
  for (const event of ['online', 'offline', 'pageshow']) window.addEventListener(event, () => { void measure(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void measure(); });
  async function register() {
    try {
      phase = 'registering'; render();
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
      const observe = () => {
        const worker = registration?.installing;
        if (!worker) return;
        phase = 'downloading static snapshot'; render();
        worker.addEventListener('statechange', () => {
          phase = worker.state;
          if (worker.state === 'redundant') error = 'Offline update failed integrity/download checks. Any previous snapshot is retained.';
          render(); if (worker.state === 'activated') void measure();
        });
      };
      registration.addEventListener('updatefound', observe); observe();
      if (registration.active) phase = 'active';
      await measure();
    } catch { phase = 'unavailable'; error = 'Offline registration failed. The online portfolio still works.'; render(); }
  }
  const schedule = () => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(() => { void register(); }, { timeout: 1500 });
    else setTimeout(() => { void register(); }, 0);
  };
  if (document.readyState === 'complete') schedule(); else window.addEventListener('load', schedule, { once: true });
}