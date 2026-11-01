import * as THREE from 'three';
import { CARD_THICKNESS } from './cardGeometry';

export interface Pose {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  s: number;
}

export const CAMERA_Z = 3.2;
export const CAMERA_FOV = 35;

/** Card reveal layout derived from the visible viewport (world units at z = 0). */
export function revealLayout(viewport: { width: number; height: number }) {
  const portrait = viewport.width / viewport.height < 0.85;
  const side = Math.min(0.78, viewport.width / 2 - 0.22);
  const sideScale = portrait ? 0.42 : 0.72;
  const sideY = portrait ? -viewport.height / 2 + 0.24 : -0.06;
    // visible height at the face-up card's depth (z = 0.55) is ~83% of the height at z = 0
  const centerScale = Math.min(1.45, (viewport.height * 0.83 * (portrait ? 0.62 : 0.84)) / 0.88);
  return {
    center: { x: 0, y: portrait ? 0.14 : 0.03, z: 0.55, rx: 0, ry: 0, rz: 0, s: centerScale } as Pose,
    stack: { x: portrait ? viewport.width / 2 - 0.2 : side, y: sideY, z: -0.25, rx: 0, ry: Math.PI, rz: 0, s: sideScale } as Pose,
    pile: { x: portrait ? -viewport.width / 2 + 0.2 : -side, y: sideY, z: -0.25, rx: 0, ry: 0, rz: 0, s: sideScale } as Pose,
  };
}

/** Pose of the k-th card (0 = first revealed) inside a stack whose base is `base`. */
export function stackCardPose(base: Pose, k: number, total = 10): Pose {
  // The first card to be revealed sits on top (closest to the camera).
  const depth = (total - 1 - k) * CARD_THICKNESS * 1.25 * base.s;
  return { ...base, z: base.z + depth, rz: base.rz + ((k * 37) % 7 - 3) * 0.003 };
}

export function pileCardPose(base: Pose, k: number): Pose {
  return { ...base, z: base.z + k * CARD_THICKNESS * 1.25 * base.s, rz: (((k * 53) % 11) - 5) * 0.012 };
}

export function applyPose(obj: THREE.Object3D, p: Pose) {
  obj.position.set(p.x, p.y, p.z);
  obj.rotation.set(p.rx, p.ry, p.rz);
  obj.scale.setScalar(p.s);
}

export function readPose(obj: THREE.Object3D): Pose {
  return {
    x: obj.position.x,
    y: obj.position.y,
    z: obj.position.z,
    rx: obj.rotation.x,
    ry: obj.rotation.y,
    rz: obj.rotation.z,
    s: obj.scale.x,
  };
}
