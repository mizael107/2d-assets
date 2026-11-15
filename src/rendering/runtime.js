// (Navegador) Runtime do estúdio: cria o renderer, roda a cena e expõe a API de
// renderização quadro a quadro para o Node (window.__studio).
//
// Contrato de uma cena (arquivo em scenes/, export default):
//   export default async function createScene(ctx) {
//     // ctx = { THREE, renderer, width, height, fps, params, debug }
//     return {
//       scene, camera,                 // obrigatórios
//       update(t, dt),                 // obrigatório: posiciona TUDO para o tempo t (determinístico)
//       render(dt)?,                   // opcional: ex. composer de pós-processamento
//       duration?,                     // segundos
//       cues?,                         // [{ t, sound, gain?, kind? }] eventos de áudio
//       probes?(t),                    // dados medidos por quadro para a autocorreção
//     };
//   }
import * as THREE from 'three';

export async function startStudio(createScene, { width, height, fps, params, debug }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  const ctx = { THREE, renderer, width, height, fps, params: params || {}, debug };
  const sc = await createScene(ctx);
  if (!sc?.scene || !sc?.camera || typeof sc.update !== 'function') {
    throw new Error('A cena precisa retornar { scene, camera, update(t, dt) }');
  }
  if (sc.camera.isPerspectiveCamera) { sc.camera.aspect = width / height; sc.camera.updateProjectionMatrix(); }

  let stats = null;
  if (debug && window.Stats) { stats = new window.Stats(); document.body.appendChild(stats.dom); }

  window.__studio = {
    meta: () => ({ duration: sc.duration ?? null, cues: sc.cues ?? [], info: sc.info ?? {} }),
    renderAt(t, format = 'image/jpeg', quality = 0.92) {
      stats?.begin();
      sc.update(t, 1 / fps);
      if (sc.render) sc.render(1 / fps); else renderer.render(sc.scene, sc.camera);
      stats?.end();
      return { img: renderer.domElement.toDataURL(format, quality), probes: sc.probes ? sc.probes(t) : null };
    },
    info: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, gl: renderer.getContext().getParameter(renderer.getContext().VERSION) }),
  };
  window.__studioReady = true;
}
