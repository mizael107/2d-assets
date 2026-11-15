// Teste J — integração: personagem anda numa arena ao pôr do sol, uma caixa cai (física),
// ele se assusta (expressão + pânico), faíscas e poeira no impacto, câmera cinematográfica,
// bloom + DoF, e boca sincronizada com a narração (params.envelope).
//
// params: { envelope:[0..1 por quadro], characterYOffset, narrationAt }
import { createHumanoid, footSoles } from '@studio/characters/humanoid.js';
import { motions, createMotionPlayer, speedFor, footstepTimes } from '@studio/animation/motions.js';
import { createFaceController } from '@studio/characters/face.js';
import { createCameraDirector } from '@studio/cameras/director.js';
import { createPhysicsWorld } from '@studio/physics/world.js';
import { createParticles } from '@studio/effects/particles.js';
import { createPostFX } from '@studio/effects/postfx.js';
import { createGround, createSky, addFog, scatterTrees, box } from '@studio/environments/environment.js';
import { applyLighting } from '@studio/environments/lighting.js';
import { ndc, minY } from '@studio/rendering/probes.js';

export default async function ({ THREE, renderer, height, fps, params }) {
  const D = 6;
  const scene = new THREE.Scene();
  scene.add(createSky({ top: '#3b2a6a', horizon: '#f0905a', bottom: '#2a1a22' })); addFog(scene, { color: '#c07a6a', near: 12, far: 45 });
  applyLighting(scene, 'porDoSol', { shadowSize: 8, keyPos: [-7, 4, 5] }); // sol baixo à esquerda-frente: rosto iluminado, sombras longas
  scene.add(createGround({ color: '#9a6a3a' })); scatterTrees(scene, { count: 14, radius: [12, 22], seed: 4 });
  // Mureta da arena (anel de blocos).
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; const b = box([1.6, 0.6, 0.4], '#8a7a6a', { name: 'mureta' }); b.position.set(Math.cos(a) * 9, 0.3, Math.sin(a) * 9); b.rotation.y = -a + Math.PI / 2; scene.add(b); }

  // Personagem: anda de z=-2.5 até parar, assusta com o impacto (t≈2,9 s).
  const ch = createHumanoid({ name: 'Caio' }); scene.add(ch.root);
  const yOff = params.characterYOffset ?? 0;
  const walkEnd = 2.4, vw = speedFor('walk');
  const player = createMotionPlayer(ch, [
    { clip: motions.walk(), start: 0, end: walkEnd },
    { clip: motions.idle(3), start: walkEnd, end: 3.0 },
    { clip: motions.panic(1.4), start: 3.0, end: 4.4, loop: false },
    { clip: motions.cast(1.6), start: 4.4, loop: false },
  ]);
  const zAt = (t) => -2.5 + vw * Math.min(t, walkEnd);

  // Caixa cai do céu na frente dele (física pré-calculada).
  const phys = await createPhysicsWorld(); phys.addGround();
  const crate = box([0.7, 0.7, 0.7], '#c0603a', { name: 'caixa' }); const fallTime = 2.85; // impacto ~0,45 s depois de ele parar
  crate.position.set(-0.35, 0.35 + 0.5 * 9.81 * fallTime * fallTime, zAt(walkEnd) + 0.9); crate.rotation.set(0, 0.6, 0); scene.add(crate); // quase reta: assenta em vez de rolar para fora do quadro
  phys.addBody(crate, { shape: { type: 'box', size: [0.7, 0.7, 0.7] }, restitution: 0, friction: 1.0, name: 'caixa' }); // caixa pesada: assenta sem quicar
  phys.bake(D);
  const impacts = phys.impacts(2.0); const hit = impacts[0]?.t ?? 3;

  // Efeitos: poeira ambiente, faíscas e fumaça no impacto, magia no feitiço.
  const cp = crate.position.clone(); const fx = [
    createParticles('poeira', { center: [0, 1.5, zAt(walkEnd)], size: [8, 3, 8], viewportHeight: height, seed: 11 }),
    createParticles('faiscas', { origin: [cp.x, 0.1, cp.z], viewportHeight: height, seed: 12, start: hit }),
    createParticles('fumaca', { origin: [cp.x, 0.1, cp.z], viewportHeight: height, seed: 13, start: hit, count: 40, burst: true, life: [1.5, 2.5], speed: [0.4, 0.9], opacity: 0.35 }),
    createParticles('magia', { origin: [0.45, 1.25, zAt(walkEnd) + 0.6], size: [0.8, 0.8, 0.8], viewportHeight: height, seed: 14, start: 4.6, burst: true, life: [1, 1.4], count: 90 }),
  ];
  fx.forEach((p) => scene.add(p.points));

  // Rosto: piscadas, susto, concentração; boca segue a narração.
  const face = createFaceController(ch.face, { duration: D, seed: 5, envelope: params.envelope, fps });
  face.setExpression('neutro', 0); face.setExpression('surpreso', hit + 0.05); face.setExpression('concentrado', 4.4);

  // Câmera: geral -> acompanha -> reação em close -> plano baixo heroico.
  const camera = new THREE.PerspectiveCamera(45, 9 / 16, 0.1, 200);
  const dir = createCameraDirector(camera);
  const stop = new THREE.Vector3(0, 0, zAt(walkEnd));
  dir.shot(0, dir.framing.wide(new THREE.Vector3(0, 0, -1), { dist: 9, height: 3.2 }))
    .follow(0.6, walkEnd - 0.6, ch.root, { offset: [1.6, 1.5, 3.4], lookOffset: [0, 1.0, 0], smooth: 3 })
    .shot(walkEnd, dir.framing.medium(stop, { dist: 3.6, side: 1.4, height: 1.4, fov: 42 }))
    .shake(hit, 0.35, { amp: 0.04 })
    .moveTo(3.3, 0.9, { ...dir.framing.closeUp(stop.clone().add(new THREE.Vector3(0, 1.64, 0)), { dist: 1.5, side: 0.3, fov: 34 }), ease: 'power2.inOut' })
    .shot(4.4, dir.framing.lowAngle(stop, { dist: 2.6, height: 0.35, side: 1.3, lookUp: 1.1 })) // do lado oposto à caixa, que cobria o personagem
    .dollyIn(4.4, 1.6, { distance: 0.6, ease: 'sine.inOut' });
  const post = createPostFX(renderer, scene, camera, { bloom: { intensity: 0.8, threshold: 0.75, smoothing: 0.2, radius: 0.6 }, dof: { focus: 4, range: 2.5, bokeh: 2 }, vignette: { offset: 0.3, darkness: 0.55 }, grain: 0.05 });

  const steps = footstepTimes('walk', 0, walkEnd - 0.1);
  const cues = [
    ...steps.map((s) => ({ t: +s.t.toFixed(3), sound: 'passo', gain: 0.5, kind: `passo-${s.foot}` })),
    ...impacts.slice(0, 1).map((c) => ({ t: +c.t.toFixed(3), sound: 'impacto', gain: 1, kind: 'caixa-chao' })),
    { t: 4.55, sound: 'whoosh', gain: 0.7, kind: 'feitico' },
  ];
  return {
    scene, camera, duration: D, cues, info: { hit, speedWalk: vw, footsteps: steps.length },
    update(t, dt) {
      ch.root.position.set(0, yOff, zAt(t));
      player.update(t); face.update(t); phys.apply(t); fx.forEach((p) => p.update(t));
      const c = dir.update(t, dt);
      post.setFocus(camera.position.distanceTo(ch.bones.head.getWorldPosition(new THREE.Vector3())));
      return c;
    },
    render: (dt) => post.render(dt),
    // A caixa entra pelo topo de propósito; só depois do pouso ela precisa estar no quadro.
    probes(t) {
      ch.root.updateMatrixWorld(true); const f = footSoles(ch);
      return { feet: { L: +f.L.y.toFixed(4), R: +f.R.y.toFixed(4) }, grounded: true, objectsMinY: { caixa: minY(crate) },
        onScreen: { cabeca: ndc(ch.bones.head, camera), ...(t >= hit && t < 3.3 ? { caixa: ndc(crate, camera) } : {}) }, camera: camera.position.toArray().map((n) => +n.toFixed(3)) };
    },
  };
}
