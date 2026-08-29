import type { SceneId } from "./data";

export type TuneId = SceneId | "ending";

type Env = { a: number; d: number; s: number; r: number };

type Voice = {
  wave: OscillatorType;
  gain: number;
  pan?: number;
  lp?: number;
  vibrato?: number;
  env: Env;
  pluck?: number;
  pattern: string;
};

type Tune = {
  bpm: number;
  swing?: number;
  lp: number;
  delay: number;
  delayMix: number;
  voices: Voice[];
  hat?: string;
  kick?: string;
};

const MUTE_KEY = "perfectday-mute";
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
const FLAT: Record<string, string> = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#" };

const soft: Env = { a: 0.012, d: 0.12, s: 0.45, r: 0.18 };
const pluck: Env = { a: 0.005, d: 0.22, s: 0.08, r: 0.16 };
const pad: Env = { a: 0.06, d: 0.18, s: 0.62, r: 0.35 };
const bassEnv: Env = { a: 0.01, d: 0.08, s: 0.7, r: 0.2 };

export type Hit = { at: number; note: string; dur: number };

/** `B4:4 D5:2 -:8` — duration in 16th notes. `-` is a rest. */
export function parseHits(pattern: string): Hit[] {
  let at = 0;
  const hits: Hit[] = [];
  for (const tok of pattern.trim().split(/\s+/)) {
    if (!tok) continue;
    const colon = tok.lastIndexOf(":");
    const note = colon >= 0 ? tok.slice(0, colon) : tok;
    const dur = colon >= 0 ? Number(tok.slice(colon + 1)) : 1;
    if (!Number.isFinite(dur) || dur <= 0) throw new Error(`bad duration in ${tok}`);
    if (note !== "-") hits.push({ at, note, dur });
    at += dur;
  }
  return hits;
}

export function patternLength(pattern: string): number {
  let at = 0;
  for (const tok of pattern.trim().split(/\s+/)) {
    if (!tok) continue;
    const colon = tok.lastIndexOf(":");
    const dur = colon >= 0 ? Number(tok.slice(colon + 1)) : 1;
    if (!Number.isFinite(dur) || dur <= 0) throw new Error(`bad duration in ${tok}`);
    at += dur;
  }
  return at;
}

