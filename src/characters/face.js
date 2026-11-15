// Controle de rosto: piscadas, expressões e sincronização labial.
// Funciona com o humanoide procedural (olhos/sobrancelhas/boca como malhas) e com
// personagens VRM (expressionManager: 'blink', 'happy', 'aa', 'ih', 'ou', 'ee', 'oh').
import { rng } from '../utils/random.js';

export const EXPRESSIONS = {
  neutro: { brow: 0, browTilt: 0, mouthW: 1, smile: 0 },
  feliz: { brow: 0.01, browTilt: -0.1, mouthW: 1.3, smile: 1 },
  bravo: { brow: -0.015, browTilt: 0.45, mouthW: 0.8, smile: -0.3 },
  surpreso: { brow: 0.03, browTilt: -0.15, mouthW: 0.7, smile: 0, open: 0.8 },
  triste: { brow: 0.005, browTilt: -0.4, mouthW: 0.9, smile: -0.6 },
  concentrado: { brow: -0.012, browTilt: 0.25, mouthW: 0.6, smile: 0 },
};

// Piscadas naturais: intervalos aleatórios (com semente) de 2 a 5 s, 0,15 s cada.
export function blinkSchedule(duration, seed = 7) {
  const r = rng(seed); const out = []; let t = r.range(0.4, 1.5);
  while (t < duration) { out.push(t); t += r.range(2, 5); if (r() < 0.15) out.push(t - 0.25); }
  return out.sort((a, b) => a - b);
}
const blinkAmount = (t, times, len = 0.15) => {
  for (const b of times) { const d = t - b; if (d >= 0 && d <= len) return Math.sin((d / len) * Math.PI); }
  return 0;
};

// envelope: array de 0..1 por quadro (de src/audio/analyze.mjs → envelope()).
export function createFaceController(target, { duration = 60, seed = 7, envelope = null, fps = 30 } = {}) {
  const blinks = blinkSchedule(duration, seed);
  let expression = EXPRESSIONS.neutro;
  const timeline = []; // [{ t, name }]
  const isVRM = !!target.expressionManager;
  const exprAt = (t) => { let e = expression; for (const k of timeline) if (t >= k.t) e = EXPRESSIONS[k.name]; return e; };
  return {
    blinks,
    setExpression(name, at = 0) { timeline.push({ t: at, name }); timeline.sort((a, b) => a.t - b.t); },
    update(t) {
      const e = exprAt(t);
      const blink = blinkAmount(t, blinks);
      const talk = envelope ? envelope[Math.min(envelope.length - 1, Math.max(0, Math.round(t * fps)))] ?? 0 : 0;
      const open = Math.max(e.open ?? 0, talk);
      if (isVRM) {
        const m = target.expressionManager;
        m.setValue('blink', blink);
        m.setValue('happy', Math.max(0, e.smile)); m.setValue('angry', e === EXPRESSIONS.bravo ? 1 : 0);
        m.setValue('sad', e === EXPRESSIONS.triste ? 1 : 0); m.setValue('surprised', e === EXPRESSIONS.surpreso ? 1 : 0);
        m.setValue('aa', open);
        return { blink, open };
      }
      const { eyes, brows, mouth } = target;
      for (const s of ['L', 'R']) {
        eyes[s].scale.y = 1.15 * (1 - 0.92 * blink);
        brows[s].userData.base ??= brows[s].position.y;
        brows[s].position.y = brows[s].userData.base + e.brow;
        brows[s].rotation.z = (s === 'L' ? 1 : -1) * -e.browTilt;
      }
      mouth.scale.x = e.mouthW;
      mouth.scale.y = 0.12 + 0.9 * open + 0.05 * Math.abs(e.smile);
      mouth.rotation.z = 0;
      return { blink, open };
    },
  };
}
