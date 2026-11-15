// (Node) Verificações automáticas por código sobre o resultado do render.
// Não precisam de "olhos": medem números (pixels, posições, tempos de áudio).
// A avaliação estética (composição, expressão, legibilidade) fica para a revisão
// visual por um modelo que analisa imagens — ver docs/AUTOCORRECAO.md.
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import sharp from 'sharp';
import { probe } from '../../pipeline/ffmpeg.mjs';
import { alignOffset, loudnessStats } from '../audio/analyze.mjs';
import { ProbeRulesSchema } from './schemas.mjs';

const issue = (severity, code, message, extra = {}) => ({ severity, code, message, ...extra });

// 1. Arquivo de vídeo: resolução, fps, duração, streams.
export function checkVideoFile(file, expect = {}) {
  const info = probe(file); const v = info.streams.find((s) => s.codec_type === 'video'); const a = info.streams.find((s) => s.codec_type === 'audio');
  const issues = [];
  if (!v) issues.push(issue('erro', 'sem-video', 'arquivo sem trilha de vídeo'));
  if (expect.width && v?.width !== expect.width) issues.push(issue('erro', 'resolucao', `largura ${v?.width} ≠ ${expect.width}`));
  if (expect.height && v?.height !== expect.height) issues.push(issue('erro', 'resolucao', `altura ${v?.height} ≠ ${expect.height}`));
  if (expect.fps && v && eval(v.r_frame_rate) !== expect.fps) issues.push(issue('erro', 'fps', `fps ${v.r_frame_rate} ≠ ${expect.fps}`));
  const dur = Number(info.format.duration);
  if (expect.duration && Math.abs(dur - expect.duration) > 0.1) issues.push(issue('aviso', 'duracao', `duração ${dur.toFixed(2)}s ≠ ${expect.duration}s`));
  if (expect.audio && !a) issues.push(issue('erro', 'sem-audio', 'vídeo sem trilha de áudio'));
  return { info: { width: v?.width, height: v?.height, fps: v?.r_frame_rate, duration: dur, video: v?.codec_name, audio: a?.codec_name ?? null }, issues };
}

// 2. Quadros: preto, estourado, congelado, contraste baixo.
export async function checkFrames(framesDir, { frozenRun = 15 } = {}) {
  const files = (await readdir(framesDir)).filter((f) => /\.(jpg|png)$/.test(f)).sort();
  const stats = []; const issues = []; let run = 1, prevHash = null;
  for (const f of files) {
    const buf = await readFile(join(framesDir, f));
    const s = await sharp(buf).greyscale().stats();
    const mean = s.channels[0].mean, std = s.channels[0].stdev;
    // Faixa superior (20% de cima) preta com o resto iluminado = céu/fundo faltando.
    const meta = await sharp(buf).metadata();
    // (stats() do sharp mede a imagem de ENTRADA: o recorte precisa virar buffer antes.)
    const topBuf = await sharp(buf).extract({ left: 0, top: 0, width: meta.width, height: Math.max(1, Math.round(meta.height * 0.2)) }).greyscale().png().toBuffer();
    const top = await sharp(topBuf).stats();
    if (top.channels[0].mean < 6 && mean > 30) issues.push(issue('aviso', 'faixa-superior-preta', `${f}: topo do quadro preto com o resto iluminado (céu/fundo faltando ou cortado pelo camera.far?)`, { frame: f }));
    const hash = createHash('md5').update(await sharp(buf).resize(64, 64, { fit: 'fill' }).greyscale().raw().toBuffer()).digest('hex');
    run = hash === prevHash ? run + 1 : 1; prevHash = hash;
    stats.push({ f, mean: +mean.toFixed(1), std: +std.toFixed(1) });
    if (mean < 8) issues.push(issue('erro', 'quadro-preto', `${f} está preto (luminância ${mean.toFixed(1)})`, { frame: f }));
    else if (mean > 247) issues.push(issue('erro', 'quadro-estourado', `${f} está estourado (luminância ${mean.toFixed(1)})`, { frame: f }));
    else if (std < 4) issues.push(issue('aviso', 'sem-contraste', `${f} quase sem contraste (desvio ${std.toFixed(1)})`, { frame: f }));
    if (run === frozenRun) issues.push(issue('aviso', 'imagem-congelada', `${frozenRun} quadros idênticos seguidos até ${f}`, { frame: f }));
  }
  return { frames: files.length, stats, issues };
}