export function freq(note: string): number {
  const m = note.match(/^([A-G][#b]?)(-?\d)$/);
  if (!m) throw new Error(`bad note ${note}`);
  const name = FLAT[m[1]] ?? m[1];
  const n = NAMES.indexOf(name as (typeof NAMES)[number]);
  if (n < 0) throw new Error(`bad note ${note}`);
  return 440 * 2 ** ((n + (Number(m[2]) + 1) * 12 - 69) / 12);
}

function voice(wave: OscillatorType, gain: number, env: Env, pattern: string, extra: Partial<Voice> = {}): Voice {
  return { wave, gain, env, pattern, ...extra };
}

const townMelody = `
  B4:4 D5:2 E5:2 G5:4 E5:2 D5:2
  B4:4 A4:2 B4:2 G4:8
  A4:4 B4:2 D5:2 E5:4 D5:2 B4:2
  A4:2 G4:2 E4:4 D4:8
  D5:4 E5:2 G5:2 A5:4 G5:2 E5:2
  D5:4 B4:2 A4:2 G4:8
  E5:2 D5:2 B4:2 A4:2 G4:2 A4:2 B4:2 D5:2
  E5:4 D5:2 B4:2 G4:8
`;

const townBass = `
  G2:8 D3:8 C3:8 D3:8 G2:8 E2:8 C3:8 D3:8
  G2:8 D3:8 C3:8 D3:8 G2:8 E2:8 C3:8 D3:6 G2:2
`;

const townArp = `
  G3:2 B3:2 D4:2 G4:2 G3:2 B3:2 D4:2 B3:2
  D3:2 F#3:2 A3:2 D4:2 D3:2 F#3:2 A3:2 F#3:2
  C3:2 E3:2 G3:2 C4:2 C3:2 E3:2 G3:2 E3:2
  D3:2 F#3:2 A3:2 D4:2 D3:2 F#3:2 A3:2 F#3:2
  G3:2 B3:2 D4:2 G4:2 G3:2 B3:2 D4:2 B3:2
  E3:2 G3:2 B3:2 E4:2 E3:2 G3:2 B3:2 G3:2
  C3:2 E3:2 G3:2 C4:2 C3:2 E3:2 G3:2 E3:2
  D3:2 F#3:2 A3:2 D4:2 D3:2 A3:2 D4:2 G3:2
`;

const TUNES: Record<TuneId, Tune> = {
  town: {
    bpm: 96,
    lp: 2600,
    delay: 0.5,
    delayMix: 0.14,
    voices: [
      voice("triangle", 0.07, soft, townMelody, { pan: -0.15, vibrato: 3.2, lp: 3200 }),
      voice("sine", 0.045, { a: 0.02, d: 0.1, s: 0.35, r: 0.12 }, townArp, { pan: 0.28, lp: 1800 }),
      voice("sine", 0.11, bassEnv, townBass, { pan: 0, lp: 700 }),
    ],
    hat: "----x-------x---".repeat(8),
  },
  park: {
    bpm: 84,
    lp: 2400,
    delay: 0.75,
    delayMix: 0.2,
    voices: [
      voice(
        "sine",
        0.065,
        { a: 0.03, d: 0.16, s: 0.4, r: 0.28 },
        `
          D5:6 E5:2 G5:6 A5:2 G5:4 E5:4 D5:8
          B4:6 A4:2 G4:4 D5:4 E5:8 D5:8
          G5:4 A5:4 B5:4 A5:4 G5:4 E5:2 D5:2 B4:8
          A4:4 B4:4 D5:4 E5:4 D5:4 B4:4 G4:8
        `,
        { pan: -0.1, vibrato: 5, lp: 2800 },
      ),
      voice(
        "triangle",
        0.03,
        pad,
        `
          G4:16 D4:16 C4:16 D4:16
          G4:16 E4:16 C4:16 D4:16
        `,
        { pan: 0.25, lp: 1400 },
      ),
      voice(
        "sine",
        0.1,
        bassEnv,
        `
          G2:16 D3:16 C3:16 D3:16
          G2:16 E2:16 C3:16 D3:16
        `,
        { lp: 600 },
      ),
    ],
  },
  home: {
    bpm: 72,
    lp: 2000,
    delay: 0.7,
    delayMix: 0.22,
    voices: [
      voice(
        "sine",
        0.055,
        pluck,
        `
          G4:4 D5:4 B4:4 D5:4 A4:4 D5:4 G4:4 D5:4
          E4:4 B4:4 G4:4 B4:4 D4:4 A4:4 G4:8
          G4:4 E5:4 D5:4 B4:4 A4:4 G4:4 E4:4 D4:4
          G4:2 B4:2 D5:4 A4:4 G4:4 D4:8 G3:8
        `,
        { pan: -0.05, pluck: 0.35, lp: 2400 },
      ),
      voice(
        "sine",
        0.09,
        bassEnv,
        `
          G2:16 D3:16 C3:16 D3:16
          G2:16 E2:16 C3:16 D3:16
        `,
        { lp: 520 },
      ),
    ],
  },
  diner: {
    bpm: 108,
    swing: 0.2,
    lp: 2500,
    delay: 0.35,
    delayMix: 0.08,
    voices: [
      voice(
        "triangle",
        0.065,
        soft,
        `
          G4:2 B4:2 D5:4 G5:4 F#5:2 D5:2 B4:4 G4:4 D5:8
          C5:2 D5:2 E5:4 G5:4 D5:4 C5:4 B4:2 A4:2 G4:8
          G4:2 A4:2 B4:4 D5:2 E5:2 G5:4 A5:4 G5:4 D5:8
          E5:2 D5:2 B4:4 A4:4 G4:4 F#4:4 D4:4 G4:8
        `,
        { pan: -0.12, lp: 3000 },
      ),
      voice(
        "sine",
        0.1,
        bassEnv,
        `
          G2:2 A2:2 B2:2 D3:2 G2:2 B2:2 D3:2 G3:2
          C3:2 D3:2 E3:2 G3:2 D3:2 C3:2 B2:2 A2:2
          E2:2 G2:2 A2:2 B2:2 E2:2 G2:2 B2:2 E3:2
          C3:2 G2:2 A2:2 C3:2 D3:2 A2:2 C3:2 D3:2
          G2:2 A2:2 B2:2 D3:2 G2:2 B2:2 D3:2 G3:2
          C3:2 D3:2 E3:2 G3:2 D3:2 C3:2 B2:2 A2:2
          E2:2 G2:2 A2:2 B2:2 E2:2 G2:2 B2:2 E3:2
          C3:2 G2:2 D3:2 A2:2 G2:4 D2:4
        `,
        { lp: 650 },
      ),
    ],
    hat: "--x-x-x---x-x-x-".repeat(8),
  },
  arcade: {
    bpm: 128,
    lp: 1700,
    delay: 0.25,
    delayMix: 0.05,
    voices: [
      voice(
        "square",
        0.035,
        { a: 0.004, d: 0.08, s: 0.25, r: 0.06 },
        `
          E5:2 D5:2 E5:2 G5:4 A5:2 G5:2 E5:2
          D5:2 B4:2 D5:4 E5:2 G5:2 D5:4
          E5:2 G5:2 A5:2 B5:4 A5:2 G5:2 E5:2
          D5:4 B4:2 A4:2 G4:8
        `,
        { pan: -0.08, pluck: 0.12, lp: 1600 },
      ),
      voice(
        "square",
        0.028,
        { a: 0.004, d: 0.06, s: 0.2, r: 0.05 },
        `
          C3:2 G3:2 C4:2 G3:2 C3:2 G3:2 C4:2 G3:2
          A2:2 E3:2 A3:2 E3:2 A2:2 E3:2 A3:2 E3:2
          F2:2 C3:2 F3:2 C3:2 F2:2 C3:2 F3:2 C3:2
          G2:2 D3:2 G3:2 D3:2 G2:2 D3:2 C3:2 G2:2
        `,
        { pan: 0.12, lp: 900 },
      ),
      voice(
        "sine",
        0.1,
        bassEnv,
        `
          C2:4 C3:4 G2:4 C3:4
          A1:4 A2:4 E2:4 A2:4
          F2:4 F3:4 C3:4 F3:4
          G2:4 G3:4 D3:2 G2:2 C2:4
        `,
        { lp: 500 },
      ),
    ],
    hat: "x-x-x-x-x-x-x-x-".repeat(4),
    kick: "x-------x-------".repeat(4),
  },
  catcafe: {
    bpm: 80,
    swing: 0.08,
    lp: 2200,
    delay: 0.65,
    delayMix: 0.2,
    voices: [
      voice(
        "sine",
        0.055,
        pluck,
        `
          E5:4 G5:4 A5:4 G5:4 E5:4 D5:4 B4:4 D5:4
          E5:4 G5:4 B5:4 A5:4 G5:4 E5:4 D5:8
          G4:4 B4:4 D5:4 E5:4 G5:4 E5:4 D5:4 B4:4
          A4:4 G4:4 E4:4 D4:4 G4:8 D4:4 G4:4
        `,
        { pan: -0.08, pluck: 0.32, vibrato: 2.4, lp: 2600 },
      ),
      voice(
        "triangle",
        0.028,
        pad,
        `
          G4:16 D4:16 E4:16 D4:16
          G4:16 E4:16 C4:16 D4:16
        `,
        { pan: 0.3, lp: 1200 },
      ),
      voice(
        "sine",
        0.09,
        bassEnv,
        `
          G2:16 D3:16 E2:16 D3:16
          G2:16 E2:16 C3:16 D3:16
        `,
        { lp: 560 },
      ),
    ],
  },
  cinema: {
    bpm: 66,
    lp: 1600,
    delay: 0.9,
    delayMix: 0.24,
    voices: [
      voice(
        "sine",
        0.05,
        pad,
        `
          G4:6 Bb4:2 D5:4 C5:4 Bb4:4 A4:4 G4:8
          D4:6 F4:2 G4:4 A4:4 Bb4:4 A4:4 G4:8
          D5:6 C5:2 Bb4:4 A4:4 G4:4 F4:4 D4:8
          Bb3:4 D4:4 F4:4 G4:4 A4:4 F4:4 G4:8
        `,
        { pan: -0.12, vibrato: 3.5, lp: 2000 },
      ),
      voice(
        "triangle",
        0.03,
        pad,
        `
          G3:16 D3:16 Bb2:16 D3:16
          G3:16 F3:16 Eb3:16 D3:16
        `,
        { pan: 0.2, lp: 900 },
      ),
      voice(
        "sine",
        0.1,
        { a: 0.04, d: 0.2, s: 0.75, r: 0.4 },
        `
          G2:16 D2:16 Eb2:16 D2:16
          G2:16 F2:16 Eb2:16 D2:16
        `,
        { lp: 420 },
      ),
    ],
  },
  ending: {
    bpm: 78,
    lp: 2100,
    delay: 0.7,
    delayMix: 0.2,
    voices: [
      voice(
        "triangle",
        0.06,
        { a: 0.02, d: 0.16, s: 0.5, r: 0.3 },
        `
          B4:4 D5:2 E5:2 G5:4 E5:2 D5:2
          B4:4 A4:2 B4:2 G4:8
          A4:4 B4:2 D5:2 E5:4 D5:2 B4:2
          A4:2 G4:2 E4:4 D4:8
          G4:4 B4:4 D5:4 G5:4
          E5:4 D5:4 B4:8
          A4:4 G4:4 D4:8
          G4:16
        `,
        { pan: -0.1, vibrato: 3, lp: 2800 },
      ),
      voice(
        "sine",
        0.035,
        pad,
        `
          G4:16 D4:16 C4:16 D4:16
          G4:16 E4:16 D4:16 G3:16
        `,
        { pan: 0.22, lp: 1400 },
      ),
      voice(
        "sine",
        0.1,
        bassEnv,
        `
          G2:16 D3:16 C3:16 D3:16
          G2:16 E2:16 D3:16 G2:16
        `,
        { lp: 560 },
      ),
    ],
  },
};

const noiseBufs = new WeakMap<AudioContext, AudioBuffer>();

function noise(ctx: AudioContext): AudioBuffer {
  let buf = noiseBufs.get(ctx);
  if (buf) return buf;
  buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBufs.set(ctx, buf);
  return buf;
}

function tone(ctx: AudioContext, dest: AudioNode, v: Voice, note: string, time: number, dur: number) {
  const f = freq(note);
  const osc = ctx.createOscillator();
  osc.type = v.wave;
  osc.frequency.setValueAtTime(f, time);

  const g = ctx.createGain();
  const peak = v.gain;
  const hold = v.pluck ?? dur;
  const { a, d, s, r } = v.env;
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), time + a);
  g.gain.exponentialRampToValueAtTime(Math.max(peak * s, 0.0001), time + a + d);
  const tail = time + hold;
  g.gain.setValueAtTime(Math.max(peak * s, 0.0001), tail);
  g.gain.exponentialRampToValueAtTime(0.0001, tail + r);

  let node: AudioNode = osc;
  if (v.lp) {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(v.lp, time);
    lp.Q.value = 0.7;
    node.connect(lp);
    node = lp;
  }
  if (v.pan) {
    const pan = ctx.createStereoPanner();
    pan.pan.setValueAtTime(v.pan, time);
    node.connect(pan);
    node = pan;
  }
  if (v.vibrato) {
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.frequency.value = v.vibrato;
    lg.gain.value = f * 0.004;
    lfo.connect(lg).connect(osc.frequency);
    lfo.start(time);
    lfo.stop(tail + r + 0.03);
  }
  node.connect(g).connect(dest);
  osc.start(time);
  osc.stop(tail + r + 0.03);
}

function hat(ctx: AudioContext, dest: AudioNode, time: number, gain: number) {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 7000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, time);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
  src.connect(hp).connect(g).connect(dest);
  src.start(time);
  src.stop(time + 0.05);
}

