// Teste F — efeitos: partículas (magia, faíscas, poeira, brasas) + bloom, DoF, vinheta.
// params.fx = false desliga o pós-processamento (para comparar com/sem).
import { createParticles } from '@studio/effects/particles.js';
import { createPostFX } from '@studio/effects/postfx.js';
import { createGround, createSky, addFog } from '@studio/environments/environment.js';
import { applyLighting } from '@studio/environments/lighting.js';

export default async function ({ THREE, renderer, height, params }) {
  const scene = new THREE.Scene(); scene.add(createSky({ top: '#1a1440', horizon: '#c0603a', bottom: '#120c18' })); addFog(scene, { color: '#5a3040', near: 8, far: 40 });
  const camera = new THREE.PerspectiveCamera(42, 9 / 16, 0.1, 200); camera.position.set(0, 1.5, 5); camera.lookAt(0, 1.1, 0);
  applyLighting(scene, 'noite'); scene.add(createGround({ color: '#3a2a2a' }));
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 3), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#7ff7f0', emissiveIntensity: 1.6 })); orb.position.set(0, 1.2, 0); scene.add(orb);
  const fire = new THREE.PointLight('#ff7a30', 6, 6); fire.position.set(1.2, 0.4, 1); scene.add(fire);
  const fxs = [
    createParticles('magia', { origin: [0, 1.2, 0], size: [1.6, 1.6, 1.6], viewportHeight: height, seed: 2 }),
    createParticles('faiscas', { origin: [1.2, 0.3, 1], viewportHeight: height, seed: 5, start: 0.5 }),
    createParticles('brasas', { origin: [1.2, 0.3, 1], viewportHeight: height, seed: 6 }),
    createParticles('poeira', { center: [0, 1.5, 0], size: [6, 3, 6], viewportHeight: height, seed: 9 }),
  ];
  fxs.forEach((p) => scene.add(p.points));
  const post = params.fx === false ? null : createPostFX(renderer, scene, camera, { bloom: { intensity: 0.9, threshold: 0.7, smoothing: 0.2, radius: 0.6 }, dof: { focus: 5, range: 1.5, bokeh: 3 }, vignette: { offset: 0.25, darkness: 0.7 }, grain: 0.08 });
  return {
    scene, camera, duration: 2.5,
    update: (t) => { fxs.forEach((p) => p.update(t)); orb.rotation.y = t; post?.setFocus(camera.position.distanceTo(orb.position)); },
    render: post ? (dt) => post.render(dt) : undefined,
  };
}
