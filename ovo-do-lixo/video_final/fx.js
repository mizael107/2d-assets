// Props and effects for the story shots of "O Ovo do Lixo".
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { eggGeo, makeEgg, grayEgg, canvasTex, M, rnd } from './scenes.js';

const P = Math.PI;
const add = (g, geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
function radial(inner, outer, mid) { return canvasTex(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 2, 64, 64, 64); g.addColorStop(0, inner); if (mid) g.addColorStop(0.45, mid); g.addColorStop(1, outer); c.fillStyle = g; c.fillRect(0, 0, 128, 128); }); }
const sprite = (tex, size, additive = true, opacity = 1) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending })); s.scale.setScalar(size); return s; };

// ---------------------------------------------------------------- the worm (beats the Penosa in fight 3)
export function worm(len = 0.55) {
  const g = new THREE.Group(), n = 9, skin = M(0xf08a9a, 0.45), ring = M(0xd86a7c, 0.5);
  for (let i = 0; i < n; i++) { const t = i / (n - 1), r = len * 0.07 * (1 - 0.35 * Math.abs(t - 0.35) * 1.6);
    const seg = add(g, new THREE.SphereGeometry(r, 16, 12), i === 3 ? ring : skin, 0, r * 0.95 + Math.max(0, (0.25 - t)) * len * 0.5, -t * len * 0.82);
    seg.scale.set(1, 0.95, 1.15); }
  const head = g.children[0]; const hr = len * 0.07;
  for (const sx of [-1, 1]) { const w = add(g, new THREE.SphereGeometry(hr * 0.42, 12, 8), M(0xffffff, 0.3), sx * hr * 0.42, head.position.y + hr * 0.35, hr * 0.78); const p = add(g, new THREE.SphereGeometry(hr * 0.2, 8, 6), M(0x111111, 0.2), sx * hr * 0.42, head.position.y + hr * 0.36, hr * 1.12);
    const brow = add(g, new THREE.BoxGeometry(hr * 0.55, hr * 0.1, hr * 0.1), M(0x5a1a2a, 0.5), sx * hr * 0.42, head.position.y + hr * 0.78, hr * 0.9); brow.rotation.z = -sx * 0.45; }   // determined eyebrows
  const mouth = add(g, new THREE.TorusGeometry(hr * 0.3, hr * 0.06, 6, 12, P), M(0x5a1a2a, 0.5), 0, head.position.y - hr * 0.25, hr * 0.95); mouth.rotation.z = P;
  // tiny headband: the worm is a fighter too
  const band = add(g, new THREE.TorusGeometry(hr * 0.98, hr * 0.12, 6, 20), M(0xe8453c, 0.6), 0, head.position.y + hr * 0.5, 0); band.rotation.x = P / 2 + 0.25;
  g.name = 'worm'; return g;
}
// ---------------------------------------------------------------- chick-size training gear
export function miniBag(h = 0.9) {
  const g = new THREE.Group(), wood = M(0x7a5232, 0.8), k = h / 2.6;
  for (const sx of [-0.9, 0.9]) add(g, new THREE.BoxGeometry(0.16 * k, 2.6 * k, 0.16 * k), wood, sx * k, 1.3 * k, 0);
  add(g, new THREE.BoxGeometry(2.0 * k, 0.16 * k, 0.16 * k), wood, 0, 2.6 * k, 0);
  add(g, new THREE.CylinderGeometry(0.02 * k, 0.02 * k, 0.5 * k, 6), M(0x999999, 0.3, { metalness: 0.8 }), 0, 2.3 * k, 0);
  add(g, new THREE.CapsuleGeometry(0.3 * k, 0.9 * k, 6, 16), M(0xb02a2a, 0.55), 0, 1.45 * k, 0);
  for (const y of [1.05, 1.85]) { const t = add(g, new THREE.TorusGeometry(0.305 * k, 0.025 * k, 6, 24), M(0x1a1a1a), 0, y * k, 0); t.rotation.x = P / 2; }
  return g;
}
export function miniDumbbell(w = 0.32) {
  const g = new THREE.Group(), iron = M(0x2a2c30, 0.5, { metalness: 0.5 }), steel = M(0xc0c6ce, 0.3, { metalness: 0.8 });
  const bar = add(g, new THREE.CylinderGeometry(w * 0.03, w * 0.03, w, 8), steel); bar.rotation.z = P / 2;
  for (const sx of [-0.42, 0.42]) { const p = add(g, new THREE.CylinderGeometry(w * 0.16, w * 0.16, w * 0.12, 16), iron, sx * w, 0, 0); p.rotation.z = P / 2; }
  return g;
}
// ---------------------------------------------------------------- snoring Zzz
export function zzz(size = 0.18) {
  const g = new THREE.Group(); const tex = canvasTex(128, 128, (c) => { c.clearRect(0, 0, 128, 128); c.font = 'bold 110px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 12; c.strokeStyle = '#2a3a8a'; c.strokeText('Z', 64, 68); c.fillStyle = '#ffffff'; c.fillText('Z', 64, 68); });
  [[0, 0, 1], [0.12, 0.17, 1.3], [0.26, 0.38, 1.65]].forEach(([x, y, k]) => { const s = sprite(tex, size * k, false); s.position.set(x * size * 5, y * size * 5, 0); g.add(s); });
  g.name = 'zzz'; return g;
}
// ---------------------------------------------------------------- an egg breaking open along a zig-zag line
// open: 0 = whole with glowing cracks, 0.5 = split, 1 = top cap lifted away. kind: 'gray' or an EGG_LOOKS kind
export function hatchEgg(kind = 'gray', r = 0.1, open = 0.5, glowC = 0xffd060) {
  const g = new THREE.Group(); const base = kind === 'gray' ? grayEgg(r) : makeEgg(kind, r);
  const H = r * 2.64, yc0 = H * 0.58, zig = (phi) => yc0 + r * 0.09 * (Math.abs(((phi / (2 * P)) * 10) % 1 - 0.5) * 4 - 1);
  const clip = (keepTop) => { const geo = base.geometry.clone(), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), yc = zig(Math.atan2(x, z) + P); if (keepTop ? y < yc : y > yc) { const k = Math.sqrt(Math.max(0, 1 - Math.pow((yc - H / 2) / (H / 2), 2))) / Math.max(1e-4, Math.sqrt(x * x + z * z) / r); p.setY(i, yc); } }
    geo.computeVertexNormals(); return geo; };
  const mat = base.material; mat.side = THREE.DoubleSide;
  const bottom = new THREE.Mesh(clip(false), mat), top = new THREE.Mesh(clip(true), mat); bottom.castShadow = top.castShadow = true; g.add(bottom, top);
  const lift = Math.max(0, open - 0.3) / 0.7; top.position.set(r * 0.9 * lift, r * 1.4 * lift + r * 0.1 * Math.min(1, open * 3), 0); top.rotation.z = -0.9 * lift;
  // light pouring out of the crack
  const glow = sprite(radial('rgba(255,240,180,0.7)', 'rgba(255,200,80,0)', 'rgba(255,220,120,0.25)'), r * (2.5 + 3 * open)); glow.position.y = yc0; g.add(glow);
  const l = new THREE.PointLight(glowC, 0.8 + 1.5 * open, r * 20, 2); l.position.y = yc0 + r; g.add(l);
  for (let i = 0; i < 6; i++) { const a = i / 6 * 2 * P; const ray = new THREE.Mesh(new THREE.PlaneGeometry(r * 0.12, r * (2 + 4 * open)), new THREE.MeshBasicMaterial({ color: 0xffe6a0, transparent: true, opacity: 0.35 * open, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ray.position.set(Math.sin(a) * r * 0.3, yc0 + r * (1 + 2 * open), Math.cos(a) * r * 0.3); ray.rotation.set(0.3 * Math.cos(a), a, 0.3 * Math.sin(a)); g.add(ray); }
  g.userData = { r, H, yc: yc0 }; return g;
}
// ---------------------------------------------------------------- energy ball, beams, bolts, fire, ice, dust, flash
export function energyBall(r = 0.22, core = 0x2a0a40, glowIn = 'rgba(200,120,255,1)', glowOut = 'rgba(90,10,160,0)') {
  const g = new THREE.Group();
  add(g, new THREE.SphereGeometry(r, 24, 16), new THREE.MeshStandardMaterial({ color: core, emissive: 0x8a2aff, emissiveIntensity: 1.6, roughness: 0.3 }));
  g.add(sprite(radial(glowIn, glowOut, 'rgba(140,40,255,0.55)'), r * 6));
  for (let i = 0; i < 5; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(r * (1.15 + i * 0.08), r * 0.03, 6, 24), new THREE.MeshBasicMaterial({ color: 0xd8a0ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending })); t.rotation.set(rnd(i) * 3, rnd(i + 1) * 3, 0); g.add(t); }
  const l = new THREE.PointLight(0xa040ff, 6, r * 30, 2); g.add(l);
  return g;
}
export function trail(from, to, r = 0.15, color = 0xa040ff) {   // fading streak behind a projectile
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), d = b.clone().sub(a), L = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.1, L, 16, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d.normalize()); return m;
}
export function bolt(from, to, w = 0.03, color = 0xbfe8ff, seed = 1, branches = 2) {
  const g = new THREE.Group(); const mk = (a, b, ww, sd, depth) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), n = 9, pts = [A.clone()], L = A.distanceTo(B);
    for (let i = 1; i < n; i++) { const p = A.clone().lerp(B, i / n); p.x += (rnd(sd * 17 + i) - 0.5) * L * 0.16; p.z += (rnd(sd * 29 + i) - 0.5) * L * 0.16; pts.push(p); } pts.push(B.clone());
    const path = new THREE.CurvePath(); for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(path, 60, ww, 5), new THREE.MeshBasicMaterial({ color: 0xffffff })));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(path, 60, ww * 3.5, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })));
    if (depth > 0) for (let k = 0; k < branches; k++) { const s0 = pts[3 + k * 2]; const e = s0.clone().add(new THREE.Vector3((rnd(sd + k * 5) - 0.5) * L * 0.4, -L * 0.18, (rnd(sd + k * 7) - 0.5) * L * 0.4)); mk(s0.toArray(), e.toArray(), ww * 0.55, sd * 3 + k, depth - 1); } };
  mk(from, to, w, seed, 1); const l = new THREE.PointLight(color, 8, 10, 2); l.position.set(...to); l.position.y += 0.4; g.add(l); return g;
}
export function flameCone(len = 0.9, r = 0.22) {   // fire breath along +z
  const g = new THREE.Group(); const tex = canvasTex(64, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,250,200,1)'); gr.addColorStop(0.35, 'rgba(255,170,40,0.9)'); gr.addColorStop(0.75, 'rgba(230,60,20,0.6)'); gr.addColorStop(1, 'rgba(120,20,10,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(r * (1 - i * 0.25), len * (1 - i * 0.15), 20, 1, true), new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); c.rotation.x = -P / 2; c.position.z = len * (1 - i * 0.15) / 2; g.add(c); }
  for (let i = 0; i < 10; i++) { const s = sprite(radial('rgba(255,210,90,1)', 'rgba(255,60,0,0)'), r * (0.6 + rnd(i) * 1.2)); s.position.set((rnd(i + 3) - 0.5) * r * 1.5, (rnd(i + 4) - 0.5) * r * 1.5, len * (0.3 + rnd(i + 5) * 0.9)); g.add(s); }
  const l = new THREE.PointLight(0xff7a20, 6, 4, 2); l.position.z = len * 0.5; g.add(l); return g;
}
export function iceShards(n = 9, len = 0.35) {   // a fan of ice spikes flying along +z
  const g = new THREE.Group(), m = new THREE.MeshPhysicalMaterial({ color: 0xbfeaff, emissive: 0x3aa0ff, emissiveIntensity: 0.6, roughness: 0.05, transmission: 0.5, transparent: true, opacity: 0.9 });
  for (let i = 0; i < n; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(len * 0.12, len * (0.7 + rnd(i) * 0.6), 6), m); c.rotation.x = P / 2; c.position.set((rnd(i + 1) - 0.5) * 0.5, (rnd(i + 2) - 0.5) * 0.3, rnd(i + 3) * 1.1); c.castShadow = true; g.add(c); }
  for (let i = 0; i < 20; i++) { const s = sprite(radial('rgba(220,245,255,1)', 'rgba(120,200,255,0)'), 0.06 + rnd(i) * 0.08); s.position.set((rnd(i + 9) - 0.5) * 0.7, (rnd(i + 8) - 0.5) * 0.4, rnd(i + 7) * 1.4); g.add(s); }
  const l = new THREE.PointLight(0x7ad0ff, 4, 4, 2); l.position.z = 0.6; g.add(l); return g;
}
export function dust(n = 14, spread = 0.6, size = 0.5, color = 'rgba(205,175,130,0.9)') {
  const g = new THREE.Group(); const tex = radial(color, 'rgba(205,175,130,0)', color.replace(/[\d.]+\)$/, '0.45)'));
  for (let i = 0; i < n; i++) { const s = sprite(tex, size * (0.5 + rnd(i) * 0.9), false, 0.85); s.position.set((rnd(i + 1) - 0.5) * spread * 2, size * 0.25 + rnd(i + 2) * spread * 0.9, (rnd(i + 3) - 0.5) * spread * 2); g.add(s); }
  return g;
}
export function grayDust(n = 40, spread = 0.5) { // the grey shell turning into dust
  const g = new THREE.Group(); const tex = radial('rgba(170,168,160,0.95)', 'rgba(170,168,160,0)');
  for (let i = 0; i < n; i++) { const s = sprite(tex, 0.04 + rnd(i) * 0.12, false); const a = rnd(i + 1) * 2 * P, rr = spread * (0.3 + rnd(i + 2)); s.position.set(Math.cos(a) * rr, rnd(i + 3) * spread * 1.6, Math.sin(a) * rr); g.add(s); }
  return g;
}
export function flash(size = 6, color = 'rgba(255,255,240,1)') { const s = sprite(radial(color, 'rgba(255,240,200,0)', 'rgba(255,250,220,0.8)'), size); s.material.depthTest = false; s.renderOrder = 10; return s; }
export function sparkle(size = 0.25) { // little gold spark coming out of the new egg's crack
  const g = new THREE.Group(); const tex = canvasTex(128, 128, (c) => { c.clearRect(0, 0, 128, 128); c.translate(64, 64); const gr = c.createRadialGradient(0, 0, 0, 0, 0, 60); gr.addColorStop(0, 'rgba(255,250,210,1)'); gr.addColorStop(1, 'rgba(255,200,60,0)'); c.fillStyle = gr;
    for (let k = 0; k < 4; k++) { c.rotate(P / 4); c.beginPath(); c.moveTo(0, -60); c.lineTo(7, 0); c.lineTo(0, 60); c.lineTo(-7, 0); c.fill(); } c.beginPath(); c.arc(0, 0, 14, 0, 7); c.fill(); });
  g.add(sprite(tex, size)); const l = new THREE.PointLight(0xffc040, 1.5, 1.2, 2); g.add(l); return g;
}
// rain: many short streaks in a box around (cx, cz)
export function rain(cx = 0, cz = 0, w = 16, d = 16, h = 9, n = 5000) {
  const pos = new Float32Array(n * 6); for (let i = 0; i < n; i++) { const x = cx + (rnd(i) - 0.5) * w, y = rnd(i + 1) * h, z = cz + (rnd(i + 2) - 0.5) * d, L = 0.25 + rnd(i + 3) * 0.2; pos.set([x, y, z, x + 0.03, y - L, z + 0.02], i * 6); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xc8d8f0, transparent: true, opacity: 0.55 }));
}
export function splashes(cx, cz, w, d, n = 60) { const g = new THREE.Group(); const m = new THREE.MeshBasicMaterial({ color: 0xdfe8f8, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
  for (let i = 0; i < n; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.06 + rnd(i) * 0.06, 16), m); r.rotation.x = -P / 2; r.position.set(cx + (rnd(i + 1) - 0.5) * w, 0.02, cz + (rnd(i + 2) - 0.5) * d); g.add(r); } return g; }
