// (Navegador) Sons procedurais com Tone.js, renderizados offline (sem tocar ao vivo).
// Servem como sons provisórios ou finais estilizados quando não há gravação: passos,
// impactos, vento, chuva, fogo, água, whoosh, porta, pássaro e trilha ambiente.
// Tone é carregado como script global (window.Tone) pela página do estúdio.
const T = () => window.Tone;

export const SYNTH_PRESETS = {
  passo: { seconds: 0.35, category: 'footsteps' },
  impacto: { seconds: 1.2, category: 'impacts' },
  whoosh: { seconds: 0.9, category: 'impacts' },
  vento: { seconds: 6, category: 'weather', loop: true },
  chuva: { seconds: 6, category: 'weather', loop: true },
  fogo: { seconds: 6, category: 'ambience', loop: true },
  agua: { seconds: 3, category: 'ambience' },
  porta: { seconds: 1.4, category: 'impacts' },
  passaro: { seconds: 1.5, category: 'animals' },
  trilha: { seconds: 8, category: 'music', loop: true },
};

const builders = {
  passo: (Tone) => {
    const f = new Tone.Filter(900, 'bandpass').toDestination(); f.Q.value = 1.2;
    new Tone.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: 0.002, decay: 0.09, sustain: 0 } }).connect(f).triggerAttackRelease(0.1, 0.01, 0.9);
    new Tone.MembraneSynth({ pitchDecay: 0.02, octaves: 2, envelope: { attack: 0.001, decay: 0.08, sustain: 0 } }).toDestination().triggerAttackRelease('G1', 0.08, 0.01, 0.5);
  },
  impacto: (Tone) => {
    const rev = new Tone.Reverb({ decay: 1.2, wet: 0.25 }).toDestination();
    new Tone.MembraneSynth({ pitchDecay: 0.08, octaves: 5, envelope: { attack: 0.001, decay: 0.5, sustain: 0 } }).connect(rev).triggerAttackRelease('C1', 0.5, 0.005, 1);
    const f = new Tone.Filter(2500, 'lowpass').connect(rev);
    new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.001, decay: 0.25, sustain: 0 } }).connect(f).triggerAttackRelease(0.25, 0.005, 0.8);
  },
  whoosh: (Tone) => {
    const f = new Tone.Filter(300, 'bandpass').toDestination(); f.Q.value = 2;
    f.frequency.setValueAtTime(300, 0); f.frequency.exponentialRampToValueAtTime(3000, 0.45); f.frequency.exponentialRampToValueAtTime(500, 0.85);
    new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.35, decay: 0.4, sustain: 0 } }).connect(f).triggerAttackRelease(0.8, 0, 0.9);
  },
  vento: (Tone, d) => {
    const f = new Tone.AutoFilter({ frequency: 0.15, baseFrequency: 250, octaves: 2.5 }).toDestination().start();
    const n = new Tone.Noise('pink').connect(f); n.volume.value = -8; n.start(0).stop(d);
  },
  chuva: (Tone, d) => {
    const hp = new Tone.Filter(1800, 'highpass').toDestination();
    const n = new Tone.Noise('white').connect(hp); n.volume.value = -14; n.start(0).stop(d);
    const drops = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.02, sustain: 0 } }).connect(new Tone.Filter(4000, 'highpass').toDestination());
    for (let t = 0.02; t < d - 0.05; t += 0.035 + 0.04 * Math.abs(Math.sin(t * 91))) drops.triggerAttackRelease(0.02, t, 0.15 + 0.2 * Math.abs(Math.sin(t * 37)));
  },
  fogo: (Tone, d) => {
    const lp = new Tone.Filter(600, 'lowpass').toDestination();
    const n = new Tone.Noise('brown').connect(lp); n.volume.value = -6; n.start(0).stop(d);
    const crack = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.015, sustain: 0 } }).connect(new Tone.Filter(2000, 'highpass').toDestination());
    for (let t = 0.05; t < d - 0.05; t += 0.06 + 0.3 * Math.abs(Math.sin(t * 53))) crack.triggerAttackRelease(0.015, t, 0.3 + 0.5 * Math.abs(Math.sin(t * 13)));
  },
  agua: (Tone, d) => {
    const s = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.005, decay: 0.08, sustain: 0, release: 0.05 } }).connect(new Tone.Reverb({ decay: 0.8, wet: 0.3 }).toDestination());
    for (let t = 0.05, i = 0; t < d - 0.2; t += 0.09 + 0.15 * Math.abs(Math.sin(i * 7.7)), i++) {
      const f0 = 400 + 600 * Math.abs(Math.sin(i * 3.3));
      s.triggerAttackRelease(f0, 0.08, t, 0.5); s.frequency.setValueAtTime(f0, t); s.frequency.exponentialRampToValueAtTime(f0 * 2.2, t + 0.07);
    }
  },
  porta: (Tone) => {
    const s = new Tone.FMSynth({ harmonicity: 2.5, modulationIndex: 12, envelope: { attack: 0.1, decay: 0.9, sustain: 0.2, release: 0.2 } }).connect(new Tone.Filter(1500, 'lowpass').toDestination());
    s.triggerAttackRelease('A2', 0.9, 0, 0.35); s.frequency.setValueAtTime(110, 0); s.frequency.linearRampToValueAtTime(150, 0.9);
    new Tone.MembraneSynth({ octaves: 3, envelope: { attack: 0.001, decay: 0.3, sustain: 0 } }).toDestination().triggerAttackRelease('D1', 0.3, 1.0, 0.9);
  },
  passaro: (Tone) => {
    const s = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.005, decay: 0.05, sustain: 0.3, release: 0.03 } }).toDestination();
    [[0.05, 3200, 4200], [0.2, 3000, 4600], [0.4, 3400, 2800], [0.7, 3600, 4400], [0.85, 3600, 4400]].forEach(([t, a, b]) => {
      s.triggerAttackRelease(a, 0.09, t, 0.4); s.frequency.setValueAtTime(a, t); s.frequency.exponentialRampToValueAtTime(b, t + 0.08);
    });
  },
  trilha: (Tone) => {
    const rev = new Tone.Reverb({ decay: 3, wet: 0.45 }).toDestination();
    const pad = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.6, decay: 0.3, sustain: 0.6, release: 1.2 } }).connect(rev);
    pad.volume.value = -10;
    [['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['C3', 'E3', 'G3'], ['G3', 'B3', 'D4']].forEach((ch, i) => pad.triggerAttackRelease(ch, 1.7, i * 2, 0.6));
    const bell = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.005, decay: 0.6, sustain: 0, release: 0.4 } }).connect(rev);
    ['E5', 'C5', 'G4', 'D5'].forEach((n, i) => bell.triggerAttackRelease(n, 0.5, i * 2 + 1, 0.25));
  },
};

// Gera um som e devolve WAV (base64), pronto para salvar no Node.
export async function renderSynth(name, { seconds, sampleRate = 44100 } = {}) {
  const Tone = T(); const d = seconds ?? SYNTH_PRESETS[name].seconds;
  const buffer = await Tone.Offline(() => builders[name](Tone, d), d, 1, sampleRate);
  return audioBufferToWavBase64(buffer.get());
}

export function audioBufferToWavBase64(ab) {
  const ch = ab.numberOfChannels, sr = ab.sampleRate, n = ab.length;
  const data = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); data.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true); data.setUint32(24, sr, true);
  data.setUint32(28, sr * ch * 2, true); data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true); w(36, 'data'); data.setUint32(40, n * ch * 2, true);
  const chans = [...Array(ch)].map((_, c) => ab.getChannelData(c)); let off = 44, peak = 0;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) peak = Math.max(peak, Math.abs(chans[c][i]));
  const norm = peak > 0.98 ? 0.98 / peak : 1;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, chans[c][i] * norm)); data.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true); off += 2; }
  let bin = ''; const bytes = new Uint8Array(data.buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return { base64: btoa(bin), seconds: n / sr, peak };
}
