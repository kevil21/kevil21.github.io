/**
 * Progressive enhancement for the server-rendered trace:
 *  - hover/focus on an attribute chip highlights every span that carries it (knowledge-map traversal)
 *  - click/keyboard on a row selects it → evidence panel (desktop) or bottom sheet (narrow)
 *  - persona changes re-order rows with a FLIP animation (facts never change, only emphasis/order)
 *  - tool executor drives the same stores, so AI actions are visible as real UI motion
 */
import { highlightedAttribute, selectedSpan, sheetOpen } from '@/lib/stores/ui';
import { persona } from '@/lib/stores/persona';
import { reducedMotion, ms } from '@/lib/stores/motion';

const ORDER: Record<string, string[]> = {
  recruiter: ['role', 'certification', 'community', 'education', 'project'],
  engineer: ['role', 'project', 'community', 'education', 'certification'],
  architect: ['project', 'role', 'community', 'education', 'certification'],
};

export function initTrace(root: HTMLElement) {
  const rows = Array.from(root.querySelectorAll<HTMLElement>('.span-row'));
  const list = root.querySelector<HTMLElement>('.trace__rows');
  if (!list) return;
  const panel = document.querySelector<HTMLElement>('[data-span-details]');
  const sheet = document.querySelector<HTMLDialogElement>('dialog[data-span-sheet]');
  const sheetBody = sheet?.querySelector<HTMLElement>('[data-sheet-body]');
  const panelDefault = panel?.querySelector<HTMLElement>('[data-detail-default]');

  /* ---- attribute highlight ---- */
  const setHighlight = (attr: string | null) => {
    root.classList.toggle('has-highlight', Boolean(attr));
    for (const r of rows) {
      const attrs = (r.dataset.attrs ?? '').split(' ');
      r.classList.toggle('is-related', Boolean(attr) && attrs.includes(attr!));
    }
    for (const chip of root.querySelectorAll<HTMLElement>('.attr[data-attr]')) {
      chip.classList.toggle('is-active', chip.dataset.attr === attr);
    }
  };
  root.addEventListener('pointerover', (e) => {
    const chip = (e.target as HTMLElement).closest<HTMLElement>('.attr[data-attr]');
    if (chip) highlightedAttribute.set(chip.dataset.attr ?? null);
  });
  root.addEventListener('pointerout', (e) => {
    const chip = (e.target as HTMLElement).closest<HTMLElement>('.attr[data-attr]');
    if (chip && !pinned) highlightedAttribute.set(null);
  });
  let pinned = false;
  root.addEventListener('click', (e) => {
    const chip = (e.target as HTMLElement).closest<HTMLElement>('.attr[data-attr]');
    if (chip) {
      const a = chip.dataset.attr ?? null;
      pinned = !(pinned && highlightedAttribute.get() === a);
      highlightedAttribute.set(pinned ? a : null);
      e.preventDefault();
    }
  });
  root.addEventListener('focusin', (e) => {
    const chip = (e.target as HTMLElement).closest<HTMLElement>('.attr[data-attr]');
    if (chip) highlightedAttribute.set(chip.dataset.attr ?? null);
  });
  highlightedAttribute.subscribe(setHighlight);

  /* ---- selection ---- */
  const narrow = () => !matchMedia('(min-width: 86rem)').matches;
  const showDetail = (id: string | null) => {
    for (const r of rows) r.classList.toggle('is-selected', r.dataset.span === id);
    const details = document.querySelectorAll<HTMLElement>('[data-detail]');
    let found: HTMLElement | null = null;
    for (const d of details) {
      const match = d.dataset.detail === id;
      if (match) found = d;
    }
    if (narrow()) {
      if (found && sheet && sheetBody) {
        sheetBody.replaceChildren(found.cloneNode(true));
        (sheetBody.firstElementChild as HTMLElement).hidden = false;
        if (!sheet.open) sheet.showModal();
        sheetOpen.set(true);
      } else if (sheet?.open) {
        sheet.close();
      }
    } else {
      for (const d of details) d.hidden = d.dataset.detail !== id;
      if (panelDefault) panelDefault.hidden = Boolean(id);
      if (found) found.hidden = false;
    }
  };
  root.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.attr') || target.closest('.event')) return;
    const row = target.closest<HTMLElement>('.span-row');
    if (!row || !row.dataset.span) return;
    const link = target.closest('a');
    // First click selects (shows evidence); a second click on the selected row follows the link.
    if (link && selectedSpan.get() === row.dataset.span) return;
    e.preventDefault();
    selectedSpan.set(row.dataset.span);
  });
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const row = (e.target as HTMLElement).closest<HTMLElement>('.span-row');
    if (!row || (e.target as HTMLElement).closest('.attr')) return;
    if (selectedSpan.get() !== row.dataset.span) {
      e.preventDefault();
      selectedSpan.set(row.dataset.span ?? null);
    }
  });
  selectedSpan.subscribe((id) => showDetail(id));
  sheet?.addEventListener('close', () => {
    sheetOpen.set(false);
    if (narrow()) selectedSpan.set(null);
  });
  sheet?.addEventListener('click', (e) => {
    if (e.target === sheet) sheet.close();
  });

  /* ---- persona re-ordering (FLIP) ---- */
  const reorder = (p: string) => {
    const order = ORDER[p] ?? ORDER.engineer!;
    const roots = rows.filter((r) => r.dataset.depth === '0');
    const first = new Map(rows.map((r) => [r, r.getBoundingClientRect()]));
    const sorted = [...roots].sort((a, b) => {
      const ka = order.indexOf(a.dataset.kind ?? ''),
        kb = order.indexOf(b.dataset.kind ?? '');
      if (ka !== kb) return ka - kb;
      return Number(a.style.getPropertyValue('--i')) - Number(b.style.getPropertyValue('--i'));
    });
    for (const r of sorted) {
      list.appendChild(r);
      for (const c of rows.filter((x) => x.dataset.parent === r.dataset.span)) list.appendChild(c);
    }
    root.classList.toggle('show-attrs', p === 'engineer');
    if (reducedMotion.get()) return;
    const dur = ms('--dur-emphasis') || 420;
    for (const r of rows) {
      const a = first.get(r)!;
      const b = r.getBoundingClientRect();
      const dy = a.top - b.top;
      if (Math.abs(dy) < 1) continue;
      r.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], {
        duration: dur,
        easing: 'cubic-bezier(.2,0,0,1)',
      });
    }
  };
  let last = persona.get();
  reorder(last);
  persona.subscribe((p) => {
    if (p === last) return;
    last = p;
    reorder(p);
  });

  /* ---- credential events ---- */
  root.addEventListener('pointerover', (e) => {
    const ev = (e.target as HTMLElement).closest<HTMLElement>('.event');
    if (ev) ev.classList.add('is-active');
  });
  root.addEventListener('pointerout', (e) => {
    const ev = (e.target as HTMLElement).closest<HTMLElement>('.event');
    if (ev) ev.classList.remove('is-active');
  });
}
