/**
 * Policy Sorter simulation (Policy → Pipelines). Shape from the ledger (F-C31–F-C40): five agents on one LangGraph —
 * Policy Compiler → Drift Scanner → Remediation Planner → Risk Assessor → Change Executor; guardrails first
 * (BLOCKED pins the score to 10, HIGH_RISK adds +6), auto-approve below 4, human gate otherwise; evidence packs filed;
 * mock mode for CI. The three sample policies and their violations are invented for the simulation and labelled so.
 */
import { clamp, type ControlValue, type Sim, type SimEvent } from './types';
import type { VizSpec } from '../viz/spec';

export const SORTER_SCENARIOS = ['single', 'rotate'] as const;
export type SorterScenario = (typeof SORTER_SCENARIOS)[number];

export const STAGES = ['idle', 'compile', 'scan', 'plan', 'risk', 'gate', 'execute', 'evidence'] as const;
export type Stage = (typeof STAGES)[number];

export const AUTO_APPROVE_BELOW = 4; // F-C34
export const BLOCKED_SCORE = 10; // F-C36
export const HIGH_RISK_BOOST = 6; // F-C36

export interface SamplePolicy {
  id: string;
  text: string;
  violations: number;
  blocked: boolean;
  highRisk: boolean;
  rubric: number; // the LLM rubric 0–10 (sample)
}

/** Sample policies. The first sentence is the project's own example (F-C30); the other two are illustrative. */
export const SAMPLE_POLICIES: SamplePolicy[] = [
  {
    id: 'bucket-labels',
    text: 'All GCS buckets must have cost_center, environment and team labels',
    violations: 3,
    blocked: false,
    highRisk: false,
    rubric: 3,
  },
  {
    id: 'public-ip-ban',
    text: 'No Compute instance may expose a public IP',
    violations: 2,
    blocked: false,
    highRisk: true,
    rubric: 2,
  },
  {
    id: 'sql-backups',
    text: 'Every Cloud SQL instance must have automated backups and deletion protection',
    violations: 1,
    blocked: true,
    highRisk: false,
    rubric: 5,
  },
];

/** Guardrails first, then the rubric. Pure function so the thresholds are unit-tested. */
export function riskScore(p: Pick<SamplePolicy, 'blocked' | 'highRisk' | 'rubric'>): number {
  if (p.blocked) return BLOCKED_SCORE;
  const s = p.rubric + (p.highRisk ? HIGH_RISK_BOOST : 0);
  return clamp(Math.round(s), 0, 10);
}

export function needsHumanGate(score: number): boolean {
  return score >= AUTO_APPROVE_BELOW;
}

const DURATIONS: Record<Stage, number> = {
  idle: 1.4,
  compile: 1.2,
  scan: 1.5,
  plan: 1.2,
  risk: 1.0,
  gate: Infinity,
  execute: 1.4,
  evidence: 0.7,
};

export interface SorterReadouts extends Record<string, string | number> {
  stage: string;
  violations: number;
  'risk-score': number;
  'evidence-packs': number;
}

export class SorterSim implements Sim<SorterReadouts> {
  readonly slug = 'policy-sorter';
  private ctrl: Record<string, ControlValue> = {
    policy: 'bucket-labels',
    approve: false,
    'mock-mode': true,
    scenario: 'single',
  };
  /** Plans finished since the last policy/scenario change; `rotate` walks the sample policies with it. */
  private rotations = 0;
  private ledger: Array<{ n: number; policy: string; score: number; how: 'auto-approved' | 'human gate' }> =
    [];
  private viaGate = false;
  private events: SimEvent[] = [];
  private stage: Stage = 'idle';
  private t = 0;
  private current: SamplePolicy = SAMPLE_POLICIES[0]!;
  private score = 0;
  private packs = 0;
  private gateWaited = 0;
  /** The approval lever was pulled while a plan waited at the gate. A pulse: it is consumed, never stored. */
  private approved = false;

  controls() {
    return { ...this.ctrl };
  }
  getControl(id: string) {
    return this.ctrl[id];
  }
  setControl(id: string, value: ControlValue): boolean {
    if (!(id in this.ctrl)) return false;
    if (id === 'approve') {
      // A button, not a switch: it only means something while a plan waits at the human gate.
      if (value === true) {
        if (this.stage === 'gate') this.approved = true;
        else this.events.push({ type: 'approve-ignored', stage: this.stage });
      }
      return true;
    }
    if (id === 'policy' && !SAMPLE_POLICIES.some((p) => p.id === value)) return false;
    if (id === 'scenario' && !SORTER_SCENARIOS.includes(value as SorterScenario)) return false;
    this.ctrl[id] = value;
    if (id === 'policy' || id === 'scenario') this.rotations = 0;
    this.events.push({ type: 'control', id, value });
    if (id === 'policy' || id === 'scenario') {
      // a new card drops: restart the belt
      this.stage = 'idle';
      this.t = DURATIONS.idle - 0.2;
    }
    return true;
  }

