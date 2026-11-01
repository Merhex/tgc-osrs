/**
 * Small synthesized sound effects via Web Audio (no audio files).
 * The AudioContext is only created after a user gesture, so nothing plays before interaction.
 */
export type SoundName = 'tear' | 'rustle' | 'slide' | 'flip' | 'whoosh' | 'anticipation' | 'legendary' | 'click';

let ctx: AudioContext | null = null;
let muted = false;
let unlocked = false;

export function setMuted(value: boolean) {
  muted = value;
}

/** Call from a user gesture handler. */
export function unlockAudio() {
  unlocked = true;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

function noiseBuffer(c: AudioContext, seconds: number): AudioBuffer {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function noise(
  c: AudioContext,
  t: number,
  dur: number,
  freq: number,
  q: number,
  gain: number,
  type: BiquadFilterType = 'bandpass',
  crackle = false,
) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, dur);
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.02);
  if (crackle) {
    for (let k = 0; k < dur * 40; k++) g.gain.setValueAtTime(gain * (0.4 + Math.random() * 0.6), t + 0.02 + k / 40);
  }
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
  src.stop(t + dur + 0.05);
}

function tone(c: AudioContext, t: number, freq: number, dur: number, gain: number, type: OscillatorType = 'sine', slideTo?: number) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function play(name: SoundName) {
  if (muted || !unlocked || !ctx || ctx.state !== 'running') return;
  const c = ctx;
  const t = c.currentTime;
  switch (name) {
    case 'tear':
      noise(c, t, 0.65, 3200, 0.8, 0.22, 'bandpass', true);
      break;
    case 'rustle':
      noise(c, t, 0.7, 1800, 0.5, 0.12, 'bandpass', true);
      break;
    case 'slide':
      noise(c, t, 0.45, 900, 0.7, 0.1, 'lowpass');
      break;
    case 'flip':
      noise(c, t, 0.18, 2400, 1.2, 0.12, 'bandpass');
      break;
    case 'whoosh':
      noise(c, t, 0.3, 700, 0.6, 0.08, 'lowpass');
      break;
    case 'anticipation':
      tone(c, t, 70, 1.0, 0.18, 'sine', 110);
      tone(c, t, 140, 1.0, 0.05, 'triangle', 220);
      break;
    case 'legendary':
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, t + i * 0.09, f, 1.2, 0.08, 'triangle'));
      tone(c, t + 0.36, 1567.98, 1.4, 0.03, 'sine');
      break;
    case 'click':
      tone(c, t, 880, 0.06, 0.04, 'square');
      break;
  }
}
