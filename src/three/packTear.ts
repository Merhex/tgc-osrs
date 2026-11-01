/**
 * Deterministic tear path and strip-curl kinematics for the booster seal.
 * Pure functions (no Three.js) so the path is generated once per opening and can
 * be tested independently.
 */

export const PACK_W = 0.74;
export const HALF = 0.52;
export const CRIMP_H = 0.07;
/** Nominal tear height: just below the crimped top seal. */
export const TEAR_BASE = HALF - 0.034;

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mulberry(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TearPath {
  /** Tear height at x (pack-local units). */
  y(x: number): number;
  samples: Float32Array;
}

/**
 * Mostly horizontal path with small irregular deviations: a few incommensurate
 * low-amplitude waves plus a smoothed random walk. No repeating teeth.
 * The corner where the tear starts dips slightly, like a nick.
 */
export function makeTearPath(seed: string, n = 160): TearPath {
  const rng = mulberry(hashSeed(seed));
  const waves = [0, 1, 2].map((k) => ({
    amp: [0.0035, 0.0018, 0.0009][k] * (0.6 + rng() * 0.8),
    freq: [1.7, 4.3, 10.9][k] * (0.8 + rng() * 0.4),
    phase: rng() * Math.PI * 2,
  }));
  const walk = new Float32Array(n + 1);
  let w = 0;
  for (let i = 0; i <= n; i++) {
    w = w * 0.82 + (rng() - 0.5) * 0.0016;
    walk[i] = w;
  }
  const slope = (rng() - 0.5) * 0.006;
  const samples = new Float32Array(n + 1);
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = -PACK_W / 2 + u * PACK_W;
    let y = TEAR_BASE + slope * (u - 0.5);
    for (const wv of waves) y += wv.amp * Math.sin(u * wv.freq * Math.PI * 2 + wv.phase);
    y += walk[i];
    y -= 0.008 * Math.exp(-(x + PACK_W / 2) / 0.04); // starting nick at the left corner
    samples[i] = Math.min(HALF - 0.012, y);
  }
  return {
    samples,
    y(x: number) {
      const f = Math.min(n, Math.max(0, ((x + PACK_W / 2) / PACK_W) * n));
      const i = Math.floor(f);
      const t = f - i;
      return i >= n ? samples[n] : samples[i] * (1 - t) + samples[i + 1] * t;
    },
  };
}

/**
 * Centre-line of the detached strip, parameterised by arc length s from the tear
 * front. The strip bends backward (−z) with curvature that tightens toward its free
 * end, while the bending plane tilts upward, so it curls back over itself.
 */
export class CurlTable {
  readonly n = 96;
  readonly maxS = PACK_W + 0.12;
  /** position (x,y,z), tangent (x,y,z), width direction (x,y,z) per sample */
  readonly data = new Float32Array((this.n + 1) * 9);

  update(pull: number) {
    const ds = this.maxS / this.n;
    let px = 0;
    let py = 0;
    let pz = 0;
    let theta = 0;
    for (let i = 0; i <= this.n; i++) {
      const s = i * ds;
      const beta = 0.55 * pull * (1 - Math.exp(-s / 0.12));
      const cb = Math.cos(beta);
      const sb = Math.sin(beta);
      // plane basis: e1 = −x (along the strip), e2 = backward and slightly up
      const ct = Math.cos(theta);
      const st = Math.sin(theta);
      const tx = -ct;
      const ty = st * sb;
      const tz = -st * cb;
      const o = i * 9;
      this.data[o] = px;
      this.data[o + 1] = py;
      this.data[o + 2] = pz;
      this.data[o + 3] = tx;
      this.data[o + 4] = ty;
      this.data[o + 5] = tz;
      this.data[o + 6] = 0;
      this.data[o + 7] = cb;
      this.data[o + 8] = sb;
      const kappa = pull * (1.6 + 7.5 * Math.min(1, s / PACK_W));
      theta += kappa * ds;
      px += tx * ds;
      py += ty * ds;
      pz += tz * ds;
    }
  }

  /** Writes the frame at arc length s into out[0..8]. */
  sample(s: number, out: Float32Array) {
    const f = Math.min(this.n, Math.max(0, s / (this.maxS / this.n)));
    const i = Math.min(this.n - 1, Math.floor(f));
    const t = f - i;
    const a = i * 9;
    const b = a + 9;
    for (let k = 0; k < 9; k++) out[k] = this.data[a + k] * (1 - t) + this.data[b + k] * t;
    // beyond the table: extrapolate along the last tangent
    if (s > this.maxS) {
      const e = s - this.maxS;
      out[0] += out[3] * e;
      out[1] += out[4] * e;
      out[2] += out[5] * e;
    }
  }
}
