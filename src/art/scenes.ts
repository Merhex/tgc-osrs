/**
 * Full card illustrations (640×470). Original procedural low-poly artwork
 * interpreting recognizable OSRS silhouettes and colour schemes.
 */
import { scytheOfVitur, thirdAgePickaxe, tumekensShadow, twistedBow } from './items';
import { doc, H, linear, p, poly, radial, rand, rockBed, shade, W, type Pt } from './svg';

const vig = (id = 'vig') => `<rect width="${W}" height="${H}" fill="url(#${id})"/>`;
const vigDef = (id = 'vig', s = 0.7) =>
  radial(
    id,
    [
      [0.5, '#000', 0],
      [1, '#000', s],
    ],
    0.5,
    0.45,
    0.75,
  );

function crystals(seed: number, n: number, color: string, yMin: number, yMax: number, scale = 1): string {
  const r = rand(seed);
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = r() * W;
    const y = yMin + r() * (yMax - yMin);
    const h = (30 + r() * 50) * scale;
    const w = (8 + r() * 10) * scale;
    const lean = (r() - 0.5) * 20;
    out += poly(
      [
        [x - w, y],
        [x + lean, y - h],
        [x + w, y],
      ],
      shade(color, -0.25),
    );
    out += poly(
      [
        [x - w * 0.2, y],
        [x + lean, y - h],
        [x + w, y],
      ],
      shade(color, 0.25),
    );
  }
  return out;
}

/** 001 Great Olm: pale head emerging from the chamber wall, claws at either side. */
export function greatOlm(): string {
  const defs =
    linear('olmBg', [
      [0, '#0c1a14'],
      [0.6, '#16261c'],
      [1, '#07100b'],
    ]) +
    radial(
      'olmGlow',
      [
        [0, '#5fe08a', 0.55],
        [0.6, '#2f8f5a', 0.15],
        [1, '#000', 0],
      ],
      0.5,
      0.55,
      0.55,
    ) +
    vigDef();
  // Chamber wall: faceted blocks.
  const r = rand(11);
  let wall = '';
  for (let y = 0; y < 330; y += 55) {
    for (let x = -40; x < W + 40; x += 80) {
      const ox = (y / 55) % 2 ? 40 : 0;
      const c = ['#24302a', '#1d2822', '#2b3a31', '#222c26'][Math.floor(r() * 4)];
      wall += poly(
        [
          [x + ox, y],
          [x + ox + 78, y + r() * 6],
          [x + ox + 76, y + 53],
          [x + ox + 2, y + 51],
        ],
        c,
      );
      wall += poly(
        [
          [x + ox, y],
          [x + ox + 78, y + 4],
          [x + ox + 60, y + 14],
          [x + ox + 10, y + 12],
        ],
        '#33443a',
      );
    }
  }
  const hole = (cx: number, cy: number, rw: number, rh: number) =>
    poly(
      Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        return [cx + Math.cos(a) * rw * (0.9 + (i % 2) * 0.12), cy + Math.sin(a) * rh] as Pt;
      }),
      '#050806',
    );
  // Head (pale salamander-like, wide jaw).
  const head =
    p('320,118 392,132 436,170 448,214 430,262 380,292 320,300 260,292 210,262 192,214 204,170 248,132', '#d9d2c3') +
    p('320,118 392,132 410,176 320,170 230,176 248,132', '#ece6d8') +
    p('230,176 320,170 410,176 436,170 448,214 192,214 204,170', '#cfc6b4') +
    p('192,214 448,214 430,262 380,292 320,300 260,292 210,262', '#bdb3a0') +
    p('216,236 424,236 404,262 320,276 236,262', '#7c5a54') + // mouth
    p('236,240 404,240 392,252 320,262 248,252', '#3a2020') +
    p('240,240 252,252 262,240', '#efe9dc') +
    p('300,240 310,256 320,240', '#efe9dc') +
    p('360,240 372,252 382,240', '#efe9dc') +
    p('250,186 284,180 294,198 262,204', '#1b1f1a') +
    p('390,186 356,180 346,198 378,204', '#1b1f1a') +
    p('262,190 276,188 272,196', '#9df5bd') +
    p('378,190 364,188 368,196', '#9df5bd') +
    p('300,134 320,124 340,134 320,150', '#f6f1e6') +
    p('280,300 320,300 360,300 350,318 290,318', '#a89d88');
  const claw = (dir: 1 | -1) => {
    const bx = 320 + dir * 230;
    const f = (k: number) => {
      const fx = bx - dir * (24 + k * 22);
      const tipx = fx - dir * (38 + k * 6);
      return (
        poly(
          [
            [fx - 9, 250],
            [fx + 9, 250],
            [tipx + 6, 330 + k * 8],
            [tipx - 6, 324 + k * 8],
          ],
          k % 2 ? '#c9c0ad' : '#ddd5c4',
        ) +
        poly(
          [
            [tipx + 6, 330 + k * 8],
            [tipx - 6, 324 + k * 8],
            [tipx - dir * 16, 352 + k * 8],
          ],
          '#2a2622',
        )
      );
    };
    return (
      poly(
        [
          [bx + dir * 50, 206],
          [bx - dir * 10, 190],
          [bx - dir * 52, 214],
          [bx - dir * 60, 256],
          [bx - dir * 20, 270],
          [bx + dir * 44, 262],
        ],
        '#d2cab9',
      ) +
      poly(
        [
          [bx + dir * 50, 206],
          [bx - dir * 10, 190],
          [bx - dir * 52, 214],
          [bx - dir * 14, 226],
        ],
        '#e6dfd0',
      ) +
      poly(
        [
          [bx - dir * 14, 226],
          [bx - dir * 52, 214],
          [bx - dir * 60, 256],
          [bx - dir * 20, 270],
        ],
        '#bcb19c',
      ) +
      f(0) +
      f(1) +
      f(2)
    );
  };
  const floor = rockBed(12, 400, ['#1c2620', '#26332b', '#18201b']);
  const crys = crystals(13, 9, '#3fbf74', 360, 470) + crystals(14, 5, '#5fe08a', 40, 120, 0.6);
  const mist = `<ellipse cx="320" cy="420" rx="360" ry="70" fill="#5fe08a" opacity="0.12"/>`;
  return doc(
    defs,
    `<rect width="${W}" height="${H}" fill="url(#olmBg)"/>${wall}<rect width="${W}" height="${H}" fill="url(#olmGlow)"/>` +
      hole(320, 210, 150, 120) +
      hole(90, 230, 72, 66) +
      hole(550, 230, 72, 66) +
      head +
      claw(-1) +
      claw(1) +
      floor +
      crys +
      mist +
      vig(),
  );
}

