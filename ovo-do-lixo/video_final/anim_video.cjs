// Animated shots for the whole video (everything except the fight, which comes from fight_video.cjs).
// Each shot is a storyboard still brought to life: the camera always moves, characters animate, effects are rebuilt every frame.
// usage: node anim_video.cjs <port> <id,id,...|all>      -> tripo/anim/<id>/f####.png
// env: W, H (default 720x1280), STEP (render every Nth frame, for drafts), FORCE
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs = require('fs');
const { build, FPS } = require('./timeline.cjs');
const W = +(process.env.W || 720), H = +(process.env.H || 1280), PORT = +(process.argv[2] || 8901), STEP = +(process.env.STEP || 1);
const P = Math.PI;
const HELPERS = fs.readFileSync(__dirname + '/storyboard.cjs', 'utf8').match(/const HELPERS = `([\s\S]*?)`;/)[1];

// page-side extras: a per-frame effects group, re-showing named props, and a 2D overlay layer (titles, counters, speech bubbles)
const EXTRA = `
(() => { let AG = null; const S = window.__scene;
  window.agClear = () => { if (AG) { S.remove(AG); AG.traverse(o => { if (o.geometry) o.geometry.dispose(); }); } AG = new window.THREE.Group(); S.add(AG); return true; };
  window.af = (name, args = []) => { const o = window.FA[name](...args); AG.add(o); return o; };
  window.ax = (name, args = [], pos = [0, 0, 0], rot = [0, 0, 0], sc = 1) => { const o = (window.FX[name] || window.SC[name])(...args); o.position.set(...pos); o.rotation.set(...rot); if (o.scale) o.scale.multiplyScalar(sc); AG.add(o); return o; };
  window.showNamed = (n, v = true) => { const o = S.getObjectByName(n); if (o) o.visible = v; return !!o; };
  const st = document.createElement('style'); st.textContent = \`
    #ov { position: fixed; inset: 0; pointer-events: none; font-family: 'DejaVu Sans', sans-serif; z-index: 10; }
    .tt { position: absolute; left: 0; right: 0; text-align: center; font-weight: 900; letter-spacing: 0.02em; line-height: 1.05;
          -webkit-text-stroke: 0.9vw #1b0f05; paint-order: stroke fill; text-shadow: 0 1.2vw 0 rgba(0,0,0,0.35); }
    .bub { position: absolute; background: #fff; border: 1vw solid #1b0f05; border-radius: 6vw; padding: 2.5vw 4vw; font-weight: 900; color: #1b0f05; font-size: 7vw; }
    .bub:after { content: ''; position: absolute; bottom: -6vw; left: 20%; border: 3vw solid transparent; border-top: 4vw solid #1b0f05; }\`;
  document.head.appendChild(st); const ov = document.createElement('div'); ov.id = 'ov'; document.body.appendChild(ov);
  window.ovl = (html) => { if (ov.__h !== html) { ov.innerHTML = html; ov.__h = html; } return true; };
  // title helper: text, top (vh), size (vw), color, pop-in progress k (0..1)
  window.T = (txt, top, size, color, k = 1, extra = '') => { const sc = k < 1 ? (k < 0.7 ? 1.25 * k / 0.7 : 1.25 - 0.25 * (k - 0.7) / 0.3) : 1;
    return '<div class="tt" style="top:' + top + 'vh;font-size:' + size + 'vw;color:' + color + ';transform:scale(' + sc.toFixed(3) + ');opacity:' + Math.min(1, k * 3).toFixed(2) + ';' + extra + '">' + txt + '</div>'; };
  window.BLACK = (a) => '<div style="position:absolute;inset:0;background:#000;opacity:' + a.toFixed(3) + '"></div>';
  window.rainT = (t) => { S.traverse(o => { if (o.isLineSegments && o.material && o.material.opacity === 0.55) o.position.y = -((t * 7) % 0.9); }); };
  return true; })()`;

// ---------------------------------------------------------------- the shots
// fields: scene, setup (once), poses (static), anim (JS run every frame: t = shot time, u = 0..1, d = duration, T = clock for poses;
//         may return { poses, ov, cam, tgt, fov }), cam/tgt/fov (start), cam1/tgt1/fov1 (end) or mv { orbit, push, rise }
const A = {};
const shot = (id, o) => { A[id] = o; };
const pop = (u, a, b = a + 0.12) => Math.max(0, Math.min(1, (u - a) / (b - a)));   // used inside anim strings via window.pop
// ---- 1. hook
shot('01b', { scene: 'Street', cam: [2.6, 1.45, -7.75], tgt: [0.3, 1.12, -8.6], cam1: [1.4, 1.3, -7.85], tgt1: [-0.2, 1.1, -8.6], fov: 50,
  anim: `for (let k = 0; k < 7; k++) { const t0 = (k * 0.53) % d; if (t >= t0) window.af('burst', [t, t0, [-0.9 + k * 0.3, 1.0 + 0.15 * Math.sin(k * 2), -8.75], { n: 6, speed: 0.35, up: 0.3, grav: 0.2, life: 0.9, color: [0xffe080, 0xc070ff, 0x9ad8ff][k % 3], size: 0.03, seed: k }]); }` });
