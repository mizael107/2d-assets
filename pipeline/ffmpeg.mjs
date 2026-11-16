// FFmpeg: quadros -> MP4, processamento de áudio e mixagem final.
import { execFileSync } from 'node:child_process';
import { VIDEO, AUDIO } from './config.mjs';

const run = (args) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args]);

// Sequência de PNGs (ex.: dir/f%05d.png) -> MP4 H.264.
export function framesToMp4(pattern, out, { fps = VIDEO.fps, crf = VIDEO.crf, preset = VIDEO.preset } = {}) {
  run(['-framerate', String(fps), '-i', pattern, '-c:v', VIDEO.codec, '-pix_fmt', VIDEO.pixFmt,
    '-crf', String(crf), '-preset', preset, '-movflags', '+faststart', out]);
  return out;
}

// Normaliza volume (EBU R128) e converte para AAC.
export function normalizeAudio(input, out, { lufs = AUDIO.loudnessLUFS } = {}) {
  run(['-i', input, '-af', `loudnorm=I=${lufs}:TP=-1.5:LRA=11`, '-ar', String(AUDIO.sampleRate),
    '-c:a', AUDIO.codec, '-b:a', AUDIO.bitrate, out]);
  return out;
}

// Mixa várias trilhas (narração, música, efeitos), cada uma com volume e atraso em ms.
export function mixAudio(tracks, out, { duration = 'longest' } = {}) {
  const inputs = tracks.flatMap((t) => ['-i', t.file]);
  const chains = tracks.map((t, i) => `[${i}:a]volume=${t.volume ?? 1},adelay=${t.delayMs ?? 0}:all=1[a${i}]`);
  const mix = `${tracks.map((_, i) => `[a${i}]`).join('')}amix=inputs=${tracks.length}:duration=${duration}:normalize=0[out]`;
  run([...inputs, '-filter_complex', [...chains, mix].join(';'), '-map', '[out]',
    '-ar', String(AUDIO.sampleRate), '-c:a', AUDIO.codec, '-b:a', AUDIO.bitrate, out]);
  return out;
}

// Junta vídeo e áudio num MP4 final.
export function muxVideoAudio(video, audio, out) {
  run(['-i', video, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', AUDIO.codec,
    '-b:a', AUDIO.bitrate, '-shortest', '-movflags', '+faststart', out]);
  return out;
}

// Informações de um arquivo de mídia (duração e streams).
export function probe(file) {
  const json = execFileSync('ffprobe', ['-v', 'error', '-show_entries',
    'format=duration:stream=codec_type,codec_name,width,height,sample_rate,r_frame_rate', '-of', 'json', file]);
  return JSON.parse(json);
}