/** 002 Verzik Vitur: monstrous spider-like final form in the theatre. */
export function verzikVitur(): string {
  const defs =
    linear('vzBg', [
      [0, '#1a0a12'],
      [0.7, '#2a0d17'],
      [1, '#0b0408'],
    ]) +
    radial(
      'vzGlow',
      [
        [0, '#d12b3a', 0.45],
        [1, '#000', 0],
      ],
      0.5,
      0.45,
      0.5,
    ) +
    vigDef();
  // Gothic arches.
  let arches = '';
  for (let i = 0; i < 5; i++) {
    const x = 20 + i * 130;
    arches +=
      p(`${x},330 ${x},120 ${x + 45},50 ${x + 90},120 ${x + 90},330`, '#2e1420') +
      p(`${x + 14},330 ${x + 14},126 ${x + 45},72 ${x + 76},126 ${x + 76},330`, '#170910') +
      p(`${x + 30},200 ${x + 30},130 ${x + 45},104 ${x + 60},130 ${x + 60},200`, '#5c1424', 'opacity="0.8"');
  }
  const web = `<g stroke="#8a6a72" stroke-width="1.4" opacity="0.35" fill="none">${[0, 1, 2, 3, 4, 5]
    .map((k) => `<line x1="0" y1="0" x2="${80 + k * 28}" y2="${160 - k * 26}"/>`)
    .join('')}${[40, 80, 120].map((r) => `<path d="M ${r} 0 Q ${r * 0.8} ${r * 0.8} 0 ${r * 1.2}"/>`).join('')}</g>`;
  const leg = (x0: number, y0: number, kx: number, ky: number, fx: number, fy: number, c: string) =>
    poly(
      [
        [x0 - 7, y0],
        [x0 + 7, y0],
        [kx + 6, ky],
        [kx - 6, ky],
      ],
      c,
    ) +
    poly(
      [
        [kx - 6, ky],
        [kx + 6, ky],
        [fx + 2, fy],
        [fx - 2, fy],
      ],
      shade(c, -0.25),
    ) +
    poly(
      [
        [kx - 7, ky - 7],
        [kx + 7, ky - 7],
        [kx, ky - 22],
      ],
      '#9e1f2e',
    );
  const legs =
    leg(270, 250, 150, 150, 70, 390, '#3b2338') +
    leg(260, 270, 120, 240, 40, 430, '#4a2b45') +
    leg(280, 280, 200, 330, 150, 440, '#3b2338') +
    leg(300, 290, 270, 370, 250, 450, '#4a2b45') +
    leg(370, 250, 490, 150, 570, 390, '#3b2338') +
    leg(380, 270, 520, 240, 600, 430, '#4a2b45') +
    leg(360, 280, 440, 330, 490, 440, '#3b2338') +
    leg(340, 290, 370, 370, 390, 450, '#4a2b45');
  const abdomen =
    p('240,300 280,250 360,250 400,300 380,360 320,390 260,360', '#2c1729') +
    p('280,250 360,250 380,300 320,320 260,300', '#3d2139') +
    p('300,280 320,262 340,280 320,330', '#c21f33') +
    p('306,300 320,288 334,300 320,318', '#ff4d5e');
  const torso =
    p('290,250 300,170 320,150 340,170 350,250 320,262', '#4a2a44') +
    p('300,170 320,150 340,170 320,200', '#60365a') +
    p('292,184 260,212 250,248 270,240 296,206', '#3d2139') +
    p('348,184 380,212 390,248 370,240 344,206', '#3d2139');
  const head =
    p('300,150 306,108 320,96 334,108 340,150 320,160', '#5a3253') +
    p('306,108 296,70 312,98', '#2c1729') +
    p('334,108 344,70 328,98', '#2c1729') +
    p('308,122 318,126 310,132', '#ff3346') +
    p('332,122 322,126 330,132', '#ff3346') +
    p('312,142 320,152 328,142', '#d9cfd6');
  const floor = rockBed(21, 430, ['#1a0b12', '#24101a']);
  const blood = `<ellipse cx="320" cy="455" rx="220" ry="18" fill="#7a1420" opacity="0.6"/>`;
  return doc(
    defs,
    `<rect width="${W}" height="${H}" fill="url(#vzBg)"/>${arches}${web}<rect width="${W}" height="${H}" fill="url(#vzGlow)"/>` +
      floor +
      blood +
      legs +
      abdomen +
      torso +
      head +
      vig(),
  );
}

