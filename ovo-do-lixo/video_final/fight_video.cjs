// Fight & powers test video. usage: node fight_video.cjs <SEG A|B|C> <startFrame> <endFrame> <port>
// frames -> tripo/fight_<SEG>/f####.png  (720x1280, 24 fps). Everything is a function of time t, so chunks can render in parallel.
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs = require('fs');
const W = +(process.env.W || 720), H = +(process.env.H || 1280), FPS = 24, P = Math.PI;
const SEG = process.argv[2] || 'A', START = +(process.argv[3] || 0), PORT = +(process.argv[5] || 9100);
const cl = (x) => Math.min(1, Math.max(0, x)), ease = (u) => u * u * (3 - 2 * u), eo = (u) => 1 - (1 - u) * (1 - u), ei = (u) => u * u * u;
const lerp = (a, b, u) => a + (b - a) * u, L3 = (a, b, u) => a.map((v, i) => lerp(v, b[i], u));
const seg = (t, a, b) => cl((t - a) / (b - a));
// hit-stop: during [ts, ts+d] the action runs at 10% speed (camera shake keeps going)
const hitstop = (t, stops) => { let ta = t; for (const [ts, d] of stops) ta -= Math.min(Math.max(0, t - ts), d) * 0.9; return ta; };
const shake = (t, hits) => { let x = 0, y = 0; for (const [ti, a] of hits) if (t >= ti) { const k = a * Math.exp(-(t - ti) * 9); x += k * Math.sin(t * 97); y += k * Math.sin(t * 71 + 1.3); } return [x, y]; };
const camShake = (cam, sh) => [cam[0] + sh[0], cam[1] + sh[1], cam[2]];
// camera that fits all the points in the PORTRAIT frame: yaw = direction from the subject to the camera, up = height above the subjects
const fit = (pts, yaw, up = 0.3, fov = 46, m = 0.45, maxR = 4.2, minD = 1.0) => {
  const c = [0, 1, 2].map(k => pts.reduce((a, p) => a + p[k], 0) / pts.length), d = [Math.sin(yaw), 0, Math.cos(yaw)], r = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const th = Math.tan(Math.atan(Math.tan(fov * P / 360) * W / H)), tv = Math.tan(fov * P / 360);
  let dist = minD; for (const p of pts) { const q = [p[0] - c[0], p[1] - c[1], p[2] - c[2]], lat = Math.abs(q[0] * r[0] + q[2] * r[2]) + m, dep = q[0] * d[0] + q[2] * d[2], vy = Math.abs(q[1]) + m; dist = Math.max(dist, lat / th + dep, vy / tv + dep); }
  let cam = [c[0] + d[0] * dist, c[1] + up, c[2] + d[2] * dist]; const rr = Math.hypot(cam[0], cam[2]); if (rr > maxR) { cam[0] *= maxR / rr; cam[2] *= maxR / rr; }
  return [cam, c]; };
const puffs = (fx, t, from, to, every, mk) => { for (let ti = from; ti <= Math.min(t, to); ti += every) fx.push(mk(ti)); };

