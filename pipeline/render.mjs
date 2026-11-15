// Renderiza uma cena Three.js quadro a quadro no Chromium headless.
// A página precisa definir window.setupScene(THREE, renderer) que retorna
// { scene, camera, update(t) }, onde t é o tempo em segundos.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { launchBrowser } from './browser.mjs';
import { startServer, IMPORT_MAP } from './server.mjs';
import { VIDEO } from './config.mjs';

export function scenePage(sceneModuleCode, { width = VIDEO.width, height = VIDEO.height } = {}) {
  return `<!doctype html><html><body style="margin:0;background:#000">${IMPORT_MAP}
<script type="module">
import * as THREE from 'three';
${sceneModuleCode}
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(${width}, ${height}); renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const ctx = await setupScene(THREE, renderer);
window.renderAt = (t) => { ctx.update(t); renderer.render(ctx.scene, ctx.camera); return renderer.domElement.toDataURL('image/png'); };
window.ready = true;
</script></body></html>`;
}

// Gera os PNGs em outDir e retorna o padrão para o FFmpeg.
export async function renderFrames(sceneModuleCode, { outDir, seconds, fps = VIDEO.fps, width, height, onProgress } = {}) {
  await mkdir(outDir, { recursive: true });
  const { server, url } = await startServer({ '/': scenePage(sceneModuleCode, { width, height }) });
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url + '/');
    await page.waitForFunction('window.ready === true', null, { timeout: 60000 }).catch(() => {
      throw new Error('Cena não carregou: ' + (errors.join(' | ') || 'timeout'));
    });
    const total = Math.round(seconds * fps);
    for (let i = 0; i < total; i++) {
      const data = await page.evaluate((t) => window.renderAt(t), i / fps);
      await writeFile(join(outDir, `f${String(i).padStart(5, '0')}.png`), Buffer.from(data.split(',')[1], 'base64'));
      onProgress?.(i + 1, total);
    }
    return { pattern: join(outDir, 'f%05d.png'), frames: total };
  } finally {
    await browser.close();
    server.close();
  }
}