/** 003 The Wardens: Elidinis' Warden and Tumeken's Warden facing each other. */
export function theWardens(): string {
  const defs =
    linear('wdBg', [
      [0, '#2a1d14'],
      [0.55, '#5a3f24'],
      [1, '#2a1c12'],
    ]) +
    radial(
      'wdSun',
      [
        [0, '#ffe7a0', 0.8],
        [0.4, '#e8c35a', 0.25],
        [1, '#000', 0],
      ],
      0.5,
      0.25,
      0.45,
    ) +
    linear(
      'beam',
      [
        [0, '#3fd6c8', 0.9],
        [0.5, '#ffffff', 0.9],
        [1, '#ffbf3a', 0.9],
      ],
      0,
      0,
      1,
      0,
    ) +
    vigDef('vig', 0.6);
  const columns = [40, 140, 500, 600]
    .map(
      (x) =>
        p(`${x - 30},470 ${x - 30},60 ${x + 30},60 ${x + 30},470`, '#6e5234') +
        p(`${x - 30},470 ${x - 30},60 ${x - 8},60 ${x - 8},470`, '#8a6a42') +
        p(`${x - 38},60 ${x + 38},60 ${x + 30},40 ${x - 30},40`, '#a07c4c'),
    )
    .join('');
  const hiero = `<g fill="#3d2a18" opacity="0.6">${Array.from({ length: 12 }, (_, i) => {
    const x = i < 6 ? 30 : 590;
    const y = 90 + (i % 6) * 55;
    return `<rect x="${x}" y="${y}" width="20" height="8"/><circle cx="${x + 10}" cy="${y + 22}" r="5"/>`;
  }).join('')}</g>`;
  const warden = (cx: number, dir: 1 | -1, core: string, coreLight: string, trim: string) => {
    const s = (x: number) => cx + dir * x;
    return (
      // legs/base
      p(`${s(-40)},470 ${s(-30)},360 ${s(30)},360 ${s(40)},470`, '#7d6448') +
      // torso
      p(`${s(-62)},360 ${s(-70)},240 ${s(0)},214 ${s(70)},240 ${s(62)},360`, '#a1835c') +
      p(`${s(-70)},240 ${s(0)},214 ${s(0)},360 ${s(-62)},360`, '#bd9c6c') +
      // shoulders
      p(`${s(-70)},240 ${s(-118)},226 ${s(-122)},270 ${s(-80)},290`, trim) +
      p(`${s(70)},240 ${s(118)},226 ${s(122)},270 ${s(80)},290`, shade(trim, -0.25)) +
      // arms reaching toward centre
      p(`${s(118)},262 ${s(150)},300 ${s(176)},282 ${s(122)},232`, '#8f734f') +
      p(`${s(-118)},262 ${s(-128)},330 ${s(-106)},336 ${s(-98)},270`, '#8f734f') +
      // core
      p(`${s(-22)},270 ${s(0)},248 ${s(22)},270 ${s(0)},300`, core) +
      p(`${s(-10)},270 ${s(0)},258 ${s(10)},270 ${s(0)},284`, coreLight) +
      // head + nemes headdress
      p(`${s(-46)},214 ${s(-40)},140 ${s(0)},116 ${s(40)},140 ${s(46)},214 ${s(0)},226`, trim) +
      p(`${s(-46)},214 ${s(-40)},140 ${s(0)},116 ${s(0)},226`, shade(trim, 0.2)) +
      p(`${s(-26)},196 ${s(-24)},150 ${s(0)},138 ${s(24)},150 ${s(26)},196 ${s(0)},210`, '#6b5236') +
      p(`${s(-16)},166 ${s(-4)},162 ${s(-6)},172`, coreLight) +
      p(`${s(16)},166 ${s(4)},162 ${s(6)},172`, coreLight) +
      // stripes on headdress
      [0, 1, 2]
        .map((k) =>
          p(
            `${s(-44 + k * 2)},${170 + k * 16} ${s(-30)},${168 + k * 16} ${s(-30)},${174 + k * 16} ${s(-44 + k * 2)},${176 + k * 16}`,
            core,
          ),
        )
        .join('') +
      // crown
      p(`${s(-14)},118 ${s(0)},78 ${s(14)},118`, core) +
      p(`${s(-6)},104 ${s(0)},86 ${s(6)},104`, coreLight)
    );
  };
  const sand = rockBed(31, 440, ['#7a5a36', '#8c6a40', '#6a4c2c']);
  const beamSvg = `<rect x="210" y="282" width="220" height="10" fill="url(#beam)" opacity="0.85"/><circle cx="320" cy="287" r="16" fill="#fff8e0" opacity="0.8"/>`;
  return doc(
    defs,
    `<rect width="${W}" height="${H}" fill="url(#wdBg)"/><rect width="${W}" height="${H}" fill="url(#wdSun)"/>${columns}${hiero}` +
      warden(170, 1, '#2bb7ad', '#9ff5ec', '#c79b45') +
      warden(470, -1, '#f0a52c', '#ffe7a0', '#d8b04a') +
      beamSvg +
      sand +
      vig(),
  );
}