const SEGS = {
  // ================= A: RAIO x FOGO (charge, peck, knockback, lightning, fire breath, dodge)
  A: { scene: 'Arena', T: 8.0, setup: `window.place('r', 'raio', 0, 0, 0); window.place('f', 'fogo', 0, 0, 0);`,
    frame(t) {
      const stops = [[1.65, 0.1], [3.45, 0.1]], ta = hitstop(t, stops), sh = shake(t, [[1.65, 0.05], [3.45, 0.08], [6.25, 0.03]]);
      const fx = [], lights = [], ch = {};
      // ---- Raio position: knockback after the peck, dodge jump over the flames, landing
      let rx = -1.3, ry0 = 0, rRz = 0, rState = 'fight';
      const kb = seg(ta, 1.65, 2.2); if (ta > 1.65) { rx = -1.3 - 0.9 * eo(kb); rRz = 0.55 * Math.sin(P * kb) * (1 - kb * 0.3); rState = kb < 1 ? 'flap' : 'fight'; }
      if (ta > 2.3) rx = -2.2 + 0.4 * ease(seg(ta, 2.3, 2.7));                       // steps back in
      const jmp = seg(ta, 4.95, 5.9); if (jmp > 0 && jmp < 1) { ry0 = 1.0 * Math.sin(P * jmp); rx = -1.8 + 0.3 * jmp; rState = 'flap'; } else if (ta >= 5.9) rx = -1.5;
      // ---- Fogo: charge, recoil after the lightning
      let fx_ = 1.3, fRz = 0, fState = 'fight';
      const chg = seg(ta, 1.3, 1.65); if (ta > 1.3 && ta < 1.65) { fx_ = lerp(1.3, -0.45, ei(chg)); fState = 'run'; }
      if (ta >= 1.65) fx_ = lerp(-0.45, 0.95, ease(seg(ta, 1.75, 2.4)));
      const kb2 = seg(ta, 3.45, 3.95); if (ta >= 3.45) { fx_ = 0.95 + 0.9 * eo(kb2); fRz = -0.7 * Math.sin(P * kb2); if (kb2 < 1) fState = 'flap'; }
      if (ta > 4.3) fx_ = 1.85 - 0.25 * ease(seg(ta, 4.3, 4.6));
      ch.r = { pos: [rx, ry0, 0, P / 2], tilt: [0, rRz], state: rState };
      ch.f = { pos: [fx_, 0, 0, -P / 2], tilt: [0, fRz], state: fState };
      // ---- 1. the charge + peck
      puffs(fx, ta, 1.3, 1.65, 0.07, (ti) => ['puff', [ta, ti, [lerp(1.3, -0.45, ei(seg(ti, 1.3, 1.65))), 0, 0], { n: 3, size: 0.3, life: 0.7, seed: ti * 100 }]]);
      fx.push(['impact', [ta, 1.65, [-0.85, 0.62, 0], { size: 0.9 }]], ['burst', [ta, 1.65, [-0.9, 0.6, 0], { n: 14, kind: 'feather', color: 0xffe07a, speed: 1.6, up: 2, grav: -3, life: 1.4, size: 0.1, seed: 3 }]],
        ['burst', [ta, 1.65, [-0.85, 0.62, 0], { n: 18, speed: 3, life: 0.4, color: 0xffd060, seed: 7 }]]);
      ch.r.flash = [0xffffff, ta >= 1.65 ? 1 - seg(ta, 1.65, 1.85) : 0];
      puffs(fx, ta, 1.68, 2.1, 0.08, (ti) => ['puff', [ta, ti, [-1.3 - 0.9 * eo(seg(ti, 1.65, 2.2)), 0, 0], { n: 3, size: 0.3, life: 0.8, seed: ti * 77 }]]);
      // ---- 2. Raio charges up: glow, sparks spiralling in, arcs on the body, ground pulses
      if (ta > 2.4 && ta < 3.5) { const u = seg(ta, 2.4, 3.4); fx.push(['charge', [ta, 2.4, [rx + 0.15, 0.62, 0], { dur: 1.0, color: 0x9ad8ff, size: 1.1, r: 1.0 }]], ['arcs', [ta, [rx, 0.15, 0], { r: 0.45, n: 1 + Math.round(u * 5), h: 0.8 }]]);
        for (const tp of [2.6, 2.9, 3.2]) fx.push(['shockwave', [ta, tp, [rx, 0, 0], { r: 0.9, life: 0.35, color: 0x9ad8ff }]]);
        lights.push([0, [rx + 0.3, 0.9, 0.4], 0x8ac8ff, 6 * u, 4]); }
      // ---- 3. lightning strike
      if (ta >= 3.4 && ta < 3.8) { const f = Math.floor(t * 24); fx.push(['lightning', [[rx + 0.38, 0.72, 0], [fx_ - 0.1, 0.55, 0], { seed: f, w: 0.022, branches: 3 }]], ['lightning', [[rx + 0.38, 0.72, 0], [fx_ - 0.1, 0.5, 0.05], { seed: f + 50, w: 0.012, branches: 1, opacity: 0.7 }]]);
        lights.push([1, [(rx + fx_) / 2, 0.9, 0.3], 0xcfe8ff, 18, 6]); }
      fx.push(['impact', [ta, 3.45, [1.0, 0.55, 0], { size: 1.1, color: 0xcfeaff }]], ['burst', [ta, 3.45, [1.0, 0.55, 0], { n: 30, speed: 3.5, life: 0.6, color: 0x9ad8ff, seed: 11 }]],
        ['shockwave', [ta, 3.45, [1.0, 0, 0], { r: 1.4, life: 0.45, color: 0xbfe6ff }]]);
      if (ta > 3.45) { fx.push(['scorch', [[0.95, 0, 0], 0.45, 0.9]]); ch.f.flash = [0xcfe8ff, ta < 3.9 ? (Math.floor(t * 24) % 2) * 0.9 : 0]; }
      if (ta > 3.45 && ta < 4.5) fx.push(['arcs', [ta, [fx_, 0.15, 0], { r: 0.42, n: Math.max(1, Math.round(4 * (1 - seg(ta, 3.45, 4.5)))), h: 0.7, seed: 9 }]]);
      fx.push(['puff', [ta, 3.6, [fx_, 0.6, 0], { n: 8, size: 0.35, life: 1.6, color: 0x3a3a40, opacity: 0.6, rise: 1.0, spread: 0.2, seed: 21 }]]);
      // ---- 4. fire breath, Raio dodges over it
      const mouth = [fx_ - 0.42, 0.68, 0];
      fx.push(['fireBreath', [ta, 4.75, 5.75, mouth, [-1, -0.12, 0], { len: 2.1, n: 80 }]]);
      if (ta > 4.75 && ta < 6.2) { const k = (1 - seg(ta, 5.75, 6.2)) * (0.8 + 0.2 * Math.sin(t * 50)); lights.push([2, [mouth[0] - 0.8, 0.6, 0.3], 0xff7a20, 10 * k, 5]); fx.push(['scorch', [[mouth[0] - 1.2, 0, 0], 0.7 * seg(ta, 4.9, 5.5), 0.8]]); }
      fx.push(['burst', [ta, 4.9, [mouth[0] - 1.0, 0.4, 0], { n: 26, speed: 1.2, up: 3, grav: 0.5, life: 1.4, color: 0xff9030, seed: 31, size: 0.06 }]]);
      fx.push(['puff', [ta, 5.9, [-1.5, 0, 0], { n: 8, size: 0.4, life: 0.9, seed: 41 }]], ['shockwave', [ta, 5.9, [-1.5, 0, 0], { r: 0.8, life: 0.4, color: 0xffffff }]]);
      if (ta > 5.9) fx.push(['arcs', [ta, [rx, 0.15, 0], { r: 0.45, n: 2, h: 0.8, seed: 5 }]]);
      // ---- cameras (a cut every 1-2 s), framed automatically on the fighters
      const R_ = [rx, 0.5 + ry0, 0], F_ = [fx_, 0.5, 0]; let cam, tgt, fov = 46;
      if (t < 1.3) [cam, tgt] = fit([R_, F_], lerp(P / 2 - 0.55, P / 2 - 0.35, ease(t / 1.3)), 0.25, 46, 0.4);            // over Fogo's shoulder
      else if (t < 2.4) [cam, tgt] = fit([R_, F_], lerp(1.0, 0.8, seg(t, 1.3, 2.4)), 0.15, 46, 0.45);                       // the charge, 3/4 low
      else if (t < 3.4) { [cam, tgt] = fit([R_], lerp(0.9, 0.6, ease(seg(t, 2.4, 3.4))), 0.05, 44, 0.55, 4.2, 1.2); }      // Raio charging, close
      else if (t < 4.6) [cam, tgt] = fit([R_, F_], -P / 2 + 0.5, 0.3, 48, 0.45);                                           // lightning, over Raio's shoulder
      else if (t < 6.3) [cam, tgt] = fit([R_, F_, [mouth[0] - 1.0, 0.5, 0]], P / 2 - 0.5, 0.35, 48, 0.5);                  // fire, over Fogo's shoulder
      else [cam, tgt] = fit([R_, F_], lerp(P / 2 - 0.35, P / 2 - 0.6, seg(t, 6.3, 8)), lerp(0.4, 1.3, ease(seg(t, 6.3, 8))), 48, 0.45);       // both, crane up
      return { ta, ch, fx, lights, cam: camShake(cam, sh), tgt, fov };
    } },
  // ================= B: GELO freezes PRETA
  B: { scene: 'Arena', T: 4.6, setup: `window.place('g', 'gelo', 0, 0, 0); window.place('k', 'preta', 0, 0, 0);`,
    frame(t) {
      const ta = hitstop(t, [[1.2, 0.08], [3.6, 0.08]]), sh = shake(t, [[1.2, 0.04], [3.6, 0.06]]), fx = [], lights = [], ch = {};
      const kx = ta < 0.8 ? 1.3 : ta < 1.2 ? lerp(1.3, 0.75, seg(ta, 0.8, 1.2)) : 0.75;
      const frozen = ta >= 1.2 && ta < 3.6;
      ch.g = { pos: [-1.3, 0, 0, P / 2], state: 'fight' };
      ch.k = { pos: [kx, 0, 0, -P / 2], state: ta < 0.8 ? 'fight' : ta < 3.6 ? 'run' : 'flap', tp: frozen ? 1.2 : undefined, flash: [0x8ad0ff, frozen ? 0.45 : ta >= 3.6 ? 0.45 * (1 - seg(ta, 3.6, 3.9)) : 0] };
      fx.push(['charge', [ta, 0.0, [-0.9, 0.72, 0], { dur: 0.8, color: 0xbfeaff, size: 0.8, r: 0.7 }]].map((v, i) => i ? v : v), ['iceVolley', [ta, 0.8, [-0.88, 0.7, 0], [0.75, 0, 0], { n: 7 }]]);
      if (ta < 0.9) lights.push([0, [-0.7, 0.9, 0.4], 0x9ad8ff, 5 * seg(ta, 0, 0.8), 4]);
      fx.push(['impact', [ta, 1.2, [0.7, 0.55, 0], { size: 0.8, color: 0xdff6ff }]], ['burst', [ta, 1.2, [0.7, 0.5, 0], { n: 24, speed: 2.5, life: 0.6, color: 0xdff6ff, seed: 13 }]]);
      if (ta >= 1.2 && ta < 3.6) fx.push(['iceBlock', [ta, 1.22, [0.75, 0, 0], [1.0, 1.15, 1.0]]]);
      if (ta >= 1.2 && ta < 3.6) lights.push([1, [0.75, 0.6, 0.8], 0x8ad0ff, 3, 3]);
      // the block cracks and shatters
      fx.push(['burst', [ta, 3.6, [0.75, 0.6, 0], { n: 40, speed: 3, up: 2, life: 0.9, color: 0xe8f8ff, seed: 17, size: 0.1 }]], ['shockwave', [ta, 3.6, [0.75, 0, 0], { r: 1.2, life: 0.4, color: 0xcff0ff }]], ['impact', [ta, 3.6, [0.75, 0.6, 0], { size: 1.0, color: 0xe8f8ff }]]);
      if (ta > 3.7) fx.push(['dizzyStars', [ta, [0.75, 1.15, 0], 0.18]]);
      const G_ = [-1.3, 0.5, 0], K_ = [kx, 0.5, 0]; let cam, tgt, fov = 46;
      if (t < 1.25) [cam, tgt] = fit([G_, K_], -P / 2 + 0.55, 0.3, 46, 0.4);                                     // over Gelo's shoulder
      else if (t < 3.3) [cam, tgt] = fit([K_], lerp(-0.2, 0.9, ease(seg(t, 1.25, 3.3))), 0.2, 44, 0.65, 4.2, 1.6);  // orbit the frozen one
      else [cam, tgt] = fit([G_, K_], 0.75, 0.35, 46, 0.45);
      return { ta, ch, fx, lights, cam: camShake(cam, sh), tgt, fov };
    } },
  // ================= C: SOMBRA x PENOSA (energy ball, knock into the fence, evolution, thunder)
  C: { scene: 'ArenaTorneio', T: 27.5, populate: true,
    setup: `await window.loadAnimated('pen', 'ref/chickensoft_mascot.glb'); await window.loadAnimated('sb', 'ref/chickensoft_mascot.glb');
      window.chickenSkin('pen', 0xffd04d, 0xff8142, 0xff434c, true); window.dressPenosa('pen'); window.chickenSkin('sb', 0x16131a, 0x1e1a22, 0xc8102e, true); window.dressSombra('sb');
      window.placeAnimated('p', 'pen', 0, 0, 0, 0.75); window.placeAnimated('s', 'sb', 0, 0, 0, 1.35); await window.placeKit('boy', 0, 0, 0, 1.95); await window.placeKaio('kaio', 0, 0, 0, 1.95);`,
    frame(t) {
      // story time ta: slow motion on the impact, a beat on the fence and on the thunder
      const WARP = [[2.55, 0.14, 0.15], [3.1, 0.05, 0.15], [8.0, 0.08, 0.2], [13.7, 0.08, 0.15]];
      const toT = (x) => { let r = x; for (const [a, d, f] of WARP) r += Math.min(Math.max(0, x - a), d) * (1 / f - 1); return r; };
      let lo = 0, hi = t; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (toT(m) < t) lo = m; else hi = m; } const ta = (lo + hi) / 2;
      const HIT = 2.55, FENCE = 3.1, TB = 8.0, REV = 9.6;      // bolt at TB, dust holds until REV, then settles
      const sh = shake(t, [[toT(HIT), 0.11], [toT(FENCE), 0.13], [toT(5.55), 0.03], [toT(TB), 0.16], [toT(10.9), 0.06], [toT(13.0), 0.02], [toT(13.7), 0.16], [toT(14.2), 0.06]]), fx = [], lights = [], ch = {};
      const SZ = -1.6, mouth = [0, 0.82, SZ + 0.5], PZ0 = 1.3, H = 0.75, PZ = 3.5, FZ = 4.15;
      // ---- Sombra
      let sz = SZ, sState = 'idle', sFace = ta < 0.8 ? 'mean' : 'meanRage', sSp = ta < 0.8 ? 0.6 : 1.0, sRy = 0, sTalk = false;
      if (ta > HIT && ta < TB) { sFace = 'meanLaugh'; sSp = 0.7; sTalk = (ta > 2.7 && ta < 3.4) || (ta > 4.0 && ta < 4.9); }
      if (ta >= TB) { sFace = 'surprised'; sSp = 0.1; sz = SZ - 0.8 * ease(seg(ta, 8.4, 9.8)); sState = ta > 8.4 && ta < 9.8 ? 'walk' : 'idle'; }
      const CH2 = 12.0, FIRE2 = 12.5, CLASH = 12.75, BACK = 13.5, KO = 13.7, LAND = 14.2, SKO = SZ - 1.9;
      if (ta > 11.6) { sFace = 'meanRage'; sSp = 1.0; sz = SZ - 0.8 + 0.8 * ease(seg(ta, 11.6, 12.0)); sState = ta < 12.0 ? 'walk' : 'idle'; }
      let sSpin = null;
      if (ta >= KO) { const u = seg(ta, KO, LAND); sFace = 'surprised'; sSp = 0.0;
        sSpin = u < 1 ? [[0, 0.68 + 1.0 * Math.sin(P * u), lerp(SZ, SKO, eo(u))], 0, 1.8 * P * u, 0, 1.35] : [[0, 0.36, SKO], 0, -0.2, 1.5, 1.35]; if (u >= 1) sFace = 'sad'; }
      // ---- the boy comes to get her, Kaio is furious
      const PICK = 22.2, A0 = [2.9, 1.3], B0 = [0.55, 3.05], C0 = [-2.7, 2.3];
      const dir = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]);
      const boyAt = (tt) => { if (tt < 19.0) return [A0[0], 0, A0[1], dir(A0, B0), 'idle'];
        if (tt < 21.4) { const u = seg(tt, 19.0, 21.4); return [lerp(A0[0], B0[0], u), 0, lerp(A0[1], B0[1], u), dir(A0, B0), 'walk']; }
        if (tt < PICK) return [B0[0], 0, B0[1], dir(B0, [0, PZ]), tt < 21.6 ? 'idle' : 'pickup'];
        if (tt < PICK + 0.8) return [B0[0], 0, B0[1], dir(B0, [0, PZ]), tt < PICK + 0.25 ? 'pickup' : 'carry'];
        const u = seg(tt, PICK + 0.8, 26.2); return [lerp(B0[0], C0[0], u), 0, lerp(B0[1], C0[1], u), dir(B0, C0), u < 1 ? 'carryWalk' : 'carry']; };
      if (ta > 18.9) { const b = boyAt(ta); ch.boy = { pos: [b[0], 0, b[2], b[3]], state: b[4], opts: { mouth: b[4] === 'pickup' ? 'smile' : 'smile' } }; } else ch.boy = { pos: [0, -50, 0, 0], state: 'idle' };
      ch.kaio = { pos: [0.3, 0, -5.95, 0], state: ta < 15.3 ? 'cross' : 'angry', opts: { talk: ta > 17.2 && ta < 19.2 && ((ta - 17.2) % 0.9) < 0.6, mouth: ta < 15.3 ? 'smirk' : 'mad' } };
      if (ta > 17.1 && ta < 19.3) for (let tp = 17.1; tp < ta; tp += 0.3) for (const sx of [-1, 1]) fx.push(['puff', [ta, tp, [0.3 + sx * 0.3, 1.5, -5.8], { n: 3, size: 0.2, life: 0.9, color: 0xbfbfc4, opacity: 0.9, rise: 0.3, spread: 0.05, seed: tp * 31 + sx }]]);   // steam out of his ears
      ch.s = sSpin ? { spin: sSpin, state: 'fall', opts: { face: sFace, sparks: 0 } } : { pos: [0, 0, sz, sRy], state: sState, opts: { face: sFace, sparks: sSp, talk: sTalk } };
      // ---- the orb
      const ORB0 = 0.8, LAUNCH = 2.2, orbR = 0.05 + 0.17 * ease(seg(ta, ORB0, LAUNCH));
      const orbAt = (tt) => tt < LAUNCH ? mouth : L3(mouth, [0, 0.4, PZ0 - 0.1], ei(seg(tt, LAUNCH, HIT)));
      if (ta > ORB0 && ta < HIT) { const p = orbAt(ta); fx.push(['energyOrb', [ta, p, orbR]]); lights.push([0, [p[0], p[1] + 0.2, p[2] + 0.3], 0xb04aff, 3 + 8 * seg(ta, ORB0, LAUNCH), 5]);
        if (ta < LAUNCH) { fx.push(['charge', [ta, ORB0, mouth, { dur: 1.4, color: 0xc070ff, size: 0.9, r: 1.1, n: 34 }]], ['arcs', [ta, [0, 0.2, SZ], { r: 0.7, n: 3, h: 1.0, color: 0xc070ff, seed: 3 }]]);
          for (const tp of [1.1, 1.5, 1.9]) fx.push(['shockwave', [ta, tp, [0, 0, SZ], { r: 1.3, life: 0.4, color: 0xa040ff }]]);
          fx.push(['puff', [ta, 1.0, [0, 0, SZ + 0.2], { n: 10, size: 0.45, life: 1.2, spread: 1.0, seed: 51 }]]); }
        else { const pts = []; for (let i = 1; i <= 12; i++) pts.push(orbAt(ta - i * 0.02)); fx.push(['trail', [pts, { size: 0.5 }]]); } }
      fx.push(['impact', [ta, HIT, [0, 0.42, PZ0], { size: 0.7, color: 0xe0b0ff, life: 0.07 }]], ['burst', [ta, HIT, [0, 0.42, PZ0], { n: 44, speed: 4, life: 0.8, color: 0xc070ff, seed: 61 }]],
        ['shockwave', [ta, HIT, [0, 0, PZ0], { r: 2.2, life: 0.5, color: 0xc070ff }]], ['shockwave', [ta, HIT, [0, 0.42, PZ0], { r: 1.2, life: 0.12, color: 0xffffff, tilt: [0, 0, 0] }]],
        ['burst', [ta, HIT, [0, 0.4, PZ0], { n: 16, kind: 'feather', color: 0xffe066, speed: 1.4, up: 2, grav: -3, life: 2.0, size: 0.08, seed: 63 }]]);
      // ---- Penosa
      let spin = null, pState = 'idle', pFace = 'sleepy', evo = 0, talk = false;
      const lie = (y = 0.24, rx = 0.15, rz = 1.45) => [[0, y, FZ], P, rx, rz, H];
      if (ta < HIT) { pFace = ta < 2.2 ? 'sleepy' : 'surprised'; ch.p = { pos: [0, 0, PZ0, P] }; }
      else if (ta < FENCE) { const u = seg(ta, HIT, FENCE); spin = [[0, lerp(0.37, 0.6, u) + 0.9 * Math.sin(P * u), lerp(PZ0, FZ, eo(u))], P, -2.6 * P * u, 0, H]; pState = 'fall'; pFace = 'sad'; }
      else if (ta < 3.6) { const u = ease(seg(ta, FENCE, 3.6)); spin = [[0, lerp(0.6, 0.24, u), FZ], P, lerp(0.6, 0.15, u), lerp(0, 1.45, u), H]; pState = 'fall'; pFace = 'sad'; }
      else if (ta < 4.9) { spin = lie(); pFace = 'sad'; }
      else if (ta < 5.55) { const u = Math.sin(P * seg(ta, 4.9, 5.55)) * 0.75, wob = 0.12 * Math.sin(ta * 30) * u;     // tries to get up... and collapses
        spin = lie(0.24 + 0.1 * u, 0.15, 1.45 - 0.9 * u + wob); pFace = 'sad'; }
      else if (ta < 6.5) { spin = lie(); pFace = 'sleep'; }
      else if (ta < 7.2) { spin = lie(); pFace = 'surprised'; }
      else if (ta < 7.8) { const u = ease(seg(ta, 7.2, 7.8)); spin = [[0, lerp(0.24, H / 2, u), lerp(FZ, PZ, u)], P, lerp(0.15, 0, u), lerp(1.45, 0, u), H]; pFace = 'surprised'; evo = 0.2 * u; }
      else if (ta < 16.6) { ch.p = { pos: [0, 0, PZ, P] }; pFace = ta < TB ? 'surprised' : ta < 15.9 ? 'power' : 'sleepy'; evo = ta < TB + 0.05 ? 0.2 : 1 - ease(seg(ta, 15.5, 16.4)); if (ta > 10.8 && ta < 11.5) { pState = 'jump'; talk = true; } }
      else if (ta < 17.1) { const u = ease(seg(ta, 16.6, 17.1)), wob = 0.15 * Math.sin(ta * 12) * (1 - u); spin = [[0, lerp(H / 2, 0.24, u), PZ], P, 0, lerp(wob, 1.45, u), H]; pFace = 'sleep'; }   // wobbles and plops down asleep
      else if (ta < PICK) { spin = [[0, 0.24, PZ], P, 0, 1.45, H]; pFace = 'sleep'; }
      else { const b = boyAt(ta), f = [Math.sin(b[3]), Math.cos(b[3])], lift = ease(seg(ta, PICK, PICK + 0.6));        // in the boy's arms
        const arm = [b[0] + f[0] * 0.3, 0.95, b[2] + f[1] * 0.3]; spin = [[lerp(0, arm[0], lift), lerp(0.24, arm[1], lift), lerp(PZ, arm[2], lift)], lerp(P, b[3], lift), lerp(0, 0.18, lift), lerp(1.45, 0.12, lift), H]; pFace = 'sleep'; }   // upright, cuddled against his chest
      if (spin) ch.p = { spin };
      ch.p.state = pState; ch.p.opts = { face: pFace, evo, breakT: toT(TB + 0.05) - (t - ta) + 0.0001, talk };
      // breakT is in the same clock as the pose time (ta)
      ch.p.opts.breakT = TB + 0.05;
      ch.p.flash = [0xc070ff, ta >= HIT ? 0.8 * (1 - seg(ta, HIT, HIT + 0.1)) : 0];
      // fence: heavy hit
      fx.push(['impact', [ta, FENCE, [0, 0.6, FZ + 0.25], { size: 1.1 }]], ['puff', [ta, FENCE, [0, 0.1, FZ + 0.1], { n: 16, size: 0.6, life: 1.8, spread: 0.8, seed: 71 }]], ['burst', [ta, FENCE, [0, 0.5, FZ + 0.2], { n: 20, speed: 2, life: 0.6, color: 0xffffff, seed: 73 }]],
        ['puff', [ta, 5.5, [0, 0.05, FZ], { n: 8, size: 0.4, life: 1.0, spread: 0.5, seed: 74 }]]);
      if (ta > 3.5 && ta < 6.4) fx.push(['dizzyStars', [ta, [0.35, 0.55, FZ], 0.16]]);
      if (ta > 6.95 && ta < TB) { fx.push(['arcs', [ta, [0, 0.1, ta < 7.8 ? FZ : PZ], { r: 0.35, n: 2, h: 0.6, color: 0xffd060, seed: 2 }]]); lights.push([1, [0.2, 0.7, PZ - 0.5], 0xffc040, 2, 3]); }
      // ---- the thunder: bolt -> white flash -> dust cloud swallows her -> dust settles -> transformed
      if (ta > TB - 0.05 && ta < TB + 0.4) { const f = Math.floor(t * 24); fx.push(['lightning', [[1.4, 16, 2.0], [0, 0.7, PZ], { seed: f, w: 0.1, branches: 4, color: 0xffe9a0, jag: 0.12 }]], ['lightning', [[-1.2, 15, 1.8], [0, 0.9, PZ], { seed: f + 9, w: 0.05, branches: 2, color: 0xffe9a0, jag: 0.15, opacity: 0.7 }]]); lights.push([3, [0, 3, PZ], 0xfff0c0, 45, 20]); }
      fx.push(['shockwave', [ta, TB, [0, 0, PZ], { r: 3.5, life: 0.7, color: 0xffe9a0 }]], ['burst', [ta, TB, [0, 0.3, PZ], { n: 40, speed: 3, up: 2, life: 0.9, color: 0xffe080, seed: 97 }]]);
      fx.push(['dustCloud', [ta, TB + 0.02, REV - TB - 0.7, 0.8, [0, 0, PZ], { r: 0.55, h: 1.1, n: 40 }]]);
      if (ta > REV && ta < 15.8) { fx.push(['auraColumn', [ta, REV, [0, 0, PZ], { h: 1.5 * (1 - seg(ta, 15.4, 15.8)), r: 0.42 }]]); lights.push([1, [0.2, 0.8, PZ - 0.6], 0xffc040, 3 * (1 - seg(ta, 15.4, 15.8)), 4]); }
      fx.push(['shockwave', [ta, 10.9, [0, 0, PZ], { r: 2.8, life: 0.6, color: 0xffc040 }]], ['burst', [ta, 10.9, [0, 0.5, PZ], { n: 50, speed: 3.5, up: 2, life: 1.0, color: 0xffd060, seed: 91 }]]);
      // ---- round 2: Sombra charges again, beam struggle, the Penosa wins, the orb blows back into the Sombra
      const sm = [0, 0.82, SZ + 0.5], pm = [0, 0.5, PZ - 0.3];
      const clashZ = (tt) => tt < CLASH ? lerp(sm[2], 1.0, ei(seg(tt, FIRE2, CLASH))) : tt < BACK ? 1.0 + 0.35 * Math.sin((tt - CLASH) * 9) * (1 - seg(tt, CLASH, BACK) * 0.5) - 0.6 * ease(seg(tt, 13.1, BACK)) : lerp(0.4, sm[2], ei(seg(tt, BACK, KO)));
      const orb2 = (tt) => [0, tt < FIRE2 ? sm[1] : lerp(sm[1], 0.65, seg(tt, FIRE2, CLASH)), tt < FIRE2 ? sm[2] : clashZ(tt)];
      if (ta > CH2 && ta < KO) { const o = orb2(ta), r2 = 0.06 + 0.16 * ease(seg(ta, CH2, FIRE2)); fx.push(['energyOrb', [ta, o, r2 * (ta > BACK ? 1.3 : 1)]]); lights.push([0, [o[0] + 0.3, o[1] + 0.3, o[2]], 0xb04aff, 8, 5]);
        if (ta < FIRE2) fx.push(['charge', [ta, CH2, sm, { dur: 0.5, color: 0xc070ff, size: 0.9, r: 1.0, n: 30 }]]);
        if (ta > FIRE2 && ta < BACK) fx.push(['lightning', [sm, o, { seed: Math.floor(t * 24) + 300, w: 0.035, branches: 2, color: 0xc070ff, jag: 0.08 }]]);
        if (ta > BACK) { const pts = []; for (let i = 1; i <= 10; i++) pts.push(orb2(ta - i * 0.015)); fx.push(['trail', [pts, { size: 0.6, color: 0xffd060 }]]); } }
      if (ta > 12.6 && ta < BACK + 0.15) { const o = orb2(Math.min(ta, BACK)), f = Math.floor(t * 24);   // golden thunder beam from the Penosa
        fx.push(['lightning', [pm, o, { seed: f, w: 0.05, branches: 3, color: 0xffd060, jag: 0.07 }]], ['lightning', [pm, o, { seed: f + 77, w: 0.025, branches: 1, color: 0xfff0a0, jag: 0.12, opacity: 0.8 }]]);
        lights.push([2, [0.3, 0.9, (o[2] + pm[2]) / 2], 0xffd060, 14, 8]);
        if (ta > CLASH) { fx.push(['impact', [ta, ta - ((ta - CLASH) % 0.12), o, { size: 0.9, color: 0xfff0c0, life: 0.12 }]]); for (let k = 0; k < 4; k++) { const t0 = ta - ((ta - CLASH) % 0.2) - k * 0.2; if (t0 > CLASH) fx.push(['burst', [ta, t0, o, { n: 14, speed: 2.5, life: 0.5, color: k % 2 ? 0xc070ff : 0xffd060, seed: Math.round(t0 * 50) }]]); }
          for (const tp of [12.9, 13.15, 13.4]) fx.push(['shockwave', [ta, tp, [0, 0.65, clashZ(tp)], { r: 1.0, life: 0.3, color: 0xffe9a0, tilt: [0, 0, 0] }]]); } }
      // the hit and the knock-out
      fx.push(['impact', [ta, KO, [0, 0.8, SZ], { size: 1.6, color: 0xfff0c0, life: 0.12 }]], ['burst', [ta, KO, [0, 0.8, SZ], { n: 60, speed: 4.5, up: 2, life: 1.0, color: 0xffd060, seed: 131 }]], ['burst', [ta, KO, [0, 0.8, SZ], { n: 30, speed: 3.5, life: 0.8, color: 0xc070ff, seed: 133 }]],
        ['shockwave', [ta, KO, [0, 0, SZ], { r: 3.2, life: 0.6, color: 0xffd060 }]], ['burst', [ta, KO, [0, 0.8, SZ], { n: 14, kind: 'feather', color: 0x2a2030, speed: 1.6, up: 2, grav: -3, life: 2.0, size: 0.1, seed: 135 }]],
        ['puff', [ta, LAND, [0, 0.05, SKO], { n: 16, size: 0.6, life: 1.6, spread: 0.9, seed: 137 }]]);
      if (ta > LAND + 0.2) fx.push(['dizzyStars', [ta, [0.5, 0.8, SKO], 0.25]]);
      // powering down: gold sparks drain up out of her, the aura goes out
      fx.push(['burst', [ta, 15.5, [0, 0.4, PZ], { n: 40, speed: 0.6, up: 6, grav: 1.5, life: 1.6, color: 0xffd060, seed: 151, size: 0.07 }]], ['puff', [ta, 15.6, [0, 0.1, PZ], { n: 10, size: 0.35, life: 1.4, spread: 0.3, rise: 1.0, color: 0xffe0a0, opacity: 0.5, seed: 153 }]]);
      if (ta > 17.3) { const zp = ta < PICK ? [0.15, 0.62, PZ] : (() => { const b = boyAt(ta); return [b[0] + Math.sin(b[3]) * 0.38, 1.35, b[2] + Math.cos(b[3]) * 0.38]; })(); fx.push(['zzzAt', [ta, zp]]); }
      if (ta > LAND) fx.push(['arcs', [ta, [0, 0.1, SKO], { r: 0.6, n: Math.max(0, Math.round(3 * (1 - seg(ta, LAND, LAND + 1.5)))), h: 0.5, color: 0xffd060, seed: 21 }]]);
      // ---- cameras (story time, so they slow down with the action)
      let cam, tgt, fov = 50;
      if (ta < 0.8) { cam = [0.55, 0.45, 2.4]; tgt = [0, 0.85, SZ]; }
      else if (ta < LAUNCH) { const u = ease(seg(ta, ORB0, LAUNCH)); cam = [lerp(1.0, 0.7, u), lerp(1.0, 0.92, u), lerp(1.0, 0.35, u)]; tgt = [0, 0.8, SZ + 0.1]; fov = 46; }
      else if (ta < HIT) { const z = orbAt(ta)[2]; cam = [2.4, 0.75, z - 0.3]; tgt = [0, 0.55, z + 0.2]; fov = 52; }
      else if (ta < HIT + 0.14) { const u = seg(ta, HIT, FENCE), c = [0, lerp(0.37, 0.6, u) + 0.9 * Math.sin(P * u), lerp(PZ0, FZ, eo(u))]; cam = [c[0] + 0.9, c[1] + 0.1, c[2] - 1.1]; tgt = c; fov = 42; }   // slow motion, the camera follows her                       // slow motion: close on the impact
      else if (ta < 3.6) { const zz = lerp(PZ0, FZ, eo(seg(ta, HIT, FENCE))); cam = [2.4, 0.75, zz - 0.3]; tgt = [0, 0.5, zz + 0.2]; fov = 52; }
      else if (ta < 4.0) { cam = [1.7, 0.75, 2.6]; tgt = [0, 0.25, FZ]; fov = 44; }
      else if (ta < 4.9) { cam = [1.1, 1.05, 1.0]; tgt = [0, 0.8, SZ]; fov = 46; }                                          // Sombra laughs at her
      else if (ta < 6.5) { const u = ease(seg(ta, 4.9, 6.5)); cam = [lerp(2.3, 1.9, u), lerp(0.95, 0.8, u), lerp(2.1, 2.4, u)]; tgt = [0, 0.3, FZ]; fov = 44; }
      else if (ta < 7.2) { cam = [1.8, 0.8, 2.35]; tgt = [0, 0.3, FZ]; fov = 46; }                                         // the eye opens
      else if (ta < TB - 0.1) { const u = ease(seg(ta, 7.2, TB)); cam = [lerp(1.8, 1.5, u), 0.75, lerp(1.2, 1.4, u)]; tgt = [0, 0.5, PZ]; fov = 54; }
      else if (ta < TB + 0.5) { cam = [0, 2.4, 0.6]; tgt = [0, 1.4, PZ]; fov = 62; }                                       // the bolt
      else if (ta < 11.6) { const u = ease(seg(ta, TB + 0.5, 11.6)); cam = [lerp(2.4, 1.7, u), lerp(1.0, 0.8, u), lerp(0.7, 1.1, u)]; tgt = [0, 0.55, PZ]; fov = 50; }   // dust settles, reveal
      else if (ta < 12.5) { cam = [1.0, 0.8, 4.05]; tgt = [0, 0.8, SZ]; fov = 50; }                                        // over her shoulder: the Sombra charges again
      else if (ta < 13.0) { cam = [1.4, 2.3, 4.0]; tgt = [0, 0.5, 0.6]; fov = 56; }                                         // the two beams meet
      else if (ta < BACK) { const u = seg(ta, 13.0, BACK); cam = [lerp(2.3, 2.1, u), 1.0, lerp(2.5, 2.3, u)]; tgt = [0, 0.65, clashZ(ta) + 0.6]; fov = 50; }   // the struggle, close
      else if (ta < 14.3) { cam = [0.4, 0.5, 4.15]; tgt = [0, 0.7, SZ - 0.8]; fov = 48; }                                    // blown away
      else if (ta < 15.3) { const u = ease(seg(ta, 14.3, 15.3)); cam = [lerp(2.4, 2.0, u), lerp(1.4, 1.2, u), SKO + lerp(2.6, 2.3, u)]; tgt = [0, 0.4, SKO]; fov = 46; }   // knocked out
      else if (ta < 17.2) { const u = ease(seg(ta, 15.3, 17.2)); cam = [lerp(1.7, 1.4, u), lerp(0.85, 0.75, u), lerp(1.3, 1.6, u)]; tgt = [0, lerp(0.5, 0.3, u), PZ]; fov = 48; }   // powers down, falls asleep
      else if (ta < 19.2) { cam = [0.62, 1.72, -4.6]; tgt = [0.3, 1.62, -5.95]; fov = 40; }                                // Kaio furious
      else if (ta < 21.5) { cam = [-1.7, 1.6, -0.6]; tgt = [0.6, 0.6, 2.9]; fov = 58; }                                   // the boy walks in
      else if (ta < PICK + 0.8) { cam = [-2.2, 1.6, 3.6]; tgt = [0.35, 0.75, 3.1]; fov = 56; }                          // picks her up
      else { const b = boyAt(ta); cam = [-3.2, 1.45, 0.3]; tgt = [b[0], 1.15, b[2]]; fov = 52; }                         // carries her away asleep
      cam = camShake(cam, sh);
      // drama: darken the edges while she is down, flash on the hits
      const vig = ta < HIT ? 0 : ta < 3.6 ? 0.35 : ta < 6.9 ? 0.35 + 0.45 * seg(ta, 3.6, 6.0) : 0.8 * (1 - seg(ta, 6.9, 7.8));
      fx.push(['vignette', [cam, tgt, vig, fov]]);
      const fl = Math.max(ta >= HIT ? 0.85 * (1 - seg(ta, HIT, HIT + 0.035)) : 0, ta >= KO ? 0.9 * (1 - seg(ta, KO, KO + 0.05)) : 0, ta >= TB ? 1 - seg(ta, TB + 0.15, TB + 0.7) : 0, ta >= 10.9 ? 0.5 * (1 - seg(ta, 10.9, 11.2)) : 0);
      fx.push(['screenFlash', [cam, tgt, fl, ta >= TB ? 0xfff6d8 : 0xe8c8ff]]);
      return { ta, ch, fx, lights, cam, tgt, fov };
    } },
};
// S: the Penosa asleep in the middle of the arena after the KO (low close shot, the Sombra knocked out behind her)
// K: Kaio furious, shouting his line ("Eu não acredito que eu perdi pra esse moleque pobre!"), which starts 1.7 s into the shot
SEGS.K = { ...SEGS.C, T: 4.9, frame(t) { const F = SEGS.C.frame(19.1 + t * 0.39); const kk = F.ch.kaio;
  if (kk) { kk.opts = { ...(kk.opts || {}), mouth: 'mad', talk: t > 1.72 && t < 4.55 && (t % 0.24) < 0.15 }; }
  return F; } };
