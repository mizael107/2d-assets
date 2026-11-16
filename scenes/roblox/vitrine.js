// Vitrine: mostra um item do catálogo girando, enquadrado automaticamente pelo tamanho.
// params: { id: 'casa-teste-rbxm' }  (use para revisar qualquer recurso importado)
import { loadCatalog, instantiate } from '@studio/roblox/assets.js';
import { createSky, createGround } from '@studio/environments/environment.js';
import { applyLighting } from '@studio/environments/lighting.js';

export default async function ({ THREE, params }) {
  const scene = new THREE.Scene(); scene.add(createSky({ top: '#6a90c8', horizon: '#e8e0d0', bottom: '#555' }));
  applyLighting(scene, 'dia', { keyPos: [8, 14, 10] }); scene.add(createGround({ color: '#7a8a6a' }));
  const cat = await loadCatalog(); const e = cat.itens.find((x) => x.id === params.id);
  const obj = await instantiate(e); scene.add(obj);
  const box = new THREE.Box3().setFromObject(obj); const size = box.getSize(new THREE.Vector3()); const c = box.getCenter(new THREE.Vector3());
  const camera = new THREE.PerspectiveCamera(40, 9 / 16, 0.05, 300);
  // Distância para a esfera envolvente caber no MENOR ângulo da lente (no 9:16 é o horizontal).
  const vf = THREE.MathUtils.degToRad(camera.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
  const r = (size.length() / 2) / Math.sin(Math.min(vf, hf) / 2) * 1.05;
  return { scene, camera, duration: 4, info: { item: e.id, tamanho: size.toArray() },
    update(t) { const a = 0.6 + t * 0.8; camera.position.set(c.x + Math.sin(a) * r, c.y + size.y * 0.6, c.z + Math.cos(a) * r); camera.lookAt(c); } };
}
