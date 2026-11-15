// Biblioteca de movimentos procedurais para o humanoide (src/characters/humanoid.js).
// Cada função devolve um THREE.AnimationClip tocável com AnimationMixer e exportável em GLB.
//
// Convenção: o personagem olha para +Z. Rotação X negativa na coxa = perna para a frente.
// O deslocamento no mundo (andar pela cena) é feito pelo objeto raiz; use speedFor()
// para casar velocidade e passada e evitar "pé deslizando".
import * as THREE from 'three';
import { HUMANOID_DIMENSIONS as D } from '../characters/humanoid.js';

const LEG = D.thigh + D.shin;
const qx = (a) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), a);
const qz = (a) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), a);
const qxyz = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));

// Amostra uma função de pose (t -> { osso: quaternion, hipsY? }) em keyframes.
function sampleClip(name, duration, fps, poseAt) {
  const n = Math.max(2, Math.round(duration * fps) + 1);
  const times = [], rot = {}, hipsPos = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * duration; times.push(t);
    const pose = poseAt(t);
    for (const [bone, q] of Object.entries(pose.rot)) (rot[bone] ??= []).push(q.x, q.y, q.z, q.w);
    hipsPos.push(pose.hips?.x ?? 0, pose.hips?.y ?? D.hipsY, pose.hips?.z ?? 0);
  }
  const tracks = Object.entries(rot).map(([b, v]) => new THREE.QuaternionKeyframeTrack(`${b}.quaternion`, times, v));
  tracks.push(new THREE.VectorKeyframeTrack('hips.position', times, hipsPos));
  return new THREE.AnimationClip(name, duration, tracks);
}

// Ciclo de locomoção (andar/correr). Quadril baixa para manter o pé de apoio no chão.
function locomotion(name, { period, thighAmp, kneeLift, armAmp, lean, bounce = 0 }) {
  const w = (2 * Math.PI) / period;
  return sampleClip(name, period, 60, (t) => {
    const ph = w * t;
    const thL = -thighAmp * Math.sin(ph), thR = thighAmp * Math.sin(ph);
    // Joelho dobra enquanto a perna vai para a frente (fase de balanço).
    const swingL = Math.max(0, Math.cos(ph)), swingR = Math.max(0, -Math.cos(ph));
    const kneeL = kneeLift * swingL, kneeR = kneeLift * swingR;
    // Perna de apoio = a que não está em balanço; quadril cai para o pé tocar o chão.
    const stanceTh = swingL > swingR ? thR : thL;
    const drop = LEG * (1 - Math.cos(stanceTh));
    return {
      hips: { y: D.hipsY - drop + bounce * Math.abs(Math.sin(ph)) },
      rot: {
        hips: qxyz(0, 0.08 * Math.sin(ph), 0),
        spine: qx(lean * 0.5), chest: qxyz(lean * 0.5, -0.12 * Math.sin(ph), 0),
        thigh_L: qx(thL - kneeL * 0.25), shin_L: qx(kneeL), foot_L: qx(-thL * 0.3),
        thigh_R: qx(thR - kneeR * 0.25), shin_R: qx(kneeR), foot_R: qx(-thR * 0.3),
        upperArm_L: qxyz(armAmp * Math.sin(ph), 0, 0.08), foreArm_L: qx(-0.25 - 0.2 * Math.max(0, Math.sin(ph))),
        upperArm_R: qxyz(-armAmp * Math.sin(ph), 0, -0.08), foreArm_R: qx(-0.25 - 0.2 * Math.max(0, -Math.sin(ph))),
        neck: qx(-lean * 0.4), head: qx(0),
      },
    };
  });
}

export const MOTION_PARAMS = {
  walk: { period: 1.1, thighAmp: 0.36, kneeLift: 0.7, armAmp: 0.4, lean: 0.04 },
  run: { period: 0.62, thighAmp: 0.62, kneeLift: 1.3, armAmp: 0.9, lean: 0.22, bounce: 0.05 },
};

// Velocidade de deslocamento (m/s) que casa com a passada do ciclo (pé não desliza).
export function speedFor(kind = 'walk', scale = 1) {
  const p = MOTION_PARAMS[kind];
  return (4 * LEG * Math.sin(p.thighAmp) / p.period) * scale;
}

// Momentos em que cada calcanhar toca o chão (para sincronizar sons de passos).
export function footstepTimes(kind, start, end) {
  const p = MOTION_PARAMS[kind]; const out = [];
  // Pé esquerdo toca quando está todo à frente (sin(ph) = 1 → 1/4 do ciclo); direito em 3/4.
  for (let k = 0; ; k++) {
    const tL = start + (0.25 + k) * p.period, tR = start + (0.75 + k) * p.period;
    if (tL > end) break; out.push({ t: tL, foot: 'L' }); if (tR <= end) out.push({ t: tR, foot: 'R' });
  }
  return out;
}

