import { parseRequest } from './contracts';
import { flip } from './motion';
import { emitState } from './state';
export function initializeComparison(): void {
  const form = document.querySelector<HTMLFormElement>('[data-compare-form]');
  const container = document.querySelector<HTMLElement>('[data-comparison]');
  const status = document.querySelector('[data-compare-status]');
  if (!form || !container || !status) return;
  const cards = [...container.querySelectorAll<HTMLElement>('[data-compare-project]')];
  const ids = cards.map((card) => card.dataset.compareProject!);
  const left = form.querySelector<HTMLSelectElement>('[name="left"]')!;
  const right = form.querySelector<HTMLSelectElement>('[name="right"]')!;
  const compare = (a: string, b: string, history: 'push' | 'none' = 'push') => {
    if (!ids.includes(a) || !ids.includes(b)) return;
    if (a === b) { status.textContent = 'Choose two different projects. The existing comparison is unchanged.'; return; }
    left.value = a; right.value = b;
    flip(cards, () => {
      cards.forEach((card) => { card.hidden = card.dataset.compareProject !== a && card.dataset.compareProject !== b; });
      container.prepend(cards.find((card) => card.dataset.compareProject === b)!);
      container.prepend(cards.find((card) => card.dataset.compareProject === a)!);
    });
    status.textContent = `${left.selectedOptions[0]!.text} alongside ${right.selectedOptions[0]!.text}. Summaries, technologies, perspectives, and source evidence only; no fit score.`;
    if (history === 'push') {
      const url = new URL(location.href); url.search = ''; url.searchParams.set('left', a); url.searchParams.set('right', b);
      window.history.pushState(null, '', url);
    }
    emitState({ type: 'comparison', projectIds: [a, b] });
  };
  const fromLocation = () => {
    const params = new URLSearchParams(location.search);
    const a = ids.includes(params.get('left') ?? '') ? params.get('left')! : ids[0]!;
    const b = ids.includes(params.get('right') ?? '') && params.get('right') !== a ? params.get('right')! : ids.find((id) => id !== a)!;
    compare(a, b, 'none');
  };
  form.hidden = false;
  form.addEventListener('submit', (event) => { event.preventDefault(); compare(left.value, right.value); });
  addEventListener('popstate', fromLocation);
  document.addEventListener('atlas:request', (event) => {
    const request = parseRequest((event as CustomEvent<unknown>).detail, ids);
    if (request?.type === 'compare-projects') compare(request.left, request.right);
  });
  fromLocation();
  document.dispatchEvent(new CustomEvent('atlas:ready', { detail: { version: 1, surface: 'comparison' } }));
}