// Teste E — física (Rapier): caixas e bola caem, colidem, uma é empurrada para o lado.
import { createPhysicsWorld } from '@studio/physics/world.js';
import { createGround, box } from '@studio/environments/environment.js';
import { applyLighting } from '@studio/environments/lighting.js';
import { minY } from '@studio/rendering/probes.js';

export default async function ({ THREE }) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#2a3040');
  const camera = new THREE.PerspectiveCamera(40, 9 / 16, 0.1, 100); camera.position.set(0, 2.5, 8); camera.lookAt(0, 1, 0);
  applyLighting(scene, 'dia'); scene.add(createGround({ color: '#666a70' }));
  const phys = await createPhysicsWorld(); phys.addGround();
  const objs = [];
  const add = (mesh, opts) => { scene.add(mesh); objs.push(mesh); return phys.addBody(mesh, opts); };
  const a = box([0.8, 0.8, 0.8], '#e07030', { name: 'caixaA' }); a.position.set(-0.6, 3, 0); add(a, { shape: { type: 'box', size: [0.8, 0.8, 0.8] } });
  const b = box([0.6, 0.6, 0.6], '#30a0e0', { name: 'caixaB' }); b.position.set(-0.4, 5, 0.1); b.rotation.set(0.4, 0.3, 0.2); add(b, { shape: { type: 'box', size: [0.6, 0.6, 0.6] } });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 12), new THREE.MeshStandardMaterial({ color: '#e0e040' })); ball.name = 'bola'; ball.castShadow = true;
  ball.position.set(2.5, 0.35, 0); add(ball, { shape: { type: 'sphere', radius: 0.35 }, velocity: [-4.2, 0, 0], restitution: 0.4 }); // bola rola e empurra
  const bake = phys.bake(4);
  const impacts = phys.impacts(1.0);
  return {
    scene, camera, duration: 4, info: { contacts: bake.contacts.length, impacts },
    cues: impacts.map((c) => ({ t: +c.t.toFixed(3), sound: 'impacto', gain: Math.min(1, c.speed / 8), kind: `${c.a}-${c.b}` })),
    update: (t) => phys.apply(t),
    probes: () => ({ objectsMinY: Object.fromEntries(objs.map((o) => [o.name, minY(o)])), pos: Object.fromEntries(objs.map((o) => [o.name, o.position.toArray().map((n) => +n.toFixed(3))])) }),
  };
}
