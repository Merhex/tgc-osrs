import { ContactShadows } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import type { Phase } from '../opening/machine';
import type { OpeningRecord } from '../persistence/repository';
import { packTextures, prewarmCardTextures, releaseCardTextures, type PackTextures } from '../render/textureStore';
import { maxDpr, usePageVisible } from '../hooks/usePageVisible';
import { Pack, type PackRotation } from './Pack';
import { RevealCards, type RevealSound } from './RevealCards';
import { CAMERA_FOV, CAMERA_Z, revealLayout } from './layout';
import { StudioLighting } from './Lighting';

export interface StageProps {
  phase: Phase;
  opening: OpeningRecord | null;
  revealIndex: number;
  reducedMotion: boolean;
  skipToken: number;
  resetToken: number;
  rotateToken: { dx: number; dy: number; n: number };
  onOpened: () => void;
  onCardShown: () => void;
  onAdvance: () => void;
  onSound: (s: RevealSound | 'tear' | 'rustle' | 'slide') => void;
  label: string;
}

function StackRest({ children }: { children: (rest: ReturnType<typeof revealLayout>['stack']) => React.ReactNode }) {
  const viewport = useThree((s) => s.viewport);
  const rest = useMemo(() => revealLayout(viewport).stack, [viewport.width, viewport.height]); // eslint-disable-line react-hooks/exhaustive-deps
  return <>{children(rest)}</>;
}

export default function Stage(props: StageProps) {
  const { phase, opening, revealIndex, reducedMotion, skipToken, resetToken, rotateToken } = props;
  const visible = usePageVisible();
  const [textures, setTextures] = useState<PackTextures | null>(null);
  const rotation = useRef<PackRotation>({ yaw: 0.5, pitch: -0.08, targetYaw: -0.35, targetPitch: 0.05, velocity: 0, dragging: false });
  const drag = useRef<{ id: number; x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    let alive = true;
    packTextures().then((t) => {
      if (alive) setTextures(t);
      prewarmCardTextures();
    });
    return () => {
      alive = false;
    };
  }, []);

  // Free card textures from the GPU when the stage goes away.
  useEffect(() => () => releaseCardTextures(), []);

  const packPhase = phase === 'sealed' || phase === 'preparing' || phase === 'opening';
  const canRotate = phase === 'sealed';

  useEffect(() => {
    if (resetToken === 0) return;
    const r = rotation.current;
    r.velocity = 0;
    r.targetYaw = Math.round(r.yaw / (Math.PI * 2)) * Math.PI * 2;
    r.targetPitch = 0;
  }, [resetToken]);

  useEffect(() => {
    if (rotateToken.n === 0 || !canRotate) return;
    const r = rotation.current;
    r.targetYaw += rotateToken.dx;
    r.targetPitch = THREE.MathUtils.clamp(r.targetPitch + rotateToken.dy, -0.45, 0.45);
  }, [rotateToken, canRotate]);

  // Before opening, bring the pack back to its presentation position.
  useEffect(() => {
    if (phase === 'preparing') {
      const r = rotation.current;
      r.velocity = 0;
      r.dragging = false;
      r.targetYaw = Math.round(r.yaw / (Math.PI * 2)) * Math.PI * 2;
      r.targetPitch = 0;
    }
  }, [phase]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!canRotate) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
    rotation.current.dragging = true;
    rotation.current.velocity = 0;
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const r = rotation.current;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    const now = performance.now();
    const dt = Math.max(1, now - d.t) / 1000;
    r.targetYaw += dx * 0.011;
    r.targetPitch = THREE.MathUtils.clamp(r.targetPitch + dy * 0.006, -0.45, 0.45);
    r.velocity = THREE.MathUtils.clamp((dx * 0.011) / dt, -12, 12);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: now };
  };
  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== e.pointerId) return;
    if (performance.now() - drag.current.t > 80) rotation.current.velocity = 0;
    drag.current = null;
    rotation.current.dragging = false;
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!canRotate) return;
    const r = rotation.current;
    if (e.key === 'ArrowLeft') r.targetYaw -= 0.4;
    else if (e.key === 'ArrowRight') r.targetYaw += 0.4;
    else if (e.key === 'ArrowUp') r.targetPitch = Math.max(-0.45, r.targetPitch - 0.15);
    else if (e.key === 'ArrowDown') r.targetPitch = Math.min(0.45, r.targetPitch + 0.15);
    else return;
    e.preventDefault();
  };

  return (
    <div
      className={`stage ${canRotate ? 'stage--grab' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      tabIndex={canRotate ? 0 : -1}
      role="img"
      aria-label={props.label}
    >
      <Canvas
        dpr={[1, maxDpr()]}
        frameloop={visible ? 'always' : 'never'}
        camera={{ position: [0, 0, CAMERA_Z], fov: CAMERA_FOV, near: 0.1, far: 30 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
        }}
      >
        <StudioLighting />
        <StackRest>
          {(rest) => (
            <>
              {packPhase && textures && (
                <Pack
                  textures={textures}
                  rotation={rotation}
                  phase={phase as 'sealed' | 'preparing' | 'opening'}
                  reducedMotion={reducedMotion}
                  skipToken={skipToken}
                  stackRest={rest}
                  tearSeed={opening?.id ?? 'sealed'}
                  onOpened={props.onOpened}
                  onSound={props.onSound}
                />
              )}
              {opening && (phase === 'opening' || phase === 'revealing') && (
                <RevealCards
                  opening={opening}
                  phase={phase}
                  revealIndex={revealIndex}
                  reducedMotion={reducedMotion}
                  onCardShown={props.onCardShown}
                  onAdvance={props.onAdvance}
                  onSound={props.onSound}
                />
              )}
            </>
          )}
        </StackRest>
        <ContactShadows position={[0, -0.78, 0]} opacity={0.55} scale={4} blur={2.6} far={1.6} resolution={256} color="#1a0f05" />
      </Canvas>
    </div>
  );
}
