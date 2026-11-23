// Time-driven special effects for the fight shots. Every builder takes the current time t and the effect's start
// time t0 and returns an Object3D for THIS frame (the caller rebuilds them every frame). No lights are created here:
// lights come from a fixed pool (window.fxLight) so the shaders never recompile between frames.
import * as THREE from 'three';

const P = Math.PI, cl = (x) => Math.min(1, Math.max(0, x)), ease = (u) => u * u * (3 - 2 * u), easeOut = (u) => 1 - (1 - u) * (1 - u);
const R = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const TEX = {};
function tex(key, w, h, draw) { if (!TEX[key]) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; TEX[key] = t; } return TEX[key]; }
const radialT = (key, stops) => tex(key, 128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
const T = {
  glow: () => radialT('glow', [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]),
  soft: () => radialT('soft', [[0, 'rgba(255,255,255,0.9)'], [0.5, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]),
  smoke: () => tex('smoke', 128, 128, (g) => { for (let i = 0; i < 7; i++) { const x = 40 + R(i) * 48, y = 40 + R(i + 9) * 48, r = 22 + R(i + 3) * 20; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); } }),
  star: () => tex('star', 256, 256, (g) => { g.translate(128, 128); g.fillStyle = '#ffffff'; g.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * 2 * P, r = i % 2 ? 40 : 120 - (i % 4) * 18; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); }),
  ring: () => tex('ring', 256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 60, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.72, 'rgba(255,255,255,0.0)'); gr.addColorStop(0.86, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }),
  feather: () => tex('feather', 64, 128, (g) => { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(32, 64, 16, 58, 0, 0, 2 * P); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 3; g.beginPath(); g.moveTo(32, 8); g.lineTo(32, 124); g.stroke(); }),
  scorch: () => radialT('scorch', [[0, 'rgba(20,12,8,0.9)'], [0.6, 'rgba(30,20,10,0.55)'], [1, 'rgba(30,20,10,0)']]),
  spark: () => tex('spark', 64, 64, (g) => { g.translate(32, 32); const gr = g.createRadialGradient(0, 0, 0, 0, 0, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; for (let k = 0; k < 2; k++) { g.rotate(P / 2); g.fillRect(-3, -30, 6, 60); } g.beginPath(); g.arc(0, 0, 8, 0, 7); g.fill(); }),
};
function spr(t, size, color, opacity = 1, additive = true, rot = 0) {
  const m = new THREE.SpriteMaterial({ map: t, color, transparent: true, opacity, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, rotation: rot });
  const s = new THREE.Sprite(m); s.scale.setScalar(size); return s;
}
const V = (a) => new THREE.Vector3(...a);

