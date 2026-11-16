// Teste C — câmera: corte, dolly in, órbita, pan, tilt, zoom, crane e acompanhamento.
import { createCameraDirector } from '@studio/cameras/director.js';
import { createGround } from '@studio/environments/environment.js';
import { applyLighting } from '@studio/environments/lighting.js';
import { ndc } from '@studio/rendering/probes.js';

export default async function ({ THREE }) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#2b2440');
  const camera = new THREE.PerspectiveCamera(40, 9 / 16, 0.1, 200);
  applyLighting(scene, 'porDoSol'); scene.add(createGround({ color: '#8a6a40' }));
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2, 0.6), new THREE.MeshStandardMaterial({ color: '#c0a080' })); pillar.position.y = 1; pillar.castShadow = true; scene.add(pillar);
  const runner = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 12), new THREE.MeshStandardMaterial({ color: '#e04040' })); runner.position.set(-4, 0.3, 2); scene.add(runner);
  const dir = createCameraDirector(camera);
  dir.shot(0, { pos: [0, 1.6, 8], look: [0, 1, 0], fov: 40 })
    .dollyIn(0, 1, { distance: 3 })            // 0–1 s
    .orbit(1, 1, { center: [0, 1, 0], degrees: 90 }) // 1–2 s
    .pan(2, 0.5, { degrees: 20 })              // 2–2,5 s
    .tilt(2.5, 0.5, { degrees: -10 })          // 2,5–3 s
    .zoom(3, 0.5, { fov: 25 })                 // 3–3,5 s
    .crane(3.5, 0.5, { height: 6 })            // 3,5–4 s
    .follow(4, 1, runner, { offset: [0, 1.2, 3], lookOffset: [0, 0.2, 0], smooth: 8 }); // 4–5 s
  return {
    scene, camera, duration: 5,
    update: (t, dt) => { runner.position.x = -4 + Math.max(0, t - 4) * 4; dir.update(t, dt); },
    probes: () => ({ camera: camera.position.toArray().map((n) => +n.toFixed(3)), fov: camera.fov, onScreen: { pilar: ndc(pillar, camera) }, runnerNdc: ndc(runner, camera) }),
  };
}
