/**
 * Ceiling skills cables: a fixed-layout skills graph drawn as cable runs between the machines that used each skill
 * (never force-directed). Skills used by one machine drop a short tail onto that bay. `highlightSkill` lights a run;
 * the Operator's highlightSkill tool and the résumé's skill chips call it.
 */
import { Group, Vector3, type Mesh } from 'three';
import type { Kit } from './kit/parts';
import { SKILL_CABLES, bayOf, type SkillCable } from './data/skills';
import { bayX, HALL_HEIGHT, MACHINE_Z } from './layout';

export interface Cables {
  group: Group;
  highlight(skillIdOrName: string | null): SkillCable | null;
  dispose(): void;
}

const GROUP_Z: Record<string, number> = {
  languages: -0.9,
  'ai-ml': -0.5,
  cloud: -0.1,
  'dev-tools': 0.3,
  'data-observability': 0.7,
};

export function buildCables(kit: Kit): Cables {
  const group = new Group();
  group.name = 'skills-cables';
  const runs = new Map<string, Mesh[]>();
  let lane = 0;
  for (const s of SKILL_CABLES) {
    const z = MACHINE_Z + (GROUP_Z[s.group] ?? 0) + (lane % 3) * 0.08;
    const y = HALL_HEIGHT - 0.25 - (lane % 5) * 0.06;
    lane++;
    const meshes: Mesh[] = [];
    if (s.machines.length === 1) {
      const x = bayX(bayOf(s.machines[0]!)) + ((lane % 4) - 1.5) * 0.25;
      const m = kit.pipe([new Vector3(x, y, z), new Vector3(x, y - 0.6, z)], 0.01, 'steelDark');
      m.userData['ownGeometry'] = true;
      meshes.push(m);
      group.add(m);
    } else {
      for (let i = 0; i < s.machines.length - 1; i++) {
        const a = bayX(bayOf(s.machines[i]!));
        const b = bayX(bayOf(s.machines[i + 1]!));
        const m = kit.cable(new Vector3(a, y, z), new Vector3(b, y, z), 0.25 + (lane % 3) * 0.1, 'steelDark');
        m.userData['ownGeometry'] = true;
        meshes.push(m);
        group.add(m);
      }
    }
    runs.set(s.id, meshes);
  }

  let current: string | null = null;
  const find = (q: string): SkillCable | null => {
    const needle = q.toLowerCase();
    return (
      SKILL_CABLES.find(
        (s) =>
          s.id === needle ||
          s.name.toLowerCase() === needle ||
          s.aliases.some((a) => a.toLowerCase() === needle),
      ) ?? null
    );
  };

  return {
    group,
    highlight(q) {
      if (current) for (const m of runs.get(current) ?? []) m.material = kit.palette.get('steelDark');
      current = null;
      if (!q) return null;
      const s = find(q);
      if (!s) return null;
      for (const m of runs.get(s.id) ?? []) m.material = kit.palette.get('lampOn');
      current = s.id;
      return s;
    },
    dispose() {
      for (const meshes of runs.values()) for (const m of meshes) m.geometry.dispose();
      group.removeFromParent();
    },
  };
}