// 3. Probes da cena: pés atravessando o chão ou flutuando, objetos abaixo do chão,
//    personagem fora do quadro, câmera dentro do chão.
export function checkProbes(probes, rulesIn = {}) {
  const R = ProbeRulesSchema.parse(rulesIn); const issues = []; const seen = new Set();
  const once = (code, frame, msg, extra) => { if (seen.has(code)) return; seen.add(code); issues.push(issue('erro', code, msg, { frame, ...extra })); };
  for (const p of probes) {
    for (const [name, y] of Object.entries(p.feet ?? {})) {
      if (y < R.groundY - R.footTolerance) once(`pe-atravessa-chao:${name}`, p.frame, `pé ${name} ${((R.groundY - y) * 100).toFixed(1)} cm abaixo do chão no quadro ${p.frame}`, { value: y, fix: { param: 'characterYOffset', delta: R.groundY - y } });
    }
    if (p.grounded && p.feet) {
      const minY = Math.min(...Object.values(p.feet));
      if (minY > R.groundY + R.floatTolerance) once('personagem-flutuando', p.frame, `personagem flutuando ${(minY * 100).toFixed(1)} cm acima do chão no quadro ${p.frame}`, { value: minY, fix: { param: 'characterYOffset', delta: -minY } });
    }
    for (const [name, y] of Object.entries(p.objectsMinY ?? {})) if (y < R.groundY - 0.02) once(`objeto-abaixo-chao:${name}`, p.frame, `${name} abaixo do chão (${y.toFixed(3)} m) no quadro ${p.frame}`);
    for (const [name, ndc] of Object.entries(p.onScreen ?? {})) {
      if (Math.abs(ndc[0]) > R.frameEdgeMargin || Math.abs(ndc[1]) > R.frameEdgeMargin || ndc[2] > 1) once(`fora-do-quadro:${name}`, p.frame, `${name} fora do enquadramento no quadro ${p.frame}`);
    }
    if (p.camera && p.camera[1] < R.groundY + 0.05) once('camera-no-chao', p.frame, `câmera dentro/abaixo do chão no quadro ${p.frame}`);
  }
  return { issues };
}

// 4. Sincronia de áudio: para cada cue, mede por correlação de envelope onde o som
//    realmente começou no stem de efeitos (sem música/ambiente) e compara com o tempo pedido.
export function checkAudioSync(stemFile, cues, { tolerance = 0.045 } = {}) {
  const issues = []; const report = [];
  for (const c of cues) {
    if (!c.file) continue;
    const a = alignOffset(stemFile, c.file, c.t);
    report.push({ t: c.t, sound: c.sound, errMs: Math.round(a.offset * 1000), score: a.score });
    if (a.score < 0.5) issues.push(issue('erro', 'audio-ausente', `som "${c.sound}" em ${c.t.toFixed(3)}s não encontrado no áudio (correlação ${a.score})`, { cue: c }));
    else if (Math.abs(a.offset) > tolerance) issues.push(issue('erro', 'audio-fora-de-sincronia', `som "${c.sound}" esperado em ${c.t.toFixed(3)}s está ${Math.round(a.offset * 1000)} ms ${a.offset > 0 ? 'atrasado' : 'adiantado'}`, { cue: c, fix: { param: 'audioOffset', delta: -a.offset } }));
  }
  return { report, issues };
}

