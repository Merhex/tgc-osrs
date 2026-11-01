import * as THREE from 'three';
import type { CardDefinition, InspectEffect } from '../data/cards';
import { ART_UV } from '../render/cardFace';

const EFFECT_INDEX: Record<InspectEffect, number> = {
  chamberGlow: 0,
  crimsonPulse: 1,
  alternatingLight: 2,
  lavaEmbers: 3,
  lavaPattern: 4,
  spectralRipple: 5,
  holoSheen: 6,
  crimsonSweep: 7,
  amberAura: 8,
  silverGoldShimmer: 9,
};

const vertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormalV = normalize(normalMatrix * normal);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D map;
  uniform float uTime;
  uniform int uEffect;
  uniform float uEffectStrength;
  uniform float uFoil;
  uniform vec3 uAccent;
  uniform vec3 uAccent2;
  uniform vec4 uArt;
  uniform float uBrightness;
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vViewDir;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float sq(float x) { return x * x; }
  vec3 hue(float h) {
    return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  }

  void main() {
    vec4 tex = texture2D(map, vUv);
    vec3 col = tex.rgb;
    vec3 n = normalize(vNormalV);
    vec3 v = normalize(vViewDir);
    // Card orientation relative to the camera (constant across the face), drives view-dependent foil.
    vec2 tilt = n.xy;

    // Art window mask and local coordinates
    vec2 a = (vUv - uArt.xy) / (uArt.zw - uArt.xy);
    float inArt = step(0.0, a.x) * step(a.x, 1.0) * step(0.0, a.y) * step(a.y, 1.0);
    float frame = 1.0 - inArt;
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    float t = uTime;
    float s = uEffectStrength;
    vec3 fx = vec3(0.0);

    if (uEffect == 0) {
      // Great Olm: restrained green chamber glow
      float d = distance(a, vec2(0.5, 0.35));
      fx += uAccent * smoothstep(0.75, 0.0, d) * (0.18 + 0.08 * sin(t * 1.3)) * (1.0 - lum * 0.6);
    } else if (uEffect == 1) {
      // Verzik: crimson pulse behind the illustration (dark background pixels)
      float pulse = pow(0.5 + 0.5 * sin(t * 2.2), 3.0);
      fx += uAccent * pow(1.0 - lum, 4.0) * (0.03 + 0.1 * pulse);
    } else if (uEffect == 2) {
      // Wardens: light travelling between the two figures
      float c = 0.5 + 0.36 * sin(t * 0.9);
      float w = exp(-sq(a.x - c) / 0.012);
      fx += mix(uAccent, uAccent2, smoothstep(0.3, 0.7, c)) * w * 0.32;
    } else if (uEffect == 3) {
      // Zuk: slow lava illumination and a few embers
      float glow = sq(1.0 - a.y) * (0.22 + 0.1 * sin(t * 0.7 + a.x * 4.0));
      fx += uAccent * glow;
      vec2 g = vec2(a.x * 9.0, a.y * 6.0 - t * 0.35);
      vec2 cell = floor(g);
      vec2 f = fract(g) - 0.5;
      float h = hash(cell);
      vec2 off = vec2(hash(cell + 3.1) - 0.5, hash(cell + 7.7) - 0.5) * 0.6;
      float ember = step(0.8, h) * smoothstep(0.08, 0.0, length(f - off));
      fx += vec3(1.0, 0.7, 0.3) * ember * (0.6 + 0.4 * sin(t * 4.0 + h * 20.0));
    } else if (uEffect == 4) {
      // Infernal cape: animated lava inside the bright orange pattern
      float hot = smoothstep(0.25, 0.55, col.r - col.b) * smoothstep(0.45, 0.8, col.r);
      float flow = noise(a * vec2(10.0, 14.0) + vec2(0.0, -t * 0.6)) * noise(a * 6.0 + t * 0.2);
      fx += uAccent2 * hot * (0.15 + 0.7 * flow);
    } else if (uEffect == 5) {
      // Elysian: soft translucent blue protective ripple
      float d = distance(a, vec2(0.5, 0.5));
      float ring = smoothstep(0.82, 1.0, sin(d * 38.0 - t * 2.4));
      fx += uAccent * ring * smoothstep(0.55, 0.05, d) * 0.28;
      fx += uAccent * 0.05;
    } else if (uEffect == 6) {
      // Twisted bow: narrow holographic sheen following the viewing angle
      float pos = (vUv.x + vUv.y) * 0.5 + tilt.x * 1.6 + tilt.y * 0.8;
      float band = exp(-sq(fract(pos * 0.9) - 0.5) / 0.0009);
      fx += mix(uAccent, uAccent2, fract(pos * 2.0)) * band * 0.55;
    } else if (uEffect == 7) {
      // Scythe: restrained crimson sweep along the blade
      float sweep = fract(t * 0.28);
      float d = (1.0 - a.x) * 0.7 + a.y * 0.6;
      float band = exp(-sq(d - sweep * 1.6 + 0.2) / 0.004);
      fx += uAccent * band * 0.6 * smoothstep(0.35, 0.75, a.y);
    } else if (uEffect == 8) {
      // Tumeken's shadow: amber light with a contrasting dark aura
      float d = distance(a, vec2(0.5, 0.62));
      fx += uAccent * smoothstep(0.6, 0.1, d) * (0.15 + 0.05 * sin(t * 1.1));
      float aura = smoothstep(0.08, 0.2, d) * smoothstep(0.32, 0.18, d);
      col = mix(col, col * vec3(0.55, 0.45, 0.75), aura * (0.35 + 0.15 * sin(t * 1.7)) * s);
    } else if (uEffect == 9) {
      // 3rd age pickaxe: elegant silver-gold shimmer
      vec2 g = a * vec2(16.0, 12.0);
      vec2 cell = floor(g);
      float h = hash(cell);
      float tw = pow(max(0.0, sin(t * 2.0 + h * 40.0)), 12.0) * step(0.86, h);
      float sparkle = tw * smoothstep(0.35, 0.0, length(fract(g) - 0.5));
      float pos = vUv.x * 0.6 + vUv.y * 0.4 + tilt.x * 1.2;
      float band = exp(-sq(fract(pos) - 0.5) / 0.01);
      fx += mix(vec3(0.85, 0.88, 0.95), uAccent, fract(pos * 3.0)) * (band * 0.25 + sparkle * 0.8);
    }

    col += fx * s * inArt;

    // Legendary holofoil on the frame, responding to the viewing angle
    if (uFoil > 0.0) {
      float h = fract(vUv.x * 1.3 + vUv.y * 0.7 + tilt.x * 2.2 - tilt.y * 1.4);
      vec3 holo = mix(hue(h), mix(uAccent, uAccent2, h), 0.55);
      // keep the foil on the metal frame, off the name plate and text panels
      float panels = step(0.05, vUv.x) * step(vUv.x, 0.95) * (step(0.09, vUv.y) * step(vUv.y, 0.415) + step(0.888, vUv.y) * step(vUv.y, 0.97));
      float mask = frame * (1.0 - panels) * (0.4 + 0.6 * lum);
      col += holo * mask * 0.22 * uFoil;
      col += holo * frame * panels * 0.03 * uFoil;
    }

    // Soft specular sheen for all cards
    float spec = pow(max(0.0, dot(normalize(v + vec3(0.3, 0.5, 0.6)), n)), 24.0);
    col += vec3(1.0, 0.97, 0.9) * spec * (0.12 + 0.18 * uFoil);

    gl_FragColor = vec4(col * uBrightness, tex.a);
    #include <colorspace_fragment>
  }
