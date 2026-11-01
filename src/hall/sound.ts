/**
 * Machine-room sound, synthesised in Web Audio (no files): low hums per machine (ducked by distance from the camera),
 * relay clicks on controls, a breaker thunk for the opening. Off by default; the site is complete in silence.
 * Preference `sr:sound` ∈ on | off (default off). Audio starts only after a user gesture (the toggle).
 */
import { persistentAtom } from '@nanostores/persistent';

export const soundPref = persistentAtom<'on' | 'off'>('sr:sound', 'off', {
  encode: (v) => v,
  decode: (v) => (v === 'on' ? 'on' : 'off'),
});

const HUM_HZ: Record<string, number> = {
  'telemetry-refinery': 55,
  'policy-sorter': 65.4,
  'forecast-engine': 49,
  'data-workbench': 58.3,
  'calibration-bench': 73.4,
  'foundations-generator': 41.2,
};

interface Hum {
  osc: OscillatorNode;
  osc2: OscillatorNode;
  gain: GainNode;
  target: number;
}

export class MachineRoomAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private hums = new Map<string, Hum>();
  private enabled = false;

  get isEnabled(): boolean {
    return this.enabled;
  }

  /** Must be called from a user gesture. */
  async enable(): Promise<void> {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      this.master.connect(lp).connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.enabled = true;
    this.master!.gain.setTargetAtTime(0.35, this.ctx.currentTime, 0.4);
  }

  disable(): void {
    if (!this.ctx || !this.master) return;
    this.enabled = false;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
  }

  /** Start (or keep) a machine's hum; `level` 0..1 from distance. */
  hum(slug: string, level: number): void {
    if (!this.ctx || !this.master || !this.enabled) return;
    let h = this.hums.get(slug);
    if (!h) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = HUM_HZ[slug] ?? 55;
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = (HUM_HZ[slug] ?? 55) * 2.01;
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(this.master);
      osc.start();
      osc2.start();
      h = { osc, osc2, gain, target: 0 };
      this.hums.set(slug, h);
    }
    const t = Math.max(0, Math.min(1, level)) * 0.12;
    if (Math.abs(t - h.target) > 0.002) {
      h.target = t;
      h.gain.gain.setTargetAtTime(t, this.ctx.currentTime, 0.6);
    }
  }

  /** Relay click for a control change. */
  click(): void {
    if (!this.ctx || !this.master || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.03);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  /** The breaker: a low thunk with a short noise burst. */
  thunk(): void {
    if (!this.ctx || !this.master || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.25);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.45);
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.08, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const ng = this.ctx.createGain();
    ng.gain.value = 0.4;
    src.connect(ng).connect(this.master);
    src.start(t);
  }

  dispose(): void {
    for (const h of this.hums.values()) {
      h.osc.stop();
      h.osc2.stop();
    }
    this.hums.clear();
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.enabled = false;
  }
}
