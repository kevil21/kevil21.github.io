# ADR-017 — Hand-written versioned service worker

**Status:** accepted · 2026-11-01

`scripts/build-service-worker.ts` generates `dist/sw.js` after the Astro build. The precache list is
the app shell (home, offline, 404), the assets those pages reference, fonts, icons and the small
generated indexes; its SHA-256 versions the cache names so every deploy installs fresh and deletes old
generations. HTML is network-first with offline fallback; hashed assets, images and indexes are
cache-first. `/models/` and model downloads are never intercepted or precached: the AI runtime caches
them itself and the observatory offers a "clear downloaded models" control. Offline Full Brain is only
promised once a model is actually cached. Workbox was rejected for dependency weight and opacity.
