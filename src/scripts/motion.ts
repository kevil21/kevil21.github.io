const active = new Set<Animation>();
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const duration = (token: string) => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return parseFloat(value) * (value.endsWith('ms') ? 1 : 1000) || 0;
};
export function cancelMotion(): void { active.forEach((animation) => animation.cancel()); active.clear(); }
function animate(element: Element, frames: Keyframe[], token = '--motion-base'): void {
  if (reduced() || document.hidden || typeof element.animate !== 'function') return;
  const animation = element.animate(frames, { duration: duration(token), easing: getComputedStyle(document.documentElement).getPropertyValue('--ease-standard').trim() });
  active.add(animation);
  void animation.finished.then(() => active.delete(animation), () => active.delete(animation));
}
/** Mutate document order immediately; animate only the surviving elements' displacement. */
export function flip(elements: HTMLElement[], update: () => void): void {
  cancelMotion();
  if (reduced()) { update(); return; }
  const before = new Map(elements.map((element) => [element, element.getBoundingClientRect()]));
  update();
  for (const element of elements) {
    const previous = before.get(element)!;
    const next = element.getBoundingClientRect();
    if (!previous.width || !next.width || !previous.height || !next.height) continue;
    const x = previous.left - next.left;
    const y = previous.top - next.top;
    if (Math.abs(x) + Math.abs(y) > 1) animate(element, [{ transform: `translate(${x}px, ${y}px)` }, { transform: 'translate(0, 0)' }]);
  }
}
export function reveal(element: Element): void { animate(element, [{ opacity: 0.7 }, { opacity: 1 }], '--motion-fast'); }
export function initializeMotion(): void {
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', cancelMotion);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelMotion(); });
  addEventListener('pagehide', cancelMotion);
  document.querySelectorAll('details').forEach((details) => details.addEventListener('toggle', () => {
    if (details.open) { const body = details.querySelector('.disclosure-body'); if (body) reveal(body); }
  }));
}