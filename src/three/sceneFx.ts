import * as THREE from 'three';
import type { Pose } from './layout';

/**
 * Cosmetic, per-frame scene state shared between the pack timeline, the card
 * reveal and the lights. Never persisted; never affects collection data.
 */
export const sceneFx = {
  /** 0 = normal lighting, 1 = fully dimmed surroundings (Legendary anticipation). */
  dim: 0,
  accent: new THREE.Color('#ffae2b'),
  accentIntensity: 0,
  /** Stack pose driven by the pack-opening timeline while phase === 'opening'. */
  stackAnchor: { x: 0, y: -0.03, z: 0, rx: 0, ry: Math.PI, rz: 0, s: 1 } as Pose,
  stackVisible: false,
};
