import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { aiState } from '@/lib/stores/ai';
import { persona } from '@/lib/stores/persona';
import { resolvedTheme } from '@/lib/stores/theme';
import type { Capabilities } from '@/ai/runtime/capability';
import type { AIManifest } from '@/ai/protocol';

interface SWInfo {
  state: 'unsupported' | 'none' | 'installing' | 'active';
  version?: string;
  precached?: number;
}

export default function Observatory({
  manifest,
}: {
  manifest: AIManifest & { semanticAvailable?: boolean };
}) {
  const ai = useStore(aiState);
  const p = useStore(persona);
  const theme = useStore(resolvedTheme);
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [sw, setSw] = useState<SWInfo>({ state: 'none' });
  const [cache, setCache] = useState<{ names: string[]; usageMB: number | null }>({
    names: [],
    usageMB: null,
  });
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState<number | null>(null);

  useEffect(() => {
    import('@/ai/runtime/capability').then(({ detectCapabilities }) => detectCapabilities().then(setCaps));
    import('@/ai/runtime/pocket-client').then(({ getPocketClient }) => getPocketClient());
    const refreshCaches = async () => {
      try {
        const names = await caches.keys();
        const est = navigator.storage?.estimate ? await navigator.storage.estimate() : null;
        setCache({ names, usageMB: est?.usage ? Math.round(est.usage / 1e6) : null });
      } catch {
        setCache({ names: [], usageMB: null });
      }
    };
    void refreshCaches();
    const t = setInterval(refreshCaches, 4000);
    if (!('serviceWorker' in navigator)) setSw({ state: 'unsupported' });
    else {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return setSw({ state: 'none' });
        if (reg.active) {
          setSw({ state: 'active' });
          const onMsg = (e: MessageEvent) => {
            if (e.data?.type === 'SW_VERSION')
              setSw({ state: 'active', version: e.data.version, precached: e.data.precached });
          };
          navigator.serviceWorker.addEventListener('message', onMsg);
          reg.active.postMessage('GET_VERSION');
        } else setSw({ state: 'installing' });
      });
    }
    return () => clearInterval(t);
  }, []);

  const tier = ai.full === 'ready' || ai.full === 'generating' ? 2 : ai.pocket === 'idle' ? 0 : 1;
  const yes = (v: boolean | null | undefined) => (v === null || v === undefined ? '…' : v ? 'yes' : 'no');

  const clearModels = async () => {
    setClearing(true);
    const { getFullClient } = await import('@/ai/runtime/full-client');
    const n = await getFullClient().clearModels();
    setCleared(n);
    setClearing(false);
  };

  return (
    <div class="obs">
      <section class="obs__grid" aria-label="Live runtime state">
        <Tile
          label="active tier"
          value={`Tier ${tier}`}
          sub={tier === 2 ? 'Full Brain' : tier === 1 ? 'Pocket Brain' : 'Static'}
          tone={tier === 2 ? 'ink-signal' : tier === 1 ? 'ink-trace' : 'text-3'}
        />
        <Tile
          label="pocket brain"
          value={ai.pocket.replace('-', ' ')}
          sub={
            ai.semanticModel
              ? ai.semanticModel.split('@')[0]
              : `${ai.indexChunks || manifest.version ? ai.indexChunks : 0} chunks`
          }
          tone="ink-trace"
        />
        <Tile
          label="full brain"
          value={ai.full}
          sub={
            ai.fullModel ??
            (caps ? (caps.fullBrainEligible ? 'eligible · opt-in' : (caps.fullBrainBlockers[0] ?? '')) : '…')
          }
          tone="ink-signal"
        />
        <Tile
          label="last path"
          value={ai.lastPath ?? '—'}
          sub={ai.lastEvidence.length ? `${ai.lastEvidence.length} evidence chunks` : 'no query yet'}
        />
        <Tile
          label="webgpu"
          value={yes(caps?.webgpu)}
          sub={caps ? (caps.shaderF16 ? 'shader-f16 ✓' : 'no shader-f16') : ''}
        />
        <Tile
          label="workers · wasm"
          value={`${yes(caps?.workers)} · ${yes(caps?.wasm)}`}
          sub={caps ? `render tier: ${caps.renderTier}` : ''}
        />
        <Tile
          label="index version"
          value={manifest.version.split('+')[1] ?? manifest.version}
          sub={new Date(manifest.generatedAt).toISOString().slice(0, 10)}
        />
        <Tile
          label="service worker"
          value={sw.state}
          sub={sw.version ? `build ${sw.version} · ${sw.precached} precached` : ''}
        />
        <Tile
          label="model cache"
          value={cache.usageMB !== null ? `${cache.usageMB} MB used` : '—'}
          sub={`${cache.names.length} cache${cache.names.length === 1 ? '' : 's'}`}
        />
        <Tile
          label="persona · theme"
          value={`${p} · ${theme}`}
          sub={caps?.coarsePointer ? 'touch-first device' : 'pointer device'}
        />
        <Tile
          label="storage"
          value={caps?.storageQuotaMB ? `${Math.round(caps.storageQuotaMB / 1000)} GB quota` : '—'}
          sub={caps ? (caps.persistentStorage ? 'persistent' : 'best-effort') : ''}
        />
        <Tile
          label="save-data · memory"
          value={`${yes(caps?.saveData)} · ${caps?.deviceMemoryGB ? `${caps.deviceMemoryGB} GB` : 'n/a'}`}
          sub={caps?.online === false ? 'offline' : 'online'}
        />
      </section>
      {ai.lastError && <p class="note note--warn small">last error: {ai.lastError}</p>}
      <section class="card flow" aria-labelledby="obs-controls">
        <h2 id="obs-controls" style="font-size:var(--fs-1)">
          Your data, your device
        </h2>
        <p class="small muted">
          Models and indexes are cached in this browser only. Nothing you type is sent anywhere. You can
          remove every cached model and saved consent here.
        </p>
        <div class="cluster">
          <button type="button" class="btn" onClick={clearModels} disabled={clearing}>
            {clearing ? 'Clearing…' : 'Clear downloaded models'}
          </button>
          {cleared !== null && (
            <span class="small faint">
              removed {cleared} cache{cleared === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <p class="small faint">Caches present: {cache.names.length ? cache.names.join(', ') : 'none'}</p>
      </section>
      <style>{`
        .obs{display:grid;gap:var(--sp-5)}
        .obs__grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,11rem),1fr));gap:var(--sp-2)}
        .tile{display:grid;gap:2px;padding:var(--sp-3);border-radius:var(--r-2);background:var(--surface-1);border:var(--hairline) solid var(--border);min-inline-size:0}
        .tile__label{font-family:var(--font-mono);font-size:var(--fs--2);color:var(--text-3)}
        .tile__value{font-weight:600;font-size:var(--fs-0);color:var(--tone,var(--text-1));overflow-wrap:anywhere;transition:color var(--dur-normal) var(--ease-standard)}
        .tile__sub{font-size:var(--fs--2);color:var(--text-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      `}</style>
    </div>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div class="tile" style={tone ? `--tone:var(--${tone})` : undefined}>
      <span class="tile__label">{label}</span>
      <span class="tile__value">{value}</span>
      {sub && (
        <span class="tile__sub" title={sub}>
          {sub}
        </span>
      )}
    </div>
  );
}