shot('01c', { scene: 'Street', cam: [-5.9, 1.05, -15.9], tgt: [-6.6, 0.3, -18.4], cam1: [-6.35, 0.55, -17.4], tgt1: [-6.75, 0.15, -18.35], fov: 46,
  anim: `if (t > 0.6) window.af('puff', [t, 0.6, [-6.75, 0.02, -18.2], { n: 4, size: 0.12, life: 1.6, color: 0xb0a080, opacity: 0.5, rise: 0.15, spread: 0.15, seed: 4 }]);
         const fly = [-6.75 + 0.18 * Math.sin(t * 5), 0.35 + 0.06 * Math.sin(t * 13), -18.3 + 0.15 * Math.cos(t * 5)]; window.af('burst', [t, t - 0.01, fly, { n: 1, speed: 0, life: 0.2, color: 0x111111, size: 0.025, seed: 1 }]);` });
shot('01d', { scene: 'Street', setup: `SB.put('boy', -6.62, -17.72, P);`, cam: [-5.55, 1.3, -19.75], tgt: [-6.65, 0.6, -17.95], cam1: [-5.2, 1.7, -20.3], tgt1: [-6.6, 1.25, -17.9], fov: 52, fov1: 56,
  anim: `const up = u > 0.42; if (window.__held !== up) { window.__held = up; window.showNamed('grayEgg', !up); window.holdProp('boy', 'R', up ? 'grayEgg' : null, [0.1], [0, -0.2, 0.04]); }
         if (up && u < 0.6) window.af('burst', [t, 0.42 * d, [-6.6, 0.9, -17.9], { n: 10, speed: 0.6, up: 0.6, life: 0.8, color: 0xffffff, size: 0.03, seed: 9 }]);
         return { poses: { boy: up ? ['holdUp', { mouth: 'happy' }] : ['pickup', { mouth: 'smile' }] } };` });
shot('01e', { scene: 'Arena', setup: `SB.put('pen', 0.15, 0.9, 0.9); window.tilt('pen', 0, 1.45, 0.2); SB.put('cRaio', -0.45, -0.1, 0.5);`,
  poses: { pen: ['idle', { face: 'sad' }], cRaio: 'flap' }, cam: [0.45, 0.95, 2.9], tgt: [0, 1.6, -6.5], cam1: [0.2, 0.75, 2.2], tgt1: [0.1, 0.9, -4.0], fov: 66,
  anim: `window.af('dizzyStars', [t, [0.55, 0.45, 0.95], 0.13]);
         let ov = ''; if (u > 0.2) ov += window.T('347 LUTAS', 8, 11, '#ffffff', window.pop(u, 0.2)); if (u > 0.56) ov += window.T('347 DERROTAS', 18, 11, '#ff4a3a', window.pop(u, 0.56));
         return { ov };` });
// ---- 2. rules
shot('02a', { scene: 'Street', cam: [-1.05, 0.66, -4.2], tgt: [-1.6, 0.42, -5.2], cam1: [-1.35, 0.55, -4.65], tgt1: [-1.6, 0.5, -5.2], fov: 45,
  anim: `const o = Math.min(1, Math.max(0, (u - 0.35) / 0.55)); window.ax('nestBox', ['dourado', o > 0 ? o : 0, 0.11], [-1.6, 0, -5.2], [0, 0.3, 0.04 * Math.sin(t * 22) * (u < 0.35 ? u / 0.35 : 1)]);
         window.fxLight(0, [-1.5, 0.7, -4.9], 0xffd060, 2 + 3 * u + Math.sin(t * 9), 3); if (u > 0.35) window.af('burst', [t, 0.35 * d, [-1.6, 0.55, -5.2], { n: 16, speed: 0.8, up: 1, life: 0.9, color: 0xffe080, size: 0.035, seed: 3 }]);` });
shot('02b', { scene: 'Arena', setup: `SB.put('cFogo', 1.5, 0.78, 1.35);`, poses: { cFogo: 'peck' }, cam: [0.3, 1.1, 3.3], tgt: [1.75, 0.5, 0.9], cam1: [0.6, 1.0, 3.2], fov: 50,
  anim: `const ph = (t * 1.25) % 1, hitT = t - ph / 1.25 + 0.36; const sw = ph > 0.3 ? 0.22 * Math.exp(-(ph - 0.3) * 5) * Math.sin((ph - 0.3) * 18) : 0;
         window.ax('miniBag', [0.95], [2.05, 0, 0.6], [0, -0.2, -sw]); if (t > hitT) window.af('impact', [t, hitT, [1.92, 0.42, 0.65], { size: 0.35, color: 0xffd080, life: 0.1 }]);` });
shot('02c', { scene: 'Arena', setup: `SB.put('cRaio', -0.2, 1.4, 0.3); window.addFX('trophy', [0.9], [0.45, 0, 1.6]);`, poses: { cRaio: 'flap' }, cam: [0.35, 1.05, 3.7], tgt: [0, 0.9, 0.6], fov: 55,
  anim: `for (let k = 0; k < 4; k++) { const t0 = 0.3 + k * 0.45; if (t > t0) window.af('burst', [t, t0, [0.45, 1.0, 1.6], { n: 10, speed: 1.2, up: 2.2, grav: 3, life: 1.2, color: 0xffd040, size: 0.05, seed: k + 20 }]); }
         return { ov: window.T('+100 TROFÉUS', 8, 10, '#ffd23a', window.pop(u, 0.05)) + (u > 0.45 ? window.T('+ R$ 500', 17, 10, '#5dff7a', window.pop(u, 0.45)) : '') };` });