SEGS.S = { ...SEGS.C, T: 2.5, frame(t) { const F = SEGS.C.frame(19.15 + t * 0.7); const u = t / 2.5;
  F.cam = [0.75 - 0.25 * u, 0.32, 4.55 - 0.15 * u]; F.tgt = [0, 0.22, 3.2]; F.fov = 44; return F; } };

(async () => {
  const S = SEGS[SEG], END = Math.min(+(process.argv[4] || 1e9), Math.round(S.T * FPS));
  const srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: __dirname, stdio: 'ignore' }); await new Promise(r => setTimeout(r, 1000));
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: W, height: H } }); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(`http://localhost:${PORT}/rig.html`); await p.waitForFunction(() => window.ready);
  await p.evaluate(() => window.filmLook()); await p.evaluate((n) => window.buildScene(n), S.scene); await p.evaluate(() => window.init());
  await p.evaluate(`(async () => { ${S.setup} })()`); if (S.populate) await p.evaluate(() => window.populate());
  await p.evaluate(() => { window.doFrame = (F) => { window.clearShot(); window.fxLightsOff();
    for (const [id, c] of Object.entries(F.ch)) { const o = window.__ch(id);
      if (c.spin) window.spinAbout(id, ...c.spin); else { o.rotation.order = 'XYZ'; o.rotation.set(0, 0, 0); window.pos(id, ...c.pos); if (c.tilt) { o.rotation.x = c.tilt[0]; o.rotation.z = c.tilt[1]; } }
      window.flashChar(id, ...(c.flash || [0, 0])); o.userData.pose(c.state || 'idle', c.tp ?? F.ta, c.opts || {}); }
    for (const [n, a] of F.fx) window.fa(n, a);
    for (const l of F.lights) window.fxLight(...l);
    return window.frame({}, F.ta, F.cam, F.tgt, F.fov); }; });
  if (process.env.TIMES) {    // timeline mode: render the exact source times listed in the file, into tripo/tl/<key>/
    const J = JSON.parse(fs.readFileSync(process.env.TIMES, 'utf8'));
    for (const job of J) { const out = `tripo/${process.env.OUT || 'tl'}/${job.key}`; fs.mkdirSync(out, { recursive: true });
      for (let i = 0; i < job.times.length; i += +(process.env.STEP || 1)) { const fn = `${out}/f${String(i).padStart(4, '0')}.png`; if (fs.existsSync(fn)) continue;
        const F = S.frame(job.times[i]); await p.evaluate((F) => window.doFrame(F), F); await p.screenshot({ path: fn, timeout: 120000 }); } }
    await b.close(); srv.kill(); return; }
  const out = `tripo/fight_${SEG}`; fs.mkdirSync(out, { recursive: true });
  const STEP = +(process.env.STEP || 1); const ref = fs.statSync(__dirname + '/fight_render.sh').mtimeMs; for (let f = START; f < END; f += STEP) { const fn = `${out}/f${String(f).padStart(4, '0')}.png`; if (!process.env.FORCE && fs.existsSync(fn) && fs.statSync(fn).mtimeMs > ref) continue; const F = S.frame(f / FPS); await p.evaluate((F) => window.doFrame(F), F); await p.screenshot({ path: `${out}/f${String(f).padStart(4, '0')}.png`, timeout: 120000 }); }
  await b.close(); srv.kill();
})();
