import type { Evidence, Journey, Project, Skill } from '../lib/content';
import { domains } from '../lib/routes';
import { announce, emitState, getPersona } from './state';
import { flip, reveal } from './motion';
import { parseRequest } from './contracts';

interface AtlasProject extends Project { evidence: Evidence[]; skills: Skill[] }
interface AtlasData { projects: AtlasProject[]; journeys: Journey[] }
export function initializeAtlas(): void {
  const source = document.querySelector('#atlas-data');
  const canvas = document.querySelector<HTMLElement>('#project-map');
  const inspector = document.querySelector<HTMLElement>('[data-inspector]');
  if (!source || !canvas || !inspector || canvas.dataset.atlasReady === 'true') return;
  const data = JSON.parse(source.textContent ?? '{}') as AtlasData;
  const projectIds = data.projects.map((project) => project.id);
  const lanes = [...canvas.querySelectorAll<HTMLElement>('[data-domain]')];
  const items = [...canvas.querySelectorAll<HTMLElement>('[data-project-item]')];
  let selected = data.projects[0]!.id;
  let filter = 'all';
  let subset: string[] | undefined;
  let view: 'map' | 'list' = 'map';
  let frame = 0;
  const setText = (selector: string, text: string) => { const element = inspector.querySelector(selector); if (element) element.textContent = text; };
  const list = (selector: string, records: { title: string; href: string }[]) => {
    const host = inspector.querySelector(selector);
    if (!host) return;
    const ul = host.tagName === 'UL' ? host : document.createElement('ul');
    ul.className = selector.includes('skills') ? 'chips' : 'evidence-links';
    ul.replaceChildren();
    for (const record of records) { const li = document.createElement('li'); const a = document.createElement('a'); a.href = record.href; a.textContent = record.title; li.append(a); ul.append(li); }
    if (host !== ul) host.replaceChildren(ul);
  };
  const select = (id: string, feedback = true) => {
    const project = data.projects.find((item) => item.id === id);
    if (!project) return;
    selected = id;
    canvas.querySelectorAll<HTMLElement>('[data-project]').forEach((node) => { node.dataset.selected = String(node.dataset.project === id); });
    canvas.querySelectorAll('[data-inspect]').forEach((button) => button.setAttribute('aria-pressed', String(button.getAttribute('data-inspect') === id)));
    setText('[data-inspector-title]', project.title);
    setText('[data-inspector-domain]', project.domain);
    setText('[data-inspector-summary]', project.summary);
    setText('[data-inspector-lens]', `${getPersona()} perspective`);
    setText('[data-inspector-perspective]', project.perspectives[getPersona()]);
    setText('[data-inspector-quote]', project.evidence[0]!.text);
    setText('[data-inspector-source]', `${project.evidence[0]!.source} · source-provided, not independently verified.`);
    list('[data-inspector-evidence]', project.evidence.map((evidence) => ({ title: evidence.title, href: `/evidence/#${evidence.id}` })));
    list('[data-inspector-skills]', project.skills.map((skill) => ({ title: skill.name, href: `/evidence/#${skill.id}` })));
    inspector.querySelector<HTMLAnchorElement>('[data-inspector-link]')!.href = `/projects/${id}/`;
    inspector.querySelector<HTMLAnchorElement>('[data-inspector-compare]')!.href = `/compare/?left=${id}`;
    if (feedback) {
      reveal(inspector);
      announce(`${project.title} selected. Context updated; open Read project for the full dossier.`);
      if (matchMedia('(max-width: 1379px)').matches) { inspector.focus({ preventScroll: true }); inspector.scrollIntoView({ block: 'start', behavior: 'instant' }); }
    }
    emitState({ type: 'selection', projectId: id, domain: project.domain });
  };
  // Use layout offsets, not animated visual bounds: edges stay deterministic during FLIP.
  const offset = (element: HTMLElement, ancestor: HTMLElement) => {
    let x = 0; let y = 0; let current: HTMLElement | null = element;
    while (current && current !== ancestor) { x += current.offsetLeft; y += current.offsetTop; current = current.offsetParent as HTMLElement | null; }
    return { x, y };
  };
  const draw = () => {
    frame = 0;
    for (const lane of lanes) {
      const svg = lane.querySelector<SVGSVGElement>('[data-topology]')!;
      const path = svg.querySelector('path')!;
      if (lane.hidden || view === 'list') { path.setAttribute('d', ''); continue; }
      svg.setAttribute('viewBox', `0 0 ${lane.clientWidth} ${lane.clientHeight}`);
      const heading = lane.querySelector<HTMLElement>('.domain-heading')!;
      const hubY = heading.offsetTop + heading.offsetHeight + 8;
      const segments = [...lane.querySelectorAll<HTMLElement>('.project-node')].filter((node) => !node.closest<HTMLElement>('[data-project-item]')?.hidden).map((node) => {
        const point = offset(node, lane);
        return `M 8 ${hubY} V ${point.y + 36} H ${point.x}`;
      });
      path.setAttribute('d', segments.join(' '));
    }
  };
  const scheduleDraw = () => { if (!frame) frame = requestAnimationFrame(draw); };
  const reorder = (animate = true) => {
    const journey = data.journeys.find((item) => item.persona === getPersona())!;
    const rank = (id: string) => { const index = journey.projectIds.indexOf(id); return index === -1 ? 100 + projectIds.indexOf(id) : index; };
    const change = () => {
      for (const item of items) item.hidden = subset !== undefined && !subset.includes(item.dataset.projectItem!);
      for (const lane of lanes) {
        const group = lane.querySelector('.domain-projects')!;
        [...group.children].sort((a, b) => rank((a as HTMLElement).dataset.projectItem!) - rank((b as HTMLElement).dataset.projectItem!)).forEach((item) => group.append(item));
        lane.hidden = (filter !== 'all' && lane.dataset.domain !== filter) || ![...group.children].some((item) => !(item as HTMLElement).hidden);
      }
      [...lanes].sort((a, b) => {
        const laneRank = (lane: HTMLElement) => Math.min(...data.projects.filter((project) => project.domain === lane.dataset.domain).map((project) => rank(project.id)));
        return laneRank(a) - laneRank(b);
      }).forEach((lane) => canvas.append(lane));
      canvas.dataset.view = view;
      canvas.dataset.filter = filter;
    };
    if (animate) flip(items, change); else change();
    scheduleDraw();
  };
  const filterDomain = (domain: string) => {
    if (!['all', ...domains].includes(domain)) return;
    filter = domain;
    subset = undefined;
    document.querySelectorAll('[data-domain-filter]').forEach((button) => button.setAttribute('aria-pressed', String(button.getAttribute('data-domain-filter') === filter)));
    reorder();
    const visible = data.projects.filter((project) => filter === 'all' || project.domain === filter);
    if (!visible.some((project) => project.id === selected)) select(visible[0]!.id, false);
    const count = document.querySelector('[data-project-count]');
    if (count) count.textContent = `${visible.length} ${visible.length === 1 ? 'project' : 'projects'} / ${filter === 'all' ? 'four domains' : filter}`;
    announce(`${visible.length} projects shown. Domain: ${filter}.`);
    emitState({ type: 'filter', domain: filter, projectIds: visible.map((project) => project.id) });
  };
  const filterProjects = (ids: string[]) => {
    filter = 'all'; subset = ids;
    document.querySelectorAll('[data-domain-filter]').forEach((button) => button.setAttribute('aria-pressed', 'false'));
    reorder();
    if (ids.length && !ids.includes(selected)) select(ids[0]!, false);
    const count = document.querySelector('[data-project-count]');
    if (count) count.textContent = `${ids.length} projects / requested evidence filter`;
    announce(`${ids.length} projects shown. All work clears this filter.`);
    emitState({ type: 'filter', domain: 'all', projectIds: ids });
  };
  const setView = (value: 'map' | 'list') => {
    if (view === value) return;
    view = value;
    reorder();
    document.querySelectorAll('[data-atlas-view]').forEach((button) => button.setAttribute('aria-pressed', String(button.getAttribute('data-atlas-view') === view)));
    announce(`${view} view. The same projects and sources remain available.`);
    emitState({ type: 'view', view });
  };
  document.querySelectorAll<HTMLElement>('.atlas-controls, [data-inspect]').forEach((element) => { element.hidden = false; });
  document.querySelectorAll<HTMLButtonElement>('[data-inspect]').forEach((button) => button.addEventListener('click', () => select(button.dataset.inspect!)));
  document.querySelectorAll<HTMLButtonElement>('[data-domain-filter]').forEach((button) => button.addEventListener('click', () => filterDomain(button.dataset.domainFilter!)));
  document.querySelectorAll<HTMLButtonElement>('[data-atlas-view]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.atlasView === 'list' ? 'list' : 'map')));
  document.addEventListener('atlas:personachange', () => { reorder(); select(selected, false); });
  document.addEventListener('atlas:request', (event) => {
    const request = parseRequest((event as CustomEvent<unknown>).detail, projectIds);
    if (request?.type === 'filter-domain') filterDomain(request.domain);
    if (request?.type === 'filter-projects') filterProjects(request.projectIds);
    if (request?.type === 'set-view') setView(request.view);
    if (request?.type === 'select-project') {
      const project = data.projects.find((item) => item.id === request.projectId)!;
      if ((filter !== 'all' && filter !== project.domain) || (subset && !subset.includes(request.projectId))) filterDomain(project.domain);
      select(request.projectId);
    }
  });
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(scheduleDraw);
    const observe = () => lanes.forEach((lane) => observer.observe(lane));
    observe(); addEventListener('pageshow', observe); addEventListener('pagehide', () => observer.disconnect());
  }
  addEventListener('resize', scheduleDraw);
  addEventListener('pagehide', () => { cancelAnimationFrame(frame); frame = 0; });
  reorder(false); select(selected, false);
  const initialIds = new URLSearchParams(location.search).get('projects')?.split(',');
  const initial = initialIds && parseRequest({ type: 'filter-projects', projectIds: initialIds }, projectIds);
  if (initial?.type === 'filter-projects') filterProjects(initial.projectIds);
  canvas.dataset.atlasReady = 'true';
  document.dispatchEvent(new CustomEvent('atlas:ready', { detail: { version: 1, surface: 'atlas' } }));
}