// 5. Loudness final (alvo de redes sociais: −14 LUFS, pico ≤ −1 dBTP).
export function checkLoudness(file, { target = -14, tol = 1.5, maxPeak = -1 } = {}) {
  const s = loudnessStats(file); const issues = [];
  if (s.lufs == null) issues.push(issue('aviso', 'loudness', 'não foi possível medir loudness'));
  else if (Math.abs(s.lufs - target) > tol) issues.push(issue('aviso', 'loudness', `loudness ${s.lufs} LUFS (alvo ${target})`));
  if (s.truePeak != null && s.truePeak > maxPeak + 0.5) issues.push(issue('aviso', 'pico', `pico ${s.truePeak} dBFS acima de ${maxPeak}`));
  return { ...s, issues };
}

// 6. Folha de contato: vários quadros numa imagem só, com número do quadro e tempo,
//    para revisão visual rápida (por pessoa ou por modelo com visão).
export async function contactSheet(framesDir, out, { count = 12, cols = 4, thumbWidth = 270, fps = 30 } = {}) {
  const files = (await readdir(framesDir)).filter((f) => /\.(jpg|png)$/.test(f)).sort();
  const pick = [...Array(Math.min(count, files.length))].map((_, i) => files[Math.round((i * (files.length - 1)) / Math.max(1, count - 1))]);
  const meta = await sharp(join(framesDir, pick[0])).metadata();
  const th = Math.round((thumbWidth * meta.height) / meta.width); const label = 26;
  const rows = Math.ceil(pick.length / cols);
  const tiles = await Promise.all(pick.map(async (f, i) => {
    const n = Number(f.match(/\d+/)[0]);
    const svg = Buffer.from(`<svg width="${thumbWidth}" height="${label}"><rect width="100%" height="100%" fill="#111"/><text x="8" y="18" font-family="DejaVu Sans, sans-serif" font-size="15" fill="#fff">#${n}  ${(n / fps).toFixed(2)}s</text></svg>`);
    const img = await sharp(join(framesDir, f)).resize(thumbWidth, th).toBuffer();
    return [{ input: img, left: (i % cols) * thumbWidth, top: Math.floor(i / cols) * (th + label) + label }, { input: svg, left: (i % cols) * thumbWidth, top: Math.floor(i / cols) * (th + label) }];
  }));
  await sharp({ create: { width: cols * thumbWidth, height: rows * (th + label), channels: 3, background: '#000' } }).composite(tiles.flat()).jpeg({ quality: 85 }).toFile(out);
  return { out, frames: pick };
}

// 7. Comparação antes/depois: % de pixels que mudaram e imagem de diferença.
export async function diffImages(a, b, out, { threshold = 24 } = {}) {
  const A = await sharp(a).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const B = await sharp(b).resize(A.info.width, A.info.height).removeAlpha().raw().toBuffer();
  const d = Buffer.alloc(A.data.length); let changed = 0; const px = A.data.length / 3;
  for (let i = 0; i < A.data.length; i += 3) {
    const delta = (Math.abs(A.data[i] - B[i]) + Math.abs(A.data[i + 1] - B[i + 1]) + Math.abs(A.data[i + 2] - B[i + 2])) / 3;
    if (delta > threshold) changed++;
    const v = Math.min(255, delta * 4); d[i] = v; d[i + 1] = v * 0.3; d[i + 2] = 0;
  }
  if (out) await sharp(d, { raw: { width: A.info.width, height: A.info.height, channels: 3 } }).png().toFile(out);
  return { changedPercent: +((changed / px) * 100).toFixed(2), out };
}

export function summarize(sections) {
  const all = sections.flatMap((s) => s.issues ?? []);
  return { ok: !all.some((i) => i.severity === 'erro'), errors: all.filter((i) => i.severity === 'erro'), warnings: all.filter((i) => i.severity === 'aviso') };
}