  get policy(): SamplePolicy {
    return this.current;
  }
  get currentStage(): Stage {
    return this.stage;
  }
  /** 0..1 progress through the current stage (Infinity-duration gate reports 0). */
  get stageProgress(): number {
    const d = DURATIONS[this.stage];
    return Number.isFinite(d) ? clamp(this.t / d, 0, 1) : 0;
  }
  get scenario(): SorterScenario {
    return this.ctrl['scenario'] as SorterScenario;
  }
  /** The policy that is on the belt (or about to be): the selected one, advanced by `rotate`. */
  private activePolicy(): SamplePolicy {
    const base = Math.max(
      0,
      SAMPLE_POLICIES.findIndex((p) => p.id === this.ctrl['policy']),
    );
    const i = (base + (this.scenario === 'rotate' ? this.rotations : 0)) % SAMPLE_POLICIES.length;
    return SAMPLE_POLICIES[i]!;
  }
  get mock(): boolean {
    return Boolean(this.ctrl['mock-mode']);
  }

  private enter(stage: Stage): void {
    this.stage = stage;
    this.t = 0;
    this.events.push({ type: 'stage', stage, policy: this.current.id, mock: this.mock });
    if (stage === 'risk') {
      this.score = riskScore(this.current);
      this.events.push({
        type: 'risk',
        score: this.score,
        blocked: this.current.blocked,
        highRisk: this.current.highRisk,
        rubric: this.current.rubric,
      });
    }
    if (stage === 'evidence') {
      this.packs++;
      this.ledger.push({
        n: this.packs,
        policy: this.current.id,
        score: this.score,
        how: this.viaGate ? 'human gate' : 'auto-approved',
      });
      if (this.ledger.length > 6) this.ledger.shift();
      this.events.push({ type: 'pack', count: this.packs, policy: this.current.id });
    }
    if (stage === 'compile') {
      this.current = this.activePolicy();
      this.viaGate = false;
      this.events.push({ type: 'card', policy: this.current.id, text: this.current.text });
    }
  }

  step(dt: number): void {
    const speed = this.mock ? 1.6 : 1;
    this.t += clamp(dt, 0, 0.2) * speed;
    switch (this.stage) {
      case 'idle':
        if (this.t >= DURATIONS.idle) this.enter('compile');
        break;
      case 'compile':
        if (this.t >= DURATIONS.compile) this.enter('scan');
        break;
      case 'scan':
        if (this.t >= DURATIONS.scan) this.enter(this.current.violations > 0 ? 'plan' : 'evidence');
        break;
      case 'plan':
        if (this.t >= DURATIONS.plan) this.enter('risk');
        break;
      case 'risk':
        if (this.t >= DURATIONS.risk) {
          if (needsHumanGate(this.score)) {
            this.enter('gate');
            this.viaGate = true;
            this.approved = false;
            this.gateWaited = 0;
          } else this.enter('execute');
        }
        break;
      case 'gate':
        this.gateWaited += dt;
        if (this.approved) {
          this.approved = false;
          this.events.push({
            type: 'approved',
            score: this.score,
            waitedSeconds: Math.round(this.gateWaited),
          });
          this.enter('execute');
        }
        break;
      case 'execute':
        if (this.t >= DURATIONS.execute) this.enter('evidence');
        break;
      case 'evidence':
        if (this.t >= DURATIONS.evidence) {
          if (this.scenario === 'rotate') this.rotations++;
          this.enter('idle');
        }
        break;
    }
  }

