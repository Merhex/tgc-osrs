/**
 * Reusable equipment illustrations drawn in a local coordinate frame centred
 * on (0,0), roughly 440 units tall. Used by both card art and the pack wrapper.
 * Original low-poly interpretations of the in-game silhouettes.
 */
import { curve, poly, ribbon, shade, type Pt } from './svg';

function along(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Twisted bow: dark, twisted wooden limbs with pale fibres and curled tips. */
export function twistedBow(): string {
  const body = curve(
    [
      [34, -238],
      [22, -214],
      [-12, -186],
      [-44, -120],
      [-40, -50],
      [-30, 0],
      [-40, 50],
      [-44, 120],
      [-12, 186],
      [22, 214],
      [34, 238],
    ],
    60,
  );
  const tones = ['#2f2622', '#4a3b31', '#6d5b49', '#a08d70', '#5a4a3d'];
  const limbs = ribbon(
    body,
    (t) => 7 + 17 * Math.sin(Math.PI * t) ** 0.8,
    (i, _t, side) => {
      const k = (i + (side ? 2 : 0)) % tones.length;
      return tones[k];
    },
  );
  // Twisting fibre highlights crossing the limb diagonally.
  let fibres = '';
  for (let i = 3; i < body.length - 3; i += 4) {
    const a = body[i];
    const b = body[i + 2];
    fibres += `<line x1="${a[0] - 8}" y1="${a[1] - 3}" x2="${b[0] + 8}" y2="${b[1] + 3}" stroke="#c9b48e" stroke-width="2.2" stroke-linecap="round" opacity="0.75"/>`;
  }
  const top = body[2];
  const bottom = body[body.length - 3];
  const string = `<line x1="${top[0]}" y1="${top[1]}" x2="${bottom[0]}" y2="${bottom[1]}" stroke="#e8e1cf" stroke-width="2" opacity="0.9"/>`;
  const grip =
    poly(
      [
        [-44, -30],
        [-18, -30],
        [-16, 30],
        [-44, 30],
      ],
      '#231b18',
    ) +
    [-22, -10, 2, 14]
      .map((y) =>
        poly(
          [
            [-46, y],
            [-16, y - 6],
            [-16, y - 1],
            [-46, y + 5],
          ],
          '#4a3a30',
        ),
      )
      .join('') +
    poly(
      [
        [-48, -34],
        [-14, -34],
        [-16, -28],
        [-46, -28],
      ],
      '#8a7458',
    ) +
    poly(
      [
        [-48, 34],
        [-14, 34],
        [-16, 28],
        [-46, 28],
      ],
      '#8a7458',
    );
  // Curled tips.
  const tip = (y: number, dir: 1 | -1) =>
    poly(
      [
        [30, y],
        [46, y + dir * 8],
        [50, y + dir * 24],
        [40, y + dir * 30],
        [42, y + dir * 18],
        [32, y + dir * 10],
      ],
      '#3a2e27',
    );
  return `<g>${string}${limbs}${fibres}${grip}${tip(-238, -1)}${tip(238, 1)}</g>`;
}

/** Scythe of Vitur: long dark shaft, huge crescent blade with crimson spine. */
export function scytheOfVitur(): string {
  const shaftA: Pt = [86, 232];
  const shaftB: Pt = [-14, -206];
  const shaftPts = Array.from({ length: 14 }, (_, i) => along(shaftA, shaftB, i / 13));
  const shaft = ribbon(
    shaftPts,
    () => 15,
    (i, _t, s) => (i % 4 === 2 ? (s ? '#8d1420' : '#b51e2c') : s ? '#1f1e23' : '#3b3a42'),
  );
  const outer = curve(
    [
      [-14, -216],
      [-100, -238],
      [-196, -214],
      [-262, -158],
      [-298, -84],
      [-306, -40],
    ],
    20,
  );
  const inner = curve(
    [
      [-20, -186],
      [-104, -196],
      [-180, -176],
      [-240, -128],
      [-282, -70],
      [-306, -40],
    ],
    20,
  );
  let blade = '';
  for (let i = 0; i < outer.length - 1; i++) {
    const light = i % 2 === 0;
    blade += poly([outer[i], outer[i + 1], inner[i]], light ? '#c8cbd3' : '#9da2ad');
    blade += poly([outer[i + 1], inner[i + 1], inner[i]], light ? '#7c818c' : '#a9aeb8');
  }
  // Crimson spine along the outer edge.
  const spineIn = outer.map(([x, y], i) => {
    const q = inner[i];
    return [x + (q[0] - x) * 0.18, y + (q[1] - y) * 0.18] as Pt;
  });
  let spine = '';
  for (let i = 0; i < outer.length - 2; i++) {
    spine += poly([outer[i], outer[i + 1], spineIn[i + 1], spineIn[i]], i % 2 ? '#a3121f' : '#d02234');
  }
  const edge = `<polyline points="${inner.map(([x, y]) => `${x},${y}`).join(' ')}" fill="none" stroke="#f1f3f7" stroke-width="2.4" opacity="0.85"/>`;
  const spike =
    poly(
      [
        [-14, -222],
        [36, -252],
        [22, -226],
        [6, -200],
      ],
      '#3b3a42',
    ) +
    poly(
      [
        [-14, -222],
        [36, -252],
        [10, -214],
      ],
      '#57565f',
    );
  const joint =
    poly(
      [
        [-36, -218],
        [-4, -230],
        [12, -204],
        [-4, -180],
        [-34, -186],
      ],
      '#26252b',
    ) +
    poly(
      [
        [-22, -210],
        [-6, -214],
        [0, -200],
        [-10, -190],
        [-24, -196],
      ],
      '#e0263a',
    ) +
    poly(
      [
        [-22, -210],
        [-6, -214],
        [-12, -204],
      ],
      '#ff7d8a',
    );
  const pommel = poly(
    [
      [80, 226],
      [98, 226],
      [104, 246],
      [89, 258],
      [74, 246],
    ],
    '#8d1420',
  );
  return `<g>${shaft}${blade}${spine}${edge}${spike}${joint}${pommel}</g>`;
}

/** Tumeken's shadow: gold staff with an ornate crown cradling a dark violet gem. */
export function tumekensShadow(): string {
  const shaftPts = Array.from({ length: 14 }, (_, i) => [0, 232 - i * 25] as Pt);
  const shaft = ribbon(
    shaftPts,
    (t) => 20 - t * 4,
    (i, _t, s) => (i % 3 === 1 ? (s ? '#2a1640' : '#43245f') : s ? '#a77a23' : '#e2b24a'),
  );
  const arm = (dir: 1 | -1) => {
    const c = curve(
      [
        [0, -86],
        [dir * 34, -110],
        [dir * 56, -150],
        [dir * 52, -196],
        [dir * 30, -232],
      ],
      16,
    );
    return ribbon(
      c,
      (t) => 16 - t * 12,
      (i, _t, s) => (s === (dir > 0 ? 1 : 0) ? '#9b6d1d' : i % 2 ? '#f0c55c' : '#d9a640'),
    );
  };
  const frond = (dir: 1 | -1, k: number) => {
    const bx = dir * (60 + k * 16);
    const by = -120 - k * 26;
    return poly(
      [
        [dir * 46, -110 - k * 20],
        [bx + dir * 22, by - 18],
        [bx + dir * 6, by + 8],
      ],
      k % 2 ? '#c99632' : '#f2c860',
    );
  };
  // Faceted gem.
  const cx = 0;
  const cy = -158;
  const r = 36;
  const ring: Pt[] = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.1];
  });
  const inner: Pt[] = ring.map(([x, y]) => [cx + (x - cx) * 0.45, cy + (y - cy) * 0.45]);
  const gemTones = ['#3d1b66', '#2a1149', '#5a2a91', '#1d0b33', '#4b2380', '#24103f', '#6b35a8', '#33175a'];
  let gem = '';
  for (let i = 0; i < 8; i++) {
    const j = (i + 1) % 8;
    gem += poly([ring[i], ring[j], inner[j], inner[i]], gemTones[i]);
  }
  gem += poly(inner, '#140724');
  gem += poly(
    [
      [cx - 8, cy - 22],
      [cx + 6, cy - 26],
      [cx - 2, cy - 12],
    ],
    '#c8a2ff',
    'opacity="0.8"',
  );
  const crown =
    poly(
      [
        [-14, -232],
        [0, -270],
        [14, -232],
        [0, -214],
      ],
      '#f5cf6a',
    ) +
    poly(
      [
        [0, -270],
        [14, -232],
        [0, -214],
      ],
      '#b98a2c',
    );
  const collar =
    poly(
      [
        [-26, -100],
        [26, -100],
        [18, -72],
        [-18, -72],
      ],
      '#c9952f',
    ) +
    poly(
      [
        [-26, -100],
        [0, -112],
        [26, -100],
      ],
      '#f4cd66',
    );
  const ferrule = poly(
    [
      [-14, 228],
      [14, 228],
      [6, 252],
      [-6, 252],
    ],
    '#f0c55c',
  );
  return `<g>${shaft}${ferrule}${frond(-1, 0)}${frond(1, 0)}${frond(-1, 1)}${frond(1, 1)}${frond(-1, 2)}${frond(1, 2)}${arm(-1)}${arm(1)}${collar}${gem}${crown}</g>`;
}

