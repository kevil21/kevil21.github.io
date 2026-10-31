/**
 * Safe UI executor (plan.md §8). Tool calls mutate application state (nanostores) or navigate to
 * canonical routes. They never touch arbitrary DOM, never evaluate code, never fetch.
 */
import type { ValidatedToolCall } from './registry';
import { routes } from '@/lib/knowledge/routes';
import {
  compareIds,
  highlightedAttribute,
  projectFilter,
  pushToast,
  resetWorkspace,
  selectedSpan,
} from '@/lib/stores/ui';
import { setPersona } from '@/lib/stores/persona';
import type { PersonaId } from '@/lib/schema';

const sectionRoute: Record<string, string> = {
  trace: routes.home(),
  work: '/work/',
  skills: routes.skills(),
  credentials: routes.credentials(),
  education: routes.education(),
  resume: routes.resume(),
  match: routes.match(),
  journeys: routes.journeys(),
  observatory: routes.observatory(),
  ask: routes.ask(),
  compare: routes.compare(),
};

export interface ExecutionResult {
  tool: string;
  ok: boolean;
  description: string;
  navigated?: string;
}

/** Known ids are injected by the page so the executor can refuse unknown targets without a fetch. */
let knownIds: Set<string> | null = null;
export function setKnownIds(ids: Iterable<string>) {
  knownIds = new Set(ids);
}
const known = (id: string) => !knownIds || knownIds.has(id);

export function executeTool(
  call: ValidatedToolCall,
  opts: { navigate?: (href: string) => void } = {},
): ExecutionResult {
  const nav = opts.navigate ?? ((href: string) => location.assign(href));
  const here = location.pathname;
  const onHome = here === '/' || here === '/index.html';
  const onWork = here.startsWith('/work/') && here === '/work/';
  const a = call.args as Record<string, unknown>;
  const done = (description: string, navigated?: string): ExecutionResult => {
    pushToast({ text: description, tool: call.tool, tone: 'info' });
    return { tool: call.tool, ok: true, description, navigated };
  };
  const fail = (description: string): ExecutionResult => {
    pushToast({ text: description, tool: call.tool, tone: 'warn' });
    return { tool: call.tool, ok: false, description };
  };

  switch (call.tool) {
    case 'navigateTo': {
      const href = sectionRoute[String(a.section)];
      if (!href) return fail(`Unknown section ${String(a.section)}`);
      nav(href);
      return done(`Navigating to ${String(a.section)}`, href);
    }
    case 'openProject': {
      const id = String(a.projectId);
      if (!known(id)) return fail(`No project "${id}" in the portfolio`);
      nav(routes.project(id));
      return done(`Opening project ${id}`, routes.project(id));
    }
    case 'openResume':
      nav(routes.resume());
      return done('Opening the résumé', routes.resume());
    case 'switchPersona':
      setPersona(String(a.persona) as PersonaId);
      return done(`Viewing as ${String(a.persona)}`);
    case 'highlightSkill': {
      const id = String(a.skillId);
      if (!known(id)) return fail(`No skill "${id}" in the portfolio`);
      if (!onHome) {
        nav(`${routes.home()}?highlight=${encodeURIComponent(id)}`);
        return done(`Highlighting ${id} on the trace`, routes.home());
      }
      highlightedAttribute.set(id);
      return done(`Highlighting every span that carries ${id}`);
    }
    case 'filterProjects': {
      const skills = ((a.skills as string[]) ?? []).filter(known);
      const kinds = (a.kinds as string[]) ?? [];
      const query = String(a.query ?? '');
      if (!onWork) {
        const qs = new URLSearchParams();
        if (skills.length) qs.set('skills', skills.join(','));
        if (kinds.length) qs.set('kinds', kinds.join(','));
        nav(`/work/${qs.toString() ? `?${qs}` : ''}`);
        return done(
          `Filtering projects${skills.length ? ` by ${skills.join(', ')}` : ''}${kinds.length ? ` (${kinds.join(', ')})` : ''}`,
          '/work/',
        );
      }
      projectFilter.set({ skills, kinds, query });
      return done(
        `Filtering projects${skills.length ? ` by ${skills.join(', ')}` : ''}${kinds.length ? ` (${kinds.join(', ')})` : ''}`,
      );
    }
    case 'showRelevantExperience': {
      const skills = ((a.skills as string[]) ?? []).filter(known);
      if (!skills.length) return fail('No known skills to show');
      if (!onHome) {
        nav(`${routes.home()}?highlight=${encodeURIComponent(skills[0]!)}`);
        return done(`Showing experience relevant to ${skills.join(', ')}`, routes.home());
      }
      highlightedAttribute.set(skills[0]!);
      return done(`Showing experience relevant to ${skills.join(', ')}`);
    }
    case 'showEvidence': {
      const id = String(a.nodeId);
      if (!known(id)) return fail(`No node "${id}"`);
      if (!onHome) {
        nav(`${routes.home()}?select=${encodeURIComponent(id)}`);
        return done(`Opening evidence for ${id}`, routes.home());
      }
      selectedSpan.set(id);
      return done(`Showing evidence for ${id}`);
    }
    case 'compareProjects': {
      const ids = ((a.projectIds as string[]) ?? []).filter(known);
      if (ids.length < 2) return fail('Need two known projects to compare');
      compareIds.set(ids);
      nav(`${routes.compare()}?ids=${ids.join(',')}`);
      return done(`Comparing ${ids.join(' vs ')}`, routes.compare());
    }
    case 'resetWorkspace':
      resetWorkspace();
      return done('Workspace reset');
  }
}
