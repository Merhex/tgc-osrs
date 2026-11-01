import { useFrame } from '@react-three/fiber';
import { forwardRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { getCard } from '../data/cards';
import { cardGeometries } from './cardGeometry';
import { applyFinish, createCardFaceMaterial, edgeMaterialParams, sharedBackMaterial, type CardFaceTextures } from './cardMaterial';
import { tuning } from './tuning';

/** Mutable per-card cosmetic state read every frame (no React re-renders). */
export interface CardFx {
  /** Edge illumination 0..1. */
  glow: number;
  color: THREE.Color;
  /** Strength of the subject-specific ambient light effect 0..1. */
  strength: number;
  /** Extra foil emphasis 0..1 (Legendary reveal). */
  foilBoost: number;
}

export function makeCardFx(color = '#ffae2b'): CardFx {
  return { glow: 0, color: new THREE.Color(color), strength: 1, foilBoost: 0 };
}

interface Props {
  cardId: string;
  face: CardFaceTextures | null;
  back: THREE.Texture;
  fx?: CardFx;
  onClick?: (e: { stopPropagation: () => void }) => void;
  name?: string;
}

export const CardMesh = forwardRef<THREE.Group, Props>(function CardMesh({ cardId, face, back, fx, onClick, name }, ref) {
  const geo = cardGeometries();
  const card = getCard(cardId);
  const faceMat = useMemo(() => (face ? createCardFaceMaterial(card, face) : null), [card, face]);
  const backMat = sharedBackMaterial(back);
  const edgeMat = useMemo(
    () => new THREE.MeshPhysicalMaterial({ ...edgeMaterialParams(card.rarity), emissive: new THREE.Color(0) }),
    [card.rarity],
  );
  const edgeBase = useMemo(() => new THREE.Color(edgeMaterialParams(card.rarity).color as string), [card.rarity]);

  useEffect(() => () => faceMat?.dispose(), [faceMat]);
  useEffect(() => () => edgeMat.dispose(), [edgeMat]);

  useFrame((state) => {
    if (faceMat) applyFinish(faceMat, card, state.clock.elapsedTime, fx ?? { strength: 1, foilBoost: 0 });
    const rarity = tuning.rarityOverride ?? card.rarity;
    const p = edgeMaterialParams(rarity);
    edgeMat.metalness = p.metalness as number;
    edgeMat.roughness = p.roughness as number;
    edgeBase.set(p.color as string);
    if (fx) {
      edgeMat.emissive.copy(fx.color).multiplyScalar(fx.glow * 1.6);
      edgeMat.color.copy(edgeBase).lerp(fx.color, fx.glow * 0.5);
    } else edgeMat.color.copy(edgeBase);
  });

  return (
    <group ref={ref} name={name} onClick={onClick}>
      {faceMat && <mesh geometry={geo.front} material={faceMat} />}
      <mesh geometry={geo.back} material={backMat} />
      <mesh geometry={geo.edge} material={edgeMat} />
    </group>
  );
});
