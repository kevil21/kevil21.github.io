/**
 * Policy Sorter simulation (Policy → Pipelines). Shape from the ledger (F-C31–F-C40): five agents on one LangGraph —
 * Policy Compiler → Drift Scanner → Remediation Planner → Risk Assessor → Change Executor; guardrails first
 * (BLOCKED pins the score to 10, HIGH_RISK adds +6), auto-approve below 4, human gate otherwise; evidence packs filed;
 * mock mode for CI. The three sample policies and their violations are invented for the simulation and labelled so.
 */
import { clamp, type ControlValue, type Sim, type SimEvent } from './types';

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
  private ctrl: Record<string, ControlValue> = { policy: 'bucket-labels', approve: false, 'mock-mode': true };
  private events: SimEvent[] = [];
  private stage: Stage = 'idle';
  private t = 0;
  private current: SamplePolicy = SAMPLE_POLICIES[0]!;
  private score = 0;
  private packs = 0;
  private gateWaited = 0;

  controls() {
    return { ...this.ctrl };
  }
  getControl(id: string) {
    return this.ctrl[id];
  }
  setControl(id: string, value: ControlValue): boolean {
    if (!(id in this.ctrl)) return false;
    if (id === 'policy' && !SAMPLE_POLICIES.some((p) => p.id === value)) return false;
    this.ctrl[id] = value;
    this.events.push({ type: 'control', id, value });
    if (id === 'policy') {
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
      this.events.push({ type: 'pack', count: this.packs, policy: this.current.id });
    }
    if (stage === 'compile') {
      this.current = SAMPLE_POLICIES.find((p) => p.id === this.ctrl['policy']) ?? SAMPLE_POLICIES[0]!;
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
            this.ctrl['approve'] = false;
            this.gateWaited = 0;
          } else this.enter('execute');
        }
        break;
      case 'gate':
        this.gateWaited += dt;
        if (this.ctrl['approve'] === true) {
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
          this.ctrl['approve'] = false;
          this.enter('idle');
        }
        break;
    }
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