export const motions = {
  walk: () => locomotion('andar', MOTION_PARAMS.walk),
  run: () => locomotion('correr', MOTION_PARAMS.run),

  idle: (duration = 3) => sampleClip('parado', duration, 30, (t) => {
    const b = Math.sin((t / duration) * Math.PI * 2);
    return { hips: { y: D.hipsY - 0.004 * (1 + b) }, rot: {
      chest: qx(0.02 * b), head: qxyz(0.03 * Math.sin(t * 1.3), 0.06 * Math.sin(t * 0.7), 0),
      upperArm_L: qz(0.06 + 0.01 * b), upperArm_R: qz(-0.06 - 0.01 * b),
      foreArm_L: qx(-0.12), foreArm_R: qx(-0.12),
    } };
  }),

  // Pulo completo: agacha, impulsiona, voa, aterrissa e amortece (1,1 s).
  jump: ({ height = 0.45 } = {}) => sampleClip('pular', 1.1, 60, (t) => {
    const crouch = t < 0.25 ? Math.sin((t / 0.25) * Math.PI / 2) : t < 0.33 ? 1 - (t - 0.25) / 0.08 : t > 0.85 ? Math.sin(((t - 0.85) / 0.25) * Math.PI) : 0;
    const air = t >= 0.3 && t <= 0.85 ? (t - 0.3) / 0.55 : -1;
    const y = air >= 0 ? 4 * height * air * (1 - air) : 0;
    const k = 0.9 * crouch;
    return { hips: { y: D.hipsY - 0.14 * crouch + y }, rot: {
      spine: qx(0.25 * crouch), chest: qx(0.1 * crouch),
      thigh_L: qx(-k), shin_L: qx(2 * k), foot_L: qx(-k),
      thigh_R: qx(-k), shin_R: qx(2 * k), foot_R: qx(-k),
      upperArm_L: qx(air >= 0 ? -2.4 * Math.sin(air * Math.PI) : 0.6 * crouch), upperArm_R: qx(air >= 0 ? -2.4 * Math.sin(air * Math.PI) : 0.6 * crouch),
    } };
  }),

  // Queda para a frente (tropeço), termina deitado de bruços (1,4 s).
  fall: () => sampleClip('cair', 1.4, 60, (t) => {
    const a = Math.min(1, t / 0.9), e = a * a;
    const land = t > 0.9 ? Math.min(1, (t - 0.9) / 0.15) : 0;
    return { hips: { y: D.hipsY - (D.hipsY - 0.16) * e, z: 0.7 * e }, rot: {
      hips: qx(1.45 * e), spine: qx(-0.15 * e), neck: qx(-0.5 * e),
      upperArm_L: qx(-2.6 * Math.min(1, a * 1.6)), upperArm_R: qx(-2.6 * Math.min(1, a * 1.6)),
      foreArm_L: qx(-0.3 * land), foreArm_R: qx(-0.3 * land),
      thigh_L: qx(-0.5 * Math.sin(a * Math.PI) ), shin_L: qx(0.6 * e), thigh_R: qx(0.2 * e), shin_R: qx(0.4 * e),
    } };
  }),

  // Acenar com a mão direita.
  wave: (duration = 2) => sampleClip('acenar', duration, 30, (t) => {
    const up = Math.min(1, t / 0.3) * Math.min(1, (duration - t) / 0.3);
    return { rot: {
      upperArm_R: qxyz(0, 0, 2.6 * up), foreArm_R: qxyz(0, 0, 0.5 * up * Math.sin(t * 14)),
      upperArm_L: qz(0.06), head: qz(-0.08 * up),
    } };
  }),

  // Mãos na cabeça (desespero), como na referência.
  panic: (duration = 1.5) => sampleClip('panico', duration, 30, (t) => {
    const u = Math.min(1, t / 0.25);
    const shake = 0.04 * Math.sin(t * 30) * u;
    return { rot: {
      upperArm_L: qxyz(-0.9 * u, 0, 2.3 * u), foreArm_L: qxyz(0, 0, 1.6 * u),
      upperArm_R: qxyz(-0.9 * u, 0, -2.3 * u), foreArm_R: qxyz(0, 0, -1.6 * u),
      head: qxyz(shake, shake * 2, 0), spine: qx(0.08 * u),
    } };
  }),

  // Braço esticado lançando magia / apontando.
  cast: (duration = 1.5) => sampleClip('feitico', duration, 30, (t) => {
    const u = Math.min(1, t / 0.3);
    return { rot: { upperArm_R: qxyz(-1.5 * u, 0, -0.1), foreArm_R: qx(0), chest: qxyz(0, -0.25 * u, 0), upperArm_L: qz(0.15) } };
  }),
};

// Mistura vários clipes no mesmo personagem com transições (crossfade) determinísticas.
// plan: [{ clip, start, end?, fade = 0.25, loop = true }]
export function createMotionPlayer(character, plan) {
  const mixer = new THREE.AnimationMixer(character.mesh);
  const items = plan.map((p) => {
    const action = mixer.clipAction(p.clip);
    action.setLoop(p.loop === false ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = true;
    action.play(); action.setEffectiveWeight(0);
    return { ...p, fade: p.fade ?? 0.25, action };
  });
  return {
    mixer,
    // Posiciona a animação exatamente no tempo t (sem depender de quadros anteriores).
    update(t) {
      for (const it of items) {
        const end = it.end ?? Infinity;
        const fin = Math.min(1, Math.max(0, (t - it.start) / it.fade));
        const fout = end === Infinity ? 1 : Math.min(1, Math.max(0, (end - t) / it.fade));
        const w = Math.max(0, Math.min(fin, fout));
        it.action.setEffectiveWeight(w);
        const local = Math.max(0, t - it.start);
        const d = it.clip.duration;
        it.action.time = it.loop === false ? Math.min(local, d) : local % d;
      }
      mixer.update(0);
    },
  };
}
