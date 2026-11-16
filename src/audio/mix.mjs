// (Node) Mixagem e composição final de áudio com FFmpeg.
//
//   await mixScene({
//     duration: 8,
//     beds: [{ file: 'assets/sounds/music/proc-trilha.wav', gain: 0.35, loop: true, fadeIn: 1, fadeOut: 1.5 }],
//     narration: { file: 'voz.wav', at: 0.5, gain: 1, duck: true },      // abaixa a música sob a voz
//     cues: [{ file: 'impacto.wav', t: 2.43, gain: 0.9, reverb: 0.2, lowpass: 3000 }],
//     out: 'mix.wav', stems: true,                                          // grava também o stem de efeitos
//   })
import { execFileSync } from 'node:child_process';

const ff = (args) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args]);

// Cadeia de filtros por som: volume, filtros, reverb (aecho), fade, atraso.
function chain(input, label, { gain = 1, lowpass, highpass, reverb = 0, delayMs = 0, fadeIn = 0, fadeOut = 0, duration, loop = false, pan }) {
  const f = [];
  if (loop) f.push('aloop=loop=-1:size=2e9');
  if (duration) f.push(`atrim=0:${duration}`, 'asetpts=PTS-STARTPTS');
  f.push('aformat=sample_rates=48000:channel_layouts=stereo');
  if (highpass) f.push(`highpass=f=${highpass}`);
  if (lowpass) f.push(`lowpass=f=${lowpass}`);
  if (reverb > 0) f.push(`aecho=0.8:${(0.6 + reverb * 0.3).toFixed(2)}:60|110|170:${(reverb * 0.6).toFixed(2)}|${(reverb * 0.4).toFixed(2)}|${(reverb * 0.25).toFixed(2)}`);
  if (pan !== undefined) f.push(`pan=stereo|c0=${(1 - Math.max(0, pan)).toFixed(2)}*c0|c1=${(1 + Math.min(0, pan)).toFixed(2)}*c1`);
  f.push(`volume=${gain}`);
  if (fadeIn) f.push(`afade=t=in:st=0:d=${fadeIn}`);
  if (fadeOut && duration) f.push(`afade=t=out:st=${Math.max(0, duration - fadeOut)}:d=${fadeOut}`);
  if (delayMs) f.push(`adelay=${Math.round(delayMs)}:all=1`);
  return `[${input}:a]${f.join(',')}[${label}]`;
}

function mixGraph(items, outLabel, duration) {
  if (!items.length) return [`anullsrc=r=48000:cl=stereo,atrim=0:${duration}[${outLabel}]`];
  if (items.length === 1) return [`[${items[0]}]apad=whole_dur=${duration},atrim=0:${duration}[${outLabel}]`];
  return [`${items.map((l) => `[${l}]`).join('')}amix=inputs=${items.length}:duration=longest:normalize=0,apad=whole_dur=${duration},atrim=0:${duration}[${outLabel}]`];
}

export function mixScene({ duration, beds = [], narration = null, cues = [], out, stems = false, loudness = -14, limiter = true }) {
  const inputs = []; const filters = []; const bedL = [], sfxL = [];
  const addIn = (file) => { inputs.push('-i', file); return inputs.length / 2 - 1; };
  beds.forEach((b, i) => { const k = addIn(b.file); filters.push(chain(k, `bed${i}`, { ...b, duration: b.loop ? duration : b.duration, delayMs: (b.at ?? 0) * 1000 })); bedL.push(`bed${i}`); });
  cues.forEach((c, i) => { const k = addIn(c.file); filters.push(chain(k, `sfx${i}`, { ...c, delayMs: c.t * 1000 })); sfxL.push(`sfx${i}`); });
  let narrL = null;
  if (narration) { const k = addIn(narration.file); filters.push(chain(k, 'narr', { ...narration, delayMs: (narration.at ?? 0) * 1000 })); narrL = 'narr'; }

  filters.push(...mixGraph(bedL, 'beds', duration), ...mixGraph(sfxL, 'sfx', duration));
  let musicOut = 'beds';
  if (narrL) {
    filters.push(`[narr]apad=whole_dur=${duration},atrim=0:${duration},asplit=2[narrA][narrSC]`);
    if (narration.duck !== false && bedL.length) { filters.push('[beds][narrSC]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[ducked]'); musicOut = 'ducked'; }
    else filters.push('[narrSC]anullsink');
  }
  if (stems) filters.push('[sfx]asplit=2[sfxMix][sfxStem]'); else filters.push('[sfx]anull[sfxMix]');
  const final = [musicOut, 'sfxMix', narrL ? 'narrA' : null].filter(Boolean);
  filters.push(`${final.map((l) => `[${l}]`).join('')}amix=inputs=${final.length}:duration=longest:normalize=0,aresample=48000,atrim=0:${duration}[mix]`);
  const outArgs = ['-map', '[mix]', '-ar', '48000', '-c:a', out.endsWith('.wav') ? 'pcm_s16le' : 'aac', out];
  const stemOut = stems ? out.replace(/(\.\w+)$/, '.sfx-stem.wav') : null;
  if (stems) outArgs.push('-map', '[sfxStem]', '-ar', '48000', '-c:a', 'pcm_s16le', stemOut);
  const pre = out.replace(/(\.\w+)$/, '.pre.wav');
  outArgs[outArgs.indexOf(out)] = pre; outArgs[outArgs.indexOf('-c:a') + 1] = 'pcm_s16le';
  ff([...inputs, '-filter_complex', filters.join(';'), ...outArgs]);
  normalizeLoudness(pre, out, { target: loudness, limiter });
  execFileSync('rm', ['-f', pre]);
  return { out, stem: stemOut };
}

// Normalização em duas passadas: mede o loudness real e aplica o ganho exato, com limitador.
// (Mais precisa que loudnorm de uma passada, que erra em trechos curtos.)
export function normalizeLoudness(input, out, { target = -14, limiter = true } = {}) {
  const r = execFileSync('bash', ['-c', 'ffmpeg -hide_banner -nostats -i "$1" -af ebur128 -f null - 2>&1 | tail -12', '_', input], { encoding: 'utf8' });
  const m = r.match(/I:\s+(-?[\d.]+) LUFS/); const measured = m ? +m[1] : target;
  const gain = Math.max(-30, Math.min(30, target - measured));
  const af = `volume=${gain.toFixed(2)}dB${limiter ? ',alimiter=limit=0.89:level=false' : ''}`;
  ff(['-i', input, '-af', af, '-ar', '48000', '-c:a', out.endsWith('.wav') ? 'pcm_s16le' : 'aac', out]);
  return { measured, gain };
}

// Aplica efeitos a um arquivo isolado (filtro, reverb, volume, velocidade).
export function processSound(input, out, { gain = 1, lowpass, highpass, reverb = 0, speed } = {}) {
  const c = chain(0, 'o', { gain, lowpass, highpass, reverb });
  const g = speed ? `${c};[o]atempo=${speed}[o2]` : c;
  ff(['-i', input, '-filter_complex', g, '-map', speed ? '[o2]' : '[o]', out]);
  return out;
}
