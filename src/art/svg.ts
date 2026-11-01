/** Small helpers for building low-poly, flat-shaded SVG illustrations. */

export type Pt = [number, number];

export const W = 640;
export const H = 470;

export function pts(list: readonly Pt[]): string {
  return list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

export function poly(list: readonly Pt[], fill: string, extra = ''): string {
  return `<polygon points="${pts(list)}" fill="${fill}" ${extra}/>`;
}

/** Parses "x,y x,y ..." into a polygon. */
export function p(s: string, fill: string, extra = ''): string {
  return `<polygon points="${s}" fill="${fill}" ${extra}/>`;
}

export function linear(id: string, stops: [number, string, number?][], x1 = 0, y1 = 0, x2 = 0, y2 = 1): string {
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops
    .map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a ?? 1}"/>`)
    .join('')}</linearGradient>`;
}

export function radial(id: string, stops: [number, string, number?][], cx = 0.5, cy = 0.5, r = 0.5): string {
  return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops
    .map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a ?? 1}"/>`)
    .join('')}</radialGradient>`;
}

export function doc(defs: string, body: string, w = W, h = H): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 2}" height="${h * 2}"><defs>${defs}</defs>${body}</svg>`;
}

/** Deterministic pseudo random for reproducible scatter (rocks, crystals, embers). */
export function rand(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shades a hex colour: amount > 0 lightens, < 0 darkens. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const f = (c: number) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  r = f(r);
  g = f(g);
  b = f(b);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/**
 * A faceted ribbon following a polyline: quads between two offset curves,
 * alternately shaded to read as low-poly, twisted geometry.
 */
export function ribbon(
  path: readonly Pt[],
  width: (t: number) => number,
  color: (i: number, t: number, side: 0 | 1) => string,
  split = true,
): string {
  const left: Pt[] = [];
  const right: Pt[] = [];
  const mid: Pt[] = [];
  for (let i = 0; i < path.length; i++) {
    const a = path[Math.max(0, i - 1)];
    const b = path[Math.min(path.length - 1, i + 1)];
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const w = width(i / (path.length - 1)) / 2;
    left.push([path[i][0] - dy * w, path[i][1] + dx * w]);
    right.push([path[i][0] + dy * w, path[i][1] - dx * w]);
    mid.push(path[i]);
  }
  let out = '';
  for (let i = 0; i < path.length - 1; i++) {
    const t = i / (path.length - 2 || 1);
    if (split) {
      out += poly([left[i], left[i + 1], mid[i + 1], mid[i]], color(i, t, 0));
      out += poly([mid[i], mid[i + 1], right[i + 1], right[i]], color(i, t, 1));
    } else {
      out += poly([left[i], left[i + 1], right[i + 1], right[i]], color(i, t, 0));
    }
  }
  return out;
}

/** Samples a quadratic/cubic-like curve through control points (Catmull–Rom). */
export function curve(ctrl: readonly Pt[], samples = 24): Pt[] {
  const out: Pt[] = [];
  const n = ctrl.length - 1;
  for (let s = 0; s <= samples; s++) {
    const u = (s / samples) * n;
    const i = Math.min(n - 1, Math.floor(u));
    const t = u - i;
    const p0 = ctrl[Math.max(0, i - 1)];
    const p1 = ctrl[i];
    const p2 = ctrl[i + 1];
    const p3 = ctrl[Math.min(n, i + 2)];
    const t2 = t * t;
    const t3 = t2 * t;
    const f = (a: number, b: number, c: number, d: number) =>
      0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
    out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
  }
  return out;
}

/** Scatter of faceted rocks along the bottom of a scene. */
export function rockBed(seed: number, y: number, colors: string[], count = 14, w = W, h = H): string {
  const r = rand(seed);
  let out = '';
  for (let i = 0; i < count; i++) {
    const cx = (i / (count - 1)) * w + (r() - 0.5) * 40;
    const rw = 40 + r() * 60;
    const rh = 25 + r() * 45;
    const top = y - rh;
    const c = colors[Math.floor(r() * colors.length)];
    out += poly(
      [
        [cx - rw / 2, h],
        [cx - rw / 2 + r() * 10, y - rh * 0.4],
        [cx - rw * 0.15, top],
        [cx + rw * 0.25, top + r() * 10],
        [cx + rw / 2, y - rh * 0.3],
        [cx + rw / 2, h],
      ],
      c,
    );
    out += poly(
      [
        [cx - rw * 0.15, top],
        [cx + rw * 0.25, top + 6],
        [cx + rw * 0.05, y - rh * 0.2],
      ],
      shade(c, 0.18),
    );
  }
  return out;
}

/** Simple radial vignette overlay. */
export function vignette(id = 'vig', strength = 0.65, w = W, h = H): string {
  return `${`<defs>${radial(id, [
    [0.55, '#000', 0],
    [1, '#000', strength],
  ])}</defs>`}<rect width="${w}" height="${h}" fill="url(#${id})"/>`;
}
