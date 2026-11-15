// Diretor de câmera: movimentos cinematográficos reutilizáveis, todos determinísticos.
//
// Uso:
//   const dir = createCameraDirector(camera);
//   dir.shot(0, { pos: [0, 1.6, 6], look: [0, 1, 0], fov: 40 });  // corte seco
//   dir.dollyIn(0, 3, { distance: 2.5 });                          // aproxima 2,5 m
//   dir.orbit(3, 2, { center: [0, 1, 0], degrees: 45 });
//   dir.follow(5, 4, character, { offset: [0, 1.5, -3] });          // acompanha personagem
//   ...no update(t): dir.update(t, dt)
//
// Cada movimento é uma tween GSAP numa timeline pausada; follow é calculado a cada quadro.
import * as THREE from 'three';
import { gsap } from 'gsap';
import { damp } from '../utils/math.js';

const V = (a) => (Array.isArray(a) ? new THREE.Vector3(...a) : a.clone());

export function createCameraDirector(camera, { defaultEase = 'power2.inOut' } = {}) {
  const tl = gsap.timeline({ paused: true });
  // Estado animável (números simples para o GSAP interpolar).
  const s = { px: 0, py: 1.6, pz: 6, tx: 0, ty: 1, tz: 0, fov: camera.fov, roll: 0, focus: 5 };
  const follows = []; // { start, end, target, offset, lookOffset, smooth }
  const shake = [];   // { start, end, amp, freq }
  let last = { ...s };

  // Estado no fim do que já foi agendado: cada movimento parte de onde o anterior parou.
  const stateAt = (t) => { tl.seek(t, false); return { ...s }; };
  const vecs = (st) => ({ pos: new THREE.Vector3(st.px, st.py, st.pz), look: new THREE.Vector3(st.tx, st.ty, st.tz) });
  const tw = (at, duration, vars, ease) => tl.to(s, { ...vars, duration, ease: ease ?? defaultEase }, at);

  const api = {
    timeline: tl,
    state: s,
    // Corte seco para um enquadramento.
    shot(at, { pos, look, fov, roll = 0 }) {
      const p = V(pos), l = V(look);
      tl.set(s, { px: p.x, py: p.y, pz: p.z, tx: l.x, ty: l.y, tz: l.z, fov: fov ?? s.fov, roll, focus: p.distanceTo(l) }, at);
      return api;
    },
    // Transição suave entre enquadramentos (blend de posição, alvo e lente).
    moveTo(at, duration, { pos, look, fov, roll, ease }) {
      const vars = {};
      if (pos) { const p = V(pos); Object.assign(vars, { px: p.x, py: p.y, pz: p.z }); }
      if (look) { const l = V(look); Object.assign(vars, { tx: l.x, ty: l.y, tz: l.z }); }
      if (fov) vars.fov = fov;
      if (roll !== undefined) vars.roll = roll;
      if (pos || look) { const p = pos ? V(pos) : null; const l = look ? V(look) : null; vars.focus = (p ?? vecs(stateAt(at)).pos).distanceTo(l ?? vecs(stateAt(at)).look); }
      tw(at, duration, vars, ease);
      return api;
    },
    // Dolly: a câmera anda em direção ao alvo (positivo) ou se afasta (negativo).
    dollyIn(at, duration, { distance = 2, ease } = {}) {
      const { pos, look } = vecs(stateAt(at));
      const dir = look.clone().sub(pos).normalize();
      const p = pos.add(dir.multiplyScalar(distance));
      return api.moveTo(at, duration, { pos: p, ease });
    },
    dollyOut(at, duration, { distance = 2, ease } = {}) { return api.dollyIn(at, duration, { distance: -distance, ease }); },
    // Zoom óptico: muda só a lente (FOV), a câmera não anda.
    zoom(at, duration, { fov, ease }) { return api.moveTo(at, duration, { fov, ease }); },
    // Travelling: câmera e alvo andam juntos lateralmente / em qualquer direção.
    travel(at, duration, { by = [2, 0, 0], ease = 'none' } = {}) {
      const st = stateAt(at); const d = V(by);
      tw(at, duration, { px: st.px + d.x, py: st.py + d.y, pz: st.pz + d.z, tx: st.tx + d.x, ty: st.ty + d.y, tz: st.tz + d.z }, ease);
      return api;
    },
    // Pan (giro horizontal) e tilt (giro vertical) com a câmera parada no lugar.
    pan(at, duration, { degrees = 30, ease } = {}) {
      const { pos, look } = vecs(stateAt(at));
      const v = look.sub(pos).applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(degrees));
      return api.moveTo(at, duration, { look: pos.clone().add(v), ease });
    },
    tilt(at, duration, { degrees = 15, ease } = {}) {
      const { pos, look } = vecs(stateAt(at));
      const v = look.sub(pos); const right = new THREE.Vector3().crossVectors(v, new THREE.Vector3(0, 1, 0)).normalize();
      v.applyAxisAngle(right, THREE.MathUtils.degToRad(degrees));
      return api.moveTo(at, duration, { look: pos.clone().add(v), ease });
    },
    // Órbita ao redor de um centro (graus positivos = anti-horário visto de cima).
    orbit(at, duration, { center, degrees = 90, ease } = {}) {
      const st = stateAt(at); const c = center ? V(center) : new THREE.Vector3(st.tx, st.ty, st.tz);
      const start = new THREE.Vector3(st.px, st.py, st.pz).sub(c);
      const proxy = { a: 0 };
      const rad = THREE.MathUtils.degToRad(degrees);
      tl.to(proxy, {
        a: rad, duration, ease: ease ?? defaultEase,
        onUpdate: () => {
          const p = start.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), proxy.a).add(c);
          s.px = p.x; s.py = p.y; s.pz = p.z; s.tx = c.x; s.ty = c.y; s.tz = c.z;
        },
      }, at);
      return api;
    },
    // Câmera aérea descendo (crane down) ou subindo até um ponto.
    crane(at, duration, { height, ease } = {}) {
      const st = stateAt(at);
      tw(at, duration, { py: height ?? st.py }, ease);
      return api;
    },
    // Enquadramentos prontos em relação a um alvo (personagem, objeto).
    framing: {
      aerial: (target, { height = 12, back = 4 } = {}) => ({ pos: V(target).add(new THREE.Vector3(0, height, back)), look: V(target) }),
      lowAngle: (target, { dist = 3, height = 0.3, side = 0.8, lookUp = 1.2 } = {}) => ({ pos: V(target).add(new THREE.Vector3(side, height, dist)), look: V(target).add(new THREE.Vector3(0, lookUp, 0)) }),
      closeUp: (face, { dist = 0.7, side = 0.15, fov = 30 } = {}) => ({ pos: V(face).add(new THREE.Vector3(side, 0.02, dist)), look: V(face), fov }),
      medium: (target, { dist = 2.6, height = 1.3, side = 0.4, fov = 40 } = {}) => ({ pos: V(target).add(new THREE.Vector3(side, height, dist)), look: V(target).add(new THREE.Vector3(0, 1.0, 0)), fov }),
      wide: (target, { dist = 9, height = 3, fov = 45 } = {}) => ({ pos: V(target).add(new THREE.Vector3(0, height, dist)), look: V(target).add(new THREE.Vector3(0, 0.8, 0)), fov }),
    },
    // Câmera de acompanhamento: segue um Object3D com atraso suave entre start e end.
    follow(start, duration, target, { offset = [0, 1.6, 3.5], lookOffset = [0, 1.1, 0], smooth = 4 } = {}) {
      follows.push({ start, end: start + duration, target, offset: V(offset), lookOffset: V(lookOffset), smooth, cur: null });
      return api;
    },
    // Tremor de câmera (impactos), determinístico.
    shake(at, duration, { amp = 0.05, freq = 22 } = {}) { shake.push({ start: at, end: at + duration, amp, freq }); return api; },

    update(t, dt = 1 / 30) {
      // render forçado: seek() não reprocessa se a timeline já estiver em t (ex.: t = 0 logo
      // após a montagem), e a câmera ficaria na posição padrão.
      tl.seek(t, false); tl.render(t, false, true);
      let pos = new THREE.Vector3(s.px, s.py, s.pz);
      let look = new THREE.Vector3(s.tx, s.ty, s.tz);
      for (const f of follows) {
        if (t < f.start || t > f.end) { f.cur = null; continue; }
        const wp = f.target.getWorldPosition(new THREE.Vector3());
        const goalPos = wp.clone().add(f.offset), goalLook = wp.clone().add(f.lookOffset);
        if (!f.cur) f.cur = { pos: goalPos.clone(), look: goalLook.clone() };
        for (const k of ['x', 'y', 'z']) {
          f.cur.pos[k] = damp(f.cur.pos[k], goalPos[k], f.smooth, dt);
          f.cur.look[k] = damp(f.cur.look[k], goalLook[k], f.smooth * 1.5, dt);
        }
        pos = f.cur.pos.clone(); look = f.cur.look.clone();
      }
      for (const k of shake) {
        if (t < k.start || t > k.end) continue;
        const fade = 1 - (t - k.start) / (k.end - k.start);
        pos.x += Math.sin(t * k.freq * 6.283) * k.amp * fade;
        pos.y += Math.sin(t * k.freq * 4.71 + 1.3) * k.amp * fade;
      }
      camera.position.copy(pos);
      camera.up.set(Math.sin(s.roll), Math.cos(s.roll), 0);
      camera.lookAt(look);
      if (camera.fov !== s.fov) { camera.fov = s.fov; camera.updateProjectionMatrix(); }
      last = { ...s };
      return { pos, look, focus: pos.distanceTo(look) };
    },
    current: () => last,
  };
  return api;
}
