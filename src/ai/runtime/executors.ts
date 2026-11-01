/**
 * Tool executors: mutate application state only (hall stores, control bus, lens store, navigation to real pages).
 * Never arbitrary DOM, never code. Each returns a narration line built from the decision records where one applies.
 */
import { walkTo, bayForSlug, setMode } from '@/hall/state';
import { setControlValue, narrate, resetControls } from '@/hall/bus';
import { startTour } from '@/hall/tour';
import { setLens } from './lens';
import type { ToolCall } from '../tools';
import type { Chunk } from '../protocol';

export interface ExecResult {
  ok: boolean;
  narration: string;
  navigated?: string;
}

const onHallPage = () => typeof document !== 'undefined' && document.getElementById('hall-stage') !== null;

function decisionFor(chunks: Chunk[], machine: string, control?: string): string | null {
  const d = chunks.find(
    (c) =>
      c.id.startsWith('decision:') &&
      c.machine === machine &&
      (!control || c.text.toLowerCase().includes(control.replace(/-/g, ' ').split(' ')[0]!)),
  );
  if (!d) return null;
  const [, narration] = d.text.split(' — ');
  return narration ? `${narration} [${d.id}]` : null;
}

export function executeTool(call: ToolCall, chunks: Chunk[]): ExecResult {
  const a = call.args;
  switch (call.name) {
    case 'walkTo': {
      const slug = String(a['machine']);
      const bay = bayForSlug(slug);
      if (onHallPage()) {
        walkTo(bay);
        return { ok: true, narration: `Walking the rail to ${slug.replace(/-/g, ' ')} (bay ${bay}).` };
      }
      const href = bay === 0 ? '/#control-room' : bay === 7 ? '/#hall-power' : `/#bay-${bay}`;
      window.location.assign(href);
      return { ok: true, narration: `Opening the floor at ${slug.replace(/-/g, ' ')}.`, navigated: href };
    }
    case 'setControl': {
      const machine = String(a['machine']);
      const control = String(a['control']);
      const value = a['value'] as number | boolean | string;
      setControlValue(machine, control, value);
      const why = decisionFor(chunks, machine, control);
      const line = why
        ? `Set ${control} to ${String(value)}: ${why}`
        : `Set ${control} to ${String(value)} on the ${machine.replace(/-/g, ' ')}.`;
      narrate(machine, line);
      if (onHallPage()) walkTo(bayForSlug(machine));
      return { ok: true, narration: line };
    }
    case 'runMachine': {
      const machine = String(a['machine']);
      const run: Record<string, [string, number | boolean | string]> = {
        'telemetry-refinery': ['dogfooding', true],
        'policy-sorter': ['approve', true],
        'forecast-engine': ['baseline', true],
        'data-workbench': ['run-incidents', true],
        'calibration-bench': ['print', true],
        'foundations-generator': ['turbine', 'gdsc'],
      };
      const [control, value] = run[machine] ?? ['', true];
      if (control) setControlValue(machine, control, value);
      if (onHallPage()) walkTo(bayForSlug(machine));
      const why = decisionFor(chunks, machine);
      const line = `Running the ${machine.replace(/-/g, ' ')}.${why ? ` ${why}` : ''}`;
      narrate(machine, line);
      return { ok: true, narration: line };
    }
    case 'openCaseStudy': {
      const href = `/work/${String(a['id'])}/`;
      window.location.assign(href);
      return { ok: true, narration: `Opening the ${String(a['id'])} case study.`, navigated: href };
    }
    case 'highlightSkill': {
      const skill = String(a['skill']);
      const handle = (
        window as Window & { __srHallHandle?: { highlightSkill(s: string | null): string | null } }
      ).__srHallHandle;
      if (handle) {
        const hit = handle.highlightSkill(skill);
        return hit
          ? { ok: true, narration: `Lighting the ${hit} cable run across the ceiling.` }
          : { ok: false, narration: `No cable for "${skill}" on this ceiling.` };
      }
      window.location.assign(`/resume/#r-skills`);
      return {
        ok: true,
        narration: `Opening the skills section for ${skill}.`,
        navigated: '/resume/#r-skills',
      };
    }
    case 'showEvidence': {
      const id = String(a['nodeId']);
      if (id === 'lab-notebook') {
        window.location.assign('/lab-notebook/');
        return { ok: true, narration: 'Opening the lab notebook.', navigated: '/lab-notebook/' };
      }
      const c = chunks.find((x) => x.id === id);
      if (!c) return { ok: false, narration: `No evidence node ${id}.` };
      const href = c.url ?? '/resume/';
      window.location.assign(href);
      return { ok: true, narration: `Showing ${c.text.slice(0, 80)}…`, navigated: href };
    }
    case 'openResume':
      window.location.assign('/resume/');
      return { ok: true, narration: 'Opening the résumé.', navigated: '/resume/' };
    case 'startTour':
      if (onHallPage()) {
        startTour();
        return { ok: true, narration: 'Starting the 90-second tour.' };
      }
      window.location.assign('/?tour=1');
      return { ok: true, narration: 'Opening the floor and starting the tour.', navigated: '/?tour=1' };
    case 'switchLens': {
      const lens = a['lens'] as 'recruiter' | 'engineer';
      setLens(lens);
      return {
        ok: true,
        narration: `Switched to the ${lens} lens: ${lens === 'engineer' ? 'decision logs and stacks expanded' : 'headline facts first'}.`,
      };
    }
    case 'resetFloor': {
      resetControls();
      if (onHallPage()) {
        setMode('rail');
        walkTo(0);
      }
      return {
        ok: true,
        narration: 'Every machine back to its defaults; back on the rail at the control room.',
      };
    }
  }
}