`;

export interface CardMaterialUniforms {
  [key: string]: THREE.IUniform;
  map: THREE.IUniform<THREE.Texture | null>;
  uTime: THREE.IUniform<number>;
  uEffect: THREE.IUniform<number>;
  uEffectStrength: THREE.IUniform<number>;
  uFoil: THREE.IUniform<number>;
  uAccent: THREE.IUniform<THREE.Color>;
  uAccent2: THREE.IUniform<THREE.Color>;
  uArt: THREE.IUniform<THREE.Vector4>;
  uBrightness: THREE.IUniform<number>;
}

export function createCardFaceMaterial(card: CardDefinition, map: THREE.Texture): THREE.ShaderMaterial & { uniforms: CardMaterialUniforms } {
  const uniforms: CardMaterialUniforms = {
    map: { value: map },
    uTime: { value: 0 },
    uEffect: { value: EFFECT_INDEX[card.effect] },
    uEffectStrength: { value: 1 },
    uFoil: { value: card.rarity === 'Legendary' ? 1 : card.rarity === 'Epic' ? 0.25 : 0 },
    uAccent: { value: new THREE.Color(card.frame.accent) },
    uAccent2: { value: new THREE.Color(card.frame.accent2) },
    uArt: { value: new THREE.Vector4(ART_UV.x0, ART_UV.y0, ART_UV.x1, ART_UV.y1) },
    uBrightness: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: vertex, fragmentShader: fragment, transparent: false });
  return mat as THREE.ShaderMaterial & { uniforms: CardMaterialUniforms };
}
