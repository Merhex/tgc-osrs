import { useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { PackTextures } from '../render/textureStore';
import { sceneFx } from './sceneFx';
import type { Pose } from './layout';
import { CRIMP_H, CurlTable, HALF, makeTearPath, PACK_W, type TearPath } from './packTear';

export { PACK_W };
const BODY_H = HALF * 2;
const BULGE = 0.042;
const SEG_X = 64;
const FOIL_EDGE = 0.0016;

export interface PackRotation {
  yaw: number;
  pitch: number;
  targetYaw: number;
  targetPitch: number;
  velocity: number;
  dragging: boolean;
}

/** Cosmetic animation channels of the opening (0..1). Never persisted. */
export interface OpenAnim {
  pinch: number;
  tear: number;
  tension: number;
  broken: number;
  away: number;
  spread: number;
  recoil: number;
  stackUp: number;
  wrapperAway: number;
  stackSettle: number;
}

const zeroAnim = (): OpenAnim => ({ pinch: 0, tear: 0, tension: 0, broken: 0, away: 0, spread: 0, recoil: 0, stackUp: 0, wrapperAway: 0, stackSettle: 0 });

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function vnoise(x: number, y: number) {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}
/** Static surface wrinkles of the wrapper. */
function wrinkle(x: number, y: number) {
  return Math.sin(x * 23 + y * 7) * 0.5 + Math.sin(x * 9 - y * 17 + 1.3) * 0.35 + (vnoise(Math.floor(x * 30), Math.floor(y * 30)) - 0.5) * 0.4;
}
/** Pillow profile: zero at the side edges and at the seals. */
function bulge(x: number, y: number) {
  const bx = Math.sqrt(Math.max(0, 1 - Math.abs((2 * x) / PACK_W) ** 6));
  const by = Math.sqrt(Math.max(0, 1 - Math.abs(y / HALF) ** 8));
  return bx * by;
}
function restZ(x: number, y: number, side: 1 | -1) {
  const b = bulge(x, y);
  // irregular crimp creases, fading out before the seal so they do not read as a bright seam
  const crease = 0.0018 * Math.sin(x * 61 + Math.sin(x * 23) * 2) * smoothstep(0.34, 0.44, Math.abs(y)) * (1 - smoothstep(0.45, HALF, Math.abs(y)));
  return side * (BULGE * b + 0.0022 * wrinkle(x, y) * b + crease * b);
}

interface Sheet {
  geo: THREE.BufferGeometry;
  /** rest x, y, z and "height above tear line" per vertex */
  rest: Float32Array;
  rows: number;
  side: 1 | -1;
  kind: 'body' | 'strip' | 'crimp';
}

/** Grid sheet whose bottom/top boundary follows the tear path exactly. */
function makeSheet(kind: Sheet['kind'], side: 1 | -1, rows: number, path: TearPath): Sheet {
  const cols = SEG_X;
  const count = (cols + 1) * (rows + 1);
  const pos = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const rest = new Float32Array(count * 4);
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const k = j * (cols + 1) + i;
      const x = -PACK_W / 2 + (i / cols) * PACK_W;
      const ty = path.y(x);
      const t = j / rows;
      let y: number;
      let z: number;
      if (kind === 'body') {
        // denser rows toward the tear for smooth local deformation
        y = -HALF + (ty + HALF) * (1 - (1 - t) ** 1.7);
        z = restZ(x, y, side);
      } else if (kind === 'strip') {
        y = ty + (HALF - ty) * t;
        z = restZ(x, y, side);
      } else {
        y = HALF + CRIMP_H * t;
        const tooth = (((x * 260) % 2) + 2) % 2;
        z = (Math.abs(tooth - 1) - 0.5) * 0.004 * side;
      }
      pos.set([x, y, z], k * 3);
      rest.set([x, y, z, y - ty], k * 4);
      const u = x / PACK_W + 0.5;
      if (kind === 'crimp') uv.set([u * 4, t], k * 2);
      else uv.set([side === 1 ? u : 1 - u, (y + HALF) / BODY_H], k * 2);
    }
  }
  const index: number[] = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i;
      const b = a + 1;
      const c = a + cols + 1;
      const d = c + 1;
      if (side === 1) index.push(a, b, d, a, d, c);
      else index.push(a, d, b, a, c, d);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return { geo, rest, rows, side, kind };
}

