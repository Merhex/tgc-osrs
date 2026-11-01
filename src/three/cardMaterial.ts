import * as THREE from 'three';
import type { CardDefinition, FinishPattern, InspectEffect, Rarity } from '../data/cards';
import { ART_UV } from '../render/cardFace';
import { FINISHES, tuning } from './tuning';

/**
 * Physical card face material.
 *
 * One surface, several layers resolved in the shader (no coplanar meshes):
 *   print (frame, text, subject) · holographic artwork background (parallax) ·
 *   selective foil (frame, background, subject accents) · clearcoat lamination.
 * Built on MeshPhysicalMaterial so reflections come from the studio environment map
 * and lights; per-region roughness/metalness, thin-film iridescence and a
 * lighting-driven holographic term make the response change with viewing angle.
 */

const PATTERN_INDEX: Record<FinishPattern, number> = {
  crystalFacets: 0,
  web: 1,
  sandstoneGeometry: 2,
  volcanic: 3,
  interference: 4,
  organicGrain: 5,
  darkMetal: 6,
  solarRadial: 7,
  prismatic: 8,
};

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

const VERTEX_PARS = /* glsl */ `
varying vec3 vObjView;
varying vec2 vCardUv;
varying vec3 vTanX;
varying vec3 vTanY;
`;

const VERTEX_MAIN = /* glsl */ `
#include <worldpos_vertex>
vCardUv = uv;
vec3 camObj = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
vObjView = camObj - transformed;
vTanX = normalize(normalMatrix * vec3(1.0, 0.0, 0.0));
vTanY = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));
`;