// ---------------- particles flying out of a point with gravity (sparks, feathers, debris)
export function burst(t, t0, pos, o = {}) {
  const { n = 20, seed = 1, speed = 3, up = 1.5, grav = -6, life = 0.8, size = 0.08, color = 0xffe08a, kind = 'spark', spread = 1, dir = null, drag = 0 } = o;
  const g = new THREE.Group(), dt = t - t0; if (dt < 0 || dt > life * 1.6) return g;
  for (let i = 0; i < n; i++) {
    const l = life * (0.6 + R(seed + i) * 0.8), u = dt / l; if (u > 1) continue;
    let d = new THREE.Vector3(R(seed + i * 3) - 0.5, R(seed + i * 5) * up * 0.5, R(seed + i * 7) - 0.5).normalize();
    if (dir) d = d.multiplyScalar(spread).add(V(dir)).normalize();
    const v = speed * (0.4 + R(seed + i * 11) * 0.8), k = drag ? (1 - Math.exp(-drag * dt)) / drag : dt;
    const p = V(pos).addScaledVector(d, v * k); p.y += 0.5 * grav * dt * dt + (kind === 'feather' ? -0.5 * grav * dt * dt * 0.85 - 0.25 * dt : 0);
    if (kind === 'feather') { p.x += Math.sin(dt * 7 + i) * 0.05; if (p.y < 0.02) p.y = 0.02; }
    if (p.y < 0.01 && kind !== 'feather') p.y = 0.01;
    const s = kind === 'feather' ? spr(T.feather(), size * 1.6, color, 1 - u * u, false, dt * (3 + R(seed + i) * 6))
      : spr(T.spark(), size * (1 - u * 0.7), color, 1 - u, true);
    s.position.copy(p); g.add(s);
  }
  return g;
}
// ---------------- dust / smoke puffs that expand, rise and fade
export function puff(t, t0, pos, o = {}) {
  const { n = 10, seed = 2, size = 0.5, life = 1.2, spread = 0.5, rise = 0.4, color = 0xd8c09a, opacity = 0.75, dir = [0, 0, 0] } = o;
  const g = new THREE.Group(), dt = t - t0; if (dt < 0 || dt > life * 1.5) return g;
  for (let i = 0; i < n; i++) { const l = life * (0.7 + R(seed + i) * 0.6), u = dt / l; if (u > 1) continue;
    const a = R(seed + i * 3) * 2 * P, r = spread * easeOut(u) * (0.5 + R(seed + i * 5));
    const p = V(pos).add(new THREE.Vector3(Math.cos(a) * r + dir[0] * easeOut(u), size * 0.3 + rise * u + R(seed + i * 7) * 0.15, Math.sin(a) * r + dir[2] * easeOut(u)));
    const s = spr(T.smoke(), size * (0.5 + 1.1 * easeOut(u)) * (0.7 + R(seed + i * 9) * 0.6), color, opacity * (1 - u) * cl(u * 8), false, R(seed + i) * 6 + dt * 0.6);
    s.position.copy(p); g.add(s); }
  return g;
}
// ---------------- flat shockwave ring on the ground (+ optional vertical flash ring)
export function shockwave(t, t0, pos, o = {}) {
  const { r = 2.5, life = 0.5, color = 0xffffff, y = 0.03, width = 1, tilt = null } = o;
  const g = new THREE.Group(), u = (t - t0) / life; if (u < 0 || u > 1) return g;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: T.ring(), color, transparent: true, opacity: (1 - u) * 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const sc = 0.2 + r * 2 * easeOut(u); m.scale.set(sc, sc * width, 1); if (tilt) m.rotation.set(...tilt); else m.rotation.x = -P / 2; m.position.set(pos[0], pos[1] + y, pos[2]); g.add(m); return g;
}
// ---------------- comic hit star + white flash at the impact point
export function impact(t, t0, pos, o = {}) {
  const { size = 1.0, color = 0xfff2b0, life = 0.22 } = o; const g = new THREE.Group(), u = (t - t0) / life; if (u < 0 || u > 1) return g;
  const st = spr(T.star(), size * (0.6 + 0.8 * easeOut(u)), color, 1 - u * u, true, t0 * 3); st.position.copy(V(pos)); g.add(st);
  const f = spr(T.glow(), size * 2.2 * (1 - u * 0.5), 0xffffff, (1 - u) * 0.9); f.position.copy(V(pos)); g.add(f);
  return g;
}
// ---------------- jagged lightning between two points (flickers: new shape every frame)
export function lightning(a, b, o = {}) {
  const { seed = 1, w = 0.02, color = 0x9ad8ff, branches = 2, jag = 0.18, opacity = 1 } = o; const g = new THREE.Group();
  const core = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity }), halo = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45 * opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  const seg = (A, B, ww, sd, depth) => { const L = A.distanceTo(B), n = Math.max(4, Math.round(L / 0.12)), pts = [A.clone()], side = new THREE.Vector3().subVectors(B, A).normalize().cross(new THREE.Vector3(0, 1, 0.3)).normalize(), up2 = new THREE.Vector3().subVectors(B, A).normalize().cross(side).normalize();
    for (let i = 1; i < n; i++) { const p = A.clone().lerp(B, i / n), k = Math.sin(P * i / n); p.addScaledVector(side, (R(sd * 13 + i) - 0.5) * L * jag * k).addScaledVector(up2, (R(sd * 31 + i) - 0.5) * L * jag * k); pts.push(p); } pts.push(B.clone());
    const path = new THREE.CurvePath(); for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(path, n * 3, ww, 4), core)); g.add(new THREE.Mesh(new THREE.TubeGeometry(path, n * 3, ww * 4, 5), halo));
    if (depth > 0) for (let k = 0; k < branches; k++) { const s0 = pts[Math.floor(n * (0.25 + R(sd + k) * 0.5))], d = new THREE.Vector3().subVectors(B, A); const e = s0.clone().addScaledVector(d, 0.25 + R(sd + k * 3) * 0.2).add(new THREE.Vector3((R(sd + k * 5) - 0.5) * L * 0.4, (R(sd + k * 7) - 0.6) * L * 0.3, (R(sd + k * 9) - 0.5) * L * 0.4)); seg(s0, e, ww * 0.55, sd * 7 + k + 1, depth - 1); } };
  seg(V(a), V(b), w, seed, 1); return g;
}
// small arcs crawling around a body (charging up / electrified)
export function arcs(t, center, o = {}) {
  const { r = 0.4, n = 4, seed = 0, color = 0x9ad8ff, w = 0.008, h = 0.5 } = o; const g = new THREE.Group(), f = Math.floor(t * 24);
  for (let i = 0; i < n; i++) { const a0 = R(f * 7 + i + seed) * 2 * P, a1 = a0 + 0.6 + R(f * 3 + i) * 1.2, y0 = R(f * 5 + i) * h, y1 = y0 + (R(f * 9 + i) - 0.5) * h * 0.8, r0 = r * (0.8 + R(f + i) * 0.4);
    g.add(lightning([center[0] + Math.cos(a0) * r0, center[1] + y0, center[2] + Math.sin(a0) * r0], [center[0] + Math.cos(a1) * r0, center[1] + y1, center[2] + Math.sin(a1) * r0], { seed: f * 11 + i, w, color, branches: 0, jag: 0.35 })); }
  return g;
}
// charging glow: pulsing glow sprite + particles spiralling INTO a point
export function charge(t, t0, pos, o = {}) {
  const { dur = 1, color = 0x9ad8ff, size = 0.8, n = 26, seed = 4, r = 0.9 } = o; const g = new THREE.Group(), u = cl((t - t0) / dur); if (t < t0) return g;
  const gl = spr(T.glow(), size * (0.3 + 0.9 * u) * (1 + 0.12 * Math.sin(t * 40)), color, 0.4 + 0.6 * u); gl.position.copy(V(pos)); g.add(gl);
  for (let i = 0; i < n; i++) { const ph = ((t - t0) * 1.6 + R(seed + i)) % 1, a = R(seed + i * 3) * 2 * P + ph * 4, rr = r * (1 - ph), y = (R(seed + i * 5) - 0.5) * r * (1 - ph);
    const s = spr(T.spark(), 0.05 + 0.05 * ph, color, ph * u * 1.2); s.position.set(pos[0] + Math.cos(a) * rr, pos[1] + y, pos[2] + Math.sin(a) * rr); g.add(s); }
  return g;
}
// energy ball (purple): emissive core + layered glow + spinning rings
export function energyOrb(t, pos, r = 0.2, o = {}) {
  const { core = 0x2a0640, glowC = 0xb04aff, ringC = 0xe0b0ff } = o; const g = new THREE.Group();
  const c = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshStandardMaterial({ color: core, emissive: glowC, emissiveIntensity: 1.8, roughness: 0.3 })); c.position.copy(V(pos)); g.add(c);
  for (const [k, op] of [[3.2, 0.9], [6, 0.45]]) { const s = spr(T.glow(), r * k * (1 + 0.08 * Math.sin(t * 30 + k)), glowC, op); s.position.copy(V(pos)); g.add(s); }
  for (let i = 0; i < 3; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r * (1.25 + i * 0.12), r * 0.035, 6, 32), new THREE.MeshBasicMaterial({ color: ringC, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.position.copy(V(pos)); ring.rotation.set(t * (3 + i) + i, t * (2 - i) + i * 2, 0); g.add(ring); }
  return g;
}
// streak behind a moving object: sprites along the past path
export function trail(pts, o = {}) {   // pts: past positions, newest first
  const { size = 0.35, color = 0xb04aff } = o; const g = new THREE.Group(), n = pts.length;
  pts.forEach((p, i) => { const k = i / n; const s = spr(T.glow(), size * (1 - k * 0.7), color, 0.75 * (1 - k)); s.position.copy(V(p)); g.add(s); });
  return g;
}
// fire breath: particles flowing from the mouth along dir, white-hot → orange → red → smoke
export function fireBreath(t, t0, t1, mouth, dir, o = {}) {
  const { len = 1.8, n = 70, seed = 9, width = 0.35 } = o; const g = new THREE.Group(); if (t < t0 || t > t1 + 0.6) return g;
  const D = V(dir).normalize(), side = new THREE.Vector3().crossVectors(D, new THREE.Vector3(0, 1, 0)).normalize(), grow = easeOut(cl((t - t0) / 0.25)), fade = 1 - cl((t - t1) / 0.6);
  for (let i = 0; i < n; i++) { const ph = ((t - t0) * 2.4 + R(seed + i)) % 1; if (ph > grow) continue; const tB = t - ph / 2.4; if (tB > t1) continue;
    const d = ph * len, sp = width * ph * (0.3 + R(seed + i * 3)), a = R(seed + i * 5) * 2 * P;
    const p = V(mouth).addScaledVector(D, d).addScaledVector(side, Math.cos(a) * sp); p.y += Math.sin(a) * sp * 0.6 + ph * ph * 0.25;
    const col = ph < 0.18 ? 0xfff6c8 : ph < 0.45 ? 0xffb030 : ph < 0.75 ? 0xff4a14 : 0x5a3a2a;
    const s = ph < 0.8 ? spr(T.glow(), 0.12 + ph * 0.55, col, (1 - ph * 0.6) * fade) : spr(T.smoke(), 0.3 + ph * 0.5, 0x3a3030, 0.5 * (1 - ph) * 4 * fade, false, a);
    s.position.copy(p); g.add(s); }
  return g;
}
// ice spikes flying then stuck in the ground, and a frozen patch growing where they land
export function iceVolley(t, t0, from, to, o = {}) {
  const { n = 7, seed = 5, fly = 0.35 } = o; const g = new THREE.Group(); if (t < t0) return g;
  const m = new THREE.MeshPhysicalMaterial({ color: 0xcff0ff, emissive: 0x4ab0ff, emissiveIntensity: 0.7, roughness: 0.05, transparent: true, opacity: 0.9 });
  for (let i = 0; i < n; i++) { const ti = t0 + i * 0.05, u = cl((t - ti) / fly); if (t < ti) continue;
    const tgt = V(to).add(new THREE.Vector3((R(seed + i) - 0.5) * 0.7, 0, (R(seed + i * 3) - 0.5) * 0.7)); tgt.y = 0.05;
    const p = V(from).lerp(tgt, u); p.y += Math.sin(P * u) * 0.25; const L = 0.22 + R(seed + i * 5) * 0.16;
    const c = new THREE.Mesh(new THREE.ConeGeometry(L * 0.16, L, 6), m); c.position.copy(p);
    const d = tgt.clone().sub(V(from)).normalize(); if (u < 1) c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); else { c.rotation.set(0.5 * (R(seed + i) - 0.5), 0, 0.6 * (R(seed + i * 7) - 0.5)); c.position.y = L * 0.35; }
    c.castShadow = true; g.add(c);
    if (u < 1) { const s = spr(T.glow(), 0.25, 0x9adcff, 0.6); s.position.copy(p); g.add(s); } }
  // frozen patch
  const u2 = cl((t - t0 - fly) / 0.5); if (u2 > 0) { const pm = new THREE.Mesh(new THREE.CircleGeometry(0.8 * easeOut(u2), 24), new THREE.MeshStandardMaterial({ color: 0xdff6ff, emissive: 0x3a90d0, emissiveIntensity: 0.25, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.8 }));
    pm.rotation.x = -P / 2; pm.position.set(to[0], 0.02, to[2]); g.add(pm);
    for (let i = 0; i < 10; i++) { const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.06 + R(seed + i * 9) * 0.07), m); const a = R(i * 3 + seed) * 2 * P, rr = 0.7 * easeOut(u2) * R(i * 5 + seed); cr.position.set(to[0] + Math.cos(a) * rr, 0.05, to[2] + Math.sin(a) * rr); cr.scale.y = 2 * u2; g.add(cr); } }
  return g;
}
// ice block closing around a frozen chicken
export function iceBlock(t, t0, pos, size = [0.9, 1.0, 0.9]) {
  const g = new THREE.Group(), u = easeOut(cl((t - t0) / 0.4)); if (u <= 0) return g;
  const m = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1] * u, size[2]), new THREE.MeshStandardMaterial({ color: 0x9fd8ff, emissive: 0x0a3050, emissiveIntensity: 0.2, roughness: 0.05, metalness: 0.5, transparent: true, opacity: 0.18, depthWrite: false }));
  m.position.set(pos[0], size[1] * u / 2, pos[2]); g.add(m);
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })); e.position.copy(m.position); g.add(e); return g;
}
export function scorch(pos, r = 0.6, opacity = 1) { const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: T.scorch(), transparent: true, opacity, depthWrite: false })); m.rotation.x = -P / 2; m.position.set(pos[0], 0.02, pos[2]); return m; }
// golden aura column rising from the ground (evolution / power up)
export function auraColumn(t, t0, pos, o = {}) {
  const { h = 1.6, r = 0.45, color = 0xffc040, n = 30, seed = 3 } = o; const g = new THREE.Group(), u = cl((t - t0) / 0.5); if (u <= 0) return g;
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.3, h * u, 24, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); cyl.position.set(pos[0], h * u / 2, pos[2]); g.add(cyl);
  for (let i = 0; i < n; i++) { const ph = ((t - t0) * 0.9 + R(seed + i)) % 1, a = R(seed + i * 3) * 2 * P + t * 2; const s = spr(T.spark(), 0.07, color, (1 - ph) * u); s.position.set(pos[0] + Math.cos(a) * r * (0.6 + R(i) * 0.6), ph * h, pos[2] + Math.sin(a) * r * (0.6 + R(i) * 0.6)); g.add(s); }
  return g;
}
// screen-filling white flash (place right in front of the camera)
export function screenFlash(cam, tgt, k, color = 0xffffff) { const g = new THREE.Group(); if (k <= 0.01) return g; const c = V(cam), d = V(tgt).sub(c).normalize(); const s = spr(T.glow(), 6, color, k, true); s.material.depthTest = false; s.renderOrder = 99; s.position.copy(c.addScaledVector(d, 0.6)); g.add(s); return g; }
export function dizzyStars(t, pos, r = 0.15) { const g = new THREE.Group(); for (let i = 0; i < 5; i++) { const a = i / 5 * 2 * P + t * 4; const s = spr(T.star(), r * 0.45, 0xffe14a, 1, false); s.position.set(pos[0] + Math.cos(a) * r, pos[1] + Math.sin(a * 2) * r * 0.15, pos[2] + Math.sin(a) * r); g.add(s); } return g; }
export const util = { cl, ease, easeOut, R };