shot('02d', { scene: 'Arena', setup: `SB.put('cPreta', 0.2, 2.5, 0.15);`, cam: [-1.3, 0.95, 4.0], tgt: [0.15, 0.4, 1.7], cam1: [-1.1, 0.9, 4.0], tgt1: [0.15, 0.4, 2.2], fov: 48,
  anim: `const z = 1.3 + 0.9 * u; window.pos('cPreta', 0.2 - 0.05 * u, 0, z, 0.15);
         window.af('puff', [t, t - 0.4, [0.2, 0.95, z], { n: 5, size: 0.16, life: 1.2, color: 0x6c6f78, opacity: 0.85, rise: 0, spread: 0.12, seed: 2 }]);
         if (u > 0.3) for (let k = 0; k < 6; k++) window.af('burst', [t, t - ((t + k * 0.13) % 0.5), [0.15 + 0.04 * k, 0.9, z], { n: 1, speed: 0, up: 0, grav: 3, life: 0.5, color: 0x8ab4ff, size: 0.02, seed: k }]);
         return { poses: { cPreta: 'walk' } };` });
shot('02i', { scene: 'Arena', cam: [-1.2, 0.7, 2.1], tgt: [-0.5, 0.35, 0.6], cam1: [1.0, 0.75, 2.2], tgt1: [0.6, 0.38, 0.6], fov: 46,
  anim: `const eggs = [['gray', -0.75, 0.15], ['roxo', 0, 0.55], ['dourado', 0.75, 1.0]];
         eggs.forEach(([k, x, g], i) => { window.ax('nestBox', [k, 0, 0.11], [x, 0, 0.6], [0, 0.4, 0]); const lit = Math.min(1, Math.max(0, (u - i * 0.25) / 0.3)) * g;
           window.fxLight(i, [x, 0.8, 0.9], [0xffffff, 0xb060ff, 0xffc040][i], 6 * lit, 2.5);
           if (lit > 0.2) window.af('charge', [t, i * 0.25 * d, [x, 0.55, 0.6], { dur: 1.2, color: [0xffffff, 0xc070ff, 0xffd060][i], size: 0.4 * g, r: 0.35, n: Math.round(16 * g) }]); });
         if (u > 0.75) window.af('arcs', [t, [0.75, 0.25, 0.6], { r: 0.25, n: 3, h: 0.5, color: 0xffd060, seed: 4 }]);` });
// ---- 3. the weakest chicken
shot('03a', { scene: 'House', setup: `window.hideNamed('grayEgg');`, cam: [-3.5, 0.75, -0.6], tgt: [-4.3, 0.38, -1.5], cam1: [-3.75, 0.6, -0.9], tgt1: [-4.3, 0.38, -1.5], fov: 40,
  anim: `window.ax('hatchEgg', ['gray', 0.085, 0.12], [-4.3, 0.272, -1.5], [0, 0, (u > 0.5 ? 0.12 : 0.03) * Math.sin(t * 25) * Math.max(0, Math.sin(t * 3))]);
         const day = Math.min(30, 1 + Math.floor(u * 34)); return { ov: window.T('DIA ' + day, 9, 14, '#ffffff', 1) + (day >= 30 ? window.T('1 MÊS DEPOIS...', 19, 8, '#ffe14a', window.pop(u, 0.86)) : '') };` });
shot('03b', { scene: 'House', setup: `window.hideNamed('grayEgg'); window.addFX('hatchEgg', ['gray', 0.12, 1.0], [-4.3, 0.21, -1.5]);`, cam: [-3.75, 0.68, -0.6], tgt: [-4.3, 0.42, -1.5], cam1: [-3.95, 0.6, -0.95], tgt1: [-4.3, 0.42, -1.48], fov: 40,
  anim: `const e = Math.min(1, u / 0.22), y = 0.12 + 0.15 * (1 - Math.pow(1 - e, 3)); SB.put('penS', -4.3, -1.45, 0.4, y);
         window.af('burst', [t, 0.05, [-4.3, 0.42, -1.5], { n: 14, speed: 0.6, up: 1.2, grav: 2, life: 0.9, color: 0xc8c8c8, size: 0.03, seed: 5 }]);
         let ov = ''; if (u > 0.58) ov = window.T('PENOSA', 8, 17, '#ffe14a', window.pop(u, 0.58)) + window.T('&#9829;', 20, 12, '#ff5a7a', window.pop(u, 0.66));
         return { poses: { penS: ['idle', { face: u < 0.5 ? 'sleepy' : 'happy' }] }, ov };` });
shot('03c', { scene: 'House', setup: `SB.put('penM', 0.2, 2.4, 0.5);`, poses: { penM: ['idle', { face: 'sleep' }] }, cam: [0.8, 0.6, 3.5], tgt: [0.25, 0.4, 2.4], cam1: [0.6, 0.5, 3.15], fov: 42,
  anim: `window.af('zzzAt', [t, [0.32, 0.62, 2.4], 0.07]);
         return { ov: window.T('PODER:', 7, 10, '#ffffff', window.pop(u, 0.0)) + window.T('DORMIR', 15, 17, '#9ad8ff', window.pop(u, 0.3)) };` });
shot('03d1', { scene: 'Arena', setup: `SB.put('pen', 0.45, 0.55, -0.6); SB.put('cRaio', -0.7, -0.2, 0.9);`, poses: { pen: ['idle', { face: 'sleep' }], cRaio: 'fight' }, cam: [1.6, 1.0, 3.2], tgt: [-0.1, 0.45, 0.2], cam1: [1.3, 0.95, 3.35], fov: 50,
  anim: `window.af('zzzAt', [t, [0.6, 0.85, 0.55], 0.08]); return { ov: window.T('LUTA 1', 8, 13, '#ffffff', window.pop(u, 0)) };` });