const FRAGMENT_PARS = /* glsl */ `
#include <common>
uniform sampler2D uBg;
uniform sampler2D uMask;
uniform vec4 uArt;
uniform int uPattern;
uniform int uEffect;
uniform vec3 uHoloA;
uniform vec3 uHoloB;
uniform vec3 uAccent;
uniform vec3 uAccent2;
uniform float uSpectral;
uniform float uBgHolo;
uniform float uBgMetal;
uniform float uRelief;
uniform float uFrameMetal;
uniform float uFrameRough;
uniform float uFrameHolo;
uniform float uSubjectFoil;
uniform float uDepth;
uniform float uLayered;
uniform float uIrid;
uniform float uHolo;
uniform float uFoilScale;
uniform float uRoughScale;
uniform float uTime;
uniform float uEffectStrength;
varying vec3 vObjView;
varying vec2 vCardUv;
varying vec3 vTanX;
varying vec3 vTanY;

float gFrame; float gText; float gSubj; float gAcc; float gBg; float gInArt; float gLum;
vec3 gPat; vec2 gA;

float h1(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec2 h2(vec2 p) { p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h1(i), h1(i + vec2(1.0, 0.0)), f.x), mix(h1(i + vec2(0.0, 1.0)), h1(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.03 + 1.7; a *= 0.5; } return v; }
// x = F1, y = F2, z = cell hash
vec3 voronoi(vec2 p) {
  vec2 n = floor(p); vec2 f = fract(p);
  float F1 = 8.0; float F2 = 8.0; vec2 id = n;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 r = g + h2(n + g) - f;
    float d = dot(r, r);
    if (d < F1) { F2 = F1; F1 = d; id = n + g; } else if (d < F2) { F2 = d; }
  }
  return vec3(sqrt(F1), sqrt(F2), h1(id));
}

// Height fields for the finite-difference patterns (p: art-window units, x 0..1.36, y 0..1)
float patH(int k, vec2 p) {
  if (k == 1) { // fine web
    vec2 d = p - vec2(0.68, 0.98);
    float r = length(d); float ang = atan(d.y, d.x);
    float spoke = 1.0 - smoothstep(0.0, 0.012, abs(sin(ang * 9.0)) * r);
    float ring = 1.0 - smoothstep(0.0, 0.05, abs(fract(r * 11.0 + 0.06 * sin(ang * 18.0)) - 0.5));
    return max(spoke, ring * 0.85) * 0.8 + vnoise(p * 60.0) * 0.2;
  }
  if (k == 2) { // stepped sandstone geometry
    vec2 q = p * 5.0; q.x += step(1.0, mod(floor(q.y), 2.0)) * 0.5;
    vec2 d = abs(fract(q) - 0.5);
    return floor(max(d.x, d.y) * 7.0) / 7.0 * 0.85 + vnoise(p * 40.0) * 0.15;
  }
  if (k == 3) { // volcanic cracks
    vec3 v = voronoi(p * 4.2 + fbm(p * 3.0) * 0.7);
    float crack = 1.0 - smoothstep(0.0, 0.09, v.y - v.x);
    return crack * 0.7 + fbm(p * 7.0) * 0.3;
  }
  if (k == 4) { // spectral interference
    float d1 = length(p - vec2(0.45, 0.55)); float d2 = length(p - vec2(0.92, 0.45));
    return 0.5 + 0.25 * (sin(d1 * 62.0) + sin(d2 * 62.0));
  }
  if (k == 5) { // organic grain
    float w = fbm(p * vec2(1.6, 4.0)) * 5.0;
    return 0.5 + 0.5 * sin(p.y * 16.0 + p.x * 3.0 + w);
  }
  if (k == 6) { // dark brushed metal with diagonal streaks
    vec2 q = vec2(p.x * 0.8 + p.y * 0.6, p.x * 0.6 - p.y * 0.8);
    return vnoise(vec2(q.x * 3.0, q.y * 60.0)) * 0.45 + fbm(p * 3.0) * 0.55;
  }
  if (k == 7) { // radial solar motif
    vec2 d = p - vec2(0.68, 0.66);
    float r = length(d); float ang = atan(d.y, d.x);
    return mix(0.5 + 0.5 * cos(ang * 20.0), 0.5 + 0.5 * cos(r * 30.0), 0.35);
  }
  return 0.5;
}

// Returns (height, gradient.x, gradient.y); gradient ~unit scale.
vec3 foil(int k, vec2 p) {
  if (k == 0) { // crystalline facets: each cell is a flat facet with its own tilt
    vec3 v = voronoi(p * 5.5);
    float edge = smoothstep(0.0, 0.05, v.y - v.x);
    vec2 g = (h2(vec2(v.z * 91.7, v.z * 13.3)) - 0.5) * 1.6;
    return vec3(v.z * edge, g * edge);
  }
  if (k == 8) { // restrained prismatic triangles
    vec2 q = p * 9.0;
    vec2 s = vec2(q.x + q.y * 0.57735, q.y * 1.1547);
    vec2 c = floor(s); vec2 f = fract(s);
    float tri = step(1.0, f.x + f.y);
    vec2 id = c * 2.0 + tri;
    vec2 g = (h2(id) - 0.5) * 0.9;
    return vec3(h1(id), g);
  }
  float e = 0.004;
  float h = patH(k, p);
  float hx = patH(k, p + vec2(e, 0.0));
  float hy = patH(k, p + vec2(0.0, e));
  vec2 g = vec2(hx - h, hy - h) / e * 0.02;
  float l = length(g);
  if (l > 1.0) g /= l;
  return vec3(h, g);
}
`;

const MAP_FRAGMENT = /* glsl */ `
vec2 cuv = vCardUv;
vec4 mk = texture2D(uMask, cuv);
gFrame = mk.r;
gText = mk.g;
gSubj = smoothstep(0.08, 0.42, mk.b);
gAcc = clamp((mk.b - 0.5) * 2.0, 0.0, 1.0);
gA = (cuv - uArt.xy) / (uArt.zw - uArt.xy);
gInArt = step(0.0, gA.x) * step(gA.x, 1.0) * step(0.0, gA.y) * step(gA.y, 1.0);
// Background sits slightly behind the printed subject: parallax from the camera direction in card space.
vec3 ov = normalize(vObjView);
vec2 par = ov.xy / max(ov.z, 0.35);
vec2 bgUv = (gA - 0.5) * 0.93 + 0.5 - par * uDepth;
vec4 bgC = texture2D(uBg, clamp(bgUv, 0.0, 1.0));
vec4 pr = texture2D(map, vMapUv);
gBg = gInArt * (1.0 - pr.a);
vec2 pp = vec2(gA.x * 1.3617, gA.y) * uFoilScale;
gPat = foil(uPattern, pp);
if (uLayered > 0.0) {
  vec3 p2 = foil(uPattern, pp * 2.37 + 4.1);
  gPat = mix(gPat, p2, 0.35 * uLayered);
}
// Soft contact shadow of the subject on the background for depth separation.
float shadowS = smoothstep(0.08, 0.42, texture2D(uMask, cuv + vec2(0.006, -0.009)).b);
vec3 bgCol = bgC.rgb * (1.0 - 0.35 * shadowS * uDepth * 30.0);
vec3 base = mix(bgCol, pr.rgb, pr.a);
gLum = dot(base, vec3(0.2126, 0.7152, 0.0722));
diffuseColor *= vec4(base, 1.0);
`;