/** 004 TzKal-Zuk towering behind the floating barrier above lava. */
export function tzkalZuk(): string {
  const defs =
    linear('zkBg', [
      [0, '#0d0605'],
      [0.6, '#2a0d06'],
      [1, '#5a1a06'],
    ]) +
    linear('lava', [
      [0, '#ffcf4a'],
      [0.5, '#ff7a1a'],
      [1, '#b8300a'],
    ]) +
    radial(
      'zkGlow',
      [
        [0, '#ff7a1a', 0.5],
        [1, '#000', 0],
      ],
      0.5,
      0.95,
      0.7,
    ) +
    vigDef();
  const crack = (pts: string) => `<polyline points="${pts}" fill="none" stroke="#ff8a2a" stroke-width="3" stroke-linejoin="bevel"/>`;
  const caveWall =
    p('0,0 160,0 120,140 60,260 0,300', '#170a07') +
    p('640,0 480,0 530,150 580,260 640,300', '#170a07') +
    p('0,300 60,260 120,320 0,380', '#1f0d08') +
    p('640,300 580,260 520,330 640,380', '#1f0d08');
  const zuk =
    // crest/fan
    p('320,16 250,40 200,90 230,110 270,70 320,60 370,70 410,110 440,90 390,40', '#2a1410') +
    p('320,16 300,60 320,60 340,60', '#3d1d14') +
    // shoulders/body
    p('140,330 170,200 240,150 320,140 400,150 470,200 500,330', '#1c0f0c') +
    p('170,200 240,150 320,140 320,330 140,330', '#2a1612') +
    // head
    p('266,150 274,86 320,64 366,86 374,150 320,170', '#2e1813') +
    p('274,86 320,64 320,170 266,150', '#3d2018') +
    p('286,112 308,118 300,126', '#ffcf4a') +
    p('354,112 332,118 340,126', '#ffcf4a') +
    p('298,146 320,156 342,146 320,162', '#ff7a1a') +
    // arms
    p('170,200 110,240 92,320 130,330 150,260', '#241310') +
    p('470,200 530,240 548,320 510,330 490,260', '#241310') +
    crack('200,220 230,250 222,290 250,320') +
    crack('440,220 410,252 420,290 392,322') +
    crack('320,180 310,220 330,250 318,300') +
    crack('150,250 130,290');
  const shield =
    p('250,322 280,300 360,300 390,322 380,352 360,370 280,370 260,352', '#3b2a22') +
    p('250,322 280,300 360,300 390,322 320,330', '#55402f') +
    p('300,330 320,316 340,330 320,352', '#ffb347') +
    `<circle cx="320" cy="334" r="6" fill="#fff1c0"/>`;
  const lava = `<path d="M0 400 Q 80 380 160 398 T 320 396 T 480 400 T 640 392 L640 470 L0 470 Z" fill="url(#lava)"/>`;
  const rocks =
    p('0,410 70,392 120,420 90,470 0,470', '#140806') +
    p('640,410 560,388 520,424 560,470 640,470', '#140806') +
    p('230,430 270,416 300,440 280,470 220,470', '#1b0b07');
  const r = rand(41);
  const embers = Array.from(
    { length: 16 },
    () => `<rect x="${r() * W}" y="${150 + r() * 260}" width="3" height="3" fill="#ffb347" opacity="${0.4 + r() * 0.5}"/>`,
  ).join('');
  return doc(
    defs,
    `<rect width="${W}" height="${H}" fill="url(#zkBg)"/>${caveWall}${zuk}<rect width="${W}" height="${H}" fill="url(#zkGlow)"/>${shield}${lava}${rocks}${embers}${vig()}`,
  );
}

