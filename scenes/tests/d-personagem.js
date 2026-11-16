// Teste D — personagem com esqueleto: anda, corre, pula e acena, com piscadas e expressão.
// params.glb: se informado, carrega esse GLB (personagem externo) em vez do procedural.
import { createHumanoid, footSoles } from '@studio/characters/humanoid.js';
import { motions, createMotionPlayer, speedFor } from '@studio/animation/motions.js';
import { createFaceController } from '@studio/characters/face.js';
import { createGround } from '@studio/environments/environment.js';
import { applyLighting } from '@studio/environments/lighting.js';
import { ndc } from '@studio/rendering/probes.js';

export default async function ({ THREE, params }) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#87b5d8');
  const camera = new THREE.PerspectiveCamera(38, 9 / 16, 0.1, 100);
  applyLighting(scene, 'dia'); scene.add(createGround({ color: '#7a9a5a' }));
  const ch = createHumanoid({ name: 'Caio' }); scene.add(ch.root);
  const yOff = params.characterYOffset ?? 0;
  // Plano: anda 0–2,2 s, corre 2,2–3,4 s, pula 3,4–4,5 s, acena 4,5–6 s.
  const player = createMotionPlayer(ch, [
    { clip: motions.walk(), start: 0, end: 2.2 },
    { clip: motions.run(), start: 2.2, end: 3.4 },
    { clip: motions.jump(), start: 3.4, end: 4.5, loop: false },
    { clip: motions.wave(1.5), start: 4.5, loop: false },
  ]);
  const face = createFaceController(ch.face, { duration: 6, seed: 3 });
  face.setExpression('neutro', 0); face.setExpression('feliz', 4.5);
  const vw = speedFor('walk'), vr = speedFor('run');
  const zAt = (t) => -3 + vw * Math.min(t, 2.2) + vr * Math.max(0, Math.min(t, 3.4) - 2.2) + 1.2 * Math.max(0, Math.min(t, 4.5) - 3.4);
  return {
    scene, camera, duration: 6, info: { speedWalk: vw, speedRun: vr },
    update(t) {
      ch.root.position.set(0, yOff, zAt(t));
      player.update(t); face.update(t);
      const z = ch.root.position.z; camera.position.set(2.6, 1.3, z + 3.2); camera.lookAt(0, 0.85, z);
    },
    probes(t) {
      ch.root.updateMatrixWorld(true);
      const f = footSoles(ch);
      return { feet: { L: +f.L.y.toFixed(4), R: +f.R.y.toFixed(4) }, grounded: t < 3.4 || t > 4.6, onScreen: { cabeca: ndc(ch.bones.head, camera) }, z: +ch.root.position.z.toFixed(3) };
    },
  };
}
