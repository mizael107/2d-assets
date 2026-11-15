// (Node) Executa uma função de um módulo do navegador dentro do Chromium do estúdio
// (com todas as bibliotecas disponíveis) e devolve o resultado para o Node.
//   const r = await browserTask('/src/audio/synth.js', 'renderSynth', ['impacto']);
import { startServer } from '../../pipeline/server.mjs';
import { STUDIO_IMPORT_MAP } from '../rendering/page.mjs';
import { launchStudioBrowser } from '../rendering/render-scene.mjs';

const page = (mod, fn) => `<!doctype html><html><head><meta charset="utf-8">
<script type="importmap">${JSON.stringify(STUDIO_IMPORT_MAP)}</script>
<script src="/node_modules/howler/dist/howler.min.js"></script>
<script src="/node_modules/tone/build/Tone.js"></script>
<script src="/node_modules/stats.js/build/stats.min.js"></script>
</head><body><script type="module">
import * as M from '${mod}';
window.__run = async (args) => M['${fn}'](...args);
window.__ready = true;
</script></body></html>`;

export async function browserTask(mod, fn, args = [], { browser, timeout = 120000 } = {}) {
  const { server, url } = await startServer({ '/': page(mod, fn), '/favicon.ico': '' });
  const b = browser || await launchStudioBrowser();
  try {
    const p = await b.newPage();
    const errors = []; p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(url + '/');
    await p.waitForFunction('window.__ready === true', null, { timeout }).catch(() => { throw new Error('módulo não carregou: ' + errors.join(' | ')); });
    return await p.evaluate((a) => window.__run(a), args);
  } finally { if (!browser) await b.close(); server.close(); }
}
