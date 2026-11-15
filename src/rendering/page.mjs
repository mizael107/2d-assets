// (Node) Monta a página HTML que roda uma cena do estúdio no Chromium.
// Todas as bibliotecas do navegador são servidas de node_modules pelo servidor local
// (pipeline/server.mjs). Bibliotecas UMD (howler, tone, stats.js) entram como <script>
// e ficam globais: window.Howl, window.Tone, window.Stats.

export const STUDIO_IMPORT_MAP = {
  imports: {
    three: '/node_modules/three/build/three.module.js',
    'three/addons/': '/node_modules/three/examples/jsm/',
    gsap: '/node_modules/gsap/index.js',
    'camera-controls': '/node_modules/camera-controls/dist/camera-controls.module.js',
    '@pixiv/three-vrm': '/node_modules/@pixiv/three-vrm/lib/three-vrm.module.js',
    postprocessing: '/node_modules/postprocessing/build/index.js',
    'three-mesh-bvh': '/node_modules/three-mesh-bvh/src/index.js',
    '@dimforge/rapier3d-compat': '/node_modules/@dimforge/rapier3d-compat/dist/rapier.mjs',
    'lil-gui': '/node_modules/lil-gui/dist/lil-gui.esm.js',
    '@mediapipe/tasks-vision': '/node_modules/@mediapipe/tasks-vision/vision_bundle.mjs',
    zod: '/node_modules/zod/index.js',
    '@studio/': '/src/',
  },
};

const UMD_SCRIPTS = [
  '/node_modules/howler/dist/howler.min.js',
  '/node_modules/tone/build/Tone.js',
  '/node_modules/stats.js/build/stats.min.js',
];

// entry: caminho servido do módulo da cena (ex.: '/scenes/tests/teste-a.js').
export function studioPage({ entry, width, height, fps, params = {}, debug = false }) {
  const cfg = JSON.stringify({ width, height, fps, params, debug });
  return `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;background:#000;overflow:hidden}</style>
<script type="importmap">${JSON.stringify(STUDIO_IMPORT_MAP)}</script>
${UMD_SCRIPTS.map((s) => `<script src="${s}"></script>`).join('\n')}
</head><body>
<script type="module">
import { startStudio } from '/src/rendering/runtime.js';
import createScene from '${entry}';
startStudio(createScene, ${cfg}).catch((e) => { window.__studioError = String(e && e.stack || e); });
</script></body></html>`;
}
