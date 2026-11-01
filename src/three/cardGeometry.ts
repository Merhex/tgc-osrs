import * as THREE from 'three';

export const CARD_WIDTH = 0.63;
export const CARD_HEIGHT = 0.88;
export const CARD_THICKNESS = 0.0068;
const RADIUS = 0.028;

function roundedShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function faceGeometry(mirror: boolean): THREE.BufferGeometry {
  const g = new THREE.ShapeGeometry(roundedShape(CARD_WIDTH, CARD_HEIGHT, RADIUS), 6);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / CARD_WIDTH + 0.5;
    const v = pos.getY(i) / CARD_HEIGHT + 0.5;
    uv.setXY(i, u, v);
  }
  if (mirror) g.rotateY(Math.PI);
  g.translate(0, 0, mirror ? -CARD_THICKNESS / 2 - 0.0002 : CARD_THICKNESS / 2 + 0.0002);
  g.computeVertexNormals();
  return g;
}

let shared: { front: THREE.BufferGeometry; back: THREE.BufferGeometry; edge: THREE.BufferGeometry } | null = null;

/** Shared geometries for all cards (created once, never disposed during the app lifetime). */
export function cardGeometries() {
  if (!shared) {
    const edge = new THREE.ExtrudeGeometry(roundedShape(CARD_WIDTH, CARD_HEIGHT, RADIUS), {
      depth: CARD_THICKNESS,
      bevelEnabled: false,
      curveSegments: 6,
    });
    edge.translate(0, 0, -CARD_THICKNESS / 2);
    shared = { front: faceGeometry(false), back: faceGeometry(true), edge };
  }
  return shared;
}
