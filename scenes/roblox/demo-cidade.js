// Demonstração: cidade montada a partir do catálogo (assets/roblox/catalogo.json),
// com itens do kit próprio + praça e casa importadas de arquivos Roblox (.rbxlx/.rbxm).
import { loadCatalog, buildLayout, instantiate, optimizeStatic } from '@studio/roblox/assets.js';
import { createCameraDirector } from '@studio/cameras/director.js';
import { createSky, addFog } from '@studio/environments/environment.js';
import { applyLighting } from '@studio/environments/lighting.js';
import { createPostFX } from '@studio/effects/postfx.js';
import { ndc, minY } from '@studio/rendering/probes.js';

export default async function ({ THREE, renderer, params }) {
  const D = 5;
  const scene = new THREE.Scene(); scene.add(createSky({ top: '#4a78c0', horizon: '#ffd2a0', bottom: '#3a3a40' })); addFog(scene, { color: '#d8c8b8', near: 40, far: 140 });
  applyLighting(scene, 'dia', { keyPos: [28, 30, 14], shadowSize: 45, shadowRes: 2048 }); // sol do lado da rua: fachadas e personagem iluminados
  const cat = await loadCatalog();
  const layout = [
    { id: 'chao-pinos', grid: { from: [-60, -0.2, -60], to: [60, -0.2, 60], step: 40 } }, // topo em y=0: não cobre a rua
    { id: 'rua-blocos', grid: { from: [0, 0, -42], to: [0, 0, 42], step: 12 } },
    { id: 'casa-blocos', pos: [-10, 0, -24], rotY: Math.PI / 2 }, { id: 'casa-blocos', pos: [-10, 0, -12], rotY: Math.PI / 2 },
    { id: 'casa-blocos', pos: [-10, 0, 0], rotY: Math.PI / 2 }, { id: 'casa-blocos', pos: [-10, 0, 12], rotY: Math.PI / 2 },
    { id: 'predio-blocos', grid: { from: [-26, 0, -36], to: [-26, 0, 24], step: 12 } },
    { id: 'arvore-blocos', grid: { from: [-17, 0, -30], to: [-17, 0, 18], step: 6, jitter: 1.2, seed: 7 } },
    { id: 'arvore-bola', grid: { from: [44, 0, -30], to: [52, 0, 30], step: 8, jitter: 2, seed: 3 } },
    { id: 'poste-blocos', grid: { from: [-4.4, 0, -36], to: [-4.4, 0, 36], step: 12 } },
    { id: 'poste-blocos', grid: { from: [4.4, 0, -30], to: [4.4, 0, 30], step: 12 }, rotY: Math.PI },
    { id: 'banco-blocos', pos: [-5.5, 0, -6], rotY: Math.PI / 2 }, { id: 'banco-blocos', pos: [-5.5, 0, 6], rotY: Math.PI / 2 }, // fora da calçada
    { id: 'cerca-blocos', grid: { from: [-6.8, 0, -28], to: [-6.8, 0, 16], step: 4 }, rotY: Math.PI / 2 },
    { id: 'praca-teste-rbxlx', pos: [24, 0, -4] },
    { id: 'casa-teste-rbxm', pos: [12, 0, 22], rotY: -Math.PI / 2, scale: 1.4 },
  ];
  await buildLayout(scene, cat, layout);
  const opt = optimizeStatic(scene);

  // Personagens e veículo (animados, ficam fora da otimização).
  const entry = (id) => cat.itens.find((e) => e.id === id);
  const hero = await instantiate(entry('personagem-blocos'), { position: [-4.0, 0.18, -10] }); hero.userData.keep = true; scene.add(hero);
  const mixer = new THREE.AnimationMixer(hero); const walk = hero.userData.asset.animations.find((a) => a.name === 'andar');
  mixer.clipAction(walk).play();
  const car = await instantiate(entry('carro-blocos'), { position: [1.8, 0.06, -40] }); car.userData.keep = true; scene.add(car);
  const legLen = 0.95, amp = 0.7, T = walk.duration;
  const speed = (4 * legLen * Math.sin(amp)) / T * 0.6; // passo de boneco: pernas sem joelho, passada menor
  const heroZ = (t) => -10 + speed * t;

  const camera = new THREE.PerspectiveCamera(45, 9 / 16, 0.1, 300);
  const dir = createCameraDirector(camera);
  dir.shot(0, { pos: [30, 42, -40], look: [0, 0, 0], fov: 50 })
    .moveTo(0, 2.4, { pos: [-0.6, 2.4, heroZ(2.4) + 5.5], look: [-4.0, 1.3, heroZ(2.4)], fov: 42, ease: 'power2.inOut' })
    .follow(2.4, D - 2.4, hero, { offset: [3.4, 2.0, 5.5], lookOffset: [0, 1.2, 0], smooth: 3 });
  const post = createPostFX(renderer, scene, camera, { bloom: { intensity: 0.6, threshold: 0.85, smoothing: 0.2, radius: 0.5 }, vignette: { offset: 0.35, darkness: 0.45 } });
  return {
    scene, camera, duration: D, info: { otimizacao: opt, itensNoLayout: layout.length },
    cues: [...Array(Math.floor(D / (T / 2)))].map((_, i) => ({ t: +(T / 4 + i * T / 2).toFixed(3), sound: 'passo', gain: 0.35 })),
    update(t, dt) {
      hero.position.z = heroZ(t); mixer.setTime(t); car.position.z = -40 + 11 * t; dir.update(t, dt);
      if (params.vistaDeCima) { scene.fog = null; camera.position.set(0, 95, 0.01); camera.lookAt(0, 0, 0); camera.fov = 50; camera.updateProjectionMatrix(); } // diagnóstico
    },
    render: (dt) => post.render(dt),
    probes: () => ({ onScreen: { personagem: ndc(hero, camera) }, objectsMinY: { personagem: +(minY(hero) - 0.18).toFixed(3) }, camera: camera.position.toArray().map((n) => +n.toFixed(2)) }),
  };
}
