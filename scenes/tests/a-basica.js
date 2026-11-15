// Teste A — cena 3D simples: objeto, luz e câmera.
import { ndc } from '@studio/rendering/probes.js';

export default async function ({ THREE }) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#203040');
  const camera = new THREE.PerspectiveCamera(40, 9 / 16, 0.1, 100); camera.position.set(0, 1.4, 5); camera.lookAt(0, 0.6, 0);
  const sun = new THREE.DirectionalLight('#ffffff', 2.5); sun.position.set(3, 5, 4); sun.castShadow = true; scene.add(sun, new THREE.HemisphereLight('#bcd8ff', '#403020', 0.8));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: '#557755' })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ff7700' })); cube.position.y = 0.5; cube.castShadow = true; cube.name = 'cubo'; scene.add(cube);
  return { scene, camera, duration: 1, update: (t) => { cube.rotation.y = t * 1.5; }, probes: () => ({ onScreen: { cubo: ndc(cube, camera) } }) };
}