// dark vignette in front of the camera (drama). k 0..1
export function vignette(cam, tgt, k, fov = 46, aspect = 720 / 1280) {
  const g = new THREE.Group(); if (k <= 0.01) return g; const c = V(cam), d = V(tgt).sub(c).normalize(), dist = 0.5, h = 2 * dist * Math.tan(fov * P / 360) * 1.04;
  const t = tex('vig', 256, 256, (x) => { const gr = x.createRadialGradient(128, 128, 40, 128, 128, 150); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0.95)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, opacity: k, depthTest: false, depthWrite: false })); s.renderOrder = 98; s.scale.set(h * aspect * 1.1, h, 1); s.position.copy(c.addScaledVector(d, dist)); g.add(s); return g;
}
// thick dust cloud that swallows a character: grows fast, holds, then settles (sinks, spreads, fades) to reveal it
export function dustCloud(t, t0, hold, fade, pos, o = {}) {
  const { r = 0.8, n = 46, seed = 7, color = 0xd9c39e, h = 1.3 } = o; const g = new THREE.Group(); const dt = t - t0; if (dt < 0 || dt > hold + fade + 0.2) return g;
  const grow = easeOut(cl(dt / 0.35)), out = cl((dt - hold) / fade);
  for (let i = 0; i < n; i++) { const a = R(seed + i) * 2 * P, rr = r * (0.15 + 0.85 * R(seed + i * 3)) * grow * (1 + 0.6 * out), y = h * R(seed + i * 5) * grow * (1 - 0.7 * out) + 0.1;
    const op = 0.92 * (1 - out * (0.6 + 0.6 * R(seed + i * 7))); if (op <= 0) continue;
    const s = spr(T.smoke(), (0.5 + 0.5 * R(seed + i * 9)) * (0.6 + 0.6 * grow) * (1 + 0.5 * out), color, Math.min(1, op), false, R(seed + i) * 6 + dt * (0.3 + R(i) * 0.4));
    s.position.set(pos[0] + Math.cos(a) * rr, pos[1] + y, pos[2] + Math.sin(a) * rr); g.add(s); }
  // dense core so nothing shows through while it holds
  if (out < 1) { const core = spr(T.soft(), r * 2.0 * grow, color, 0.95 * (1 - out), false); core.position.set(pos[0], pos[1] + h * 0.45 * (1 - 0.5 * out), pos[2]); g.add(core); }
  return g;
}

// floating "Z z z" over a sleeping head
export function zzzAt(t, pos, size = 0.09) { const g = new THREE.Group(); const zt = tex('zzz', 128, 128, (x) => { x.font = 'bold 110px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 12; x.strokeStyle = '#2a3a8a'; x.strokeText('Z', 64, 68); x.fillStyle = '#ffffff'; x.fillText('Z', 64, 68); });
  for (let i = 0; i < 3; i++) { const ph = (t * 0.6 + i / 3) % 1; const s = spr(zt, size * (0.6 + ph), 0xffffff, Math.sin(P * ph), false); s.position.set(pos[0] + ph * 0.25, pos[1] + ph * 0.45, pos[2]); g.add(s); } return g; }