/** 005 Infernal cape over a volcanic pedestal. */
export function infernalCape(): string {
  const defs =
    linear('icBg', [
      [0, '#0c0708'],
      [1, '#2a0e08'],
    ]) +
    radial(
      'icGlow',
      [
        [0, '#ff8a2a', 0.55],
        [1, '#000', 0],
      ],
      0.5,
      0.9,
      0.55,
    ) +
    vigDef();
  // OSRS-style cape: narrow collar flaring to a wide hem.
  const cape =
    p('262,60 378,60 410,110 446,330 400,352 320,360 240,352 194,330 230,110', '#1b0d0b') +
    p('262,60 320,66 320,360 240,352 194,330 230,110', '#271310') +
    p('262,60 378,60 366,82 274,82', '#3a1d14');
  const veins = `<g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="290,90 300,140 280,190 300,240 270,300 290,350" stroke="#ff7a1a" stroke-width="7"/>
    <polyline points="350,90 340,150 362,200 340,260 372,320 356,354" stroke="#ff7a1a" stroke-width="7"/>
    <polyline points="300,140 330,170 362,200" stroke="#ff9a2a" stroke-width="5"/>
    <polyline points="280,190 240,230 214,300" stroke="#ff9a2a" stroke-width="5"/>
    <polyline points="340,260 400,260 430,310" stroke="#ff9a2a" stroke-width="5"/>
    <polyline points="300,240 330,250 340,260" stroke="#ff9a2a" stroke-width="4"/>
    <polyline points="270,300 320,320 372,320" stroke="#ff9a2a" stroke-width="4"/>
    <polyline points="290,90 300,140 280,190 300,240 270,300 290,350" stroke="#ffe08a" stroke-width="2"/>
    <polyline points="350,90 340,150 362,200 340,260 372,320 356,354" stroke="#ffe08a" stroke-width="2"/>
  </g>`;
  const blobs = [
    [250, 160],
    [380, 130],
    [320, 220],
    [230, 270],
    [410, 230],
    [320, 300],
    [260, 330],
    [390, 340],
  ]
    .map(([x, y], i) => p(`${x - 14},${y} ${x},${y - 12} ${x + 14},${y} ${x},${y + 12}`, i % 2 ? '#ffb347' : '#ff7a1a'))
    .join('');
  const pedestal =
    p('200,400 240,372 400,372 440,400 420,470 220,470', '#1f1210') +
    p('240,372 400,372 380,392 260,392', '#3a2018') +
    `<polyline points="230,420 270,400 300,430 350,404 400,428" fill="none" stroke="#ff7a1a" stroke-width="3"/>`;
  const rocks = rockBed(51, 440, ['#140b0a', '#1d100d']);
  return doc(
    defs,
    `<rect width="${W}" height="${H}" fill="url(#icBg)"/><rect width="${W}" height="${H}" fill="url(#icGlow)"/>${rocks}${pedestal}${cape}${veins}${blobs}${vig()}`,
  );
}