/** 3rd age pickaxe: pale head with gold trim on a gold-banded handle. */
export function thirdAgePickaxe(): string {
  const base: Pt = [-120, 196];
  const top: Pt = [56, -110];
  const dir: Pt = [top[0] - base[0], top[1] - base[1]];
  const len = Math.hypot(dir[0], dir[1]);
  const d: Pt = [dir[0] / len, dir[1] / len];
  const perp: Pt = [-d[1], d[0]];
  const handlePts = Array.from({ length: 12 }, (_, i) => along(base, top, i / 11));
  const handle = ribbon(
    handlePts,
    () => 18,
    (i, _t, s) => (i === 0 || i === 5 || i === 10 ? (s ? '#b38a2a' : '#f0cf6e') : s ? '#5d4a3a' : '#87705a'),
  );
  const head: Pt[] = [];
  const headLow: Pt[] = [];
  const steps = 20;
  for (let k = 0; k <= steps; k++) {
    const s = (k / steps) * 2 - 1;
    const bend = -(s * s) * 52;
    const thick = 30 * (1 - Math.abs(s) ** 1.6) + 2;
    const cxp = top[0] + perp[0] * s * 182 + d[0] * bend;
    const cyp = top[1] + perp[1] * s * 182 + d[1] * bend;
    head.push([cxp + d[0] * thick * 0.5, cyp + d[1] * thick * 0.5]);
    headLow.push([cxp - d[0] * thick * 0.5, cyp - d[1] * thick * 0.5]);
  }
  let headSvg = '';
  for (let k = 0; k < steps; k++) {
    headSvg += poly([head[k], head[k + 1], headLow[k + 1], headLow[k]], k % 2 ? '#e9ecf1' : '#cfd4dc');
    // gold trim on the upper edge
    const t0: Pt = [head[k][0] - d[0] * 5, head[k][1] - d[1] * 5];
    const t1: Pt = [head[k + 1][0] - d[0] * 5, head[k + 1][1] - d[1] * 5];
    headSvg += poly([head[k], head[k + 1], t1, t0], k % 2 ? '#d7ac43' : '#f2d276');
  }
  const sock: Pt[] = [
    [top[0] + perp[0] * 22 + d[0] * 26, top[1] + perp[1] * 22 + d[1] * 26],
    [top[0] - perp[0] * 22 + d[0] * 26, top[1] - perp[1] * 22 + d[1] * 26],
    [top[0] - perp[0] * 22 - d[0] * 30, top[1] - perp[1] * 22 - d[1] * 30],
    [top[0] + perp[0] * 22 - d[0] * 30, top[1] + perp[1] * 22 - d[1] * 30],
  ];
  const socket = poly(sock, '#c99a35') + poly([sock[0], sock[1], [top[0], top[1]]], '#f2d276');
  const gem = poly(
    [
      [top[0] + d[0] * 2 - perp[0] * 8, top[1] + d[1] * 2 - perp[1] * 8],
      [top[0] + d[0] * 12, top[1] + d[1] * 12],
      [top[0] + d[0] * 2 + perp[0] * 8, top[1] + d[1] * 2 + perp[1] * 8],
      [top[0] - d[0] * 10, top[1] - d[1] * 10],
    ],
    '#4f7fd8',
  );
  return `<g>${handle}${headSvg}${socket}${gem}</g>`;
}

export { shade };