shot('03d2', { scene: 'Arena', setup: `SB.put('pen', 0.3, 0.4, 0.4); SB.put('cGelo', -0.6, -0.45, 0.6);`, poses: { pen: ['idle', { face: 'sleep' }], cGelo: 'fight' }, cam: [-1.9, 1.0, 2.9], tgt: [-0.1, 0.45, 0], cam1: [-1.5, 0.95, 3.1], fov: 50,
  anim: `window.af('zzzAt', [t, [0.42, 0.8, 0.45], 0.08]); window.af('charge', [t, 0.3, [-0.4, 0.62, -0.25], { dur: 1.2, color: 0xbfeaff, size: 0.5, r: 0.5, n: 14 }]);
         return { ov: window.T('LUTA 2', 8, 13, '#ffffff', window.pop(u, 0)) };` });
shot('03e', { scene: 'Arena', setup: `SB.put('pen', 0.5, 3.0, P);`, cam: [2.4, 0.8, 1.9], tgt: [0.45, 0.25, 3.15], cam1: [2.25, 0.75, 2.3], tgt1: [0.45, 0.2, 3.45], fov: 50,
  anim: `const k = Math.min(1, u / 0.85), z = 3.0 + 0.75 * k; window.pos('pen', 0.5, 0, z, P); window.ax('worm', [0.85], [0.5, 0, z - 0.5], [0, 0, 0]);
         for (let i = 0; i < 4; i++) { const t0 = 0.2 + i * 0.45; if (t > t0) window.af('puff', [t, t0, [0.5, 0, 3.0 + 0.75 * Math.min(1, t0 / d / 0.85) + 0.2], { n: 3, size: 0.18, life: 0.9, seed: i }]); }
         return { poses: { pen: ['butt_slide', { face: 'surprised' }] }, ov: window.T('LUTA 3', 8, 13, '#ffffff', window.pop(u, 0)) };` });
shot('03f', { scene: 'ArenaRindo', setup: `SB.put('kaio', 0, -5.75, 0.35); SB.put('sb', -1.1, -5.45, 0.5);`, poses: { kaio: ['laugh', { mouth: 'happy' }], sb: ['idle', { face: 'meanLaugh', talk: true }] },
  cam: [2.0, 1.5, -4.75], tgt: [-0.3, 1.5, -6.0], fov: 60, mv: { orbit: 0.2, push: 0.06 },
  anim: `return { ov: u > 0.1 ? window.T('HAHAHA', 7, 14, '#ffe14a', window.pop(u, 0.1), 'transform-origin:center;rotate:-6deg;') : '' };` });
// ---- 4. the rival
shot('04a', { scene: 'Arena', setup: `SB.put('kaio', -1.9, -3.4, 0.2); SB.put('sb', -0.75, -3.0, -0.3); window.vis('sb', false);`, poses: { kaio: 'cross' }, cam: [-1.2, 1.25, -1.0], tgt: [-1.9, 1.4, -3.4], cam1: [-1.45, 1.45, -1.55], fov: 48,
  anim: `return { ov: window.T('KAIO', 7, 15, '#ffffff', window.pop(u, 0.05)) + window.T('CAMPEÃO DA ARENA', 17, 8, '#ffd23a', window.pop(u, 0.25)) };` });
shot('04s', { scene: 'Arena', setup: `SB.put('sb', -0.75, -3.0, -0.3);`, cam: [0.55, 0.95, -0.3], tgt: [-0.75, 0.6, -3.0], cam1: [0.25, 0.95, -0.7], fov: 50,
  anim: `window.af('arcs', [t, [-0.75, 0.1, -3.0], { r: 0.55, n: 2, h: 1.1, color: 0xc070ff, seed: 7 }]);
         return { poses: { sb: ['idle', { face: 'mean', sparks: 0.8 }] }, ov: window.T('SOMBRA', 7, 15, '#c98bff', window.pop(u, 0.05)) + window.T('NUNCA PERDEU', 17, 9, '#ffffff', window.pop(u, 0.45)) };` });
shot('04c', { scene: 'Arena', setup: `SB.put('sb', -0.75, -3.0, -0.3);`, cam: [0.65, 1.05, -0.55], tgt: [-0.75, 0.75, -3.0], cam1: [0.35, 1.0, -0.9], fov: 48,
  anim: `window.af('charge', [t, 0.2, [-0.72, 1.05, -2.75], { dur: 1.5, color: 0xc070ff, size: 0.6, r: 0.6, n: 24 }]); window.af('arcs', [t, [-0.75, 0.3, -3.0], { r: 0.5, n: 3, h: 1.0, color: 0xc070ff, seed: 3 }]);
         window.fxLight(0, [-0.6, 1.1, -2.5], 0xb04aff, 3 + 2 * Math.sin(t * 8), 3);
         return { poses: { sb: ['idle', { face: 'meanRage', sparks: 1 }] } };` });
shot('04b', { scene: 'Street', setup: `SB.put('kaio', -6.0, -10.4, 2.3); SB.put('boy', -5.0, -11.3, -0.84);`, cam: [-3.4, 1.55, -8.2], tgt: [-5.5, 1.3, -10.85], cam1: [-3.9, 1.5, -8.7], fov: 62,
  anim: `return { poses: { kaio: u < 0.35 ? ['point', { mouth: 'smirk' }] : ['laugh', { mouth: 'happy' }], boy: 'sad' },
           ov: u > 0.3 ? '<div class="bub" style="left:8vw;top:14vh;transform:scale(' + Math.min(1, window.pop(u, 0.3) * 1.2).toFixed(2) + ')">MENINO DO LIXO!</div>' : '' };` });