function kick(ctx: AudioContext, dest: AudioNode, time: number) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(140, time);
  osc.frequency.exponentialRampToValueAtTime(48, time + 0.1);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.16, time);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
  osc.connect(g).connect(dest);
  osc.start(time);
  osc.stop(time + 0.16);
}

type Bus = {
  ctx: AudioContext;
  master: GainNode;
  duck: GainNode;
  filter: BiquadFilterNode;
  delay: DelayNode;
  delayGain: GainNode;
  out: GainNode;
};

let bus: Bus | null = null;
let timer = 0;
let tuneId: TuneId = "town";
let step = 0;
let nextTime = 0;
let muted = false;
try {
  muted = localStorage.getItem(MUTE_KEY) === "1";
} catch {
  /* tests / private mode */
}
let ducking = false;
let refs = 0;
let unlocked = false;

function ensure(): Bus {
  if (bus) return bus;
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.55;
  const duck = ctx.createGain();
  duck.gain.value = 1;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 2400;
  filter.Q.value = 0.6;
  const delay = ctx.createDelay(1.2);
  delay.delayTime.value = 0.3;
  const fb = ctx.createGain();
  fb.gain.value = 0.22;
  const delayGain = ctx.createGain();
  delayGain.gain.value = 0.14;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 12;
  comp.ratio.value = 2.2;
  comp.attack.value = 0.02;
  comp.release.value = 0.18;
  const out = ctx.createGain();
  out.gain.value = 1;

  out.connect(filter);
  filter.connect(delay);
  delay.connect(fb).connect(delay);
  delay.connect(delayGain);
  filter.connect(duck);
  delayGain.connect(duck);
  duck.connect(comp).connect(master).connect(ctx.destination);

  bus = { ctx, master, duck, filter, delay, delayGain, out };
  return bus;
}

