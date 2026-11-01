import { ContactShadows } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import * as THREE from 'three';
import { getCard } from '../data/cards';
import { maxDpr, usePageVisible } from '../hooks/usePageVisible';
import { cardBackTexture, cardFaceTexture, releaseCardTextures } from '../render/textureStore';
import { CardMesh, makeCardFx } from './CardMesh';
import { StudioLighting } from './Lighting';

interface Rot {
  yaw: number;
  pitch: number;
  tYaw: number;
  tPitch: number;
}

function InspectCard({ cardId, rot, reducedMotion }: { cardId: string; rot: React.MutableRefObject<Rot>; reducedMotion: boolean }) {
  const [tex, setTex] = useState<{ face: THREE.Texture; back: THREE.Texture } | null>(null);
  const group = useRef<THREE.Group>(null);
  const fx = useMemo(() => {
    const f = makeCardFx(getCard(cardId).frame.accent);
    f.strength = 1;
    f.glow = getCard(cardId).rarity === 'Legendary' ? 0.35 : 0;
    return f;
  }, [cardId]);
  useEffect(() => {
    let alive = true;
    Promise.all([cardFaceTexture(cardId), cardBackTexture()]).then(([face, back]) => alive && setTex({ face, back }));
    return () => {
      alive = false;
    };
  }, [cardId]);
  useFrame((state, dt) => {
    const r = rot.current;
    const k = 1 - Math.exp(-dt * 8);
    r.yaw += (r.tYaw - r.yaw) * k;
    r.pitch += (r.tPitch - r.pitch) * k;
    if (group.current) {
      const idle = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.8) * 0.04;
      group.current.rotation.set(r.pitch, r.yaw + idle, 0);
    }
  });
  if (!tex) return null;
  return (
    <group ref={group} scale={1.55}>
      <CardMesh cardId={cardId} face={tex.face} back={tex.back} fx={fx} />
    </group>
  );
}

export default function InspectStage({
  cardId,
  showBack,
  resetToken,
  reducedMotion,
}: {
  cardId: string;
  showBack: boolean;
  resetToken: number;
  reducedMotion: boolean;
}) {
  const visible = usePageVisible();
  const rot = useRef<Rot>({ yaw: 0, pitch: 0, tYaw: 0, tPitch: 0 });
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const r = rot.current;
    const base = Math.round(r.tYaw / (Math.PI * 2)) * Math.PI * 2;
    r.tYaw = base + (showBack ? Math.PI : 0);
    r.tPitch = 0;
  }, [showBack, resetToken]);

  useEffect(() => () => releaseCardTextures(), []);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
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
      onKeyDown={key}
      tabIndex={0}
      role="img"
      aria-label={`3D view of ${getCard(cardId).name}. Drag or use arrow keys to tilt and turn the card.`}
    >
      <Canvas
        dpr={[1, maxDpr()]}
        frameloop={visible ? 'always' : 'never'}
        camera={{ position: [0, 0, 3.2], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
        }}
      >
        <StudioLighting />
        <InspectCard cardId={cardId} rot={rot} reducedMotion={reducedMotion} />
        <ContactShadows position={[0, -0.8, 0]} opacity={0.4} scale={4} blur={2.5} far={1.5} resolution={256} />
      </Canvas>
    </div>
  );
}