// ---- 5. training
shot('05z', { scene: 'House', setup: `SB.put('boy', 0.9, 2.2, -0.4); SB.put('penM', 0.3, 2.5, 0.3);`, poses: { boy: ['cheer', { mouth: 'neutral' }], penM: ['idle', { face: 'sleep' }] }, cam: [1.3, 1.3, 5.4], tgt: [0.6, 0.85, 2.35], cam1: [1.1, 1.4, 4.9], fov: 52,
  anim: `window.af('zzzAt', [t, [0.42, 0.62, 2.5], 0.07]);` });
shot('05r', { scene: 'HouseChuva', setup: `SB.put('penM', -2.8, 1.6, 0.3, 0.22); SB.put('boy', -4.0, 2.4, 1.5);`, poses: { penM: ['run', { face: 'sleep' }], boy: ['point', { mouth: 'talk', talk: true }] }, cam: [-1.25, 1.2, 3.6], tgt: [-3.0, 0.6, 1.8], cam1: [-1.55, 1.1, 3.35], fov: 52,
  anim: `window.rainT(t); return { ov: window.T('NA CHUVA', 8, 12, '#9ad8ff', window.pop(u, 0.05)) };` });
shot('05s', { scene: 'House', setup: `SB.put('penM', 0.2, 2.6, 0.3); SB.put('boy', -0.8, 2.3, 1.2);`, poses: { penM: ['idle', { face: 'sleep' }], boy: ['cheer', { mouth: 'happy' }] }, cam: [0.9, 1.3, 5.6], tgt: [-0.3, 0.8, 2.45], cam1: [0.6, 1.2, 5.2], fov: 52,
  anim: `window.fxLight(0, [0.5, 3, 3], 0xffe0a0, 6, 8); return { ov: window.T('NO SOL', 8, 12, '#ffd23a', window.pop(u, 0.05)) };` });
shot('05c', { scene: 'HouseNoite', setup: `window.addFX('miniBag', [0.95], [1.0, 0, 2.6]); SB.put('penM', 0.62, 2.85, 0.6); SB.put('boy', -0.3, 2.5, 1.3);`, poses: { penM: ['idle', { face: 'sleep' }], boy: ['idle', { mouth: 'neutral' }] }, cam: [2.7, 1.3, 4.7], tgt: [0.6, 0.8, 2.6], cam1: [2.2, 1.1, 4.2], fov: 54,
  anim: `window.af('zzzAt', [t, [0.75, 0.6, 2.85], 0.08]); return { ov: window.T('DE MADRUGADA', 8, 10, '#c9d6ff', window.pop(u, 0.05)) };` });
shot('05a', { scene: 'HouseChuva', setup: `SB.put('penM', -2.8, 1.6, 0.3, 0.22); SB.put('boy', -4.0, 2.4, 1.5);`, poses: { penM: ['run', { face: 'sleep' }], boy: ['point', { mouth: 'talk', talk: true }] }, cam: [-2.0, 0.75, 2.9], tgt: [-2.8, 0.5, 1.6], cam1: [-2.25, 0.65, 2.55], fov: 48,
  anim: `window.rainT(t); window.af('zzzAt', [t, [-2.7, 0.78, 1.6], 0.07]);` });
shot('05b', { scene: 'House', setup: `SB.put('penM', 0.2, 2.6, 0.3);`, poses: { penM: ['idle', { face: 'sleep' }] }, cam: [1.05, 0.95, 3.9], tgt: [0.2, 0.42, 2.6], cam1: [0.85, 0.9, 3.65], fov: 44,
  anim: `const lift = Math.max(0, Math.sin(t * 3.2)) * 0.06; window.ax('miniDumbbell', [0.36], [0.2, 0.5 + 2 * lift, 2.62], [0, 0.3, 0.05 * Math.sin(t * 3.2)]); window.af('zzzAt', [t, [0.4, 0.75, 2.6], 0.08]);` });
shot('05d', { scene: 'Arena', setup: `SB.put('pen', 0.2, 0.75, 0.9); window.tilt('pen', 0, 1.45, 0.2); SB.put('cGelo', -0.55, -0.1, 0.5);`, poses: { pen: ['idle', { face: 'sleep' }], cGelo: 'flap' }, cam: [0.3, 1.3, 3.2], tgt: [0, 0.6, 0.3], cam1: [0.35, 0.9, 2.5], fov: 50,
  anim: `window.af('dizzyStars', [t, [0.6, 0.45, 0.8], 0.13]);
         const n = u < 0.12 ? 100 : u < 0.3 ? 100 + Math.round((u - 0.12) / 0.18 * 100) : u < 0.4 ? 200 : u < 0.72 ? 200 + Math.round((u - 0.4) / 0.32 * 147) : 347;
         return { ov: window.T(n + '', 7, 24, '#ff4a3a', 1) + window.T('DERROTAS', 22, 10, '#ffffff', 1) };` });
shot('05e', { scene: 'HouseNoite', setup: `SB.put('boy', 0, -1.25, 0); SB.put('penM', 0, -0.8, 0, 0.3);`, poses: { boy: ['sit', { mouth: 'smile' }], penM: ['idle', { face: 'sleep' }] }, cam: [0.95, 1.0, 0.95], tgt: [0, 0.65, -1.1], cam1: [0.6, 0.85, 0.5], tgt1: [0, 0.55, -0.9], fov: 50,
  anim: `window.af('zzzAt', [t, [0.18, 0.85, -0.8], 0.06]);` });
