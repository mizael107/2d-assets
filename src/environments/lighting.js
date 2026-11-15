// Presets de iluminação cinematográfica: luz principal forte e direcional, preenchimento
// de cor oposta e luz de contorno. Valores pensados para o tone mapping ACES.
import * as THREE from 'three';

export const LIGHTING_PRESETS = {
  // Pôr do sol: sol baixo dourado, preenchimento roxo do céu, sombras longas.
  porDoSol: { key: { color: '#ffb070', intensity: 3.2, pos: [-8, 4, -6] }, fill: { sky: '#6a4a9a', ground: '#4a3020', intensity: 0.9 }, rim: { color: '#ff9a50', intensity: 1.5, pos: [6, 3, -8] }, exposure: 1.0 },
  dia: { key: { color: '#fff4e0', intensity: 3.0, pos: [6, 12, 4] }, fill: { sky: '#bcd8ff', ground: '#806a50', intensity: 1.1 }, exposure: 1.0 },
  noite: { key: { color: '#9ab4ff', intensity: 1.2, pos: [-4, 10, -6] }, fill: { sky: '#1a2240', ground: '#0a0a12', intensity: 0.5 }, rim: { color: '#6a8aff', intensity: 1.0, pos: [5, 4, -5] }, exposure: 1.1 },
  interiorQuente: { key: { color: '#ffb060', intensity: 2.6, pos: [3, 4, 2] }, fill: { sky: '#6a7a8a', ground: '#3a2a1a', intensity: 0.6 }, exposure: 1.0 },
  laboratorio: { key: { color: '#9ac4ff', intensity: 2.0, pos: [2, 5, 3] }, fill: { sky: '#1a2a3a', ground: '#081724', intensity: 0.5 }, exposure: 0.95 },
};

// keyPos troca a direção da luz principal (ex.: trazer o sol para a frente do rosto).
export function applyLighting(scene, preset = 'porDoSol', { shadowSize = 12, shadowRes = 2048, target = [0, 0, 0], keyPos, keyIntensity } = {}) {
  const base = typeof preset === 'string' ? LIGHTING_PRESETS[preset] : preset;
  const P = { ...base, key: { ...base.key, ...(keyPos ? { pos: keyPos } : {}), ...(keyIntensity ? { intensity: keyIntensity } : {}) } };
  const group = new THREE.Group(); group.name = 'iluminacao';
  const key = new THREE.DirectionalLight(P.key.color, P.key.intensity);
  key.position.set(...P.key.pos); key.target.position.set(...target);
  key.castShadow = true; key.shadow.mapSize.set(shadowRes, shadowRes);
  const c = key.shadow.camera; c.left = c.bottom = -shadowSize; c.right = c.top = shadowSize; c.near = 0.5; c.far = 60;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 3;
  group.add(key, key.target);
  const fill = new THREE.HemisphereLight(P.fill.sky, P.fill.ground, P.fill.intensity); group.add(fill);
  let rim = null;
  if (P.rim) { rim = new THREE.DirectionalLight(P.rim.color, P.rim.intensity); rim.position.set(...P.rim.pos); group.add(rim); }
  scene.add(group);
  return { group, key, fill, rim, exposure: P.exposure };
}

// Luz pontual que pisca como fogo/vela (determinística no tempo t).
export function flicker(light, t, base = light.userData.base ?? (light.userData.base = light.intensity), amount = 0.25) {
  light.intensity = base * (1 + amount * (Math.sin(t * 17.3) * 0.5 + Math.sin(t * 7.1 + 1.7) * 0.3 + Math.sin(t * 29.7) * 0.2));
}