/** 006 Elysian spirit shield floating in a dark chamber. */
export function elysianSpiritShield(): string {
  const defs =
    linear('esBg', [
      [0, '#05080f'],
      [1, '#0e1726'],
    ]) +
    radial(
      'esGlow',
      [
        [0, '#6fc8ff', 0.5],
        [0.7, '#2a5a8a', 0.12],
        [1, '#000', 0],
      ],
      0.5,
      0.48,
      0.5,
    ) +
    linear('esBody', [
      [0, '#bfe6ff'],
      [1, '#5a9fd4'],
    ]) +
    vigDef();
  const cx = 320;
  const outline: Pt[] = [
    [cx - 120, 70],
    [cx - 60, 52],
    [cx, 46],
    [cx + 60, 52],
    [cx + 120, 70],
    [cx + 128, 180],
    [cx + 108, 280],
    [cx + 60, 360],
    [cx, 410],
    [cx - 60, 360],
    [cx - 108, 280],
    [cx - 128, 180],
  ];
  const innerPts: Pt[] = outline.map(([x, y]) => [cx + (x - cx) * 0.86, 228 + (y - 228) * 0.88]);
  let rim = '';
  for (let i = 0; i < outline.length; i++) {
    const j = (i + 1) % outline.length;
    rim += poly([outline[i], outline[j], innerPts[j], innerPts[i]], i % 2 ? '#d9e2ea' : '#aeb9c4');
  }
  let body = '';
  for (let i = 0; i < innerPts.length; i++) {
    const j = (i + 1) % innerPts.length;
    const tones = ['#9fd7ff', '#7fc0f0', '#b5e2ff', '#6aaee4'];
    body += poly([innerPts[i], innerPts[j], [cx, 220]], tones[i % 4]);
  }
  // Elysian sigil: gold ring with a four-pointed star.
  const sy = 214;
  const star = p(
    `${cx},${sy - 62} ${cx + 14},${sy - 14} ${cx + 62},${sy} ${cx + 14},${sy + 14} ${cx},${sy + 62} ${cx - 14},${sy + 14} ${cx - 62},${sy} ${cx - 14},${sy - 14}`,
    '#f3cf5a',
  );
  const starShade =
    p(`${cx},${sy - 62} ${cx + 14},${sy - 14} ${cx},${sy}`, '#c99a2e') +
    p(`${cx + 62},${sy} ${cx + 14},${sy + 14} ${cx},${sy}`, '#c99a2e') +
    p(`${cx},${sy + 62} ${cx - 14},${sy + 14} ${cx},${sy}`, '#c99a2e') +
    p(`${cx - 62},${sy} ${cx - 14},${sy - 14} ${cx},${sy}`, '#c99a2e');
  const ring = `<circle cx="${cx}" cy="${sy}" r="40" fill="none" stroke="#f3cf5a" stroke-width="7"/><circle cx="${cx}" cy="${sy}" r="14" fill="#fff4c4"/>`;
  const cross =
    p(`${cx - 8},96 ${cx + 8},96 ${cx + 8},140 ${cx - 8},140`, '#e0edf7') +
    p(`${cx - 8},290 ${cx + 8},290 ${cx + 8},360 ${cx},372 ${cx - 8},360`, '#e0edf7');
  const motes = Array.from({ length: 14 }, (_, i) => {
    const r = rand(60 + i);
    return `<circle cx="${80 + r() * 480}" cy="${40 + r() * 380}" r="${1 + r() * 2.5}" fill="#c9ecff" opacity="${0.3 + r() * 0.5}"/>`;
  }).join('');
  const floor =
    p('0,430 640,430 640,470 0,470', '#0a1018') + `<ellipse cx="${cx}" cy="440" rx="120" ry="12" fill="#6fc8ff" opacity="0.25"/>`;
  return doc(
    defs,
    `<rect width="${W}" height="${H}" fill="url(#esBg)"/><rect width="${W}" height="${H}" fill="url(#esGlow)"/>${floor}${motes}${rim}${body}${cross}${ring}${star}${starShade}${vig()}`,
  );
}