// ---- 6. the event
shot('06a', { scene: 'City', cam: [0, 1.7, 10], tgt: [0, 3, -10], cam1: [0, 1.6, 9], tgt1: [0, 18, -30], fov: 62, fov1: 42 });
shot('06b', { scene: 'ArenaTorneio', cam: [1.0, 1.7, -5.7], tgt: [2.9, 1.75, -5.0], cam1: [1.6, 1.9, -5.4], tgt1: [2.9, 1.85, -5.0], fov: 50,
  anim: `window.af('arcs', [t, [2.9, 1.5, -5.0], { r: 0.35, n: 4, h: 0.7, color: 0xffd060, seed: 11 }]); window.fxLight(0, [2.5, 2.2, -4.8], 0xffd060, 4 + 2 * Math.sin(t * 10), 4);
         if (u > 0.2) window.af('burst', [t, 0.2 * d, [2.9, 1.9, -5.0], { n: 20, speed: 0.8, up: 1, life: 1.2, color: 0xffe080, size: 0.04, seed: 2 }]);
         return { ov: window.T('OVO DO TROVÃO', 8, 11, '#ffd23a', window.pop(u, 0.1)) };` });
shot('06c', { scene: 'ArenaTorneio', cam: [-2, 2.6, 0.5], tgt: [15.6, 8.4, 0], cam1: [1, 4.0, 0.2], fov: 40, fov1: 34 });
shot('06d', { scene: 'ArenaTorneio', setup: `SB.put('boy', 0.4, 3.2, P); SB.put('pen', -0.2, 2.4, P); SB.put('kaio', -0.4, -3.2, 0); SB.put('sb', 0.3, -2.3, 0);`,
  poses: { boy: ['idle', { mouth: 'neutral' }], pen: ['idle', { face: 'sleepy' }], kaio: 'cross', sb: ['idle', { face: 'mean', sparks: 0.6 }] }, cam: [1.0, 3.3, 4.4], tgt: [-0.2, 0.5, -1.9], cam1: [0.8, 2.9, 4.1], fov: 58,
  anim: `return { ov: window.T('A FINAL', 8, 14, '#ff4a3a', window.pop(u, 0.05)) };` });
// ---- 7. climax extras
shot('07a', { scene: 'ArenaTorneio', setup: `SB.put('pen', 0, 1.3, P); SB.put('sb', 0, -1.4, 0); SB.put('boy', 0, 5.8, P); SB.put('kaio', 0, -5.8, 0);`,
  poses: { pen: ['idle', { face: 'sleepy' }], sb: ['idle', { face: 'mean', sparks: 0.6 }], boy: 'idle', kaio: 'cross' }, cam: [0, 14, 9.5], tgt: [0, 0, -2.5], cam1: [0.8, 4.5, 6.5], tgt1: [0, 0.5, 0], fov: 55, fov1: 50 });
shot('07e', { scene: 'ArenaTorneio', setup: `SB.put('pen', 0, 3.5, P);`, cam: [1.3, 0.85, 1.6], tgt: [0, 0.45, 3.5], cam1: [1.0, 0.8, 1.9], fov: 48,
  anim: `const g = Math.min(1, u * 1.3); window.af('arcs', [t, [0, 0.12, 3.45], { r: 0.25, n: 1 + Math.round(3 * g), h: 0.5, color: 0xffd060, seed: 2 }]);
         window.fxLight(1, [0.1, 0.45, 3.0], 0xffc040, 0.6 + 2 * g + 0.4 * Math.sin(t * 14), 2.5); window.af('charge', [t, 0.1, [0, 0.4, 3.35], { dur: d, color: 0xffd060, size: 0.35, r: 0.4, n: 18 }]);
         if (u > 0.6) window.af('puff', [t, 0.6 * d, [0, 0.35, 3.4], { n: 10, size: 0.12, life: 1.2, color: 0x9a9a9a, opacity: 0.8, rise: -0.2, spread: 0.2, seed: 8 }]);
         return { poses: { pen: ['idle', { face: 'power', evo: 0.2 * g, breakT: T + 50 }] } };` });
shot('07f', { scene: 'ArenaTorneio', setup: `SB.put('pen', 0, 3.5, P);`, cam: [1.25, 0.95, 1.6], tgt: [0, 0.55, 3.5], cam1: [0.95, 0.85, 1.95], fov: 48,
  anim: `window.af('auraColumn', [t, 0, [0, 0, 3.5], { h: 1.5, r: 0.42 }]); window.fxLight(1, [0.2, 0.8, 2.9], 0xffc040, 1.2, 3);
         return { poses: { pen: ['idle', { face: 'power', evo: 1, breakT: T - 30 }] } };` });
shot('07g', { scene: 'ArenaTorneio', setup: `SB.put('pen', 0, 3.4, P);`, cam: [0, 2.6, -2.6], tgt: [0, 1.8, 3.4], cam1: [0, 3.4, -3.4], tgt1: [0, 2.6, 3.4], fov: 62,
  anim: `const tb = 0.3 * d, f = Math.floor(t * 24); window.af('auraColumn', [t, 0, [0, 0, 3.4], { h: 1.5, r: 0.42 }]);
         if (t > tb && t < tb + 0.5) { window.af('lightning', [[1.4, 16, 2.4], [0, 0.7, 3.4], { seed: f, w: 0.12, branches: 4, color: 0xffe9a0, jag: 0.12 }]); window.fxLight(0, [0, 3, 3.4], 0xfff0c0, 30, 20); }
         if (t > tb) { window.af('shockwave', [t, tb, [0, 0, 3.4], { r: 4, life: 0.8, color: 0xffe9a0 }]); window.af('burst', [t, tb, [0, 0.5, 3.4], { n: 50, speed: 4, up: 2, life: 1.0, color: 0xffe080, seed: 5 }]); }
         const C = window.__camNow; const fl = t > tb ? Math.max(0, 1 - (t - tb) / 0.5) : 0;
         return { poses: { pen: ['jump', { face: 'power', evo: 1, breakT: T - 30, talk: t < tb }] }, shake: t > tb ? 0.12 * Math.exp(-(t - tb) * 4) : 0, flash: fl };` });
