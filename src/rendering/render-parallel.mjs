// (Node) Render em blocos paralelos: divide os quadros em N blocos, cada um num Chromium
// separado, e junta tudo na mesma pasta de quadros. Mesma saída de renderScene().
//
// Cada bloco simula `preroll` segundos antes do seu primeiro quadro (sem desenhar), para
// que o que depende dos quadros anteriores (câmera que acompanha com amortecimento)
// chegue no mesmo estado do render contínuo. Física, GSAP e partículas já são função
// direta do tempo e não precisam disso.
import { mkdir, rm, rename, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cpus } from 'node:os';
import { renderScene } from './render-scene.mjs';

export async function renderSceneParallel({ outDir, seconds, fps = 30, workers = Math.max(1, cpus().length), preroll = 2, ...opts }) {
  if (!seconds) throw new Error('renderSceneParallel precisa de seconds');
  const total = Math.round(seconds * fps); const n = Math.min(workers, total);
  const framesDir = join(outDir, 'frames'); await rm(framesDir, { recursive: true, force: true }); await mkdir(framesDir, { recursive: true });
  const t0 = Date.now();
  const ranges = [...Array(n)].map((_, i) => [Math.round((i * total) / n), Math.round(((i + 1) * total) / n)]);
  const parts = await Promise.all(ranges.map(([a, b], i) => renderScene({ ...opts, outDir: join(outDir, `_bloco${i}`), seconds, fps, startFrame: a, endFrame: b, preroll: a > 0 ? preroll : 0 })));
  for (const [i, p] of parts.entries()) {
    for (const f of await readdir(p.framesDir)) await rename(join(p.framesDir, f), join(framesDir, f));
    await rm(join(outDir, `_bloco${i}`), { recursive: true, force: true });
  }
  const first = parts[0];
  const result = {
    ...first, outDir, framesDir, frames: total, startFrame: 0, endFrame: total,
    pattern: join(framesDir, `f%05d.${first.format}`),
    probes: parts.flatMap((p) => p.probes), errors: parts.flatMap((p) => p.errors),
    renderSeconds: (Date.now() - t0) / 1000, blocos: ranges, workers: n, preroll,
  };
  await writeFile(join(outDir, 'meta.json'), JSON.stringify(result, null, 1));
  return result;
}
