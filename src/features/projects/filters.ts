import { projectFilter } from '@/lib/stores/ui';
import { reducedMotion, ms } from '@/lib/stores/motion';

/** Project filters driven by the shared store so the AI's filterProjects tool animates the same UI. */
export function initProjectFilters(root: HTMLElement) {
  const grid = document.querySelector<HTMLElement>('[data-project-grid]');
  const status = root.querySelector<HTMLElement>('[data-filter-status]');
  const clear = root.querySelector<HTMLButtonElement>('[data-filter-clear]');
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll<HTMLElement>('[data-project]'));

  const params = new URLSearchParams(location.search);
  const initialSkills = params.get('skills')?.split(',').filter(Boolean) ?? [];
  const initialKinds = params.get('kinds')?.split(',').filter(Boolean) ?? [];
  if (initialSkills.length || initialKinds.length)
    projectFilter.set({ skills: initialSkills, kinds: initialKinds, query: '' });

  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const kind = t.closest<HTMLElement>('[data-filter-kind]')?.dataset.filterKind;
    const skill = t.closest<HTMLElement>('[data-filter-skill]')?.dataset.filterSkill;
    if (t.closest('[data-filter-clear]')) {
      projectFilter.set({ skills: [], kinds: [], query: '' });
      return;
    }
    const f = projectFilter.get();
    if (kind)
      projectFilter.setKey(
        'kinds',
        f.kinds.includes(kind) ? f.kinds.filter((k) => k !== kind) : [...f.kinds, kind],
      );
    if (skill)
      projectFilter.setKey(
        'skills',
        f.skills.includes(skill) ? f.skills.filter((s) => s !== skill) : [...f.skills, skill],
      );
  });

  const apply = (f: { skills: string[]; kinds: string[]; query: string }) => {
    const first = new Map(cards.map((c) => [c, c.getBoundingClientRect()]));
    let shown = 0;
    for (const c of cards) {
      const kinds = f.kinds.length === 0 || f.kinds.includes(c.dataset.kind ?? '');
      const skills =
        f.skills.length === 0 || f.skills.every((s) => (c.dataset.skills ?? '').split(' ').includes(s));
      const q = !f.query || (c.textContent ?? '').toLowerCase().includes(f.query.toLowerCase());
      const show = kinds && skills && q;
      c.classList.toggle('is-filtered-out', !show);
      if (show) shown++;
    }
    for (const b of root.querySelectorAll<HTMLElement>('[data-filter-kind]'))
      b.setAttribute('aria-pressed', String(f.kinds.includes(b.dataset.filterKind ?? '')));
    for (const b of root.querySelectorAll<HTMLElement>('[data-filter-skill]'))
      b.setAttribute('aria-pressed', String(f.skills.includes(b.dataset.filterSkill ?? '')));
    const active = f.kinds.length + f.skills.length > 0 || Boolean(f.query);
    if (clear) clear.hidden = !active;
    if (status) status.textContent = active ? `${shown} of ${cards.length} projects match` : '';
    const url = new URL(location.href);
    if (f.skills.length) url.searchParams.set('skills', f.skills.join(','));
    else url.searchParams.delete('skills');
    if (f.kinds.length) url.searchParams.set('kinds', f.kinds.join(','));
    else url.searchParams.delete('kinds');
    history.replaceState(history.state, '', url);
    if (reducedMotion.get()) return;
    const dur = ms('--dur-emphasis') || 420;
    for (const c of cards) {
      if (c.classList.contains('is-filtered-out')) continue;
      const a = first.get(c)!;
      const b = c.getBoundingClientRect();
      const dx = a.left - b.left;
      const dy = a.top - b.top;
      if (!dx && !dy) continue;
      c.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
        duration: dur,
        easing: 'cubic-bezier(.2,0,0,1)',
      });
    }
  };
  projectFilter.subscribe(apply);
}