  viz(): VizSpec[] {
    const pol = this.activePolicy();
    const PIPE = [
      ['compile', 'Policy Compiler', 'plain English → enforceable rules'],
      ['scan', 'Drift Scanner', ''],
      ['plan', 'Remediation Planner', 'prints the fix'],
      ['risk', 'Risk Assessor', ''],
      ['gate', 'Human gate', ''],
      ['execute', 'Change Executor', 'applies the approved plan'],
      ['evidence', 'Evidence pack', 'filed to the cabinet'],
    ] as const;
    const idx = PIPE.findIndex(([k]) => k === this.stage);
    const clean = this.current.violations === 0;
    const autoPast = idx > 3 && !needsHumanGate(this.score);
    const items = PIPE.map(([k, label, note], i) => {
      let state: 'done' | 'active' | 'waiting' | 'todo' | 'skipped' = 'todo';
      let progress = 0;
      let n: string = note;
      if (idx >= 0 && i < idx) {
        state = 'done';
        progress = 1;
      }
      if (i === idx) {
        state = k === 'gate' ? 'waiting' : 'active';
        progress = k === 'gate' ? clamp(this.gateWaited / 30, 0, 1) : this.stageProgress;
      }
      if (idx >= 0 && clean && i >= 2 && i <= 5 && idx > 1) state = 'skipped';
      if (k === 'gate' && autoPast) {
        state = 'skipped';
        n = `auto-approved: score ${this.score} is below ${AUTO_APPROVE_BELOW}`;
      }
      if (k === 'scan' && idx >= 1)
        n = `${this.current.violations} violation${this.current.violations === 1 ? '' : 's'} found`;
      if (k === 'risk' && idx >= 3) n = `score ${this.score} of 10`;
      if (k === 'gate' && state === 'waiting') n = `score ${this.score}: waiting for the approval lever`;
      return { label, state, progress, ...(n ? { note: n } : {}) };
    });

    // How the score is built for the policy on the belt: guardrails first, then the rubric.
    const steps: Array<{
      label: string;
      delta: number;
      kind: 'add' | 'pin' | 'total';
      tone: 'brass' | 'ember' | 'amber' | 'sage';
    }> = [{ label: 'Rubric', delta: pol.rubric, kind: 'add', tone: 'brass' }];
    if (pol.highRisk && !pol.blocked)
      steps.push({ label: 'HIGH_RISK', delta: HIGH_RISK_BOOST, kind: 'add', tone: 'ember' });
    if (pol.blocked)
      steps.push({ label: 'BLOCKED', delta: BLOCKED_SCORE - pol.rubric, kind: 'pin', tone: 'ember' });
    const score = riskScore(pol);
    steps.push({
      label: 'Score',
      delta: score,
      kind: 'total',
      tone: needsHumanGate(score) ? 'amber' : 'sage',
    });

    const gateSeconds = this.stage === 'gate' ? this.gateWaited : 0;
    return [
      {
        id: 'pipeline',
        kind: 'stages',
        title: `Five agents, one graph · ${pol.id}`,
        caption: `${this.scenario === 'rotate' ? 'Rotating through the three sample policies.' : 'One sample policy.'} Mock mode ${this.mock ? 'on (×1.6 faster)' : 'off'}.`,
        items,
      },
      {
        id: 'risk-build',
        kind: 'waterfall',
        title: `Risk score build-up · ${pol.id}`,
        caption:
          'Guardrails first: BLOCKED pins the score to 10, HIGH_RISK adds 6, then the rubric (sample rubric values).',
        max: 10,
        steps,
        thresholds: [
          { label: `auto-approve below ${AUTO_APPROVE_BELOW}`, value: AUTO_APPROVE_BELOW },
          { label: `BLOCKED = ${BLOCKED_SCORE}`, value: BLOCKED_SCORE },
        ],
      },
      {
        id: 'risk-compare',
        kind: 'bars',
        title: 'All three sample policies, scored',
        caption: 'The same rules applied to each sample policy.',
        max: 10,
        unit: '/ 10',
        marker: { label: `auto-approve below ${AUTO_APPROVE_BELOW}`, value: AUTO_APPROVE_BELOW },
        items: SAMPLE_POLICIES.map((p) => {
          const sc = riskScore(p);
          return {
            label: p.id,
            value: sc,
            tone: p.blocked
              ? ('ember' as const)
              : needsHumanGate(sc)
                ? ('amber' as const)
                : ('sage' as const),
            note: p.blocked ? 'blocked → gate' : needsHumanGate(sc) ? 'human gate' : 'auto-approve',
          };
        }),
      },
      {
        id: 'gate-wait',
        kind: 'gauge',
        title: 'Human gate',
        value: Math.min(60, Math.round(gateSeconds)),
        max: 60,
        unit: 's',
        tone: 'ember',
        text:
          this.stage === 'gate'
            ? 'A plan is waiting for the approval lever'
            : 'No plan is waiting at the gate',
      },
      {
        id: 'evidence-ledger',
        kind: 'bars',
        title: 'Evidence cabinet',
        caption: this.ledger.length
          ? 'Latest packs filed (sample policies).'
          : 'Nothing filed yet: the first pack lands when a plan finishes.',
        max: 10,
        unit: '/ 10',
        marker: { label: `auto-approve below ${AUTO_APPROVE_BELOW}`, value: AUTO_APPROVE_BELOW },
        items: this.ledger.map((l) => ({
          label: `#${l.n} ${l.policy}`,
          value: l.score,
          tone: l.how === 'auto-approved' ? ('sage' as const) : ('amber' as const),
          note: l.how,
        })),
      },
    ];
  }

  readouts(): SorterReadouts {
    return {
      stage: this.stage === 'gate' ? `gate · waiting for approval (score ${this.score})` : this.stage,
      violations: this.stage === 'idle' || this.stage === 'compile' ? 0 : this.current.violations,
      'risk-score':
        this.stage === 'idle' || this.stage === 'compile' || this.stage === 'scan' || this.stage === 'plan'
          ? 0
          : this.score,
      'evidence-packs': this.packs,
    };
  }

  drain(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
}
