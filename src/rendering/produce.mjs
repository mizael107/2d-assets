// (Node) Produção completa de uma cena: render -> áudio -> MP4 -> verificações.
// É o ciclo usado pela autocorreção: produce() devolve o vídeo e um relatório de problemas.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { renderScene } from './render-scene.mjs';
import { renderSceneParallel } from './render-parallel.mjs';
import { framesToMp4, muxVideoAudio } from '../../pipeline/ffmpeg.mjs';
import { mixScene } from '../audio/mix.mjs';
import { ROOT } from '../../pipeline/config.mjs';
import { parseRenderSpec, parseCues } from '../validation/schemas.mjs';
import { checkVideoFile, checkFrames, checkProbes, checkAudioSync, checkLoudness, contactSheet, summarize } from '../validation/checks.mjs';

// soundMap: nome do som -> arquivo (relativo à raiz).
// workers > 1: render em blocos paralelos (src/rendering/render-parallel.mjs).
export async function produce({ spec, outDir, soundMap = {}, beds = [], narration = null, audioOffset = 0, rules = {}, onProgress, workers = 1, preroll = 2 }) {
  const S = parseRenderSpec(spec);
  await mkdir(outDir, { recursive: true });
  const r = workers > 1 ? await renderSceneParallel({ ...S, outDir, workers, preroll }) : await renderScene({ ...S, outDir, onProgress });
  const cues = parseCues(r.cues);
  const silent = join(outDir, 'video-sem-audio.mp4');
  framesToMp4(r.pattern, silent, { fps: S.fps, crf: 20, preset: 'veryfast' });

  const mixCues = cues.filter((c) => soundMap[c.sound]).map((c) => ({ file: join(ROOT, soundMap[c.sound]), t: Math.max(0, c.t + audioOffset), gain: c.gain ?? 1 }));
  const mixOut = join(outDir, 'mix.wav');
  const { stem } = mixScene({ duration: S.seconds, beds: beds.map((b) => ({ ...b, file: join(ROOT, b.file) })), narration: narration && { ...narration, file: join(ROOT, narration.file) }, cues: mixCues, out: mixOut, stems: true });
  const final = join(outDir, 'final.mp4');
  muxVideoAudio(silent, mixOut, final);

  const sheet = await contactSheet(r.framesDir, join(outDir, 'folha-de-contato.jpg'), { fps: S.fps, thumbWidth: Math.min(270, S.width / 2) });
  const sections = {
    video: checkVideoFile(final, { width: S.width, height: S.height, fps: S.fps, duration: S.seconds, audio: true }),
    frames: await checkFrames(r.framesDir),
    probes: checkProbes(r.probes, rules),
    sync: checkAudioSync(stem, cues.filter((c) => soundMap[c.sound]).map((c) => ({ ...c, file: join(ROOT, soundMap[c.sound]) })), { tolerance: rules.syncTolerance ?? 0.045 }),
    loudness: checkLoudness(mixOut),
  };
  const summary = summarize(Object.values(sections));
  const report = { spec: S, final, contactSheet: sheet.out, renderSeconds: r.renderSeconds, frames: r.frames, cues, summary, sections: { ...sections, frames: { frames: sections.frames.frames, issues: sections.frames.issues } } };
  if (r.captions?.length) { const { toSRT } = await import('../effects/captions.js'); await writeFile(join(outDir, 'legendas.srt'), toSRT(r.captions)); report.legendas = join(outDir, 'legendas.srt'); }
  await writeFile(join(outDir, 'relatorio.json'), JSON.stringify(report, null, 1));
  return report;
}
