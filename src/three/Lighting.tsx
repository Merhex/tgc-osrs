import { Environment, Lightformer } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { sceneFx } from './sceneFx';

/** Controlled studio lighting with a procedural (offline) environment map. */
export function StudioLighting() {
  const ambient = useRef<THREE.AmbientLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.SpotLight>(null);
  const accent = useRef<THREE.PointLight>(null);
  const backdrop = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    const d = sceneFx.dim;
    if (ambient.current) ambient.current.intensity = 0.55 * (1 - 0.7 * d);
    if (key.current) key.current.intensity = 1.7 * (1 - 0.55 * d);
    if (rim.current) rim.current.intensity = 14 * (1 - 0.6 * d);
    if (accent.current) {
      accent.current.color.copy(sceneFx.accent);
      accent.current.intensity = sceneFx.accentIntensity * 3.5;
    }
    if (backdrop.current) backdrop.current.opacity = d * 0.72;
  });
  return (
    <>
      <ambientLight ref={ambient} intensity={0.55} color="#fff1dc" />
      <directionalLight ref={key} position={[1.5, 2.5, 3]} intensity={1.7} color="#fff4e2" />
      <spotLight ref={rim} position={[-2.5, 1.5, -1.5]} angle={0.6} penumbra={0.8} intensity={14} color="#ffcf8a" />
      <pointLight ref={accent} position={[0, 0.05, 0.25]} intensity={0} distance={2.2} decay={1.5} />
      <mesh position={[0, 0, -1.4]} renderOrder={-1}>
        <planeGeometry args={[30, 30]} />
        <meshBasicMaterial ref={backdrop} color="#000000" transparent opacity={0} depthWrite={false} />
      </mesh>
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.4} position={[0, 3, 2]} scale={[6, 2, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.6} color="#ffd9a0" position={[-3, 0.5, 1.5]} scale={[1, 4, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.1} color="#b8d0ff" position={[3, 0, 1.5]} scale={[1, 4, 1]} target={[0, 0, 0]} />
        <Lightformer form="ring" intensity={0.8} position={[0, -1, 4]} scale={2} target={[0, 0, 0]} />
      </Environment>
    </>
  );
}