function applyTune(t: Tune) {
  if (!bus) return;
  const now = bus.ctx.currentTime;
  bus.filter.frequency.cancelScheduledValues(now);
  bus.filter.frequency.linearRampToValueAtTime(t.lp, now + 0.4);
  const eighth = 60 / t.bpm / 2;
  bus.delay.delayTime.linearRampToValueAtTime(Math.min(1.1, eighth * (t.delay * 2)), now + 0.3);
  bus.delayGain.gain.linearRampToValueAtTime(t.delayMix, now + 0.3);
}

function stepTime(t: Tune, s: number): number {
  const sixteenth = 60 / t.bpm / 4;
  const swung = t.swing && s % 2 === 1 ? sixteenth * t.swing : 0;
  return sixteenth + swung;
}

function schedule(t: Tune, s: number, time: number) {
  if (!bus) return;
  const { ctx, out } = bus;
  const loop = loopLength(t);
  const i = ((s % loop) + loop) % loop;
  for (const v of t.voices) {
    for (const h of parseHits(v.pattern)) {
      if (h.at === i) tone(ctx, out, v, h.note, time, h.dur * (60 / t.bpm / 4));
    }
  }
  if (t.hat?.[i] === "x") hat(ctx, out, time, t.kick ? 0.028 : 0.018);
  if (t.kick?.[i] === "x") kick(ctx, out, time);
}