function xericBackdrop(): string {
  const r = rand(71);
  let pillars = '';
  for (const x of [50, 150, 490, 590]) {
    pillars +=
      p(`${x - 34},470 ${x - 28},40 ${x + 28},40 ${x + 34},470`, '#1d1a24') +
      p(`${x - 34},470 ${x - 28},40 ${x - 6},40 ${x - 8},470`, '#2a2634');
    for (let y = 80; y < 440; y += 70) pillars += p(`${x - 30},${y} ${x + 30},${y} ${x + 30},${y + 6} ${x - 30},${y + 6}`, '#3b3550');
  }
  const runes = Array.from({ length: 8 }, () => {
    const x = 220 + r() * 200;
    const y = 30 + r() * 80;
    return p(`${x},${y} ${x + 8},${y + 14} ${x},${y + 28} ${x - 8},${y + 14}`, r() > 0.5 ? '#4fe07a' : '#9a5cff', 'opacity="0.35"');
  }).join('');
  return pillars + runes + crystals(72, 7, '#9a5cff', 420, 470, 0.8) + crystals(73, 6, '#4fe07a', 430, 470, 0.7);
}

/** 007 Twisted bow against a Chambers of Xeric backdrop. */
export function twistedBowArt(): string {
  const defs =
    linear('tbBg', [
      [0, '#0d0b14'],
      [1, '#1b1626'],
    ]) +
    radial(
      'tbGlow',
      [
        [0, '#4fe07a', 0.35],
        [0.5, '#9a5cff', 0.15],
        [1, '#000', 0],
      ],
      0.5,
      0.5,
      0.5,
    ) +
    vigDef();
  return doc(
    defs,
    `<rect width="${W}" height="${H}" fill="url(#tbBg)"/>${xericBackdrop()}<rect width="${W}" height="${H}" fill="url(#tbGlow)"/>` +
      `<g transform="translate(326 236) rotate(-30) scale(0.84)">${twistedBow()}</g>${vig()}`,
  );
}

function theatreBackdrop(): string {
  let curtains = '';
  for (let i = 0; i < 9; i++) {
    const x = i * 80 - 20;
    curtains += p(`${x},0 ${x + 80},0 ${x + 70},470 ${x + 10},470`, i % 2 ? '#3a0a12' : '#4d0e18');
    curtains += p(`${x + 30},0 ${x + 50},0 ${x + 46},470 ${x + 34},470`, '#2a060c');
  }
  const arch =
    p('120,470 120,170 320,40 520,170 520,470 470,470 470,190 320,100 170,190 170,470', '#1d1a1d') +
    p('120,170 320,40 520,170 500,176 320,62 140,176', '#3a3436');
  const candles = [150, 490]
    .map((x) => p(`${x - 6},300 ${x + 6},300 ${x + 6},250 ${x - 6},250`, '#d8cfc0') + p(`${x},230 ${x + 6},248 ${x - 6},248`, '#ffb347'))
    .join('');
  return curtains + arch + candles + rockBed(81, 450, ['#140a0c', '#1e0f12']);
}

/** 008 Scythe of Vitur against the theatre. */
export function scytheArt(): string {
  const defs =
    linear('scBg', [
      [0, '#12060a'],
      [1, '#22080e'],
    ]) +
    radial(
      'scGlow',
      [
        [0, '#e0263a', 0.35],
        [1, '#000', 0],
      ],
      0.5,
      0.45,
      0.55,
    ) +
    vigDef();
  return doc(
    defs,
    `<rect width="${W}" height="${H}" fill="url(#scBg)"/>${theatreBackdrop()}<rect width="${W}" height="${H}" fill="url(#scGlow)"/>` +
      `<g transform="translate(400 270) rotate(4) scale(0.84)">${scytheOfVitur()}</g>${vig()}`,
  );
}

