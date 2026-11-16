// Cena da demonstração de autocorreção. Os parâmetros vêm de
// scenes/demo/autocorrecao.config.json (o arquivo que o ciclo de autocorreção corrige).
import { createHumanoid, footSoles } from '@studio/characters/humanoid.js';
import { motions, createMotionPlayer, speedFor } from '@studio/animation/motions.js';
import { createFaceController } from '@studio/characters/face.js';
import { createPhysicsWorld } from '@studio/physics/world.js';
import { createGround, createSky, box } from '@studio/environments/environment.js';
import { applyLighting } from '@studio/environments/lighting.js';
import { ndc, minY } from '@studio/rendering/probes.js';

export default async function ({ THREE, params }) {
  const P = { characterYOffset: 0, cameraLookOffsetX: 0, ...params };
  const scene = new THREE.Scene(); scene.add(createSky({ top: '#5a7ab0', horizon: '#f0c090', bottom: '#403020' }));
  applyLighting(scene, 'dia', { keyPos: [-5, 8, 6] }); scene.add(createGround({ color: '#8a7a5a' }));
  const ch = createHumanoid({ name: 'Caio', shirt: '#4a7ab0' }); scene.add(ch.root);
  const player = createMotionPlayer(ch, [{ clip: motions.walk(), start: 0, end: 1.8 }, { clip: motions.idle(2), start: 1.8 }]);
  const face = createFaceController(ch.face, { duration: 3 }); face.setExpression('surpreso', 1.9);
  const v = speedFor('walk'); const zAt = (t) => -1 + v * Math.min(t, 1.8);
  const phys = await createPhysicsWorld(); phys.addGround();
  const crate = box([0.6, 0.6, 0.6], '#c0603a', { name: 'caixa' }); crate.position.set(-0.7, 0.3 + 0.5 * 9.81 * 1.6 * 1.6, zAt(1.8) + 0.4); crate.rotation.y = 0.5; scene.add(crate);
  phys.addBody(crate, { shape: { type: 'box', size: [0.6, 0.6, 0.6] }, restitution: 0, friction: 1, name: 'caixa' });
  phys.bake(3); const hit = phys.impacts(2)[0].t;
  const camera = new THREE.PerspectiveCamera(40, 9 / 16, 0.1, 100);
  return {
    scene, camera, duration: 3,
    cues: [{ t: +hit.toFixed(3), sound: 'impacto', gain: 1 }],
    update(t) {
      ch.root.position.set(0, P.characterYOffset, zAt(t)); player.update(t); face.update(t); phys.apply(t);
      camera.position.set(1.2, 1.3, zAt(t) + 3.4); camera.lookAt(P.cameraLookOffsetX, 0.9, zAt(t));
    },
    probes(t) {
      ch.root.updateMatrixWorld(true); const f = footSoles(ch);
      return { feet: { L: +f.L.y.toFixed(4), R: +f.R.y.toFixed(4) }, grounded: true, onScreen: { cabeca: ndc(ch.bones.head, camera) }, objectsMinY: { caixa: minY(crate) } };
    },
  };
}
