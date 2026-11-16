// Configuração central do pipeline de animação 3D.
import { resolve } from 'node:path';

export const ROOT = resolve(import.meta.dirname, '..');

// Chromium pré-instalado no ambiente; pode ser trocado por CHROMIUM_PATH.
export const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';

// Headless + WebGL por software (SwiftShader), pois o ambiente não tem GPU.
export const CHROMIUM_ARGS = [
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
  '--no-sandbox',
];

// Padrões de vídeo e áudio.
export const VIDEO = { fps: 30, width: 1280, height: 720, codec: 'libx264', pixFmt: 'yuv420p', crf: 18, preset: 'medium' };
export const AUDIO = { codec: 'aac', bitrate: '192k', sampleRate: 48000, loudnessLUFS: -14 };
