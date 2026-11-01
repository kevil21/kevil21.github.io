/**
 * The guided rail: scroll position and arrow keys drive `railProgress`; the camera follows with a cinematic dolly
 * (or snaps under reduced motion). The HTML bay sections on the page define the scroll stops, so the rail and the
 * readable content are the same thing.
 */
import { BAY_MAX, hall, railProgress, stepBay, walkTo } from './state';
import { prefersReducedMotion } from '@/motion/tokens';

export interface RailBinding {
  dispose(): void;
  /** Recompute scroll anchors (after layout changes). */
  measure(): void;
}

/** Map scrollY to a fractional progress using the vertical centres of the bay anchors. */
export function progressFromScroll(scrollCentre: number, anchors: number[]): number {
  if (anchors.length < 2) return 0;
  if (scrollCentre <= anchors[0]!) return 0;
  const last = anchors.length - 1;
  if (scrollCentre >= anchors[last]!) return last;
  for (let i = 0; i < last; i++) {
    const a = anchors[i]!;
    const b = anchors[i + 1]!;
    if (scrollCentre >= a && scrollCentre < b) return i + (scrollCentre - a) / (b - a);
  }
  return last;
}

export function bindRail(stage: HTMLElement): RailBinding {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-rail-stop]'));
  let anchors: number[] = [];
  let ticking = false;
  let suppressScroll = false;
  let suppressTarget = 0;
  let suppressTimer = 0;

  const measure = () => {
    anchors = sections
      .map((s) => {
        const r = s.getBoundingClientRect();
        return window.scrollY + r.top + r.height / 2;
      })
      .sort((a, b) => a - b);
  };

  const onScroll = () => {
    if (suppressScroll) {
      // programmatic smooth scroll in flight: release when it has settled near its target
      if (Math.abs(window.scrollY - suppressTarget) < 4) {
        suppressScroll = false;
        window.clearTimeout(suppressTimer);
      }
      return;
    }
    if (ticking || hall.get().mode !== 'rail') return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const centre = window.scrollY + window.innerHeight * 0.45;
      const p = progressFromScroll(centre, anchors);
      railProgress.set(p);
      const bay = Math.round(p);
      if (bay !== hall.get().bay) hall.setKey('bay', bay);
    });
  };

  // Keyboard: arrows step between bays and scroll the matching section into view.
  const onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target as HTMLElement | null;
    if (
      t &&
      (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
    )
      return;
    if (hall.get().mode !== 'rail') return;
    let delta = 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') delta = 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') delta = -1;
    else if (e.key === 'Home') {
      e.preventDefault();
      walkTo(0);
      scrollToBay(0);
      return;
    } else if (e.key === 'End') {
      e.preventDefault();
      walkTo(BAY_MAX);
      scrollToBay(BAY_MAX);
      return;
    }
    if (!delta) return;
    e.preventDefault();
    stepBay(delta);
    scrollToBay(hall.get().bay);
  };

  const scrollToBay = (bay: number) => {
    const el = sections.find((s) => Number(s.dataset['railStop']) === bay);
    if (!el) return;
    const r = el.getBoundingClientRect();
    suppressTarget = Math.max(
      0,
      Math.min(
        document.documentElement.scrollHeight - window.innerHeight,
        window.scrollY + r.top + r.height / 2 - window.innerHeight / 2,
      ),
    );
    suppressScroll = true;
    window.clearTimeout(suppressTimer);
    suppressTimer = window.setTimeout(() => (suppressScroll = false), prefersReducedMotion() ? 100 : 2500);
    window.scrollTo({ top: suppressTarget, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  // Programmatic walks (minimap, Operator tools) scroll the page to the matching stop.
  const onHall = (e: Event) => {
    const d = (e as CustomEvent<{ type: string; bay?: number }>).detail;
    if (d.type === 'walk' && typeof d.bay === 'number' && !suppressScroll) scrollToBay(d.bay);
  };

  measure();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', measure);
  window.addEventListener('keydown', onKey);
  window.addEventListener('sr:hall', onHall);
  stage.setAttribute('data-rail', 'bound');
  onScroll();

  return {
    measure,
    dispose() {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('sr:hall', onHall);
    },
  };
}
