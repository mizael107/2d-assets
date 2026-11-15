// (Node) Gera a biblioteca de sons procedurais (Tone.js) em assets/sounds/<categoria>/.
//   node src/audio/procedural.mjs            -> gera todos
//   node src/audio/procedural.mjs impacto    -> gera só um
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from '../../pipeline/config.mjs';
import { browserTask } from '../utils/browser-task.mjs';
import { launchStudioBrowser } from '../rendering/render-scene.mjs';

export const SOUND_CATEGORIES = {
  passo: 'footsteps', impacto: 'impacts', whoosh: 'impacts', porta: 'impacts', vento: 'weather', chuva: 'weather',
  fogo: 'ambience', agua: 'ambience', passaro: 'animals', trilha: 'music',
};

export async function generateSounds(names = Object.keys(SOUND_CATEGORIES)) {
  const browser = await launchStudioBrowser(); const out = [];
  try {
    for (const n of names) {
      const r = await browserTask('/src/audio/synth.js', 'renderSynth', [n], { browser });
      const dir = join(ROOT, 'assets/sounds', SOUND_CATEGORIES[n]); await mkdir(dir, { recursive: true });
      const file = join(dir, `proc-${n}.wav`); await writeFile(file, Buffer.from(r.base64, 'base64'));
      out.push({ name: n, file, seconds: r.seconds, peak: r.peak });
    }
  } finally { await browser.close(); }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const names = process.argv.slice(2);
  const r = await generateSounds(names.length ? names : undefined);
  for (const s of r) console.log(`${s.name.padEnd(8)} ${s.seconds.toFixed(2)}s  pico ${s.peak.toFixed(2)}  ${s.file}`);
}
