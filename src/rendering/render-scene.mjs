// (Node) Renderiza uma cena do estúdio quadro a quadro e grava:
//   outDir/frames/f00000.jpg ...   quadros
//   outDir/meta.json               cues de áudio, probes por quadro, tempos
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { launchBrowser } from '../../pipeline/browser.mjs';
import { CHROMIUM_ARGS } from '../../pipeline/config.mjs';

// Chromium headless + WebGL por software + áudio sem exigir clique (para testes de som).
export const launchStudioBrowser = () =>
  launchBrowser({ args: [...CHROMIUM_ARGS, '--autoplay-policy=no-user-gesture-required'] });
import { startServer } from '../../pipeline/server.mjs';
import { studioPage } from './page.mjs';

export const PRESETS = {
  vertical: { width: 1080, height: 1920 },       // 9:16 final (TikTok, Reels, Shorts)
  verticalDraft: { width: 540, height: 960 },    // 9:16 rascunho (4x mais rápido)
  horizontal: { width: 1920, height: 1080 },
  horizontalDraft: { width: 960, height: 540 },
};

export async function renderScene({
  entry, outDir, seconds, fps = 30, width = 540, height = 960, params = {},
  format = 'jpeg', quality = 0.92, startFrame = 0, endFrame, onProgress, keepBrowser,
}) {
  const framesDir = join(outDir, 'frames');
  await rm(framesDir, { recursive: true, force: true });
  await mkdir(framesDir, { recursive: true });
  const { server, url } = await startServer({ '/': studioPage({ entry, width, height, fps, params }), '/favicon.ico': '' });
  const browser = keepBrowser || await launchStudioBrowser();
  const t0 = Date.now();
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(url + '/');
    await page.waitForFunction('window.__studioReady === true || window.__studioError', null, { timeout: 120000 })
      .catch(() => { throw new Error('Cena não iniciou em 120 s. Erros do navegador: ' + (errors.join(' | ') || 'nenhum')); });
    const startErr = await page.evaluate(() => window.__studioError);
    if (startErr) throw new Error('Cena falhou ao iniciar: ' + startErr);
    const meta = await page.evaluate(() => window.__studio.meta());
    const dur = seconds ?? meta.duration;
    if (!dur) throw new Error('Duração não definida (passe seconds ou retorne duration na cena)');
    const total = Math.round(dur * fps);
    const last = Math.min(endFrame ?? total, total);
    const mime = format === 'png' ? 'image/png' : 'image/jpeg';
    const ext = format === 'png' ? 'png' : 'jpg';
    const probes = [];
    for (let i = startFrame; i < last; i++) {
      const r = await page.evaluate(([t, m, q]) => window.__studio.renderAt(t, m, q), [i / fps, mime, quality]);
      await writeFile(join(framesDir, `f${String(i).padStart(5, '0')}.${ext}`), Buffer.from(r.img.split(',')[1], 'base64'));
      probes.push({ frame: i, t: i / fps, ...(r.probes || {}) });
      onProgress?.(i + 1 - startFrame, last - startFrame);
    }
    const info = await page.evaluate(() => window.__studio.info());
    const result = {
      entry, width, height, fps, seconds: dur, frames: last - startFrame, format: ext,
      pattern: join(framesDir, `f%05d.${ext}`), framesDir,
      cues: meta.cues, info: { ...meta.info, ...info }, probes, errors,
      renderSeconds: (Date.now() - t0) / 1000,
    };
    await writeFile(join(outDir, 'meta.json'), JSON.stringify(result, null, 1));
    return result;
  } finally {
    if (!keepBrowser) await browser.close();
    server.close();
  }
}