const MATERIAL_FRAGMENT = /* glsl */ `
#include <metalnessmap_fragment>
float grain = h1(floor(cuv * 900.0));
float rf = mix(0.42, uFrameRough, gFrame);
rf = mix(rf, 0.3 - 0.08 * gPat.x, gBg);
rf = mix(rf, 0.55, gText);
roughnessFactor = clamp((rf + (grain - 0.5) * 0.05) * uRoughScale, 0.05, 1.0);
float accentFoil = gAcc * gSubj * gInArt * uSubjectFoil;
float mBg = gBg * uBgMetal * (0.55 + 0.45 * gPat.x);
metalnessFactor = max(max(gFrame * uFrameMetal, mBg), accentFoil * 0.85);
`;

const NORMAL_FRAGMENT = /* glsl */ `
#include <normal_fragment_maps>
{
  vec2 gr = gPat.yz * uRelief * (gBg + gFrame * 0.25 + gAcc * gSubj * gInArt * 0.5);
  vec2 micro = vec2(vnoise(cuv * 140.0), vnoise(cuv * 140.0 + 7.3)) - 0.5;
  gr += micro * 0.025 * (1.0 - gText);
  normal = normalize(normal + vTanX * gr.x * 0.35 + vTanY * gr.y * 0.35);
}
`;

const CLEARCOAT_FRAGMENT = /* glsl */ `
#include <clearcoat_normal_fragment_maps>
#ifdef USE_CLEARCOAT
{
  // Lamination is smooth but not perfectly flat: a gentle low-frequency waviness.
  vec2 wv = vec2(vnoise(cuv * vec2(5.0, 7.0)), vnoise(cuv * vec2(6.0, 4.0) + 3.1)) - 0.5;
  clearcoatNormal = normalize(clearcoatNormal + (vTanX * wv.x + vTanY * wv.y) * 0.03);
}
#endif
`;

const IRIDESCENCE_FRAGMENT = /* glsl */ `
#include <lights_physical_fragment>
#ifdef USE_IRIDESCENCE
material.iridescence = uIrid * clamp(gBg * (0.55 + 0.45 * gPat.x) + gFrame * uFrameHolo + gAcc * gSubj * gInArt * uSubjectFoil, 0.0, 1.0);
material.iridescenceThickness = mix(260.0, 720.0, gPat.x);
#endif
`;