/** Thin ribbon along one boundary row, extruded along the surface normal: the visible foil edge. */
function makeEdge(): THREE.BufferGeometry {
  const n = SEG_X + 1;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3));
  const idx: number[] = [];
  for (let i = 0; i < SEG_X; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  geo.setIndex(idx);
  return geo;
}

function updateEdge(edge: THREE.BufferGeometry, sheet: Sheet, row: number) {
  const src = sheet.geo.attributes.position.array as Float32Array;
  const nrm = sheet.geo.attributes.normal.array as Float32Array;
  const dst = edge.attributes.position.array as Float32Array;
  for (let i = 0; i <= SEG_X; i++) {
    const k = (row * (SEG_X + 1) + i) * 3;
    dst[i * 6] = src[k];
    dst[i * 6 + 1] = src[k + 1];
    dst[i * 6 + 2] = src[k + 2];
    dst[i * 6 + 3] = src[k] - nrm[k] * FOIL_EDGE;
    dst[i * 6 + 4] = src[k + 1] - nrm[k + 1] * FOIL_EDGE;
    dst[i * 6 + 5] = src[k + 2] - nrm[k + 2] * FOIL_EDGE;
  }
  edge.attributes.position.needsUpdate = true;
  edge.computeVertexNormals();
  edge.computeBoundingSphere();
}

function foilMaterial(map: THREE.Texture): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({
    map,
    metalness: 0.45,
    roughness: 0.3,
    clearcoat: 0.35,
    clearcoatRoughness: 0.28,
    side: THREE.DoubleSide,
  });
  // The inside of the wrapper is a slightly duller, brushed silver foil.
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <map_fragment>', '#include <map_fragment>\nif (!gl_FrontFacing) diffuseColor.rgb = vec3(0.62, 0.63, 0.66);')
      .replace(
        '#include <metalnessmap_fragment>',
        '#include <metalnessmap_fragment>\nif (!gl_FrontFacing) { metalnessFactor = 0.92; roughnessFactor = 0.42; }',
      );
  };
  m.customProgramCacheKey = () => 'pack-foil-inner';
  return m;
}

interface Props {
  textures: PackTextures;
  rotation: React.MutableRefObject<PackRotation>;
  phase: 'sealed' | 'preparing' | 'opening';
  reducedMotion: boolean;
  /** Increment to skip the opening animation. */
  skipToken: number;
  /** Final stack pose for the reveal. */
  stackRest: Pose;
  /** Seed for the tear path (the opening id): generated once per opening. */
  tearSeed: string;
  onOpened: () => void;
  onSound?: (name: 'tear' | 'rustle' | 'slide') => void;
  /** Development: receives the opening timeline for scrubbing/slow motion. */
  onTimeline?: (tl: gsap.core.Timeline | null) => void;
}

