import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { getCard } from '../data/cards';
import type { OpeningRecord } from '../persistence/repository';
import { cardBackTexture, cardFaceTexture } from '../render/textureStore';
import { CardMesh, makeCardFx, type CardFx } from './CardMesh';
import { applyPose, pileCardPose, readPose, revealLayout, stackCardPose, type Pose } from './layout';
import { sceneFx } from './sceneFx';

type Mode = 'stack' | 'center' | 'pile' | 'tween';

export type RevealSound = 'flip' | 'whoosh' | 'anticipation' | 'legendary';

interface Props {
  opening: OpeningRecord;
  phase: 'opening' | 'revealing';
  revealIndex: number;
  reducedMotion: boolean;
  onCardShown: () => void;
  onAdvance: () => void;
  onSound?: (s: RevealSound) => void;
}

export function RevealCards({ opening, phase, revealIndex, reducedMotion, onCardShown, onAdvance, onSound }: Props) {
  const viewport = useThree((s) => s.viewport);
  const layout = useMemo(() => revealLayout(viewport), [viewport.width, viewport.height]); // eslint-disable-line react-hooks/exhaustive-deps
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const [back, setBack] = useState<THREE.Texture | null>(null);
  const [faces, setFaces] = useState<Record<string, THREE.Texture>>({});
  useEffect(() => {
    let alive = true;
    cardBackTexture().then((t) => alive && setBack(t));
    Promise.all(opening.cards.map((c) => cardFaceTexture(c.cardId).then((t) => [c.cardId, t] as const))).then(
      (entries) => alive && setFaces(Object.fromEntries(entries)),
    );
    return () => {
      alive = false;
    };
  }, [opening]);

  const groups = useRef<(THREE.Group | null)[]>([]);
  const modes = useRef<Mode[]>(opening.cards.map(() => 'stack'));
  const tweenPoses = useRef<Pose[]>(opening.cards.map(() => ({ x: 0, y: 0, z: 0, rx: 0, ry: Math.PI, rz: 0, s: 1 })));
  const fxs = useMemo<CardFx[]>(
    () =>
      opening.cards.map((c) => {
        const f = makeCardFx(getCard(c.cardId).frame.accent);
        f.strength = 0.25;
        return f;
      }),
    [opening],
  );
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const lastKey = useRef<string>('');
  const animToken = useRef(0);
  const pointer = useThree((s) => s.pointer);
  const cbs = useRef({ onCardShown, onSound });
  cbs.current = { onCardShown, onSound };
  const ready = !!back && Object.keys(faces).length > 0;

  // Run the transition whenever the face-up card changes.
  useEffect(() => {
    if (phase !== 'revealing' || !ready) return;
    const key = `${opening.id}:${revealIndex}`;
    if (lastKey.current === key) return;
    const first = lastKey.current === '';
    lastKey.current = key;
    // Finish any running transition without letting it report completion for the new card.
    const token = ++animToken.current;
    timeline.current?.progress(1).kill();

    const L = layoutRef.current;
    const r = revealIndex;
    const tl = gsap.timeline({
      onComplete: () => {
        modes.current[r] = 'center';
        if (token !== animToken.current) return;
        timeline.current = null;
        cbs.current.onCardShown();
      },
    });
    timeline.current = tl;
    const speed = reducedMotion ? 0.3 : 1;

    // Everything already revealed goes (or stays) on the pile.
    for (let k = 0; k < r; k++) {
      const wasCenter = modes.current[k] === 'center' && k === r - 1 && !first;
      if (!wasCenter) {
        modes.current[k] = 'pile';
        fxs[k].glow = 0;
        fxs[k].foilBoost = 0;
        fxs[k].strength = 0.25;
        continue;
      }
      const g = groups.current[k];
      if (!g) continue;
      const p = tweenPoses.current[k];
      Object.assign(p, readPose(g));
      modes.current[k] = 'tween';
      const target = pileCardPose(L.pile, k);
      tl.to(p, { x: target.x, y: target.y, z: target.z, s: target.s, rz: target.rz, rx: 0, ry: 0, duration: 0.45 * speed, ease: 'power2.inOut', onComplete: () => void (modes.current[k] = 'pile') }, 0);
      tl.to(fxs[k], { glow: 0, foilBoost: 0, strength: 0.25, duration: 0.4 * speed }, 0);
      tl.call(() => cbs.current.onSound?.('whoosh'), [], 0);
    }
    tl.to(sceneFx, { dim: 0, accentIntensity: 0, duration: 0.4 * speed }, 0);

    const g = groups.current[r];
    if (!g) return;
    const card = getCard(opening.cards[r].cardId);
    const p = tweenPoses.current[r];
    Object.assign(p, stackCardPose(L.stack, r));
    modes.current[r] = 'tween';
    const c = L.center;
    const start = r > 0 && !first ? 0.25 * speed : 0.05;

    if (card.rarity === 'Legendary') {
      const fx = fxs[r];
      tl.call(() => void sceneFx.accent.set(card.frame.accent), [], start);
      if (!reducedMotion) {
        tl.to(sceneFx, { dim: 1, duration: 0.5, ease: 'power1.inOut' }, start);
        tl.to(p, { x: c.x, y: c.y, z: c.z + 0.12, s: c.s, rz: 0, duration: 0.65, ease: 'power3.out' }, start + 0.2);
        tl.call(() => cbs.current.onSound?.('anticipation'), [], start + 0.8);
        tl.to(fx, { glow: 1, duration: 0.9, ease: 'power1.in' }, start + 0.8);
        tl.to(sceneFx, { accentIntensity: 1, duration: 0.9 }, start + 0.8);
        tl.to(p, { keyframes: { rz: [0.025, -0.03, 0.02, -0.015, 0.008, 0] }, duration: 0.9, ease: 'none' }, start + 0.8);
        tl.call(() => cbs.current.onSound?.('legendary'), [], start + 1.8);
        tl.to(p, { ry: 0, duration: 1.35, ease: 'power2.inOut' }, start + 1.75);
        tl.to(p, { keyframes: { z: [c.z + 0.2, c.z] }, duration: 1.35, ease: 'power1.inOut' }, start + 1.75);
        tl.to(fx, { foilBoost: 1, strength: 1, duration: 0.8 }, start + 2.5);
        tl.to(sceneFx, { dim: 0.45, duration: 0.7 }, start + 3.0);
        tl.to(fx, { glow: 0.55, duration: 0.7 }, start + 3.0);
      } else {
        tl.to(sceneFx, { dim: 0.5, accentIntensity: 0.8, duration: 0.3 }, start);
        tl.to(p, { x: c.x, y: c.y, z: c.z, s: c.s, rz: 0, ry: 0, duration: 0.35 }, start);
        tl.to(fx, { glow: 0.6, foilBoost: 1, strength: 0.6, duration: 0.3 }, start);
        tl.call(() => cbs.current.onSound?.('legendary'), [], start);
      }
    } else {
      tl.call(() => cbs.current.onSound?.('flip'), [], start);
      tl.to(p, { x: c.x, y: c.y, z: c.z, s: c.s, rz: 0, duration: 0.6 * speed, ease: 'power3.out' }, start);
      tl.to(p, { ry: 0, duration: 0.6 * speed, ease: 'power2.inOut' }, start + 0.06 * speed);
      if (!reducedMotion) tl.to(p, { keyframes: { rx: [-0.25, 0] }, duration: 0.6, ease: 'sine.inOut' }, start);
      tl.to(fxs[r], { strength: 1, duration: 0.5 }, start + 0.4 * speed);
    }
  }, [phase, revealIndex, ready, opening, reducedMotion, fxs]);

  useEffect(
    () => () => {
      timeline.current?.kill();
      sceneFx.dim = 0;
      sceneFx.accentIntensity = 0;
    },
    [],
  );

  const scratch = useMemo<Pose>(() => ({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 }), []);
  useFrame((state) => {
    const L = layoutRef.current;
    const t = state.clock.elapsedTime;
    const stackBase = phase === 'opening' ? sceneFx.stackAnchor : L.stack;
    for (let k = 0; k < opening.cards.length; k++) {
      const g = groups.current[k];
      if (!g) continue;
      const mode = modes.current[k];
      if (mode === 'stack') applyPose(g, stackCardPose(stackBase, k));
      else if (mode === 'pile') applyPose(g, pileCardPose(L.pile, k));
      else if (mode === 'tween') applyPose(g, tweenPoses.current[k]);
      else {
        // Face-up card: gentle hover plus a tilt that follows the pointer for the foil response.
        const c = L.center;
        scratch.x = c.x;
        scratch.y = c.y + (reducedMotion ? 0 : Math.sin(t * 1.4) * 0.006);
        scratch.z = c.z;
        scratch.s = c.s;
        scratch.rz = 0;
        const g0 = g.rotation;
        const k2 = reducedMotion ? 1 : 0.08;
        scratch.rx = g0.x + (-pointer.y * 0.18 - g0.x) * k2;
        scratch.ry = g0.y + (pointer.x * 0.28 - g0.y) * k2;
        applyPose(g, scratch);
      }
    }
  });

  if (!back) return null;
  return (
    <group>
      {opening.cards.map((c, k) => (
        <CardMesh
          key={c.instanceId}
          ref={(el) => {
            groups.current[k] = el;
          }}
          cardId={c.cardId}
          face={faces[c.cardId] ?? null}
          back={back}
          fx={fxs[k]}
          name={`card-${k}`}
          onClick={(e) => {
            if (modes.current[k] === 'center') {
              e.stopPropagation();
              onAdvance();
            }
          }}
        />
      ))}
    </group>
  );
}