const HOLO_FRAGMENT = /* glsl */ `
#include <transmission_fragment>
{
  vec3 V = normalize(vViewPosition);
  vec3 Rv = reflect(-V, normal);
  // Brightness of what the surface currently reflects: holo colour comes from the lighting.
  float spec = min(1.4, dot(reflectedLight.directSpecular + reflectedLight.indirectSpecular, vec3(0.2126, 0.7152, 0.0722)));
  float t = dot(Rv.xy, vec2(1.45, 1.0)) + gPat.x * 0.55 + dot(gA, vec2(0.16, 0.1));
  vec3 spectral = 0.5 + 0.5 * cos(6.2832 * (t + vec3(0.0, 0.33, 0.67)));
  vec3 duo = mix(uHoloA, uHoloB, 0.5 + 0.5 * sin(6.2832 * t));
  vec3 holo = mix(duo, spectral, clamp(uSpectral, 0.0, 1.0));
  // printed ink sits on top of the foil: dark ink knocks the foil back, light ink lets it through
  float ink = 0.5 + 0.5 * smoothstep(0.02, 0.45, gLum);
  float region = gBg * uBgHolo * ink * (0.5 + 0.5 * gPat.x) + gFrame * uFrameHolo * 0.6 + gAcc * gSubj * gInArt * uSubjectFoil * 0.7;
  float facing = clamp(dot(normal, V), 0.0, 1.0);
  // a soft view-dependent lobe keeps the foil alive between highlights; spec adds the bright travelling flashes
  float lobe = pow(clamp(dot(Rv, normalize(vec3(-0.25, 0.35, 1.0))), 0.0, 1.0), 6.0);
  totalSpecular += holo * region * uHolo * (0.05 + 0.18 * lobe + 1.0 * spec) * (0.75 + 0.25 * facing);

  // Restrained subject-specific light inside the artwork (no rainbow sweeps).
  vec3 fx = vec3(0.0);
  float tt = uTime;
  vec2 a = gA;
  if (uEffect == 0) {
    fx += uAccent * smoothstep(0.75, 0.0, distance(a, vec2(0.5, 0.35))) * (0.1 + 0.04 * sin(tt * 1.3));
  } else if (uEffect == 1) {
    fx += uAccent * pow(1.0 - gLum, 4.0) * (0.02 + 0.06 * pow(0.5 + 0.5 * sin(tt * 2.2), 3.0));
  } else if (uEffect == 2) {
    float c = 0.5 + 0.36 * sin(tt * 0.9);
    fx += mix(uAccent, uAccent2, smoothstep(0.3, 0.7, c)) * exp(-(a.x - c) * (a.x - c) / 0.012) * 0.16;
  } else if (uEffect == 3) {
    fx += uAccent * (1.0 - a.y) * (1.0 - a.y) * (0.12 + 0.05 * sin(tt * 0.7 + a.x * 4.0));
  } else if (uEffect == 4) {
    float hot = smoothstep(0.25, 0.55, base.r - base.b) * smoothstep(0.35, 0.7, base.r);
    fx += uAccent2 * hot * (0.08 + 0.35 * vnoise(a * vec2(10.0, 14.0) + vec2(0.0, -tt * 0.6)));
  } else if (uEffect == 5) {
    float d = distance(a, vec2(0.5));
    fx += uAccent * smoothstep(0.82, 1.0, sin(d * 38.0 - tt * 2.0)) * (1.0 - smoothstep(0.05, 0.55, d)) * 0.12;
  } else if (uEffect == 7) {
    float sweep = fract(tt * 0.22);
    float d = (1.0 - a.x) * 0.7 + a.y * 0.6 - sweep * 1.6 + 0.2;
    fx += uAccent * exp(-d * d / 0.004) * 0.3 * smoothstep(0.35, 0.75, a.y);
  } else if (uEffect == 8) {
    fx += uAccent * (1.0 - smoothstep(0.1, 0.6, distance(a, vec2(0.5, 0.62)))) * (0.08 + 0.03 * sin(tt * 1.1));
  } else if (uEffect == 9) {
    vec2 g = a * vec2(16.0, 12.0);
    float hh = h1(floor(g));
    float tw = pow(max(0.0, sin(tt * 1.5 + hh * 40.0)), 12.0) * step(0.88, hh);
    fx += vec3(1.0, 0.95, 0.85) * tw * (1.0 - smoothstep(0.0, 0.35, length(fract(g) - 0.5))) * 0.5;
  }
  totalEmissiveRadiance += fx * gInArt * (1.0 - gText) * uEffectStrength;
}
`;

export interface CardFaceTextures {
  print: THREE.Texture;
  background: THREE.Texture;
  mask: THREE.Texture;
}

export type CardFaceMaterial = THREE.MeshPhysicalMaterial & { userData: { uniforms: Record<string, THREE.IUniform> } };

function color(hex: string) {
  return new THREE.Color(hex);
}