// ---- 8. reward extras
shot('08b', { scene: 'ArenaTorneio', cam: [0, 1.25, 3.4], tgt: [0, 4.6, -13], cam1: [0, 2.2, 1.0], tgt1: [0, 8.5, -16], fov: 60, fov1: 50,
  anim: `const won = u > 0.35; if (window.__won !== won) { window.__won = won; window.setBoard([{ t: 'TORNEIO LENDÁRIO', size: 0.15, y: 0.17, color: '#ffe27a', glow: '#ffb000' }, { t: 'VITÓRIAS  x  DERROTAS', size: 0.1, y: 0.38, color: '#cfe2ff' }, { t: (won ? '1' : '0') + '  –  347', size: 0.32, y: 0.68, color: won ? '#4aff7a' : '#ff6a5a', glow: won ? '#20ff40' : '#ff2020' }]); }
         if (won) window.af('burst', [t, 0.35 * d, [0, 8.5, -15.5], { n: 40, speed: 3, up: 1, life: 1.2, color: 0x4aff7a, size: 0.12, seed: 3 }]);` });
shot('08c', { scene: 'ArenaTorneio', setup: `SB.put('boy', 0, 1.4, 0); SB.put('penM', 0.5, 1.8, -0.3); window.holdProp('boy', 'R', 'thunderEgg', [0.24], [-0.22, 0.12, 0]);`,
  poses: { boy: ['holdUp', { mouth: 'happy' }], penM: ['idle', { face: 'sleep' }] }, cam: [0.7, 1.05, 4.3], tgt: [0.25, 1.35, 1.5], cam1: [0.55, 1.1, 4.0], fov: 62,
  anim: `for (let k = 0; k < 5; k++) { const t0 = k * 0.5; if (t > t0) window.af('burst', [t, t0, [-1 + k * 0.5, 4, 1.0], { n: 30, speed: 1.5, up: 0.5, grav: 0.8, life: 2.5, color: [0xff4a6a, 0xffd23a, 0x4ad0ff, 0x6aff6a, 0xff8aff][k], size: 0.05, seed: k + 40 }]); }
         window.af('zzzAt', [t, [0.6, 0.55, 1.8], 0.07]); window.fxLight(0, [0.5, 2.4, 1.8], 0xffd060, 1.5, 4);` });
// ---- 9. ending
shot('09a', { scene: 'Bedroom', setup: `SB.put('penM', -0.8, -2.12, 0.5, 1.44);`, poses: { penM: ['idle', { face: 'sleep' }] }, cam: [0.4, 1.65, -0.3], tgt: [-0.75, 1.45, -2.15], cam1: [0.05, 1.55, -0.85], fov: 50,
  anim: `window.af('zzzAt', [t, [-0.65, 1.95, -2.1], 0.07]);` });
shot('09b', { scene: 'BedroomDia', setup: `SB.put('penM', -0.8, -2.12, 0.5, 1.44);`, poses: { penM: ['idle', { face: 'awake' }] }, cam: [1.2, 1.7, 2.3], tgt: [-0.6, 1.2, -1.6], cam1: [0.9, 1.65, 1.6], fov: 62,
  anim: `return { ov: window.T('DE MANHÃ', 8, 12, '#ffe9a8', window.pop(u, 0.05)) };` });
shot('09c', { scene: 'BedroomDia', setup: `window.addFX('grayEgg', [0.045], [-0.72, 1.47, -2.08], [0, 0, 0.2]);`, cam: [0.1, 1.85, -0.75], tgt: [-0.8, 1.55, -2.1], cam1: [-0.25, 1.72, -1.25], tgt1: [-0.8, 1.5, -2.1], fov: 42, fov1: 40,
  anim: `const k = Math.min(1, Math.max(0, (u - 0.05) / 0.3)), e = k * k * (3 - 2 * k); SB.put('penM', -0.8 - 0.22 * e, -2.12 - 0.13 * e, 0.5 + 0.4 * e, 1.44);
         if (u > 0.4) window.ax('sparkle', [0.03 + 0.01 * Math.sin(t * 9)], [-0.7, 1.585, -2.04]).children[1].intensity = 0.08;
         return { poses: { penM: [k > 0 && k < 1 ? 'walk' : 'idle', { face: 'happy' }] } };` });
shot('09d', { scene: 'BedroomDia', setup: `window.addFX('grayEgg', [0.045], [-0.72, 1.47, -2.08], [0, 0, 0.2]); SB.put('penM', -1.02, -2.25, 0.9, 1.44);`, poses: { penM: ['idle', { face: 'happy' }] },
  cam: [-0.15, 1.72, -1.1], tgt: [-0.75, 1.52, -2.1], cam1: [-0.3, 1.68, -1.3], fov: 40, fov1: 36,
  anim: `window.ax('sparkle', [0.025 + 0.01 * Math.sin(t * 11)], [-0.7, 1.585, -2.04]).children[1].intensity = 0.08; if (u > 0.35) window.af('arcs', [t, [-0.71, 1.5, -2.07], { r: 0.05, n: 2, h: 0.1, color: 0xffd060, seed: 6 }]);
         window.fxLight(0, [-0.66, 1.62, -1.95], 0xffd060, 0.15 + 0.1 * Math.sin(t * 7), 1);
         return { ov: u > 0.72 ? window.BLACK(Math.min(1, (u - 0.72) / 0.28)) : '' };` });

