import { Environment, Lightformer } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { sceneFx } from './sceneFx';
import { tuning } from './tuning';

/**
 * Controlled studio lighting. The environment map (rendered once from light-former
 * shapes, offline) gives the cards something meaningful to reflect: a large key
 * softbox, a warm fill, a cool rim and a narrow vertical strip whose reflection
 * travels across the card as it tilts. The environment itself is never shown.
 */
export function StudioLighting() {
  const ambient = useRef<THREE.AmbientLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.SpotLight>(null);
  const accent = useRef<THREE.PointLight>(null);
  const backdrop = useRef<THREE.MeshBasicMaterial>(null);
  const scene = useThree((s) => s.scene);
  useFrame(() => {
    const d = sceneFx.dim;
    scene.environmentIntensity = tuning.envIntensity * (1 - 0.55 * d);
    if (ambient.current) ambient.current.intensity = 0.25 * (1 - 0.7 * d);
    if (key.current) {
      key.current.intensity = 1.6 * (1 - 0.55 * d);
      key.current.position.set(tuning.keyLightX, tuning.keyLightY, 3);
    }
    if (rim.current) rim.current.intensity = 10 * (1 - 0.6 * d);
    if (accent.current) {
      accent.current.color.copy(sceneFx.accent);
      accent.current.intensity = sceneFx.accentIntensity * 3;
    }
    if (backdrop.current) backdrop.current.opacity = d * 0.72;
  });
  return (
    <>
      <ambientLight ref={ambient} intensity={0.25} color="#fff1dc" />
      <directionalLight ref={key} position={[1.6, 2.4, 3]} intensity={1.6} color="#fff6ea" />
      <spotLight ref={rim} position={[-2.5, 1.5, -1.5]} angle={0.6} penumbra={0.8} intensity={10} color="#ffd6a0" />
      <pointLight ref={accent} position={[0, 0.05, 0.25]} intensity={0} distance={2.2} decay={1.5} />
      <mesh position={[0, 0, -1.4]} renderOrder={-1}>
        <planeGeometry args={[30, 30]} />
        <meshBasicMaterial ref={backdrop} color="#000000" transparent opacity={0} depthWrite={false} />
      </mesh>
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#0b0b0d']} />
        {/* broad key softbox above and in front */}
        <Lightformer form="rect" intensity={2.2} position={[0.4, 2.6, 2.4]} scale={[4.5, 1.6, 1]} target={[0, 0, 0]} />
        {/* narrow strip: produces the travelling highlight */}
        <Lightformer form="rect" intensity={6} position={[-0.7, 0.3, 3]} scale={[0.16, 6, 1]} target={[0, 0, 0]} />
        {/* warm fill and cool rim */}
        <Lightformer form="rect" intensity={1.1} color="#ffd9a0" position={[-3, -0.5, 1]} scale={[1.2, 3, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.0} color="#b8d0ff" position={[3, 0.4, 1.2]} scale={[1, 3.5, 1]} target={[0, 0, 0]} />
        {/* faint floor bounce */}
        <Lightformer form="rect" intensity={0.35} color="#ffe2b8" position={[0, -3, 1.5]} scale={[5, 1, 1]} target={[0, 0, 0]} />
      </Environment>
    </>
  );
}
