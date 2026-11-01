import { ContactShadows } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import * as THREE from 'three';
import { getCard } from '../data/cards';
import { maxDpr, usePageVisible } from '../hooks/usePageVisible';
import { cardBackTexture, cardFaceTextures, releaseCardTextures } from '../render/textureStore';
import { CardMesh, makeCardFx } from './CardMesh';
import type { CardFaceTextures } from './cardMaterial';
import { StudioLighting } from './Lighting';

interface Rot {
  yaw: number;
  pitch: number;
  /** Drag-controlled base orientation. */
  tYaw: number;
  tPitch: number;
  /** Hover tilt from the pointer position (-1..1). */
  hx: number;
  hy: number;
}

function InspectCard({
  cardId,
  rot,
  reducedMotion,
  fixedTilt,
}: {
  cardId: string;
  rot: React.MutableRefObject<Rot>;
  reducedMotion: boolean;
  fixedTilt?: { yaw: number; pitch: number } | null;
}) {
  const [tex, setTex] = useState<{ face: CardFaceTextures; back: THREE.Texture } | null>(null);
  const group = useRef<THREE.Group>(null);
  const fx = useMemo(() => {
    const f = makeCardFx(getCard(cardId).frame.accent);
    f.strength = 1;
    f.glow = getCard(cardId).rarity === 'Legendary' ? 0.35 : 0;
    return f;
  }, [cardId]);
  useEffect(() => {
    let alive = true;
    Promise.all([cardFaceTextures(cardId), cardBackTexture()]).then(([face, back]) => alive && setTex({ face, back }));
    return () => {
      alive = false;
    };
  }, [cardId]);
  useFrame((state, dt) => {
    const r = rot.current;
    const k = 1 - Math.exp(-dt * 6);
    const goalYaw = r.tYaw + r.hx * 0.6;
    const goalPitch = THREE.MathUtils.clamp(r.tPitch + r.hy * 0.42, -0.6, 0.6);
    r.yaw += (goalYaw - r.yaw) * k;
    r.pitch += (goalPitch - r.pitch) * k;
    if (group.current && fixedTilt) {
      group.current.rotation.set(fixedTilt.pitch, fixedTilt.yaw, 0);
      return;
    }
    if (group.current) {
      const idle = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.6) * 0.02;
      group.current.rotation.set(r.pitch, r.yaw + idle, 0);
    }
  });
  if (!tex) return null;
  return (
    <group ref={group} scale={1.85}>
      <CardMesh cardId={cardId} face={tex.face} back={tex.back} fx={fx} />
    </group>
  );
}

export default function InspectStage({
  cardId,
  showBack,
  resetToken,
  reducedMotion,
  fixedTilt,
}: {
  cardId: string;
  showBack: boolean;
  resetToken: number;
  reducedMotion: boolean;
  /** Development: pins the card at an exact angle (radians). */
  fixedTilt?: { yaw: number; pitch: number } | null;
}) {
  const visible = usePageVisible();
  const rot = useRef<Rot>({ yaw: 0.35, pitch: -0.1, tYaw: 0, tPitch: 0, hx: 0, hy: 0 });
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const r = rot.current;
    const base = Math.round(r.tYaw / (Math.PI * 2)) * Math.PI * 2;
    r.tYaw = base + (showBack ? Math.PI : 0);
    r.tPitch = 0;
    r.hx = 0;
    r.hy = 0;
  }, [showBack, resetToken]);

  useEffect(() => () => releaseCardTextures(), []);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d && e.pointerType === 'mouse') {
      // Hovering tilts the card toward the pointer to show the foil.
      const rect = e.currentTarget.getBoundingClientRect();
      rot.current.hx = THREE.MathUtils.clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
      rot.current.hy = THREE.MathUtils.clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
      return;
    }
    if (!d || d.id !== e.pointerId) return;
    rot.current.tYaw += (e.clientX - d.x) * 0.01;
    rot.current.tPitch = THREE.MathUtils.clamp(rot.current.tPitch + (e.clientY - d.y) * 0.006, -0.5, 0.5);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const r = rot.current;
    if (e.key === 'ArrowLeft') r.tYaw -= 0.3;
    else if (e.key === 'ArrowRight') r.tYaw += 0.3;
    else if (e.key === 'ArrowUp') r.tPitch = Math.max(-0.5, r.tPitch - 0.12);
    else if (e.key === 'ArrowDown') r.tPitch = Math.min(0.5, r.tPitch + 0.12);
    else return;
    e.preventDefault();
  };

  return (
    <div
      className="inspect-stage stage--grab"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onPointerLeave={() => {
        rot.current.hx = 0;
        rot.current.hy = 0;
      }}
      onKeyDown={key}
      tabIndex={0}
      role="img"
      aria-label={`3D view of ${getCard(cardId).name}. Move the pointer or drag to tilt the card; drag further or use arrow keys to turn it over.`}
    >
      <Canvas
        dpr={[1, maxDpr()]}
        frameloop={visible ? 'always' : 'never'}
        camera={{ position: [0, 0, 3.2], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
        }}
      >
        <StudioLighting />
        <InspectCard cardId={cardId} rot={rot} reducedMotion={reducedMotion} fixedTilt={fixedTilt} />
        <ContactShadows position={[0, -0.84, 0]} opacity={0.35} scale={4} blur={2.5} far={1.5} resolution={256} />
      </Canvas>
    </div>
  );
}
