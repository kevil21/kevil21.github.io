/**
 * Control panel island: an HTML panel over the 3D (or standalone on a machine page). Live readouts from the simulation,
 * controls that write to the bus, decisions as switches that explain themselves (narration from the decision records),
 * and the plaque's facts stay in the page's static HTML. Phone: rendered inside a bottom sheet by the page CSS.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { controls, narration, readouts, setControlValue, narrate } from '@/hall/bus';
import type { ControlValue } from '@/sim/types';
import { labWeather, fireEgg } from '@/hall/eggs';

export interface PanelControl {
  id: string;
  label: string;
  kind: 'range' | 'toggle' | 'select' | 'lever' | 'button';
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  default: ControlValue;
  note?: string;
}
export interface PanelReadout {
  id: string;
  label: string;
  unit?: string;
}
export interface PanelDecision {
  id: string;
  title: string;
  narration: string;
  control?: string;
}
interface Props {
  slug: string;
  name: string;
  controls: PanelControl[];
  readouts: PanelReadout[];
  decisions: PanelDecision[];
  /** Run the simulation here when no hall is mounted (machine pages). */
  headless?: boolean;
  compact?: boolean;
}

export default function ControlPanel({
  slug,
  name,
  controls: defs,
  readouts: outs,
  decisions,
  headless = false,
  compact = false,
}: Props) {
  const allControls = useStore(controls);
  const allReadouts = useStore(readouts);
  const lines = useStore(narration);
  const mine = allControls[slug] ?? {};
  const values = allReadouts[slug] ?? {};
  const [openDecision, setOpenDecision] = useState<string | null>(null);
  const [weather, setWeather] = useState<{ headline: string; detail: string } | null>(null);

  // Seed defaults once, and again after a resetFloor (the entry disappears from the bus)
  const seeded = allControls[slug] !== undefined;
  useEffect(() => {
    if (!seeded) for (const c of defs) setControlValue(slug, c.id, c.default);
  }, [slug, seeded]);

  useEffect(() => {
    if (!headless) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    void import('@/hall/headless').then(({ runHeadless }) => {
      if (!cancelled) stop = runHeadless(slug);
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [slug, headless]);

  const byControl = useMemo(() => {
    const m = new Map<string, PanelDecision[]>();
    for (const d of decisions) if (d.control) m.set(d.control, [...(m.get(d.control) ?? []), d]);
    return m;
  }, [decisions]);

  const set = (c: PanelControl, v: ControlValue) => {
    setControlValue(slug, c.id, v);
    const ds = byControl.get(c.id);
    if (ds && ds.length) narrate(slug, ds[0]!.narration);
  };

  const val = (c: PanelControl): ControlValue => (mine[c.id] !== undefined ? mine[c.id]! : c.default);

  return (
    <section
      class={`panel ${compact ? 'panel--compact' : ''}`}
      aria-label={`${name} control panel`}
      data-panel={slug}
    >
      <header class="panel__head">
        <span class="eyebrow">Control panel</span>
        <span class="sample-tag">sample data</span>
      </header>
      <dl class="panel__readouts">
        {outs.map((r) => (
          <div class="panel__readout" key={r.id} data-readout={r.id}>
            <dt>{r.label}</dt>
            <dd>
              <span class="panel__value mono">{values[r.id] ?? '—'}</span>
              {r.unit && <span class="panel__unit mono"> {r.unit}</span>}
            </dd>
          </div>
        ))}
      </dl>
      <div class="panel__controls">
        {defs.map((c) => {
          const v = val(c);
          const id = `pc-${slug}-${c.id}`;
          return (
            <div class="panel__control" key={c.id}>
              {c.kind === 'range' && (
                <>
                  <label for={id}>
                    {c.label} <output class="mono">{String(v)}</output>
                  </label>
                  <input
                    id={id}
                    type="range"
                    min={c.min}
                    max={c.max}
                    step={c.step ?? 1}
                    value={Number(v)}
                    onInput={(e) => set(c, Number((e.target as HTMLInputElement).value))}
                  />
                </>
              )}
              {(c.kind === 'toggle' || c.kind === 'lever') && (
                <button
                  type="button"
                  id={id}
                  class={`panel__switch ${c.kind === 'lever' ? 'panel__switch--lever' : ''}`}
                  role="switch"
                  aria-checked={Boolean(v)}
                  onClick={() => set(c, !v)}
                >
                  <span class="panel__knob" aria-hidden="true" />
                  <span>{c.label}</span>
                </button>
              )}
              {c.kind === 'select' && (
                <>
                  <label for={id}>{c.label}</label>
                  <select
                    id={id}
                    value={String(v)}
                    onChange={(e) => set(c, (e.target as HTMLSelectElement).value)}
                  >
                    {(c.options ?? []).map((o) => (
                      <option value={o} key={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </>
              )}
              {c.kind === 'button' && (
                <button type="button" id={id} class="panel__button" onClick={() => set(c, true)}>
                  {c.label}
                </button>
              )}
              {c.note && <p class="panel__note">{c.note}</p>}
            </div>
          );
        })}
      </div>
      {slug === 'forecast-engine' && (
        <div class="panel__egg">
          <button
            type="button"
            class="panel__button"
            data-egg="lab-weather"
            onClick={() => {
              const w = labWeather(new Date());
              setWeather(w);
              fireEgg({ egg: 'lab-weather', message: `${w.headline} ${w.detail}` });
            }}
          >
            Predict the lab weather
          </button>
          {weather && (
            <p class="panel__note" data-weather>
              <strong>{weather.headline}</strong> {weather.detail}
            </p>
          )}
        </div>
      )}
      {lines[slug] && (
        <p class="panel__narration" aria-live="polite">
          <span class="eyebrow">Operator</span> {lines[slug]}
        </p>
      )}
      {decisions.length > 0 && (
        <div class="panel__decisions">
          <span class="eyebrow">Decisions as switches</span>
          <ul role="list">
            {decisions.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  class="panel__decision"
                  aria-expanded={openDecision === d.id}
                  onClick={() => setOpenDecision(openDecision === d.id ? null : d.id)}
                >
                  <span class="mono panel__decision-id">{d.id}</span> {d.title}
                </button>
                {openDecision === d.id && <p class="panel__why">{d.narration}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
