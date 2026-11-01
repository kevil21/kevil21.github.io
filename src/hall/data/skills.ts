/** Skill → machines map for the ceiling cables, from the skills collection (APP 982 SKILL_USED_IN via the ledger). */
import skills from '@/content/skills.json';

export interface SkillCable {
  id: string;
  name: string;
  group: string;
  machines: string[]; // slugs, in bay order
  aliases: string[];
}

const BAY_ORDER = [
  'telemetry-refinery',
  'policy-sorter',
  'forecast-engine',
  'data-workbench',
  'calibration-bench',
  'foundations-generator',
];

export const SKILL_CABLES: SkillCable[] = (skills as Array<Record<string, unknown>>)
  .map((s) => ({
    id: String(s['id']),
    name: String(s['name']),
    group: String(s['group']),
    machines: ((s['usedIn'] as string[] | undefined) ?? [])
      .slice()
      .sort((a, b) => BAY_ORDER.indexOf(a) - BAY_ORDER.indexOf(b)),
    aliases: (s['aliases'] as string[] | undefined) ?? [],
  }))
  .filter((s) => s.machines.length >= 1);

export function bayOf(slug: string): number {
  return BAY_ORDER.indexOf(slug) + 1;
}