export function Pack({ textures, rotation, phase, reducedMotion, skipToken, stackRest, tearSeed, onOpened, onSound, onTimeline }: Props) {
  const root = useRef<THREE.Group>(null);
  const wrapper = useRef<THREE.Group>(null);
  const anim = useRef<OpenAnim>(zeroAnim());
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const cbs = useRef({ onOpened, onSound, onTimeline });
  cbs.current = { onOpened, onSound, onTimeline };
  const restRef = useRef(stackRest);
  restRef.current = stackRest;
  const curl = useMemo(() => new CurlTable(), []);
  const frame = useMemo(() => new Float32Array(9), []);

  const parts = useMemo(() => {
    const path = makeTearPath(tearSeed);
    return {
      path,
      frontBody: makeSheet('body', 1, 44, path),
      backBody: makeSheet('body', -1, 44, path),
      frontStrip: makeSheet('strip', 1, 4, path),
      backStrip: makeSheet('strip', -1, 4, path),
      crimpF: makeSheet('crimp', 1, 2, path),
      crimpB: makeSheet('crimp', -1, 2, path),
      bottomCrimp: (() => {
        const g = new THREE.PlaneGeometry(PACK_W + 0.004, CRIMP_H, 96, 2);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const tooth = (((p.getX(i) * 260) % 2) + 2) % 2;
          p.setZ(i, (Math.abs(tooth - 1) - 0.5) * 0.004);
        }
        g.translate(0, -HALF - CRIMP_H / 2, 0);
        g.computeVertexNormals();
        return g;
      })(),
      edges: { frontBody: makeEdge(), backBody: makeEdge(), frontStrip: makeEdge(), backStrip: makeEdge() },
    };
  }, [tearSeed]);

  const mats = useMemo(() => {
    textures.crimp.repeat.set(1, 1);
    return {
      front: foilMaterial(textures.front),
      back: foilMaterial(textures.back),
      crimp: new THREE.MeshPhysicalMaterial({ map: textures.crimp, metalness: 0.75, roughness: 0.3, clearcoat: 0.3, side: THREE.DoubleSide }),
      edge: new THREE.MeshStandardMaterial({ color: '#d9dbe0', metalness: 1, roughness: 0.35, side: THREE.DoubleSide }),
    };
  }, [textures]);

  useEffect(
    () => () => {
      const p = parts;
      for (const s of [p.frontBody, p.backBody, p.frontStrip, p.backStrip, p.crimpF, p.crimpB]) s.geo.dispose();
      p.bottomCrimp.dispose();
      Object.values(p.edges).forEach((e) => e.dispose());
    },
    [parts],
  );
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  // Build and run the opening timeline.
  useEffect(() => {
    if (phase !== 'opening') return;
    const a = anim.current;
    Object.assign(a, zeroAnim());
    const rot = rotation.current;
    const home = Math.round(rot.yaw / (Math.PI * 2)) * Math.PI * 2;
    const tl = gsap.timeline({
      onComplete: () => {
        timeline.current = null;
        cbs.current.onOpened();
      },
    });
    tl.to(rot, { yaw: home, targetYaw: home, pitch: 0, targetPitch: 0, duration: 0.35, ease: 'power2.out' }, 0);
    if (reducedMotion) {
      // Brief, simplified separation and reveal.
      tl.to(a, { tear: 1, duration: 0.3, ease: 'none' }, 0.1)
        .set(a, { broken: 1 }, 0.4)
        .to(a, { away: 1, spread: 1, duration: 0.3 }, 0.4)
        .to(a, { stackUp: 1, duration: 0.35 }, 0.55)
        .to(a, { wrapperAway: 1, duration: 0.3 }, 0.85)
        .to(a, { stackSettle: 1, duration: 0.35 }, 0.95);
    } else {
      tl.to(a, { pinch: 1, duration: 0.5, ease: 'power2.out' }, 0.25)
        .call(() => cbs.current.onSound?.('tear'), [], 0.75)
        .to(a, { tear: 0.07, duration: 0.2, ease: 'power1.in' }, 0.75)
        // the split propagates with small hitches rather than a constant speed
        .to(a, { keyframes: [{ tear: 0.26, duration: 0.3 }, { tear: 0.34, duration: 0.16 }, { tear: 0.6, duration: 0.32 }, { tear: 0.68, duration: 0.15 }, { tear: 0.93, duration: 0.3 }], ease: 'power1.inOut' }, 0.95)
        .to(a, { pinch: 0.4, duration: 0.6 }, 1.2)
        .to(a, { tension: 1, duration: 0.32, ease: 'power2.in' }, 2.18)
        .call(() => cbs.current.onSound?.('rustle'), [], 2.5)
        .to(a, { tear: 1, duration: 0.07, ease: 'power2.in' }, 2.5)
        .set(a, { broken: 1 }, 2.57)
        .to(a, { tension: 0, duration: 0.2 }, 2.57)
        .to(a, { away: 1, duration: 0.75, ease: 'power2.in' }, 2.57)
        .to(a, { spread: 1, duration: 0.45, ease: 'power2.out' }, 2.57)
        .to(a, { recoil: 1, duration: 0.8, ease: 'none' }, 2.57)
        .call(() => cbs.current.onSound?.('slide'), [], 2.95)
        .to(a, { stackUp: 1, duration: 0.8, ease: 'power2.out' }, 2.95)
        .to(a, { wrapperAway: 1, duration: 0.7, ease: 'power2.in' }, 3.65)
        .to(a, { stackSettle: 1, duration: 0.75, ease: 'power3.inOut' }, 3.95);
    }
    // Development aid: ?debug&freeze=<seconds> pauses the opening for visual review.
    const params = new URLSearchParams(location.search);
    const freeze = import.meta.env.DEV || params.has('debug') ? params.get('freeze') : null;
    if (freeze) tl.pause(Number(freeze));
    timeline.current = tl;
    cbs.current.onTimeline?.(tl);
    return () => {
      tl.kill();
      timeline.current = null;
      cbs.current.onTimeline?.(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, tearSeed]);

  // Skip: jump to the end of the same timeline (fires onComplete → same reveal state).
  useEffect(() => {
    if (skipToken > 0 && timeline.current) timeline.current.progress(1);
  }, [skipToken]);

  useFrame((_, dt) => {
    const r = rotation.current;
    const a = anim.current;
    if (phase !== 'opening') {
      if (!r.dragging && Math.abs(r.velocity) > 0.0001) {
        r.targetYaw += r.velocity * dt;
        r.velocity *= Math.exp(-dt * 3.5);
      }
      const k = 1 - Math.exp(-dt * 9);
      r.yaw += (r.targetYaw - r.yaw) * k;
      r.pitch += (r.targetPitch - r.pitch) * k;
    }
    const g = root.current;
    if (!g) return;
    const pull = smoothstep(0, 0.12, a.tear) * (1 - a.broken);
    const idle = phase === 'sealed' && !r.dragging ? Math.sin(performance.now() / 1400) * 0.015 : 0;
    // held in a hand: a slight counter-tilt while the seal is pulled, small recoil on break
    const recoil = Math.sin(a.recoil * Math.PI * 3) * (1 - a.recoil) * 0.025;
    g.rotation.set(r.pitch, r.yaw + idle, -0.03 * pull - 0.02 * a.pinch * (1 - a.broken) + recoil);

    curl.update(0.25 + 0.75 * smoothstep(0, 0.5, a.tear) + 0.25 * a.tension);
    const xf = -PACK_W / 2 + a.tear * PACK_W + (a.broken ? 0.4 : 0);
    deformBody(parts.frontBody, a, xf, pull);
    deformBody(parts.backBody, a, xf, pull);
    for (const s of [parts.frontStrip, parts.backStrip, parts.crimpF, parts.crimpB]) deformStrip(s, a, xf, curl, frame, parts.path);
    stitchNormals(parts.frontBody, parts.frontStrip, xf, a.broken > 0);
    stitchNormals(parts.backBody, parts.backStrip, xf, a.broken > 0);
    const opened = a.tear > 0.001;
    if (opened) {
      updateEdge(parts.edges.frontBody, parts.frontBody, parts.frontBody.rows);
      updateEdge(parts.edges.backBody, parts.backBody, parts.backBody.rows);
      updateEdge(parts.edges.frontStrip, parts.frontStrip, 0);
      updateEdge(parts.edges.backStrip, parts.backStrip, 0);
    }
    edgesVisible.current = opened;

    if (wrapper.current) {
      const w = a.wrapperAway;
      wrapper.current.position.set(0, -w * 2.3, -w * 0.35);
      wrapper.current.rotation.set(w * 0.6, 0, w * 0.15);
      wrapper.current.visible = w < 0.999;
    }

    // Stack anchor for the card reveal: cards stay inside until the seal is broken.
    const rest = restRef.current;
    const up = a.stackUp;
    const st = a.stackSettle;
    const scale = 1.22;
    // stack (≈0.066 thick) sits between the back (−0.051) and front (+0.051) foil
    const inside = { x: 0, y: (-0.05 + up * 0.62) * scale, z: -0.04 + up * 0.11 };
    const anchor = sceneFx.stackAnchor;
    anchor.x = inside.x + (rest.x - inside.x) * st;
    anchor.y = inside.y + (rest.y - inside.y) * st;
    anchor.z = inside.z + (rest.z - inside.z) * st;
    anchor.rx = 0;
    anchor.ry = Math.PI;
    anchor.rz = Math.sin(st * Math.PI) * 0.08;
    anchor.s = 1 + (rest.s - 1) * st;
    sceneFx.stackVisible = phase === 'opening';
  });

  const edgesVisible = useRef(false);
  const edgeRefs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(() => edgeRefs.current.forEach((m) => m && (m.visible = edgesVisible.current)));

  return (
    <group ref={root} scale={1.22}>
      <group ref={wrapper}>
        <mesh geometry={parts.frontBody.geo} material={mats.front} castShadow />
        <mesh geometry={parts.backBody.geo} material={mats.back} castShadow />
        <mesh geometry={parts.bottomCrimp} material={mats.crimp} castShadow />
        <mesh ref={(m) => void (edgeRefs.current[0] = m)} geometry={parts.edges.frontBody} material={mats.edge} visible={false} />
        <mesh ref={(m) => void (edgeRefs.current[1] = m)} geometry={parts.edges.backBody} material={mats.edge} visible={false} />
      </group>
      <mesh geometry={parts.frontStrip.geo} material={mats.front} />
      <mesh geometry={parts.backStrip.geo} material={mats.back} />
      <mesh geometry={parts.crimpF.geo} material={mats.crimp} castShadow />
      <mesh geometry={parts.crimpB.geo} material={mats.crimp} />
      <mesh ref={(m) => void (edgeRefs.current[2] = m)} geometry={parts.edges.frontStrip} material={mats.edge} visible={false} />
      <mesh ref={(m) => void (edgeRefs.current[3] = m)} geometry={parts.edges.backStrip} material={mats.edge} visible={false} />
    </group>
  );
}

/**
 * Remaining wrapper: corner pinch with tension wrinkles, local pull near the tear
 * front, mouth spreading after the strip breaks away with a small damped wobble.
 */
function deformBody(sheet: Sheet, a: OpenAnim, xf: number, pull: number) {
  const pos = sheet.geo.attributes.position.array as Float32Array;
  const rest = sheet.rest;
  const side = sheet.side;
  const wobble = Math.sin(a.recoil * Math.PI * 5) * (1 - a.recoil) * 0.35;
  const n = pos.length / 3;
  for (let k = 0; k < n; k++) {
    const x = rest[k * 4];
    let y = rest[k * 4 + 1];
    let z = rest[k * 4 + 2];
    const h = rest[k * 4 + 3]; // ≤ 0: distance below the tear line
    const nearTop = Math.exp(h / 0.035);
    // corner pinch: the upper-left corner is pulled outward
    const dc = (x + PACK_W / 2) ** 2 + (y - HALF) ** 2;
    const wc = Math.exp(-dc / 0.006) * a.pinch * (1 - a.broken);
    let dx = -0.008 * wc;
    y += 0.006 * wc;
    z += side * 0.012 * wc + 0.004 * Math.sin((x - y) * 110) * Math.exp(-dc / 0.02) * a.pinch * (1 - a.broken);
    // the foil just ahead of the tear front is lifted and stretched
    const front = Math.exp(-((x - xf) ** 2) / 0.004) * nearTop * pull;
    y += 0.005 * front * (1 + a.tension);
    z += side * 0.01 * front * (1 + a.tension);
    // behind the tear front the freed edge relaxes slightly outward
    if (x < xf) z += side * 0.006 * nearTop * pull;
    // opened mouth spreads (front forward, back backward), with a short recoil wobble
    const colShape = 1 - Math.abs((2 * x) / PACK_W) ** 4;
    const mouth = smoothstep(-0.14, 0, h) * colShape;
    z += side * mouth * (0.03 * a.spread + 0.012 * wobble);
    y -= mouth * 0.004 * a.spread;
    pos[k * 3] = x + dx;
    pos[k * 3 + 1] = y;
    pos[k * 3 + 2] = z;
    dx = 0;
  }
  sheet.geo.attributes.position.needsUpdate = true;
  sheet.geo.computeVertexNormals();
}

/**
 * Seal strip (front/back foil and crimp): detached columns follow the curl
 * centre-line from the tear front; after the break the whole strip is pulled away.
 */
function deformStrip(sheet: Sheet, a: OpenAnim, xf: number, curl: CurlTable, f: Float32Array, path: TearPath) {
  const pos = sheet.geo.attributes.position.array as Float32Array;
  const rest = sheet.rest;
  const n = pos.length / 3;
  const front0y = path.y(Math.min(PACK_W / 2, xf));
  const anchorX = a.broken ? PACK_W / 2 + 0.02 : xf;
  const away = a.away;
  for (let k = 0; k < n; k++) {
    const x = rest[k * 4];
    let y = rest[k * 4 + 1];
    let z = rest[k * 4 + 2];
    const h = rest[k * 4 + 3]; // ≥ 0: height above the tear line
    const s = anchorX - x;
    // corner pinch before the split
    const dc = (x + PACK_W / 2) ** 2 + (y - HALF) ** 2;
    const wc = Math.exp(-dc / 0.006) * a.pinch * (1 - a.broken);
    if (s > 0) {
      curl.sample(s, f);
      // small gap between the strip and the wrapper so the opening reads clearly
      const gap = Math.min(s, 0.03) * 0.35;
      const nx = f[4] * f[8] - f[5] * f[7];
      const ny = f[5] * f[6] - f[3] * f[8];
      const nz = f[3] * f[7] - f[4] * f[6];
      const along = h + gap;
      const ox = anchorX + f[0] + f[6] * along;
      const oy = (a.broken ? path.y(PACK_W / 2) : front0y) + f[1] + f[7] * along;
      const oz = f[2] + f[8] * along;
      // keep the side offset (front/back foil and crimp ridges) relative to the curled surface
      const zz = z;
      y = oy - ny * zz;
      z = oz - nz * zz;
      pos[k * 3] = ox - nx * zz;
      if (away > 0) {
        // after breaking free the strip is carried up, back and away with a lazy spin
        const t = away;
        const ang = t * 1.4;
        const px = pos[k * 3] - 0.1;
        const pz = z;
        pos[k * 3] = px * Math.cos(ang) - pz * Math.sin(ang) - 0.55 * t + 0.1;
        z = px * Math.sin(ang) + pz * Math.cos(ang) - 0.35 * t;
        y += 0.9 * t * t + 0.25 * t;
      }
    } else {
      pos[k * 3] = x - 0.008 * wc;
      y += 0.008 * wc;
      z += 0.02 * wc * Math.sign(z || 1);
      // the attached part ahead of the front shares the wrapper's local lift
      const front = Math.exp(-((x - xf) ** 2) / 0.004) * smoothstep(0, 0.12, a.tear) * (1 - a.broken);
      y += 0.005 * front * (1 + a.tension);
    }
    pos[k * 3 + 1] = y;
    pos[k * 3 + 2] = z;
  }
  sheet.geo.attributes.position.needsUpdate = true;
  sheet.geo.computeVertexNormals();
  sheet.geo.computeBoundingSphere();
}

/** Shares boundary normals between wrapper and strip where they are still joined (no seam line before tearing). */
function stitchNormals(body: Sheet, strip: Sheet, xf: number, broken: boolean) {
  if (broken) return;
  const bn = body.geo.attributes.normal.array as Float32Array;
  const sn = strip.geo.attributes.normal.array as Float32Array;
  const top = body.rows * (SEG_X + 1);
  for (let i = 0; i <= SEG_X; i++) {
    const x = -PACK_W / 2 + (i / SEG_X) * PACK_W;
    if (x < xf) continue;
    const b = (top + i) * 3;
    const s = i * 3;
    const nx = bn[b] + sn[s];
    const ny = bn[b + 1] + sn[s + 1];
    const nz = bn[b + 2] + sn[s + 2];
    const l = Math.hypot(nx, ny, nz) || 1;
    bn[b] = sn[s] = nx / l;
    bn[b + 1] = sn[s + 1] = ny / l;
    bn[b + 2] = sn[s + 2] = nz / l;
  }
  body.geo.attributes.normal.needsUpdate = true;
  strip.geo.attributes.normal.needsUpdate = true;
}
