import { ContactShadows } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { computeNewFlags, generateShowcasePack } from '../domain/packGenerator';
import { seededRng } from '../domain/random';
import type { OpeningRecord } from '../persistence/repository';
import { packTextures, type PackTextures } from '../render/textureStore';
import { StudioLighting } from '../three/Lighting';
import { Pack, type PackRotation } from '../three/Pack';
import { RevealCards } from '../three/RevealCards';
import { CAMERA_FOV, CAMERA_Z, revealLayout } from '../three/layout';

/** In-memory opening used only for the cosmetic replay. Never persisted. */
function fakeOpening(run: number): OpeningRecord {
  const cards = generateShowcasePack(seededRng(run + 1));
  return {
    id: `lab-${run}-${Math.random().toString(36).slice(2)}`,
    mode: 'showcase',
    createdAt: 0,
    cards,
    ownedBefore: {},
    newFlags: computeNewFlags(cards, {}),
    revealIndex: 0,
    status: 'revealing',
  };
}

function Scene({
  run,
  onTimeline,
  camera,
}: {
  run: number;
  onTimeline: (tl: gsap.core.Timeline | null) => void;
  camera: 'front' | 'close' | 'side';
}) {
  const [textures, setTextures] = useState<PackTextures | null>(null);
  const rotation = useRef<PackRotation>({ yaw: 0, pitch: 0, targetYaw: 0, targetPitch: 0, velocity: 0, dragging: false });
  const opening = useMemo(() => fakeOpening(run), [run]);
  const viewport = useThree((s) => s.viewport);
  const cam = useThree((s) => s.camera);
  const rest = useMemo(() => revealLayout(viewport).stack, [viewport.width, viewport.height]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    packTextures().then(setTextures);
  }, []);
  useEffect(() => {
    if (camera === 'close') cam.position.set(-0.35, 0.75, 1.5);
    else if (camera === 'side') cam.position.set(-1.8, 0.6, 2.4);
    else cam.position.set(0, 0, CAMERA_Z);
    cam.lookAt(camera === 'front' ? 0 : -0.1, camera === 'front' ? 0 : 0.55, 0);
  }, [camera, cam]);
  if (!textures) return null;
  return (
    <>
      <Pack
        key={opening.id}
        textures={textures}
        rotation={rotation}
        phase="opening"
        reducedMotion={false}
        skipToken={0}
        stackRest={rest}
        tearSeed={opening.id}
        onOpened={() => undefined}
        onTimeline={onTimeline}
      />
      <RevealCards
        key={`cards-${opening.id}`}
        opening={opening}
        phase="opening"
        revealIndex={0}
        reducedMotion={false}
        onCardShown={() => undefined}
        onAdvance={() => undefined}
      />
    </>
  );
}

export default function LabPackStage(props: {
  run: number;
  onTimeline: (tl: gsap.core.Timeline | null) => void;
  camera: 'front' | 'close' | 'side';
}) {
  return (
    <Canvas
      camera={{ position: [0, 0, CAMERA_Z], fov: CAMERA_FOV }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
      }}
    >
      <color attach="background" args={['#141416']} />
      <StudioLighting />
      <Scene {...props} />
      <ContactShadows position={[0, -0.78, 0]} opacity={0.5} scale={4} blur={2.6} far={1.6} resolution={256} />
    </Canvas>
  );
}