export function createCardFaceMaterial(card: CardDefinition, tex: CardFaceTextures): CardFaceMaterial {
  const uniforms: Record<string, THREE.IUniform> = {
    uBg: { value: tex.background },
    uMask: { value: tex.mask },
    uArt: { value: new THREE.Vector4(ART_UV.x0, ART_UV.y0, ART_UV.x1, ART_UV.y1) },
    uPattern: { value: PATTERN_INDEX[card.finish.pattern] },
    uEffect: { value: EFFECT_INDEX[card.effect] },
    uHoloA: { value: color(card.finish.holoA) },
    uHoloB: { value: color(card.finish.holoB) },
    uAccent: { value: color(card.frame.accent) },
    uAccent2: { value: color(card.frame.accent2) },
    uSpectral: { value: card.finish.spectral },
    uBgHolo: { value: 0 },
    uBgMetal: { value: 0 },
    uRelief: { value: 0 },
    uFrameMetal: { value: 0 },
    uFrameRough: { value: 0.3 },
    uFrameHolo: { value: 0 },
    uSubjectFoil: { value: 0 },
    uDepth: { value: 0 },
    uLayered: { value: 0 },
    uIrid: { value: 0 },
    uHolo: { value: 1 },
    uFoilScale: { value: 1 },
    uRoughScale: { value: 1 },
    uTime: { value: 0 },
    uEffectStrength: { value: 1 },
  };
  const mat = new THREE.MeshPhysicalMaterial({
    map: tex.print,
    roughness: 0.4,
    metalness: 0,
    clearcoat: tuning.clearcoat,
    clearcoatRoughness: 0.1,
    iridescence: 1,
    iridescenceIOR: 1.5,
    iridescenceThicknessRange: [260, 720],
    specularIntensity: 1,
  }) as CardFaceMaterial;
  mat.userData.uniforms = uniforms;
  mat.customProgramCacheKey = () => 'card-face-foil-v2';
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_PARS}`)
      .replace('#include <worldpos_vertex>', VERTEX_MAIN);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', FRAGMENT_PARS)
      .replace('#include <map_fragment>', MAP_FRAGMENT)
      .replace('#include <metalnessmap_fragment>', MATERIAL_FRAGMENT)
      .replace('#include <normal_fragment_maps>', NORMAL_FRAGMENT)
      .replace('#include <clearcoat_normal_fragment_maps>', CLEARCOAT_FRAGMENT)
      .replace('#include <lights_physical_fragment>', IRIDESCENCE_FRAGMENT)
      .replace('#include <transmission_fragment>', HOLO_FRAGMENT);
  };
  applyFinish(mat, card, 0, { strength: 1, foilBoost: 0 });
  return mat;
}

/** Updates uniforms from the rarity finish, the live tuning and per-card cosmetic state. */
export function applyFinish(mat: CardFaceMaterial, card: CardDefinition, time: number, fx: { strength: number; foilBoost: number }) {
  const rarity: Rarity = tuning.rarityOverride ?? card.rarity;
  const f = FINISHES[rarity];
  const u = mat.userData.uniforms;
  const boost = 1 + fx.foilBoost * 0.1;
  u.uBgHolo.value = f.bgHolo * boost;
  u.uBgMetal.value = f.bgMetal;
  u.uRelief.value = f.relief;
  u.uFrameMetal.value = f.frameMetal;
  u.uFrameRough.value = f.frameRough;
  u.uFrameHolo.value = f.frameHolo * boost;
  u.uSubjectFoil.value = f.subjectFoil;
  u.uDepth.value = f.depth;
  u.uLayered.value = f.layered;
  u.uIrid.value = f.iridescence;
  u.uSpectral.value = Math.min(1, card.finish.spectral + f.spectralBoost);
  u.uHolo.value = tuning.holo;
  u.uFoilScale.value = tuning.foilScale;
  u.uRoughScale.value = tuning.roughness;
  u.uTime.value = time;
  u.uEffectStrength.value = fx.strength;
  mat.clearcoat = tuning.clearcoat;
}

/** Card edge: card stock for Rare, silver for Epic, gilded for Legendary. */
export function edgeMaterialParams(rarity: Rarity): THREE.MeshPhysicalMaterialParameters {
  if (rarity === 'Legendary') return { color: '#d9b04a', metalness: 1, roughness: 0.28 };
  if (rarity === 'Epic') return { color: '#c3c8d0', metalness: 0.9, roughness: 0.32 };
  return { color: '#ebe3cf', metalness: 0, roughness: 0.7 };
}

let backMaterial: THREE.MeshPhysicalMaterial | null = null;
/** One shared, glossy card back material. */
export function sharedBackMaterial(map: THREE.Texture): THREE.MeshPhysicalMaterial {
  if (!backMaterial || backMaterial.map !== map) {
    backMaterial = new THREE.MeshPhysicalMaterial({ map, roughness: 0.42, metalness: 0.08, clearcoat: 0.5, clearcoatRoughness: 0.12 });
  }
  return backMaterial;
}
