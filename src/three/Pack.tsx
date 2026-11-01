import { useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { PackTextures } from '../render/textureStore';
import { sceneFx } from './sceneFx';
import type { Pose } from './layout';

/** Pack dimensions (world units). */
export const PACK_W = 0.74;
const BODY_H = 1.04;
const HALF = BODY_H / 2;
const CRIMP_H = 0.07;
const TEAR_Y = 0.465;
const BULGE = 0.042;

export interface PackRotation {
  yaw: number;
  pitch: number;
  targetYaw: number;
  targetPitch: number;
  velocity: number;
  dragging: boolean;
}

/** Cosmetic animation channels of the opening, each 0..1. */
interface OpenAnim {
  settle: number;
  stretch: number;
  tear: number;
  strip: number;
  peel: number;
  fold: number;
  stackUp: number;
  away: number;
  stackSettle: number;
}

const zeroAnim = (): OpenAnim => ({ settle: 0, stretch: 0, tear: 0, strip: 0, peel: 0, fold: 0, stackUp: 0, away: 0, stackSettle: 0 });

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Cheap deterministic value noise for wrinkles. */
function vnoise(x: number, y: number) {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}
function wrinkle(x: number, y: number) {
  return (
    Math.sin(x * 23 + y * 7) * 0.5 +
    Math.sin(x * 9 - y * 17 + 1.3) * 0.35 +
    (vnoise(Math.floor(x * 30), Math.floor(y * 30)) - 0.5) * 0.4
  );
}

/** Pillow bulge profile: zero at the side and seam edges. */
function bulge(x: number, y: number) {
  const bx = Math.sqrt(Math.max(0, 1 - Math.abs((2 * x) / PACK_W) ** 6));
  const by = Math.sqrt(Math.max(0, 1 - Math.abs(y / HALF) ** 8));
  return bx * by;
}

interface Sheet {
  geo: THREE.PlaneGeometry;
  base: Float32Array;
  side: 1 | -1;
}

function makeSheet(y0: number, y1: number, segX: number, segY: number, side: 1 | -1): Sheet {
  const h = y1 - y0;
  const geo = new THREE.PlaneGeometry(PACK_W, h, segX, segY);
  geo.translate(0, y0 + h / 2, 0);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const u = x / PACK_W + 0.5;
    const v = (y + HALF) / BODY_H;
    uv.setXY(i, side === 1 ? u : 1 - u, v);
    const b = bulge(x, y);
    const crease = 0.0035 * Math.sin(x * 95) * smoothstep(0.36, HALF, Math.abs(y));
    const z = side * (BULGE * b + 0.0022 * wrinkle(x, y) * b + crease * b);
    pos.setXYZ(i, side === 1 ? x : x, y, z);
  }
  if (side === -1) {
    // Flip winding so the outward face points to -z.
    const index = geo.index!;
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i + 1);
      index.setX(i + 1, index.getX(i + 2));
      index.setX(i + 2, a);
    }
  }
  geo.computeVertexNormals();
  return { geo, base: Float32Array.from(pos.array as Float32Array), side };
}

function makeCrimp(yCenter: number): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(PACK_W + 0.004, CRIMP_H, 96, 3);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const tooth = (((x * 260) % 2) + 2) % 2;
    pos.setZ(i, (Math.abs(tooth - 1) - 0.5) * 0.004);
  }
  geo.translate(0, yCenter, 0);
  geo.computeVertexNormals();
  return geo;
}