// thick lightning from the sky (climax)
export function skyBolt(x, z, top = 18, w = 0.12) { const g = bolt([x + 1.5, top, z - 1], [x, 0.4, z], w, 0xffe9a0, 7, 3); const l = new THREE.PointLight(0xfff0c0, 40, 30, 2); l.position.set(x, 3, z); g.add(l); return g; }

// straw nest in a crate with an egg (any kind) that may be hatching
export function nestBox(kind = 'dourado', open = 0, r = 0.1) {
  const g = new THREE.Group();
  add(g, new THREE.BoxGeometry(0.72, 0.28, 0.56), M(0x9a7044, 0.9), 0, 0.14, 0);
  const straw = add(g, new THREE.TorusGeometry(0.18, 0.1, 8, 18), M(0xe0c060, 1), 0, 0.31, 0); straw.rotation.x = P / 2; straw.scale.z = 0.6;
  for (let i = 0; i < 40; i++) { const st = add(g, new THREE.CylinderGeometry(0.005, 0.005, 0.18, 4), M(0xe8c868, 1), (rnd(i) - 0.5) * 0.56, 0.3 + rnd(i + 1) * 0.04, (rnd(i + 2) - 0.5) * 0.4); st.rotation.set(P / 2, rnd(i + 3) * 6, rnd(i + 4)); }
  const e = open > 0 ? hatchEgg(kind, r, open) : (kind === 'gray' ? grayEgg(r) : makeEgg(kind, r)); e.position.y = 0.27; g.add(e); return g;
}

// dizzy stars circling over a knocked-out head
export function dizzy(r = 0.16) { const g = new THREE.Group(); const tex = canvasTex(64, 64, (c) => { c.clearRect(0, 0, 64, 64); c.fillStyle = '#ffe14a'; c.strokeStyle = '#a06a00'; c.lineWidth = 3; c.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * 2 * P - P / 2, rr = i % 2 ? 12 : 28; c.lineTo(32 + Math.cos(a) * rr, 32 + Math.sin(a) * rr); } c.closePath(); c.fill(); c.stroke(); });
  for (let i = 0; i < 5; i++) { const a = i / 5 * 2 * P; const s = sprite(tex, r * 0.55, false); s.position.set(Math.cos(a) * r, Math.sin(a * 2) * r * 0.12, Math.sin(a) * r); g.add(s); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.02, 4, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 })); ring.rotation.x = P / 2; g.add(ring); return g; }
