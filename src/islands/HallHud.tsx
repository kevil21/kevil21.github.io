/**
 * Hall HUD island: the minimap (SVG floor plan from the same layout numbers as the 3D scene), the walk-mode toggle,
 * the sound toggle, the render-tier readout and the tour bar (caption + skip/stop) while the guided tour runs.
 * Desktop: a corner card. Phone: a sheet toggled by the bottom bar's Map button.
 */
import { useEffect } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { hall, walkTo, setMode, BAY_SLUGS, mapOpen } from '@/hall/state';
import { minimapModel } from '@/hall/layout';
import { soundPref } from '@/hall/sound';
import { tour, TOUR_STOPS, TOUR_TOTAL_SECONDS, skipTourStop, stopTour, startTour } from '@/hall/tour';

const model = minimapModel();
const NAMES: Record<number, string> = {
  0: 'Control room',
  1: 'Telemetry Refinery',
  2: 'Policy Sorter',
  3: 'Forecast Engine',
  4: 'Data Workbench',
  5: 'Calibration Bench',
  6: 'Foundations Generator',
  7: 'Hall power meter',
};

export default function HallHud() {
  const state = useStore(hall);
  const sound = useStore(soundPref);
  const t = useStore(tour);
  const open = useStore(mapOpen);
  const setOpen = (v: boolean) => mapOpen.set(v);

  useEffect(() => {
    const btn = document.querySelector<HTMLButtonElement>('#bottom-bar [data-action="map"]');
    if (btn) btn.setAttribute('aria-expanded', String(open));
  }, [open]);

  const tierLabel =
    state.tier === 'webgpu'
      ? 'WebGPU'
      : state.tier === 'webgl'
        ? 'WebGL 2'
        : state.tier === 'static'
          ? 'static twins'
          : 'loading';
  const stop = t.running ? TOUR_STOPS[t.index] : undefined;
  const elapsed = t.running
    ? TOUR_STOPS.slice(0, t.index).reduce((a, s) => a + s.seconds, 0) + t.progress * (stop?.seconds ?? 0)
    : 0;

  return (
    <>
      {t.running && stop && (
        <div class="tourbar" role="status" aria-live="polite">
          <div
            class="tourbar__progress"
            style={{ width: `${Math.round((elapsed / TOUR_TOTAL_SECONDS) * 100)}%` }}
            aria-hidden="true"
          />
          <p class="tourbar__text">
            <span class="eyebrow">
              Tour · {t.index + 1}/{TOUR_STOPS.length}
            </span>
            <strong>{stop.title}</strong> {stop.caption}
          </p>
          <div class="tourbar__actions">
            <button type="button" class="hud__mode" onClick={() => skipTourStop()}>
              Skip
            </button>
            <button type="button" class="hud__mode" onClick={() => stopTour()}>
              Stop
            </button>
          </div>
        </div>
      )}
      <aside
        class={`hud ${open ? 'hud--open' : ''}`}
        id="minimap-sheet"
        aria-label="Floor plan and walk controls"
      >
        <div class="hud__head">
          <span class="eyebrow">Floor plan</span>
          <span class="hud__where">{NAMES[state.bay] ?? ''}</span>
        </div>
        <svg
          class="hud__map"
          viewBox={`0 0 ${model.width} ${model.height}`}
          role="img"
          aria-label={`Minimap. You are at ${NAMES[state.bay]}.`}
        >
          <rect x="0" y="0" width={model.width} height={model.height} class="hud__hall" />
          <rect
            class={`hud__room ${state.bay === 0 ? 'is-here' : ''}`}
            x={model.controlRoom.x}
            y={model.controlRoom.y}
            width={model.controlRoom.w}
            height={model.controlRoom.h}
            rx="6"
          />
          {model.bays.map((b) => (
            <g
              key={b.bay}
              class={`hud__bay ${state.bay === b.bay ? 'is-here' : ''}`}
              transform={`translate(${b.x} ${b.y})`}
            >
              <rect width={b.w} height={b.h} rx="8" />
              <text x={b.w / 2} y={b.h / 2 + 10} text-anchor="middle">
                {b.bay}
              </text>
            </g>
          ))}
          <rect
            class={`hud__meter ${state.bay === 7 ? 'is-here' : ''}`}
            x={model.backWall.x}
            y={model.backWall.y}
            width={model.backWall.w}
            height={model.backWall.h}
          />
        </svg>
        <ol class="hud__list" role="list">
          {BAY_SLUGS.map((slug, i) => (
            <li key={slug}>
              <button
                type="button"
                class={`hud__stop ${state.bay === i ? 'is-here' : ''}`}
                aria-current={state.bay === i ? 'location' : undefined}
                onClick={() => walkTo(i)}
              >
                <span class="hud__num mono">{String(i).padStart(2, '0')}</span> {NAMES[i]}
              </button>
            </li>
          ))}
        </ol>
        <div class="hud__row">
          {state.tier !== 'static' && (
            <button
              type="button"
              class="hud__mode"
              data-hud="mode"
              onClick={() => setMode(state.mode === 'rail' ? 'free' : 'rail')}
              aria-pressed={state.mode === 'free'}
            >
              {state.mode === 'rail' ? 'Free walk' : 'Return to rail'}
            </button>
          )}
          {state.tier !== 'static' && (
            <button
              type="button"
              class="hud__mode"
              onClick={() => (t.running ? stopTour() : startTour())}
              aria-pressed={t.running}
              data-hud="tour"
            >
              {t.running ? 'Stop tour' : 'Tour'}
            </button>
          )}
          {state.tier !== 'static' && (
            <button
              type="button"
              class="hud__mode hud__sound"
              role="switch"
              aria-checked={sound === 'on'}
              aria-label={`Machine-room sound ${sound === 'on' ? 'on' : 'off'}`}
              onClick={() => soundPref.set(sound === 'on' ? 'off' : 'on')}
            >
              {sound === 'on' ? 'Sound on' : 'Sound off'}
            </button>
          )}
        </div>
        <div class="hud__row hud__room-row">
          <span class="eyebrow">Control room</span>
          <button
            type="button"
            class="hud__mode"
            data-action="night"
            role="switch"
            aria-checked={
              typeof document !== 'undefined' &&
              document.documentElement.getAttribute('data-theme') === 'night'
            }
            aria-label="Breaker: night shift"
          >
            Breaker
          </button>
          <button type="button" class="hud__mode" data-action="coffee" aria-label="Pick up the coffee mug">
            Coffee mug
          </button>
        </div>
        <span class="hud__tier mono" title="Render tier · adaptive quality">
          {tierLabel}
          {state.tier !== 'static' && state.tier !== 'pending' ? ` · ${state.quality}` : ''}
        </span>
        <button type="button" class="hud__close" onClick={() => setOpen(false)} aria-label="Close floor plan">
          Close
        </button>
      </aside>
    </>
  );
}