/** Jagged tear edge revealed as the tear travels across the seam. */
function makeTearLine(): THREE.BufferGeometry {
  const pts: number[] = [];
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * PACK_W;
    const j = (i % 2 ? 1 : -1) * 0.004;
    pts.push(x, TEAR_Y + j + 0.003, 0, x, TEAR_Y + j - 0.003, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  g.setIndex(idx);
  return g;
}

function foilMaterial(map: THREE.Texture): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({
    map,
    metalness: 0.4,
    roughness: 0.32,
    clearcoat: 0.7,
    clearcoatRoughness: 0.25,
    envMapIntensity: 1.25,
    side: THREE.DoubleSide,
  });
  // The inside of the wrapper is plain silver foil.
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
       if (!gl_FrontFacing) diffuseColor.rgb = vec3(0.22, 0.23, 0.25);`,
    );
  };
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
  onOpened: () => void;
  onSound?: (name: 'tear' | 'rustle' | 'slide') => void;
}

export function Pack({ textures, rotation, phase, reducedMotion, skipToken, stackRest, onOpened, onSound }: Props) {
  const root = useRef<THREE.Group>(null);
  const wrapper = useRef<THREE.Group>(null);
  const strip = useRef<THREE.Group>(null);
  const tearMesh = useRef<THREE.Mesh>(null);
  const anim = useRef<OpenAnim>(zeroAnim());
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const onOpenedRef = useRef(onOpened);
  onOpenedRef.current = onOpened;
  const restRef = useRef(stackRest);
  restRef.current = stackRest;

  const parts = useMemo(() => {
    const frontBody = makeSheet(-HALF, TEAR_Y, 28, 44, 1);
    const backBody = makeSheet(-HALF, TEAR_Y, 28, 44, -1);
    const frontStrip = makeSheet(TEAR_Y, HALF, 28, 2, 1);
    const backStrip = makeSheet(TEAR_Y, HALF, 28, 2, -1);
    const topCrimp = makeCrimp(HALF + CRIMP_H / 2);
    const bottomCrimp = makeCrimp(-HALF - CRIMP_H / 2);
    const tear = makeTearLine();
    return { frontBody, backBody, frontStrip, backStrip, topCrimp, bottomCrimp, tear };
  }, []);

  const mats = useMemo(() => {
    const crimp = new THREE.MeshPhysicalMaterial({ map: textures.crimp, metalness: 0.8, roughness: 0.28, side: THREE.DoubleSide, envMapIntensity: 1.3 });
    textures.crimp.repeat.set(4, 1);
    return {
      front: foilMaterial(textures.front),
      back: foilMaterial(textures.back),
      crimp,
      tear: new THREE.MeshBasicMaterial({ color: '#f4f1ea', side: THREE.DoubleSide }),
    };
  }, [textures]);

  useEffect(
    () => () => {
      for (const s of Object.values(parts)) ('geo' in s ? s.geo : s).dispose();
      for (const m of Object.values(mats)) m.dispose();
    },
    [parts, mats],
  );

  // Build and run the opening timeline.
  useEffect(() => {
    if (phase !== 'opening') return;
    const a = anim.current;
    Object.assign(a, zeroAnim());
    const rot = rotation.current;
    const tl = gsap.timeline({
      onComplete: () => {
        timeline.current = null;
        onOpenedRef.current();
      },
    });
    tl.to(rot, { yaw: Math.round(rot.yaw / (Math.PI * 2)) * Math.PI * 2, targetYaw: Math.round(rot.yaw / (Math.PI * 2)) * Math.PI * 2, pitch: 0, targetPitch: 0, duration: 0.35, ease: 'power2.out' }, 0)
      .to(a, { settle: 1, duration: 0.45, ease: 'back.out(2)' }, 0)
      .to(a, { stretch: 1, duration: 0.45, ease: 'power1.inOut' }, 0.4)
      .call(() => onSound?.('tear'), [], 0.85)
      .to(a, { tear: 1, duration: 0.7, ease: 'power1.in' }, 0.85)
      .to(a, { strip: 1, duration: 0.7, ease: 'power2.in' }, 1.5)
      .call(() => onSound?.('rustle'), [], 1.8)
      .to(a, { peel: 1, duration: 1.05, ease: 'power2.inOut' }, 1.8)
      .to(a, { fold: 1, duration: 0.6, ease: 'power2.out' }, 2.45)
      .call(() => onSound?.('slide'), [], 2.6)
      .to(a, { stackUp: 1, duration: 0.75, ease: 'power2.out' }, 2.6)
      .to(a, { away: 1, duration: 0.7, ease: 'power2.in' }, 3.15)
      .to(a, { stackSettle: 1, duration: 0.75, ease: 'power3.inOut' }, 3.5);
    if (reducedMotion) tl.timeScale(4);
    // Development aid: ?freeze=<seconds> pauses the opening at that moment for visual review.
    const freeze = import.meta.env.DEV || new URLSearchParams(location.search).has('debug') ? new URLSearchParams(location.search).get('freeze') : null;
    if (freeze) tl.pause(Number(freeze));
    timeline.current = tl;
    return () => {
      tl.kill();
      timeline.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Skip: jump to the end of the same timeline (fires onComplete → same reveal state).
  useEffect(() => {
    if (skipToken > 0 && timeline.current) timeline.current.progress(1);
  }, [skipToken]);

  useFrame((_, dt) => {
    const r = rotation.current;
    const a = anim.current;
    // Damped rotation of the object (camera stays fixed).
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
    const idle = phase === 'sealed' && !r.dragging ? Math.sin(performance.now() / 1400) * 0.015 : 0;
    g.rotation.set(r.pitch, r.yaw + idle, 0);
    g.position.y = -0.04 * Math.sin(a.settle * Math.PI) * (1 - a.away);

    deformFront(parts.frontBody, a);
    deformBack(parts.backBody, a);
    deformStrip(parts.frontStrip, a);
    deformStrip(parts.backStrip, a);

    if (strip.current) {
      const s = a.strip;
      strip.current.position.set(s * 0.45, s * 0.95 + a.stretch * 0.012, s * 0.25);
      strip.current.rotation.set(s * 0.8, 0, -s * 1.1);
      strip.current.visible = s < 0.999;
    }
    if (tearMesh.current) {
      tearMesh.current.visible = a.tear > 0.001 && a.strip < 0.2;
      tearMesh.current.scale.x = Math.max(0.0001, a.tear);
    }
    if (wrapper.current) {
      const w = a.away;
      wrapper.current.position.set(0, -w * 2.3, -w * 0.35);
      wrapper.current.rotation.set(w * 0.6, 0, w * 0.15);
      wrapper.current.visible = w < 0.999;
    }

    // Stack anchor for the card reveal.
    const rest = restRef.current;
    const up = a.stackUp;
    const st = a.stackSettle;
    const inside = { x: 0, y: -0.04 + up * 0.66, z: -0.031 + up * 0.11 };
    const ease = st;
    const anchor = sceneFx.stackAnchor;
    anchor.x = inside.x + (rest.x - inside.x) * ease;
    anchor.y = inside.y + (rest.y - inside.y) * ease;
    anchor.z = inside.z + (rest.z - inside.z) * ease;
    anchor.rx = 0;
    anchor.ry = Math.PI;
    anchor.rz = Math.sin(st * Math.PI) * 0.08;
    anchor.s = 1 + (rest.s - 1) * ease;
    sceneFx.stackVisible = phase === 'opening';
  });

  return (
    <group ref={root} scale={1.22}>
      <group ref={wrapper}>
        <mesh geometry={parts.frontBody.geo} material={mats.front} castShadow />
        <mesh geometry={parts.backBody.geo} material={mats.back} castShadow />
        <mesh geometry={parts.bottomCrimp} material={mats.crimp} castShadow />
      </group>
      <group ref={strip}>
        <mesh geometry={parts.frontStrip.geo} material={mats.front} />
        <mesh geometry={parts.backStrip.geo} material={mats.back} />
        <mesh geometry={parts.topCrimp} material={mats.crimp} castShadow />
      </group>
      <group position={[-PACK_W / 2, 0, BULGE * 0.78]}>
        <mesh ref={tearMesh} geometry={parts.tear} material={mats.tear} visible={false} />
      </group>
    </group>
  );
}

/** Front body: stretch near the seam, then curl downward toward the viewer, then side folds. */
function deformFront(sheet: Sheet, a: OpenAnim) {
  const pos = sheet.geo.attributes.position;
  const arr = pos.array as Float32Array;
  const base = sheet.base;
  const peel = a.peel;
  const hinge0 = TEAR_Y - peel * 1.0;
  const R = 0.045 + 0.06 * peel;
  for (let i = 0; i < pos.count; i++) {
    let x = base[i * 3];
    let y = base[i * 3 + 1];
    let z = base[i * 3 + 2];
    // seam stretch
    y += a.stretch * (1 - a.strip) * 0.012 * smoothstep(0.3, TEAR_Y, y);
    if (peel > 0) {
      const hinge = hinge0 + 0.07 * (x / PACK_W) * Math.sin(peel * Math.PI);
      const d = y - hinge;
      if (d > 0) {
        const theta = d / R;
        if (theta < Math.PI) {
          y = hinge + R * Math.sin(theta);
          z = z + R * (1 - Math.cos(theta));
        } else {
          y = hinge - (d - Math.PI * R);
          z = z + 2 * R + (d - Math.PI * R) * 0.35 * peel;
        }
        // flexible foil: slight flutter across the width
        z += Math.sin(x * 9 + d * 6) * 0.006 * Math.min(1, d * 4);
      }
    }
    if (a.fold > 0) {
      const e = smoothstep(PACK_W / 2 - 0.12, PACK_W / 2, Math.abs(base[i * 3]));
      x += Math.sign(x) * e * a.fold * 0.06;
      z += e * a.fold * 0.05;
    }
    arr[i * 3] = x;
    arr[i * 3 + 1] = y;
    arr[i * 3 + 2] = z;
  }
  pos.needsUpdate = true;
  sheet.geo.computeVertexNormals();
}

function deformBack(sheet: Sheet, a: OpenAnim) {
  const pos = sheet.geo.attributes.position;
  const arr = pos.array as Float32Array;
  const base = sheet.base;
  for (let i = 0; i < pos.count; i++) {
    let x = base[i * 3];
    let y = base[i * 3 + 1];
    let z = base[i * 3 + 2];
    y += a.stretch * (1 - a.strip) * 0.012 * smoothstep(0.3, TEAR_Y, y);
    if (a.fold > 0) {
      const e = smoothstep(PACK_W / 2 - 0.12, PACK_W / 2, Math.abs(x));
      x += Math.sign(x) * e * a.fold * 0.05;
      z -= e * a.fold * 0.04;
      // back panel relaxes once the cards leave
      z *= 1 - 0.4 * a.stackUp;
    }
    arr[i * 3] = x;
    arr[i * 3 + 1] = y;
    arr[i * 3 + 2] = z;
  }
  pos.needsUpdate = true;
  sheet.geo.computeVertexNormals();
}

function deformStrip(sheet: Sheet, a: OpenAnim) {
  const pos = sheet.geo.attributes.position;
  const arr = pos.array as Float32Array;
  const base = sheet.base;
  const tearX = -PACK_W / 2 + a.tear * PACK_W;
  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3];
    let y = base[i * 3 + 1];
    y += a.stretch * 0.012 * smoothstep(0.3, TEAR_Y, y);
    // the torn part lifts slightly, opening a gap behind the travelling tear
    if (x < tearX && y < TEAR_Y + 0.02) y += 0.006 * (1 - (y - TEAR_Y) / 0.02);
    arr[i * 3] = x;
    arr[i * 3 + 1] = y;
    arr[i * 3 + 2] = base[i * 3 + 2];
  }
  pos.needsUpdate = true;
  sheet.geo.computeVertexNormals();
}
