// Blocos de cenário reutilizáveis: chão, céu em degradê, névoa, objetos simples.
import * as THREE from 'three';
import { rng } from '../utils/random.js';

export function createGround({ size = 60, color = '#8a6a40', roughness = 0.95, segments = 1, name = 'chao' } = {}) {
  const g = new THREE.PlaneGeometry(size, size, segments, segments); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness }));
  m.receiveShadow = true; m.name = name;
  return m;
}

// Céu em degradê (esfera invertida com shader), como os pores do sol da referência.
export function createSky({ top = '#4a3a7a', horizon = '#f0a060', bottom = '#2a2030', radius = 120 } = {}) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, horizon: { value: new THREE.Color(horizon) }, bottom: { value: new THREE.Color(bottom) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; varying vec3 vP;
      void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(horizon, top, pow(h, 0.6)) : mix(horizon, bottom, pow(-h, 0.5));
      gl_FragColor = vec4(c, 1.0);
      #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), mat); sky.name = 'ceu';
  // O céu acompanha a câmera e encolhe para caber no alcance dela (camera.far):
  // sem isso, uma câmera com far menor que o raio corta o céu e o fundo fica preto.
  sky.frustumCulled = false; sky.renderOrder = -1;
  sky.onBeforeRender = (_r, _s, cam) => {
    sky.position.copy(cam.position); sky.scale.setScalar(Math.min(1, (cam.far * 0.9) / radius)); sky.updateMatrixWorld(true);
  };
  return sky;
}

export function addFog(scene, { color = '#c08a70', near = 15, far = 80, density } = {}) {
  scene.fog = density ? new THREE.FogExp2(color, density) : new THREE.Fog(color, near, far);
  return scene.fog;
}

// Árvores "bolha" low-poly espalhadas (com semente).
export function scatterTrees(scene, { count = 12, radius = [10, 25], seed = 3, color = '#2f4a2a', trunk = '#4a3020' } = {}) {
  const r = rng(seed); const group = new THREE.Group(); group.name = 'arvores';
  for (let i = 0; i < count; i++) {
    const a = r.range(0, Math.PI * 2), d = r.range(radius[0], radius[1]), s = r.range(0.8, 1.6);
    const t = new THREE.Group(); t.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 1.2 * s, 6), new THREE.MeshStandardMaterial({ color: trunk }));
    tr.position.y = 0.6 * s; const top = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0 * s, 1), new THREE.MeshStandardMaterial({ color, flatShading: true }));
    top.position.y = 1.8 * s; tr.castShadow = top.castShadow = true; t.add(tr, top); group.add(t);
  }
  scene.add(group); return group;
}

// Caixa simples com material (props, blocos, muretas).
export function box(size, color, { name = 'caixa', rough = 0.8, metal = 0 } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
  m.castShadow = true; m.receiveShadow = true; m.name = name; return m;
}
