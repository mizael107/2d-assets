// (Node) Análise de áudio: decodificação, envelope (para sincronização labial),
// detecção de ataques (onsets, para verificar sincronia som-imagem) e loudness.
import { execFileSync } from 'node:child_process';

export function decodeMono(file, sampleRate = 16000) {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(sampleRate), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  return { pcm: new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4), sampleRate };
}

// Volume (RMS) por quadro, normalizado 0..1 — alimenta a boca do personagem.
export function envelope(file, fps = 30, { gate = 0.08, smooth = 0.5 } = {}) {
  const { pcm, sampleRate } = decodeMono(file);
  const hop = Math.round(sampleRate / fps); const out = [];
  for (let i = 0; i < pcm.length; i += hop) {
    let s = 0; const end = Math.min(pcm.length, i + hop);
    for (let j = i; j < end; j++) s += pcm[j] * pcm[j];
    out.push(Math.sqrt(s / Math.max(1, end - i)));
  }
  const peak = Math.max(...out, 1e-9);
  let prev = 0;
  return out.map((v) => { const n = Math.max(0, v / peak - gate) / (1 - gate); prev = prev * smooth + n * (1 - smooth); return +prev.toFixed(3); });
}

// Ataques: momentos em que a energia sobe bruscamente (início de cada som).
export function onsets(file, { windowMs = 10, ratio = 4, minGapMs = 80, floor = 0.02 } = {}) {
  const { pcm, sampleRate } = decodeMono(file);
  const w = Math.round((sampleRate * windowMs) / 1000); const e = [];
  for (let i = 0; i + w <= pcm.length; i += w) { let s = 0; for (let j = i; j < i + w; j++) s += pcm[j] * pcm[j]; e.push(Math.sqrt(s / w)); }
  const out = []; let last = -Infinity;
  for (let k = 3; k < e.length; k++) {
    const before = (e[k - 1] + e[k - 2] + e[k - 3]) / 3 + 1e-6;
    const t = (k * windowMs) / 1000;
    if (e[k] > floor && e[k] / before > ratio && (t - last) * 1000 > minGapMs) { out.push(+t.toFixed(3)); last = t; }
  }
  return out;
}

// Loudness integrado (LUFS) e pico verdadeiro (dBTP), padrão EBU R128.
export function loudnessStats(file) {
  const res = execFileSync('bash', ['-c', 'ffmpeg -hide_banner -nostats -i "$1" -af ebur128=peak=true -f null - 2>&1 | tail -14', '_', file], { encoding: 'utf8' });
  const I = res.match(/I:\s+(-?[\d.]+) LUFS/); const peak = res.match(/Peak:\s+(-?[\d.]+) dBFS/);
  return { lufs: I ? +I[1] : null, truePeak: peak ? +peak[1] : null };
}

// Alinhamento por correlação de envelope: mede onde o som esperado realmente está no
// áudio mixado, perto do tempo t. Funciona com sons sem ataque brusco (whoosh, vento)
// e já desconta silêncio no início do arquivo. Retorna o atraso em segundos.
const envCache = new Map();
function env10ms(file) {
  if (envCache.has(file)) return envCache.get(file);
  const { pcm, sampleRate } = decodeMono(file); const w = Math.round(sampleRate / 100); const e = [];
  for (let i = 0; i + w <= pcm.length; i += w) { let s = 0; for (let j = i; j < i + w; j++) s += pcm[j] * pcm[j]; e.push(Math.sqrt(s / w)); }
  envCache.set(file, e); return e;
}
export function alignOffset(mixFile, soundFile, t, { search = 0.3 } = {}) {
  const mix = env10ms(mixFile), snd = env10ms(soundFile).slice(0, 80); // primeiros 800 ms do som
  const base = Math.round(t * 100), R = Math.round(search * 100); let best = -Infinity, bestLag = null;
  const norm = Math.sqrt(snd.reduce((a, v) => a + v * v, 0)) || 1;
  for (let lag = -R; lag <= R; lag++) {
    let dot = 0, mm = 0;
    for (let k = 0; k < snd.length; k++) { const m = mix[base + lag + k] ?? 0; dot += m * snd[k]; mm += m * m; }
    const score = dot / (norm * (Math.sqrt(mm) || 1));
    if (score > best) { best = score; bestLag = lag; }
  }
  return { offset: bestLag / 100, score: +best.toFixed(3) };
}
