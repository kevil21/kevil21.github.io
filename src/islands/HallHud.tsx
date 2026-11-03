/**
 * Hall HUD island: the minimap (SVG floor plan from the same layout numbers as the 3D scene), the walk-mode toggle,
 * the sound toggle, the render-tier readout and the tour bar (caption + skip/stop) while the guided tour runs.
 * Desktop: a corner card that folds into a small chip as soon as the visitor selects anything (a stop, a mode, a walk to
 * another bay) and opens again on hover, on the chip's button, or while focus is inside it; Escape folds it. Phone: a
 * sheet toggled by the bottom bar's Map button, closed again after a stop is picked.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { hall, walkTo, setMode, BAY_SLUGS, mapOpen } from '@/hall/state';
import { minimapModel } from '@/hall/layout';
import { soundPref } from '@/hall/sound';
import { themePref } from '@/theme/store';
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
  const theme = useStore(themePref);
  const setOpen = (v: boolean) => mapOpen.set(v);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('map') === '1') mapOpen.set(true);
  }, []);

  // Desktop card: open until the first selection, then a chip that peeks open on hover.
  const [wide, setWide] = useState(false);
  const [folded, setFolded] = useState(false);
  const [peek, setPeek] = useState(false);
  const leave = useRef(0);
  const chip = useRef<HTMLButtonElement>(null);
  const fold = () => {
    window.clearTimeout(leave.current);
    setFolded(true);
    setPeek(false);
  };
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 60rem)');
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => {
      mq.removeEventListener('change', sync);
      window.clearTimeout(leave.current);
    };
  }, []);
  // Walking to another bay by any means (stop list, keys, scroll, the Operator, the tour) counts as a selection.
  const lastBay = useRef(state.bay);
  useEffect(() => {
    if (lastBay.current === state.bay) return;
    lastBay.current = state.bay;
    fold();
  }, [state.bay]);
  // The Map button / M key pins the card open; toggling it off folds it.
  const mapSeen = useRef(open);
  useEffect(() => {
    if (mapSeen.current === open) return;
    mapSeen.current = open;
    if (open) {
      setFolded(false);
      setPeek(false);
    } else fold();
  }, [open]);
  const expanded = !wide || !folded || peek;
  const mousePeek = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    window.clearTimeout(leave.current);
    if (folded) setPeek(true);
  };
  const mouseLeave = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || !folded) return;
    window.clearTimeout(leave.current);
    leave.current = window.setTimeout(() => setPeek(false), 450);
  };

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
        class={`hud ${open ? 'hud--open' : ''} ${wide && folded ? 'hud--folded' : ''} ${peek ? 'hud--peek' : ''}`}
        id="minimap-sheet"
        aria-label="Floor plan and walk controls"
        data-hud-state={!wide ? 'sheet' : expanded ? 'open' : 'chip'}
        onPointerEnter={mousePeek}
        onPointerLeave={mouseLeave}
        onClickCapture={(e) => {
          const el = e.target as HTMLElement;
          if (el.closest('.hud__chip')) return;
          if (el.closest('button')) fold();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && wide && folded && peek) {
            setPeek(false);
            chip.current?.focus();
          }
        }}
        onFocusOut={(e) => {
          const next = e.relatedTarget as Node | null;
          if (wide && folded && peek && !(next && (e.currentTarget as HTMLElement).contains(next)))
            setPeek(false);
        }}
      >
        {wide ? (
          <button
            ref={chip}
            type="button"
            class="hud__head hud__chip"
            aria-expanded={expanded}
            aria-controls="hud-body"
            onClick={() => {
              if (!folded) fold();
              else setPeek(!peek);
            }}
          >
            <span class="eyebrow">Floor plan</span>
            <span class="hud__where">{NAMES[state.bay] ?? ''}</span>
          </button>
        ) : (
          <div class="hud__head">
            <span class="eyebrow">Floor plan</span>
            <span class="hud__where">{NAMES[state.bay] ?? ''}</span>
          </div>
        )}
        <div class="hud__body" id="hud-body">
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
                  onClick={() => {
                    walkTo(i);
                    if (!wide) setOpen(false); // the sheet has done its job once a stop is picked
                  }}
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
              aria-checked={theme === 'night'}
              aria-label="Breaker: night shift"
            >
              Breaker
            </button>
            <button type="button" class="hud__mode" data-action="coffee" aria-label="Pick up the coffee mug">
              Coffee mug
            </button>
            <button type="button" class="hud__mode" data-action="shortcuts" aria-pressed="true">
              Keyboard shortcuts: on
            </button>
          </div>
          <span class="hud__tier mono" title="Render tier · adaptive quality">
            {tierLabel}
            {state.tier !== 'static' && state.tier !== 'pending' ? ` · ${state.quality}` : ''}
          </span>
          <button
            type="button"
            class="hud__close"
            onClick={() => setOpen(false)}
            aria-label="Close floor plan"
          >
            Close
          </button>
        </div>
      </aside>
    </>
  );
}
