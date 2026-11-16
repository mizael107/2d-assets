// Sistema de partículas determinístico (THREE.Points + shader próprio).
// A posição de cada partícula é calculada a partir do tempo t (sem estado acumulado):
// renderizar o quadro 200 dá sempre o mesmo resultado, e dá para pular para qualquer
// tempo. Presets: poeira, fumaca, chuva, neve, faiscas, brasas, letras/magia.
//
// (@tsparticles/three não existe no npm; este módulo cobre essa função dentro do Three.js.)
import * as THREE from 'three';
import { rng } from '../utils/random.js';

export const PARTICLE_PRESETS = {
  poeira: { count: 300, life: [4, 8], size: [0.012, 0.03], speed: [0.02, 0.08], gravity: 0.0, drift: 0.05, color: '#fff4dc', opacity: 0.45, additive: true, spawn: 'box' },
  fumaca: { count: 160, life: [2, 4], size: [0.4, 1.1], speed: [0.3, 0.6], gravity: -0.15, drift: 0.2, color: '#9a9a9a', opacity: 0.25, additive: false, spawn: 'point', grow: 2.2 },
  chuva: { count: 1500, life: [0.5, 0.9], size: [0.015, 0.02], speed: [0, 0], gravity: 0, fall: 9, color: '#bcd3ff', opacity: 0.55, additive: true, spawn: 'box', stretch: 6 },
  neve: { count: 900, life: [6, 10], size: [0.03, 0.06], speed: [0, 0], gravity: 0, fall: 0.6, drift: 0.25, color: '#ffffff', opacity: 0.9, additive: false, spawn: 'box' },
  faiscas: { count: 220, life: [0.4, 1.0], size: [0.02, 0.04], speed: [2, 5], gravity: 6, color: '#ffb347', opacity: 1, additive: true, spawn: 'point', burst: true, glow: 3 },
  brasas: { count: 120, life: [1.5, 3], size: [0.02, 0.05], speed: [0.3, 1.0], gravity: -0.6, drift: 0.3, color: '#ff6a1a', opacity: 0.9, additive: true, spawn: 'point', glow: 2.5 },
  magia: { count: 140, life: [2, 4], size: [0.02, 0.045], speed: [0.1, 0.4], gravity: -0.1, drift: 0.4, color: '#cdfffd', opacity: 0.85, additive: true, spawn: 'sphere', glow: 1.6 },
};

const vert = /* glsl */`
uniform float uTime; uniform float uScale; uniform float uGravity; uniform float uFall; uniform float uDrift; uniform float uGrow; uniform float uBurst; uniform float uStart;
attribute vec3 aOrigin; attribute vec3 aVel; attribute vec2 aLife; attribute float aSize; attribute float aSeed;
varying float vAlpha;
void main(){
  float t = uTime - uStart;
  float life = aLife.y;
  float age = uBurst > 0.5 ? t - aLife.x : mod(t + aLife.x, life);
  float k = age / life;
  vAlpha = (age < 0.0 || k > 1.0) ? 0.0 : smoothstep(0.0, 0.1, k) * (1.0 - smoothstep(0.7, 1.0, k));
  vec3 p = aOrigin + aVel * age;
  p.y += -0.5 * uGravity * age * age - uFall * age;
  p.x += sin(age * 1.3 + aSeed * 6.28) * uDrift; p.z += cos(age * 1.1 + aSeed * 4.0) * uDrift;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * (1.0 + uGrow * k) * uScale / -mv.z;
}`;
const frag = /* glsl */`
uniform vec3 uColor; uniform float uOpacity; uniform float uGlow; varying float vAlpha;
void main(){
  vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.0, d) * vAlpha * uOpacity;
  gl_FragColor = vec4(uColor * uGlow, a);
  #include <colorspace_fragment>
}`;

// area: { center:[x,y,z], size:[x,y,z] } para 'box'; origin para 'point'/'sphere'.
export function createParticles(preset = 'poeira', { center = [0, 1, 0], size = [6, 3, 6], origin, seed = 1, start = 0, viewportHeight = 960, ...over } = {}) {
  const P = { ...PARTICLE_PRESETS[preset], ...over };
  const r = rng(seed); const n = P.count;
  const aOrigin = new Float32Array(n * 3), aVel = new Float32Array(n * 3), aLife = new Float32Array(n * 2), aSize = new Float32Array(n), aSeed = new Float32Array(n);
  const o = origin ?? center;
  for (let i = 0; i < n; i++) {
    let x, y, z;
    if (P.spawn === 'box') { x = center[0] + r.range(-0.5, 0.5) * size[0]; y = center[1] + r.range(-0.5, 0.5) * size[1]; z = center[2] + r.range(-0.5, 0.5) * size[2]; }
    else if (P.spawn === 'sphere') { const u = r.range(-1, 1), th = r.range(0, Math.PI * 2), rad = Math.cbrt(r()) * (size[0] / 2); const s = Math.sqrt(1 - u * u); x = o[0] + rad * s * Math.cos(th); y = o[1] + rad * u; z = o[2] + rad * s * Math.sin(th); }
    else { x = o[0]; y = o[1]; z = o[2]; }
    aOrigin.set([x, y, z], i * 3);
    const sp = r.range(P.speed[0], P.speed[1]);
    const dir = P.burst ? new THREE.Vector3(r.range(-1, 1), r.range(0.2, 1.2), r.range(-1, 1)).normalize() : new THREE.Vector3(r.range(-0.3, 0.3), 1, r.range(-0.3, 0.3)).normalize();
    aVel.set([dir.x * sp, dir.y * sp, dir.z * sp], i * 3);
    const life = r.range(P.life[0], P.life[1]);
    aLife.set([P.burst ? r.range(0, 0.08) : r.range(0, life), life], i * 2);
    aSize[i] = r.range(P.size[0], P.size[1]); aSeed[i] = r();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(aOrigin.slice(), 3));
  g.setAttribute('aOrigin', new THREE.BufferAttribute(aOrigin, 3));
  g.setAttribute('aVel', new THREE.BufferAttribute(aVel, 3));
  g.setAttribute('aLife', new THREE.BufferAttribute(aLife, 2));
  g.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
  g.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uStart: { value: start }, uScale: { value: viewportHeight * 0.9 },
      uGravity: { value: P.gravity ?? 0 }, uFall: { value: P.fall ?? 0 }, uDrift: { value: P.drift ?? 0 }, uGrow: { value: P.grow ?? 0 },
      uBurst: { value: P.burst ? 1 : 0 }, uColor: { value: new THREE.Color(P.color) }, uOpacity: { value: P.opacity }, uGlow: { value: P.glow ?? 1 },
    },
    vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false,
    blending: P.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const points = new THREE.Points(g, mat); points.frustumCulled = false; points.name = `particulas_${preset}`;
  return { points, update: (t) => { mat.uniforms.uTime.value = t; }, preset: P };
}
