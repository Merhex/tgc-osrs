import { useFrame } from '@react-three/fiber';
import { forwardRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { getCard } from '../data/cards';
import { cardGeometries } from './cardGeometry';
import { createCardFaceMaterial } from './cardMaterial';

/** Mutable per-card cosmetic state read every frame (no React re-renders). */
export interface CardFx {
  /** Edge illumination 0..1. */
  glow: number;
  color: THREE.Color;
  /** Strength of the subject-specific inspection effect 0..1. */
  strength: number;
  /** Extra holofoil boost 0..1 (Legendary reveal). */
  foilBoost: number;
}

export function makeCardFx(color = '#ffae2b'): CardFx {
  return { glow: 0, color: new THREE.Color(color), strength: 1, foilBoost: 0 };
}

interface Props {
  cardId: string;
  face: THREE.Texture | null;
  back: THREE.Texture;
  fx?: CardFx;
  onClick?: (e: { stopPropagation: () => void }) => void;
  name?: string;
}

const edgeBase = new THREE.Color('#efe4c8');

export const CardMesh = forwardRef<THREE.Group, Props>(function CardMesh(
  { cardId, face, back, fx, onClick, name },
  ref,
) {
  const geo = cardGeometries();
  const card = getCard(cardId);
  const baseFoil = card.rarity === 'Legendary' ? 1 : card.rarity === 'Epic' ? 0.25 : 0;
  const faceMat = useMemo(() => (face ? createCardFaceMaterial(card, face) : null), [card, face]);
  const backMat = useMemo(() => new THREE.MeshStandardMaterial({ map: back, roughness: 0.55, metalness: 0.15 }), [back]);
  const edgeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: edgeBase, roughness: 0.6, emissive: new THREE.Color(0), emissiveIntensity: 1 }), []);

  useEffect(() => () => faceMat?.dispose(), [faceMat]);
  useEffect(() => () => backMat.dispose(), [backMat]);
  useEffect(() => () => edgeMat.dispose(), [edgeMat]);

  useFrame((state) => {
    if (faceMat) {
      faceMat.uniforms.uTime.value = state.clock.elapsedTime;
      faceMat.uniforms.uEffectStrength.value = fx ? fx.strength : 1;
      faceMat.uniforms.uFoil.value = baseFoil + (fx ? fx.foilBoost * 0.8 : 0);
    }
    if (fx) {
      edgeMat.emissive.copy(fx.color).multiplyScalar(fx.glow * 2.2);
      edgeMat.color.copy(edgeBase).lerp(fx.color, fx.glow * 0.6);
    }
  });

  return (
    <group ref={ref} name={name} onClick={onClick}>
      {faceMat && <mesh geometry={geo.front} material={faceMat} castShadow />}
      <mesh geometry={geo.back} material={backMat} castShadow />
      <mesh geometry={geo.edge} material={edgeMat} />
    </group>
  );
});
