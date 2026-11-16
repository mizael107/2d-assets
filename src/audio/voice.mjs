// (Node) Voz-guia provisória com espeak-ng (offline, pt-BR).
// Serve para montar animatics, testar tempo de fala e sincronização labial antes de
// ter a narração final (gravada ou feita num serviço como ElevenLabs).
// A voz é robótica: NÃO é para o vídeo final.
import { execFileSync } from 'node:child_process';

export function guideVoice(text, out, { voice = 'pt-br', wpm = 165, pitch = 45 } = {}) {
  const raw = out.replace(/\.wav$/, '.raw.wav');
  execFileSync('espeak-ng', ['-v', voice, '-s', String(wpm), '-p', String(pitch), '-w', raw, text]);
  // Normaliza para 48 kHz e tira silêncio do início.
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,aresample=48000', out]);
  execFileSync('rm', ['-f', raw]);
  return out;
}