function loopLength(t: Tune): number {
  return Math.max(
    ...t.voices.map(v => patternLength(v.pattern)),
    t.hat?.length ?? 0,
    t.kick?.length ?? 0,
  );
}

function tick() {
  if (!bus || !unlocked || muted) return;
  const { ctx } = bus;
  if (ctx.state !== "running") return;
  const t = TUNES[tuneId];
  const ahead = 0.28;
  if (nextTime < ctx.currentTime - 0.2) nextTime = ctx.currentTime + 0.04;
  while (nextTime < ctx.currentTime + ahead) {
    try {
      schedule(t, step, nextTime);
    } catch (err) {
      console.warn("music", err);
    }
    nextTime += stepTime(t, step);
    step++;
  }
}

async function resume() {
  const b = ensure();
  if (b.ctx.state !== "running") await b.ctx.resume();
  if (!unlocked) {
    unlocked = true;
    applyTune(TUNES[tuneId]);
    nextTime = b.ctx.currentTime + 0.08;
    step = 0;
    const g = b.master.gain;
    const now = b.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(0.0001, now);
    g.exponentialRampToValueAtTime(muted ? 0.0001 : 0.55, now + 0.6);
  }
}

function onGesture() {
  void resume();
}

export const music = {
  attach() {
    refs++;
    if (refs !== 1) return;
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("keydown", onGesture);
    timer = window.setInterval(tick, 25);
  },
  detach() {
    refs = Math.max(0, refs - 1);
    if (refs) return;
    window.removeEventListener("pointerdown", onGesture);
    window.removeEventListener("keydown", onGesture);
    clearInterval(timer);
    timer = 0;
    if (bus) {
      const ctx = bus.ctx;
      bus = null;
      unlocked = false;
      void ctx.close();
    }
  },
  play(id: TuneId) {
    if (id === tuneId) return;
    tuneId = id;
    const t = TUNES[id];
    applyTune(t);
    step = 0;
    if (bus && unlocked) nextTime = Math.max(nextTime, bus.ctx.currentTime + 0.05);
  },
  duck(on: boolean) {
    if (on === ducking) return;
    ducking = on;
    if (!bus) return;
    const now = bus.ctx.currentTime;
    bus.duck.gain.cancelScheduledValues(now);
    bus.duck.gain.linearRampToValueAtTime(on ? 0.45 : 1, now + 0.18);
  },
  toggleMute() {
    muted = !muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      /* private mode */
    }
    if (bus) {
      const now = bus.ctx.currentTime;
      bus.master.gain.cancelScheduledValues(now);
      bus.master.gain.linearRampToValueAtTime(muted ? 0 : 0.55, now + 0.12);
    }
    return muted;
  },
  get muted() {
    return muted;
  },
};

export const TUNE_IDS = Object.keys(TUNES) as TuneId[];

export function tuneParts(id: TuneId) {
  const t = TUNES[id];
  return {
    loop: loopLength(t),
    voices: t.voices.map(v => patternLength(v.pattern)),
    hat: t.hat?.length ?? 0,
    kick: t.kick?.length ?? 0,
  };
}
