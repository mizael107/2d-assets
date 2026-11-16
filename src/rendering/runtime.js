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
//       captions?, captionStyle?,      // legendas (src/effects/captions.js) desenhadas por cima
//     };
//   }
import * as THREE from 'three';
import { drawCaptions } from '../effects/captions.js';

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

  // Camada 2D por cima do 3D (legendas, títulos): o quadro é composto num canvas 2D.
  const captions = sc.captions ?? params?.captions ?? null;
  const comp = captions ? Object.assign(document.createElement('canvas'), { width, height }) : null;
  const cctx = comp?.getContext('2d');
  window.__studio = {
    meta: () => ({ duration: sc.duration ?? null, cues: sc.cues ?? [], info: sc.info ?? {}, captions }),
    // Só atualiza o estado (sem desenhar): usado na pré-rolagem do render em blocos.
    advance(t) { sc.update(t, 1 / fps); },
    renderAt(t, format = 'image/jpeg', quality = 0.92) {
      stats?.begin();
      sc.update(t, 1 / fps);
      if (sc.render) sc.render(1 / fps); else renderer.render(sc.scene, sc.camera);
      stats?.end();
      let out = renderer.domElement; let caption = null;
      if (cctx) { cctx.drawImage(renderer.domElement, 0, 0); caption = drawCaptions(cctx, captions, t, { width, height, style: sc.captionStyle ?? params?.captionStyle }); out = comp; }
      return { img: out.toDataURL(format, quality), probes: { ...(sc.probes ? sc.probes(t) : {}), ...(caption ? { legenda: caption } : {}) } };
    },
    info: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, gl: renderer.getContext().getParameter(renderer.getContext().VERSION) }),
  };
  window.__studioReady = true;
}