// ---------------------------------------------------------------- renderer
const ease = (x) => x * x * (3 - 2 * x), L = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
function camAt(C, u, idx) {
  const e = ease(u);
  if (C.cam1 || C.tgt1) return [L(C.cam, C.cam1 || C.cam, e), L(C.tgt, C.tgt1 || C.tgt, e), (C.fov || 50) + ((C.fov1 || C.fov || 50) - (C.fov || 50)) * e];
  const mv = C.mv || {}, orbit = (mv.orbit ?? 0.14) * (idx % 2 ? 1 : -1), push = mv.push ?? 0.1;
  const dx = C.cam[0] - C.tgt[0], dz = C.cam[2] - C.tgt[2], a = orbit * (e - 0.5), k = 1 - push * e;
  return [[C.tgt[0] + (dx * Math.cos(a) - dz * Math.sin(a)) * k, C.tgt[1] + (C.cam[1] - C.tgt[1]) * k + (mv.rise || 0) * e, C.tgt[2] + (dx * Math.sin(a) + dz * Math.cos(a)) * k], C.tgt, C.fov || 50];
}
(async () => {
  const want = (process.argv[3] || 'all');
  const TL = build().items.filter(i => i.kind === 'anim'); const dur = Object.fromEntries(TL.map(i => [i.id, i.n]));
  const ids = (want === 'all' ? Object.keys(dur) : want.split(',')).filter(id => A[id] && dur[id]);
  const missing = Object.keys(dur).filter(id => !A[id]); if (missing.length) console.log('MISSING SHOTS', missing);
  const srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: __dirname, stdio: 'ignore' }); await new Promise(r => setTimeout(r, 1000));
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: W, height: H } }); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto(`http://localhost:${PORT}/rig.html`); await p.waitForFunction(() => window.ready);
  await p.evaluate(HELPERS); await p.evaluate(() => window.filmLook()); await p.evaluate(EXTRA);
  await p.evaluate(`window.pop = ${pop.toString()};`);
  let curScene = null, T = 100;
  const bySc = {}; ids.forEach(id => (bySc[A[id].scene] = bySc[A[id].scene] || []).push(id));
  for (const [sc, list] of Object.entries(bySc)) {
    for (const id of list) {
      const C = A[id], n = dur[id], out = `tripo/${process.env.OUT || 'anim'}/${id}`; fs.mkdirSync(out, { recursive: true });
      const todo = []; for (let f = 0; f < n; f += STEP) { const fn = `${out}/f${String(f).padStart(4, '0')}.png`; if (process.env.FORCE || !fs.existsSync(fn)) todo.push(f); }
      if (!todo.length) continue;
      // every shot starts from a fresh page: nothing from the previous shot can stay in the scene
      await p.goto(`http://localhost:${PORT}/rig.html`); await p.waitForFunction(() => window.ready);
      await p.evaluate(HELPERS); await p.evaluate(() => window.filmLook()); await p.evaluate(EXTRA); await p.evaluate(`window.pop = ${pop.toString()};`);
      await p.evaluate((n) => window.buildScene(n), sc); await p.evaluate(() => window.SB.setup()); await p.evaluate(() => window.populate()); curScene = sc;
      await p.evaluate(`(async () => { const P = Math.PI; window.SB.reset(); window.fxLightsOff(); window.__held = undefined; window.__won = undefined; window.agClear(); window.ovl(''); ${C.setup || ''} })()`);
      const fnSrc = `(t, u, d, T, P, SB) => { ${C.anim || ''} }`;
      await p.evaluate(`window.__anim = ${fnSrc};`);
      const idx = Object.keys(A).indexOf(id);
      for (let j = -1; j < todo.length; j++) {
        const f = j < 0 ? 0 : todo[j], t = f / FPS, u = n > 1 ? f / (n - 1) : 0, Tn = T + t + (j < 0 ? -0.5 : 0);
        const [cam, tgt, fov] = camAt(C, u, idx);
        await p.evaluate(([C, t, u, d, Tn, cam, tgt, fov]) => {
          window.agClear(); const r = window.__anim(t, u, d, Tn, Math.PI, window.SB) || {};
          const poses = { ...C.poses, ...(r.poses || {}) }; window.ovl(r.ov || '');
          let c = r.cam || cam; if (r.shake) c = [c[0] + r.shake * Math.sin(t * 97), c[1] + r.shake * Math.sin(t * 71 + 1), c[2]];
          if (r.flash) window.af('screenFlash', [c, r.tgt || tgt, r.flash, 0xfff6d8]);
          return window.frame(poses, Tn, c, r.tgt || tgt, r.fov || fov);
        }, [{ poses: C.poses || {} }, t, u, n / FPS, Tn, cam, tgt, fov]);
        if (j >= 0) await p.screenshot({ path: `${out}/f${String(f).padStart(4, '0')}.png`, timeout: 180000 });
      }
      T += n / FPS + 5; console.log('done', id);
    }
  }
  await b.close(); srv.kill();
})();
