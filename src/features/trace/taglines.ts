import { reducedMotion } from '@/lib/stores/motion';

/** Rotates the taglines with a soft crossfade. Content is in the DOM from first paint; this only cycles. */
export function initTaglines(el: HTMLElement) {
  let list: string[] = [];
  try {
    list = JSON.parse(el.dataset.taglines ?? '[]');
  } catch {
    return;
  }
  if (list.length < 2) return;
  let i = 0;
  const tick = () => {
    i = (i + 1) % list.length;
    if (reducedMotion.get()) {
      el.textContent = list[i]!;
      return;
    }
    el.animate(
      [
        { opacity: 1, transform: 'none' },
        { opacity: 0, transform: 'translateY(-4px)' },
      ],
      { duration: 220, easing: 'cubic-bezier(.3,0,1,1)', fill: 'forwards' },
    ).onfinish = () => {
      el.textContent = list[i]!;
      el.animate(
        [
          { opacity: 0, transform: 'translateY(4px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 320, easing: 'cubic-bezier(0,0,0,1)', fill: 'forwards' },
      );
    };
  };
  let timer = setInterval(tick, 3800);
  document.addEventListener('visibilitychange', () => {
    clearInterval(timer);
    if (!document.hidden) timer = setInterval(tick, 3800);
  });
}