function shrineBackdrop(): string {
  const sun = `<circle cx="320" cy="150" r="120" fill="#ffb547" opacity="0.35"/><circle cx="320" cy="150" r="80" fill="#ffd27a" opacity="0.35"/>`;
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const x1 = 320 + Math.cos(a) * 130;
    const y1 = 150 + Math.sin(a) * 130;
    const x2 = 320 + Math.cos(a + 0.08) * 230;
    const y2 = 150 + Math.sin(a + 0.08) * 230;
    const x3 = 320 + Math.cos(a - 0.08) * 230;
    const y3 = 150 + Math.sin(a - 0.08) * 230;
    return p(`${x1},${y1} ${x2},${y2} ${x3},${y3}`, '#ffcf6a', 'opacity="0.18"');
  }).join('');
  const shrine =
    p('90,470 90,120 150,100 150,470', '#7a5a34') +
    p('550,470 550,120 490,100 490,470', '#7a5a34') +
    p('70,120 170,92 170,74 70,100', '#a07a48') +
    p('570,120 470,92 470,74 570,100', '#a07a48') +
    p('170,470 200,400 440,400 470,470', '#6a4c2c') +
    p('200,400 440,400 420,380 220,380', '#8c6a40');
  return sun + rays + shrine;
}

/** 009 Tumeken's shadow against an ancient desert shrine. */
export function shadowArt(): string {
  const defs =
    linear('tsBg', [
      [0, '#3a2414'],
      [0.6, '#6a4424'],
      [1, '#2a1a10'],
    ]) +
    radial(
      'tsAura',
      [
        [0, '#14071f', 0.85],
        [0.5, '#2a1149', 0.45],
        [1, '#000', 0],
      ],
      0.5,
      0.36,
      0.3,
    ) +
    vigDef();
  return doc(
    defs,
    `<rect width="${W}" height="${H}" fill="url(#tsBg)"/>${shrineBackdrop()}<rect width="${W}" height="${H}" fill="url(#tsAura)"/>` +
      `<g transform="translate(320 250) rotate(-12) scale(0.9)">${tumekensShadow()}</g>${vig()}`,
  );
}

/** 010 3rd age pickaxe above an opened clue casket. */
export function pickaxeArt(): string {
  const defs =
    linear('pxBg', [
      [0, '#141826'],
      [1, '#262238'],
    ]) +
    radial(
      'pxGlow',
      [
        [0, '#fff2c0', 0.6],
        [0.5, '#e9c66a', 0.18],
        [1, '#000', 0],
      ],
      0.5,
      0.75,
      0.45,
    ) +
    vigDef();
  const casket =
    p('210,370 430,370 446,460 194,460', '#5a3a1e') +
    p('210,370 430,370 424,392 216,392', '#7a5028') +
    p('194,460 446,460 446,470 194,470', '#3a240f') +
    p('312,392 328,392 328,420 312,420', '#e9c66a') +
    p('206,370 434,370 434,380 206,380', '#c99a35') +
    p('194,450 446,450 446,460 194,460', '#c99a35') +
    // open lid tilted back
    p('214,370 426,370 410,300 230,300', '#6a4422') +
    p('230,300 410,300 404,288 236,288', '#c99a35') +
    p('228,330 412,330 414,338 226,338', '#c99a35');
  const coins = Array.from({ length: 9 }, (_, i) => {
    const x = 240 + i * 20;
    const y = 362 - (i % 3) * 6;
    return `<ellipse cx="${x}" cy="${y}" rx="11" ry="5" fill="${i % 2 ? '#f2d276' : '#d7ac43'}"/>`;
  }).join('');
  const sparkles = Array.from({ length: 12 }, (_, i) => {
    const r = rand(90 + i);
    const x = 140 + r() * 360;
    const y = 40 + r() * 300;
    const s = 4 + r() * 6;
    return p(`${x},${y - s} ${x + s * 0.3},${y} ${x},${y + s} ${x - s * 0.3},${y}`, '#fff6d8', `opacity="${0.4 + r() * 0.5}"`);
  }).join('');
  const parchment = '';
  return doc(
    defs,
    `<rect width="${W}" height="${H}" fill="url(#pxBg)"/>${parchment}<rect width="${W}" height="${H}" fill="url(#pxGlow)"/>${casket}${coins}` +
      `<g transform="translate(318 196) rotate(-14) scale(0.8)">${thirdAgePickaxe()}</g>${sparkles}${vig()}`,
  );
}

export const ART: Record<string, () => string> = {
  'great-olm.svg': greatOlm,
  'verzik-vitur.svg': verzikVitur,
  'the-wardens.svg': theWardens,
  'tzkal-zuk.svg': tzkalZuk,
  'infernal-cape.svg': infernalCape,
  'elysian-spirit-shield.svg': elysianSpiritShield,
  'twisted-bow.svg': twistedBowArt,
  'scythe-of-vitur.svg': scytheArt,
  'tumekens-shadow.svg': shadowArt,
  'third-age-pickaxe.svg': pickaxeArt,
};
