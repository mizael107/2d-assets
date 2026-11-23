// More scenarios for "O Ovo do Lixo": arena (normal + Torneio Lendário), the boy's house and yard,
// his bedroom (night / morning) and the city with the giant sky banner.
// Same units as scenes.js: the boy is 1.95 tall.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { put, K, C, M, rnd, canvasTex, clouds, skyAndFog, makeEgg, eggGeo, grayEgg, puddle } from './scenes.js';
import { rain as FXrain, splashes as FXsplash } from './fx.js';

const P = Math.PI;
const F = (p) => `assets/furn/${p}.gltf`, R = (p) => `assets/rest/${p}.gltf`, KC = (p) => `assets/kcity/${p}.glb`;
const FS = 0.72;                                     // furniture kit -> our scale (bed 3.0 -> 2.2)
const box = (s, w, h, d, mat, x, y, z, ry = 0, cast = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = cast; m.receiveShadow = true; s.add(m); return m; };
const cyl = (s, r0, r1, h, mat, x, y, z, seg = 20) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; s.add(m); return m; };
const glow = (c, i = 1.2) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.4 });

// ---------------------------------------------------------------- shared props
export function textPanel(lines, w, h, opts = {}) {
  const { bg = '#101830', bg2 = '#050a18', frame = '#ffd34a', px = 1024 } = opts;
  const tex = canvasTex(px, Math.round(px * h / w), (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, bg); gr.addColorStop(1, bg2); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (frame) { g.strokeStyle = frame; g.lineWidth = W * 0.014; g.strokeRect(W * 0.012, W * 0.012, W - W * 0.024, H - W * 0.024); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const L of lines) { g.font = `bold ${Math.round(L.size * H)}px sans-serif`; g.fillStyle = L.color || '#fff'; g.shadowColor = L.glow || 'transparent'; g.shadowBlur = L.glow ? H * 0.05 : 0; g.fillText(L.t, W * (L.x ?? 0.5), H * L.y); }
    if (opts.draw) opts.draw(g, W, H);
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: opts.lit ?? 0.9, roughness: 0.6, side: THREE.DoubleSide }));
}
function bolt(g, x, y, s, c = '#ffe14a') { g.fillStyle = c; g.beginPath(); [[0, -1], [0.45, -1], [0.1, -0.15], [0.5, -0.15], [-0.35, 1], [-0.05, 0.1], [-0.45, 0.1]].forEach(([a, b], i) => (i ? g.lineTo : g.moveTo).call(g, x + a * s, y + b * s)); g.closePath(); g.fill(); }

export function trophy(sc = 1, gold = 0xffc23a) {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: gold, metalness: 0.95, roughness: 0.22, emissive: 0x4a2a00, emissiveIntensity: 0.25 });
  const cup = new THREE.LatheGeometry([[0.0, 0], [0.16, 0], [0.16, 0.04], [0.05, 0.08], [0.04, 0.3], [0.08, 0.34], [0.22, 0.42], [0.27, 0.62], [0.28, 0.75], [0.25, 0.75], [0.0, 0.6]].map(([x, y]) => new THREE.Vector2(x, y)), 28);
  const c = new THREE.Mesh(cup, m); c.position.y = 0.12; c.castShadow = true; g.add(c);
  for (const sd of [-1, 1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 8, 20, P * 1.2), m); h.position.set(sd * 0.27, 0.70, 0); h.rotation.z = sd > 0 ? -P * 0.6 : P * 1.6; g.add(h); }
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.12, 0.36, 2, 0.02), M(0x3a2414, 0.5)); base.position.y = 0.06; base.castShadow = true; g.add(base);   // bottom of the base at y = 0
  g.scale.setScalar(sc); return g;
}
// the Ovo do Trovão: golden egg with lightning running over it
export function thunderEgg(r = 0.3) {
  const g = new THREE.Group();
  const tex = canvasTex(512, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#fff2a8'); gr.addColorStop(1, '#e0a018'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#ffffff'; c.lineWidth = 7; c.shadowColor = '#7ad8ff'; c.shadowBlur = 16; for (let k = 0; k < 5; k++) { c.beginPath(); let x = k * 105 + 20, y = 0; c.moveTo(x, y); while (y < h) { x += (rnd(k * 31 + y) - 0.5) * 60; y += 26; c.lineTo(x, y); } c.stroke(); } });
  const egg = new THREE.Mesh(eggGeo(r), new THREE.MeshStandardMaterial({ map: tex, metalness: 0.7, roughness: 0.18, emissive: 0xffc030, emissiveMap: tex, emissiveIntensity: 0.9 })); egg.castShadow = true; g.add(egg);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (c) => { const gr = c.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,230,120,0.9)'); gr.addColorStop(0.4, 'rgba(255,200,60,0.35)'); gr.addColorStop(1, 'rgba(255,200,60,0)'); c.fillStyle = gr; c.fillRect(0, 0, 128, 128); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(r * 7); halo.position.y = r * 1.3; g.add(halo);
  // three short jagged bolts crawling over the shell (straight segments = lightning, not wires)
  const arcM = new THREE.MeshBasicMaterial({ color: 0xffffff }), arcM2 = new THREE.MeshBasicMaterial({ color: 0x8ae0ff, transparent: true, opacity: 0.35, depthWrite: false });
  for (let k = 0; k < 3; k++) { const a0 = k * 2.1 + 0.4, pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6, a = a0 + (i % 2 ? 0.18 : -0.12) + t * 0.5, yy = r * (2.3 - t * 1.6), rr = r * 1.02 * Math.sin(Math.acos(Math.max(-1, Math.min(1, (yy - r * 1.32) / (r * 1.32))))) + r * 0.04;
      pts.push(new THREE.Vector3(Math.cos(a) * rr, yy, Math.sin(a) * rr)); }
    const path = new THREE.CurvePath(); for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(path, 36, r * 0.018, 5), arcM)); g.add(new THREE.Mesh(new THREE.TubeGeometry(path, 36, r * 0.05, 6), arcM2)); }
  // small sparks around it
  const sg = new THREE.BufferGeometry(), sp = []; for (let i = 0; i < 40; i++) { const a = rnd(i) * 6.28, rr = r * (1.3 + rnd(i + 1) * 0.8); sp.push(Math.cos(a) * rr, r * (0.3 + rnd(i + 2) * 2.4), Math.sin(a) * rr); }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); g.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xfff0a0, size: r * 0.06 })));
  const l = new THREE.PointLight(0xffd060, 4, r * 16, 2); l.position.y = r * 1.4; g.add(l);
  return g;
}
function pedestal(s, x, z, ry = 0) {
  const g = new THREE.Group(); const stone = M(0xe8e2d4, 0.5), goldM = new THREE.MeshStandardMaterial({ color: 0xffc23a, metalness: 0.9, roughness: 0.25 });
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.3, 32), stone); b.position.y = 0.15; g.add(b);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.0, 8), stone); c.position.y = 0.8; g.add(c);
  for (const y of [0.32, 1.28]) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.035, 8, 32), goldM); t.rotation.x = P / 2; t.position.y = y; g.add(t); }
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.48, 0.14, 32), stone); top.position.y = 1.37; g.add(top);
  const cush = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.1, 24), M(0x8a1030, 0.9)); cush.position.y = 1.49; g.add(cush);
  g.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  const egg = thunderEgg(0.3); egg.position.y = 1.53; g.add(egg);
  g.position.set(x, 0, z); g.rotation.y = ry; s.add(g); return g;
}

// ---------------------------------------------------------------- instanced background crowd
// blocky people (same proportions as the Roblox kids), one InstancedMesh per part. spots: [x, y, z, ry, kind]
// kind: 0 standing, 1 cheering (arms up), 2 one arm up, 3 laughing (hands on belly)
const FACE_KINDS = ['smile', 'open', 'laugh'];
function faceTex(kind) { return canvasTex(128, 128, (g) => { g.clearRect(0, 0, 128, 128); g.fillStyle = '#16110e';
  if (kind === 'laugh') { g.lineWidth = 7; g.strokeStyle = '#16110e'; g.lineCap = 'round'; [[40], [88]].forEach(([x]) => { g.beginPath(); g.arc(x, 56, 10, P * 1.1, P * 1.9); g.stroke(); }); }
  else { g.beginPath(); g.ellipse(42, 54, 8, 11, 0, 0, P * 2); g.fill(); g.beginPath(); g.ellipse(86, 54, 8, 11, 0, 0, P * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(45, 50, 3, 0, 7); g.arc(89, 50, 3, 0, 7); g.fill(); g.fillStyle = '#16110e'; }
  if (kind === 'smile') { g.lineWidth = 6; g.lineCap = 'round'; g.strokeStyle = '#16110e'; g.beginPath(); g.arc(64, 74, 20, P * 0.15, P * 0.85); g.stroke(); }
  else { g.fillStyle = '#5a1a1a'; g.beginPath(); g.ellipse(64, 88, kind === 'laugh' ? 22 : 14, kind === 'laugh' ? 16 : 14, 0, 0, P); g.fill(); g.fillStyle = '#d84a5a'; g.beginPath(); g.ellipse(64, 96, 10, 6, 0, 0, P * 2); g.fill(); }
}); }
export function blockCrowd(s, spots, seed = 1) {
  const SK = [0xf1c9a0, 0xe0a577, 0xc68652, 0x8d5a3a, 0x6a4028, 0xf3d6bd], SH = [0xe8453c, 0x2f7fe0, 0xf2c94c, 0x5cc7a0, 0x8e6fe0, 0xff8a3a, 0x1d1d22, 0xf4f4f6, 0xe86f9c, 0x2a9e5a, 0x3a4250], PA = [0x23314f, 0x3b5fa8, 0x1d1d22, 0x5a4a3a, 0x8a8a96], HA = [0x1a120c, 0x3a2414, 0x7a4a20, 0xc9a43c, 0x8a3b2a, 0x111111, 0xd8d8de];
  const n = spots.length, mk = (geo, mat, count) => { const im = new THREE.InstancedMesh(geo, mat, count); im.castShadow = true; im.receiveShadow = true; s.add(im); return im; };
  const rb = (w, h, d) => new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.18);
  const leg = mk(rb(0.36, 0.8, 0.38), M(0xffffff, 0.8), n * 2), tor = mk(rb(0.8, 0.8, 0.42), M(0xffffff, 0.8), n), arm = mk(rb(0.34, 0.78, 0.36), M(0xffffff, 0.7), n * 2);
  const hand = mk(rb(0.3, 0.2, 0.3), M(0xffffff, 0.6), n * 2), head = mk(rb(0.56, 0.56, 0.56), M(0xffffff, 0.6), n), hair = mk(rb(0.62, 0.2, 0.62), M(0xffffff, 0.9), n), hairB = mk(rb(0.62, 0.42, 0.16), M(0xffffff, 0.9), n);
  const faces = FACE_KINDS.map(k => mk(new THREE.PlaneGeometry(0.46, 0.46), new THREE.MeshStandardMaterial({ map: faceTex(k), transparent: true, depthWrite: false, roughness: 0.8 }), n));
  const cnt = { faces: [0, 0, 0] }; const D = new THREE.Object3D(), mP = new THREE.Matrix4(), mL = new THREE.Matrix4(), col = new THREE.Color();
  const set = (im, i, local, c) => { im.setMatrixAt(i, mL.multiplyMatrices(mP, local)); if (c != null) im.setColorAt(i, col.set(c)); };
  const loc = (x, y, z, rx = 0, rz = 0, ox = 0, oy = 0, oz = 0) => { D.position.set(x, y, z); D.rotation.set(rx, 0, rz); D.scale.set(1, 1, 1); D.updateMatrix(); const a = D.matrix.clone(); D.position.set(ox, oy, oz); D.rotation.set(0, 0, 0); D.updateMatrix(); return a.multiply(D.matrix); };
  spots.forEach(([x, y, z, ry, kind = 0, kid = 0], i) => {
    const r = (k) => rnd(i * 13 + k + seed * 101), sc = (kid ? 0.66 : 0.86) * (0.95 + r(9) * 0.1);
    D.position.set(x, y, z); D.rotation.set(0, ry, 0); D.scale.setScalar(sc); D.updateMatrix(); mP.copy(D.matrix);
    const skin = SK[Math.floor(r(1) * SK.length)], shirt = SH[Math.floor(r(2) * SH.length)], pants = PA[Math.floor(r(3) * PA.length)], hc = HA[Math.floor(r(4) * HA.length)];
    set(leg, i * 2, loc(-0.2, 0.4, 0), pants); set(leg, i * 2 + 1, loc(0.2, 0.4, 0), pants); set(tor, i, loc(0, 1.2, 0), shirt);
    const up = kind === 1 ? [2.75, 2.75] : kind === 2 ? [0, 2.8] : kind === 3 ? [-0.7, -0.7] : [0.05, 0.05], bend = kind === 3 ? -1.0 : 0;
    set(arm, i * 2, loc(-0.58, 1.55, 0, bend, -up[0], 0, -0.36, 0), shirt); set(arm, i * 2 + 1, loc(0.58, 1.55, 0, bend, up[1], 0, -0.36, 0), shirt);
    set(hand, i * 2, loc(-0.58, 1.55, 0, bend, -up[0], 0, -0.82, 0), skin); set(hand, i * 2 + 1, loc(0.58, 1.55, 0, bend, up[1], 0, -0.82, 0), skin);
    set(head, i, loc(0, 1.9, 0), skin); set(hair, i, loc(0, 2.17, -0.02), hc); set(hairB, i, loc(0, 1.98, -0.24), hc);
    const fk = kind === 3 ? 2 : (kind === 1 || kind === 2) ? 1 : 0; set(faces[fk], cnt.faces[fk]++, loc(0, 1.88, 0.285), null);
  });
  faces.forEach((f, k) => { f.count = cnt.faces[k]; }); [leg, tor, arm, hand, head, hair, hairB].forEach(im => { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; });
}

// ================================================================= ARENA
// ring of dirt (r 5.6) inside a chain-link fence, a walkway, then 9 tiers of stands. Trainers stand
// outside the fence: the boy on +z (south), Kaio on -z (north, with his trophy case). Scoreboard over the north stands.
const RING = 4.5, FENCE = 4.6, STAND0 = 7.0, TIER = 0.95, TH = 0.5, NT = 9;
function dirtTex() { return canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = '#b88a58'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { const v = rnd(i) ; g.fillStyle = `rgba(${v < 0.5 ? '120,84,48' : '220,180,130'},${0.08 + rnd(i + 3) * 0.18})`; g.beginPath(); g.arc(rnd(i + 1) * w, rnd(i + 2) * h, 1 + rnd(i + 4) * 5, 0, 7); g.fill(); }
  for (let i = 0; i < 60; i++) { g.strokeStyle = 'rgba(110,76,44,0.25)'; g.lineWidth = 2 + rnd(i) * 4; g.beginPath(); const x = rnd(i + 5) * w, y = rnd(i + 6) * h; g.moveTo(x, y); g.quadraticCurveTo(x + 40, y + 20, x + 90 * rnd(i + 8), y + 60 * rnd(i + 9)); g.stroke(); }
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 10; g.setLineDash([36, 22]); g.beginPath(); g.arc(w / 2, h / 2, w * 0.13, 0, 7); g.stroke(); g.setLineDash([]);
  g.lineWidth = 12; g.beginPath(); g.moveTo(w * 0.12, h / 2); g.lineTo(w * 0.88, h / 2); g.globalAlpha = 0.35; g.stroke(); g.globalAlpha = 1;
  [['rgba(70,140,255,0.55)', 0.78], ['rgba(255,60,70,0.55)', 0.22]].forEach(([c, y]) => { g.fillStyle = c; g.fillRect(w * 0.42, h * y - 26, w * 0.16, 52); }); }); }
function fenceTex() { const t = canvasTex(128, 128, (g) => { g.clearRect(0, 0, 128, 128); g.strokeStyle = '#c9ced6'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.lineTo(128, 128); g.moveTo(128, 0); g.lineTo(0, 128); g.stroke(); }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(140, 6); return t; }
function standSpots(fill, seed, skipAng) {
  const out = []; for (let t = 0; t < NT; t++) { const rr = STAND0 + t * TIER + TIER * 0.5, y = (t + 1) * TH, n = Math.floor(2 * P * rr / 0.72);
    for (let i = 0; i < n; i++) { const a = i / n * 2 * P + t * 0.07; if (skipAng(a)) continue; if (rnd(i * 7 + t * 131 + seed) > fill) continue;
      const k = rnd(i * 3 + t * 17 + seed), laugh = globalThis.__crowdMood === 'laugh'; out.push([Math.sin(a) * rr, y, Math.cos(a) * rr, a + P, laugh ? (k < 0.6 ? 3 : k < 0.75 ? 2 : 0) : (k < 0.35 ? 1 : k < 0.55 ? 2 : k < 0.62 ? 3 : 0), rnd(i + t * 5 + seed) < 0.25 ? 1 : 0]); } }
  return out; }
function scoreboard(s, lines, x, y, z, ry, w = 7, h = 3.6) {
  const g = new THREE.Group(); const frameM = M(0x1d2230, 0.5, { metalness: 0.4 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(w + 0.5, h + 0.5, 0.5, 2, 0.08), frameM); body.castShadow = true; g.add(body);
  const scr = textPanel(lines, w, h, { lit: 1.0 }); scr.position.z = 0.26; g.add(scr); s.userData.board = scr;
  for (const sx of [-w * 0.3, w * 0.3]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, y, 10), frameM); p.position.set(sx, -y / 2 - h / 2, -0.1); p.castShadow = true; g.add(p); }
  g.position.set(x, y + h / 2, z); g.rotation.y = ry; s.add(g); return scr; }
function lightTower(s, x, z, ry) { const g = new THREE.Group(), steel = M(0x8a909a, 0.4, { metalness: 0.6 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 16, 10), steel); pole.position.y = 8; g.add(pole);
  const head = new THREE.Mesh(new THREE.BoxGeometry(3, 1.8, 0.4), M(0x30343c, 0.5)); head.position.set(0, 16.4, 0.2); head.rotation.x = 0.35; g.add(head);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const l = new THREE.Mesh(new THREE.CircleGeometry(0.34, 16), glow(0xfff6dc, 2.5)); l.position.set(-1 + i, 16.15 + j * 0.8, 0.43 - j * 0.28); l.rotation.x = 0.35; g.add(l); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.position.set(x, 0, z); g.rotation.y = ry; s.add(g); }
function pennants(s, r, y, n, cols) { const m = cols.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, side: THREE.DoubleSide }));
  const tri = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.22, 0, 0), new THREE.Vector3(0.22, 0, 0), new THREE.Vector3(0, -0.42, 0)]); tri.computeVertexNormals();
  for (let i = 0; i < n; i++) { const a = i / n * 2 * P, p = new THREE.Mesh(tri, m[i % m.length]); p.position.set(Math.sin(a) * r, y - 0.08 * Math.abs(Math.sin(i * 0.5)), Math.cos(a) * r); p.rotation.y = a + P / 2; s.add(p); }
  const rope = new THREE.Mesh(new THREE.TorusGeometry(r, 0.015, 4, 128), M(0xeeeeee)); rope.rotation.x = P / 2; rope.position.y = y; s.add(rope); }
function trophyCase(s, x, z, ry) { const g = new THREE.Group(); const wood = M(0x3a2414, 0.5), glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false });
  const bx = (w, h, d, m, px, py, pz) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(px, py, pz); b.castShadow = b.receiveShadow = true; g.add(b); };
  bx(3.2, 0.2, 0.8, wood, 0, 0.1, 0); bx(3.2, 0.12, 0.8, wood, 0, 2.6, 0); bx(3.2, 2.5, 0.08, M(0x5a1020, 0.9), 0, 1.35, -0.36); for (const sx of [-1.56, 1.56]) bx(0.08, 2.5, 0.8, wood, sx, 1.35, 0);
  for (const sy of [0.9, 1.7]) bx(3.1, 0.06, 0.7, wood, 0, sy, 0);
  [[0.2, 0.82], [0.93, 0.66], [1.73, 0.6]].forEach(([y, sc], row) => { for (let i = 0; i < 4; i++) { const t = trophy(sc * (i === 1 && row === 0 ? 1.3 : 1)); t.position.set(-1.1 + i * 0.73, y, 0.02); g.add(t); } });
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 2.4), glass); gl.position.set(0, 1.35, 0.4); g.add(gl);
  const l = new THREE.PointLight(0xffe0a0, 2.5, 4, 2); l.position.set(0, 2.3, 0.6); g.add(l);
  g.position.set(x, 0, z); g.rotation.y = ry; s.add(g); return g; }
function bigBanner(s, text, sub, x, y, z, ry, w = 3, h = 7) {
  const p = textPanel([], w, h, { bg: '#4a1490', bg2: '#1e0640', frame: '#ffd34a', px: 512, lit: 0.8, draw: (g, W, H) => {
    bolt(g, W / 2, H * 0.2, W * 0.28); g.save(); g.translate(W / 2, H * 0.62); g.rotate(-P / 2); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `bold ${Math.round(W * 0.3)}px sans-serif`; g.fillStyle = '#ffe27a'; g.shadowColor = '#ffb000'; g.shadowBlur = 20; g.fillText(text, 0, -W * 0.08); g.font = `bold ${Math.round(W * 0.15)}px sans-serif`; g.fillStyle = '#fff'; g.shadowBlur = 0; g.fillText(sub, 0, W * 0.2); g.restore(); } });
  p.position.set(x, y, z); p.rotation.y = ry; s.add(p); return p; }

async function arenaBase(s, torneio) {
  if (torneio) { skyAndFog(s, '#1a1446', '#7a3a8a', '#ff9a5a', 0x4a2a5a, 40, 110); s.userData.exposure = 0.95; s.userData.env = 0.25; s.userData.key = 2.2; }
  else { skyAndFog(s, '#2f8cf0', '#8fcfff', '#e8f5ff', 0xd8ecff, 40, 110); s.userData.exposure = 0.85; s.userData.env = 0.3; }
  clouds(s, 9, 26, -70);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), M(0x8a9a6a, 1)); ground.rotation.x = -P / 2; ground.position.y = -0.03; ground.receiveShadow = true; s.add(ground);
  const walk = new THREE.Mesh(new THREE.RingGeometry(FENCE - 0.2, STAND0 + 0.05, 96), M(0x9a9590, 0.95)); walk.rotation.x = -P / 2; walk.position.y = 0.005; walk.receiveShadow = true; s.add(walk);
  const dirt = new THREE.Mesh(new THREE.CircleGeometry(FENCE, 96), M(0xffffff, 1, { map: dirtTex() })); dirt.rotation.x = -P / 2; dirt.position.y = 0.012; dirt.receiveShadow = true; s.add(dirt);
  const curb = new THREE.Mesh(new THREE.TorusGeometry(FENCE, 0.09, 8, 96), M(0x6a6058, 0.8)); curb.rotation.x = P / 2; curb.position.y = 0.05; s.add(curb);
  // chain-link fence: posts + mesh + top rail (the Penosa hits this in the climax)
  const fm = new THREE.Mesh(new THREE.CylinderGeometry(FENCE, FENCE, 1.5, 128, 1, true), new THREE.MeshStandardMaterial({ map: fenceTex(), alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.6, roughness: 0.4 })); fm.position.y = 0.8; s.add(fm);
  const steel = M(0xaab0ba, 0.35, { metalness: 0.7 });
  for (let i = 0; i < 36; i++) { const a = i / 36 * 2 * P; const p = cyl(s, 0.05, 0.05, 1.65, steel, Math.sin(a) * FENCE, 0.82, Math.cos(a) * FENCE, 8); p.castShadow = true; }
  for (const y of [1.6, 0.1]) { const rail = new THREE.Mesh(new THREE.TorusGeometry(FENCE, 0.035, 6, 128), steel); rail.rotation.x = P / 2; rail.position.y = y; s.add(rail); }
  // stands: 9 tiers all round, except the entrance tunnel (south-west) and the trainers' gates
  const gap = (a) => { const d = Math.atan2(Math.sin(a - P * 1.25), Math.cos(a - P * 1.25)); return Math.abs(d) < 0.2; };
  const seatC = torneio ? [0x5a2aa0, 0x3a1a70] : [0x2f6fd0, 0x2a5aa8];
  for (let t = 0; t < NT; t++) { const r0 = STAND0 + t * TIER, y = (t + 1) * TH;
    const segs = [[P * 1.25 + 0.2, 2 * P - 0.4]];
    for (const [a0, len] of segs) {
      const riser = new THREE.Mesh(new THREE.CylinderGeometry(r0, r0, TH, 96, 1, true, a0, len), M(0xd8d4cc, 0.9, { side: THREE.DoubleSide })); riser.position.y = y - TH / 2; riser.receiveShadow = true; s.add(riser);
      const tread = new THREE.Mesh(new THREE.RingGeometry(r0, r0 + TIER, 96, 1, a0 - P / 2, len), M(seatC[t % 2], 0.7, { side: THREE.DoubleSide })); tread.rotation.x = -P / 2; tread.rotation.z = 0; tread.position.y = y; tread.receiveShadow = true;
      s.add(tread);   // ring angle θ maps to world angle θ + P/2 after lying it flat
    } }
  const back = new THREE.Mesh(new THREE.CylinderGeometry(STAND0 + NT * TIER, STAND0 + NT * TIER, NT * TH + 1.4, 96, 1, true, P * 1.25 + 0.2, 2 * P - 0.4), M(0x9a3030, 0.8, { side: THREE.DoubleSide })); back.position.y = (NT * TH + 1.4) / 2; s.add(back);
  // tunnel opening walls + arch
  const ta = P * 1.25, tx = Math.sin(ta), tz = Math.cos(ta);
  for (const sd of [-1, 1]) { const a = ta + sd * 0.2; const w = box(s, 0.4, NT * TH + 1.4, NT * TIER + 0.2, M(0xd8d4cc, 0.9), Math.sin(a) * (STAND0 + NT * TIER / 2), (NT * TH + 1.4) / 2, Math.cos(a) * (STAND0 + NT * TIER / 2), a); }
  // 4 light towers, pennants, trainers' mats
  for (const a of [P * 0.25, P * 0.75, P * 1.75, P * 1.55]) lightTower(s, Math.sin(a) * 20, Math.cos(a) * 20, a + P);
  pennants(s, FENCE + 0.02, 1.75, 90, torneio ? [0xffd34a, 0x8a3cff, 0xffffff] : [0xe8453c, 0xf2c94c, 0x2f7fe0, 0x5cc7a0]);
  const matB = new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.08, 1.2, 2, 0.03), M(0x2f6fd0, 0.6)); matB.position.set(0, 0.04, FENCE + 1.15); matB.receiveShadow = true; s.add(matB);
  const matK = new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.08, 1.2, 2, 0.03), M(0xc0283a, 0.6)); matK.position.set(0, 0.04, -FENCE - 1.15); matK.receiveShadow = true; s.add(matK);
  trophyCase(s, -2.6, -STAND0 + 0.55, 0);
  // benches/buckets near the trainers (water bowl, seed bag) so the walkway is never empty
  for (const [x, z, c] of [[1.6, FENCE + 1.0, 0x2f7fe0], [-1.6, -FENCE - 1.0, 0xc0283a]]) { cyl(s, 0.22, 0.18, 0.32, M(c, 0.5), x, 0.16, z); cyl(s, 0.2, 0.2, 0.03, M(0x9ad8ff, 0.05, { metalness: 0.3 }), x, 0.31, z); }
  for (const [x, z] of [[2.4, FENCE + 1.2], [-2.4, -FENCE - 1.2], [4.3, 3.9], [-4.1, 4.0]]) { const b = new THREE.Mesh(new RoundedBoxGeometry(0.45, 0.6, 0.32, 2, 0.08), M(0xd8c090, 0.95)); b.position.set(x, 0.3, z); b.rotation.y = x; b.castShadow = true; s.add(b); }
  const ann = new THREE.Group(); s.add(ann);
  return { gap };
}
const WK = (FENCE + STAND0) / 2 + 0.15; const wk = (name, a, pose, dr = 0) => [name, +(Math.sin(a) * (WK + dr)).toFixed(2), +(Math.cos(a) * (WK + dr)).toFixed(2), a + P, pose];
function arenaCrowd(s, fill, seed) { blockCrowd(s, standSpots(fill, seed, (a) => { const d = Math.atan2(Math.sin(a - P * 1.25), Math.cos(a - P * 1.25)); return Math.abs(d) < 0.26; }), seed); }

export async function buildArena(s) {
  await arenaBase(s, false);
  const sb = scoreboard(s, [{ t: 'ARENA DA CIDADE', size: 0.13, y: 0.16, color: '#ffd34a' }, { t: 'VITÓRIAS  x  DERROTAS', size: 0.1, y: 0.36, color: '#cfe2ff' }, { t: '0  –  347', size: 0.34, y: 0.66, color: '#ff4a4a', glow: '#ff2020' }], 0, STAND0 + NT * TH + 1.2, -(STAND0 + NT * TIER) - 0.6, 0);
  arenaCrowd(s, 0.55, 3);
  return {
    ring: [0, 0], fence: FENCE, boy: [0, FENCE + 1.2, P], kaio: [0, -FENCE - 1.2, 0], trophyCase: [-2.6, -STAND0 + 0.55],
    scoreboard: [0, STAND0 + NT * TH + 3, -(STAND0 + NT * TIER)],
    chickens: [[-1.4, 0.2, P / 2, 'raio'], [1.4, -0.2, -P / 2, 'fogo']],
    // front row (walkway) people with a reason to be there: families and kids with their own chickens
    crowd: [wk('vovo', -0.62, 'cheer'), wk('afro', -0.5, 'point', -0.3), wk('menino_bone', 0.55, 'cheer'), wk('menina', 0.85, null), wk('mulher', 0.97, 'hold', 0.2),
      wk('bia', -2.3, null), wk('duda', -2.18, 'cheer', -0.3), wk('bob', 2.25, 'point')],
  };
}
export async function buildArenaRindo(s) { globalThis.__crowdMood = 'laugh'; const a = await buildArena(s); globalThis.__crowdMood = null; a.crowd = a.crowd.map(c => [c[0], c[1], c[2], c[3], 'laughA']); return a; }
export async function buildArenaTorneio(s) {
  await arenaBase(s, true);
  const sb = scoreboard(s, [{ t: 'TORNEIO LENDÁRIO', size: 0.15, y: 0.17, color: '#ffe27a', glow: '#ffb000' }, { t: 'GRANDE FINAL', size: 0.1, y: 0.36, color: '#ffffff' }, { t: 'PENOSA  x  SOMBRA', size: 0.15, y: 0.62, color: '#ffffff', glow: '#8a3cff' }, { t: 'vale o Ovo do Trovão', size: 0.09, y: 0.84, color: '#ffd34a' }],
    0, STAND0 + NT * TH + 1.2, -(STAND0 + NT * TIER) - 0.6, 0, 8, 4.2);
  // bracket board (quarter-finals -> final) over the east stands
  const br = textPanel([{ t: 'CHAVE DO TORNEIO', size: 0.1, y: 0.1, color: '#ffe27a' }], 6, 3.6, { bg: '#1e0640', bg2: '#0a0220', lit: 1.0, draw: (g, W, H) => {
    const names = ['PENOSA', 'TROVOADA', 'BRASA', 'SOMBRA', 'CRISTAL', 'PIPOCA', 'FAÍSCA', 'NEVASCA']; g.font = `bold ${Math.round(H * 0.055)}px sans-serif`; g.textAlign = 'center';
    names.forEach((nm, i) => { const x = i < 4 ? W * 0.14 : W * 0.86, y = H * (0.26 + (i % 4) * 0.18); g.fillStyle = nm === 'PENOSA' || nm === 'SOMBRA' ? '#ffffff' : '#8a7aa8'; g.fillText(nm, x, y); });
    g.strokeStyle = '#ffd34a'; g.lineWidth = 5; [[0.26, 0.44], [0.62, 0.8]].forEach(([a, b]) => { [0.24, 0.76].forEach(x0 => { const x1 = x0 < 0.5 ? x0 + 0.1 : x0 - 0.1; g.beginPath(); g.moveTo(W * x0, H * (a + 0.02)); g.lineTo(W * x1, H * (a + 0.02)); g.lineTo(W * x1, H * (b + 0.02)); g.lineTo(W * x0, H * (b + 0.02)); g.moveTo(W * x1, H * ((a + b) / 2 + 0.02)); g.lineTo(W * (x0 < 0.5 ? 0.4 : 0.6), H * ((a + b) / 2 + 0.02)); g.stroke(); }); });
    g.font = `bold ${Math.round(H * 0.08)}px sans-serif`; g.fillStyle = '#ffffff'; g.shadowColor = '#8a3cff'; g.shadowBlur = 20; g.fillText('PENOSA x SOMBRA', W / 2, H * 0.55); g.shadowBlur = 0; g.fillStyle = '#ffd34a'; g.font = `bold ${Math.round(H * 0.06)}px sans-serif`; g.fillText('FINAL', W / 2, H * 0.44); } });
  const bra = P * 0.5; br.position.set(Math.sin(bra) * (STAND0 + NT * TIER + 0.4), STAND0 * 0 + NT * TH + 4.2, Math.cos(bra) * (STAND0 + NT * TIER + 0.4)); br.rotation.y = bra + P; s.add(br);
  for (const sx of [-2.2, 2.2]) { const p = cyl(s, 0.14, 0.18, NT * TH + 2.4, M(0x1d2230), Math.sin(bra) * (STAND0 + NT * TIER + 0.6), (NT * TH + 2.4) / 2, Math.cos(bra) * (STAND0 + NT * TIER + 0.6) + sx); }
  // hanging purple/gold banners on the back wall, an arch over the tunnel
  for (let i = 0; i < 10; i++) { const a = P * 1.25 + 0.55 + i * (2 * P - 1.1) / 9; if (Math.abs(a - P * 2) < 0.35 || Math.abs(a - P * 2.5) < 0.3) continue; bigBanner(s, 'TORNEIO', 'LENDÁRIO', Math.sin(a) * (STAND0 + NT * TIER - 0.15), NT * TH + 0.6, Math.cos(a) * (STAND0 + NT * TIER - 0.15), a + P, 1.6, 3.8); }
  const arch = textPanel([{ t: '⚡ TORNEIO LENDÁRIO ⚡', size: 0.42, y: 0.52, color: '#ffe27a', glow: '#ffb000' }], 6, 1.1, { bg: '#4a1490', bg2: '#1e0640', px: 1024 }); const ta = P * 1.25; arch.position.set(Math.sin(ta) * (STAND0 - 0.2), 4.2, Math.cos(ta) * (STAND0 - 0.2)); arch.rotation.y = ta + P; s.add(arch);
  // the prize on its pedestal by the north-east gate, lit
  const pd = pedestal(s, 2.9, -5.0, -0.5);
  // confetti in the air + coloured spotlights sweeping the ring
  const cg = new THREE.BufferGeometry(), N = 1400, pos = new Float32Array(N * 3), colA = new Float32Array(N * 3), cc = [new THREE.Color(0xffd34a), new THREE.Color(0x8a3cff), new THREE.Color(0xffffff), new THREE.Color(0xff4a8a)];
  for (let i = 0; i < N; i++) { const a = rnd(i) * 2 * P, r = 3 + rnd(i + 1) * 13; pos.set([Math.sin(a) * r, 3 + rnd(i + 2) * 10, Math.cos(a) * r], i * 3); colA.set(cc[i % 4].toArray(), i * 3); }
  cg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); cg.setAttribute('color', new THREE.BufferAttribute(colA, 3));
  s.add(new THREE.Points(cg, new THREE.PointsMaterial({ size: 0.045, vertexColors: true })));
  for (const [c, x, z] of [[0x8a3cff, -9, -9], [0xffc030, 9, 9], [0xffffff, 10, -8]]) { const sp = new THREE.SpotLight(c, 60, 40, 0.28, 0.6, 1.5); sp.position.set(x, 16, z); sp.target.position.set(x * 0.1, 0, z * 0.1); s.add(sp); s.add(sp.target); }
  arenaCrowd(s, 0.96, 7);
  return {
    ring: [0, 0], fence: FENCE, boy: [0, FENCE + 1.2, P], kaio: [0, -FENCE - 1.2, 0], prize: [2.9, -5.0], bracket: br.position.toArray(),
    scoreboard: [0, STAND0 + NT * TH + 3, -(STAND0 + NT * TIER)],
    chickens: [],
    crowd: [wk('vovo', -0.62, 'cheer'), wk('afro', -0.5, 'cheer', -0.3), wk('menino_bone', 0.55, 'cheer'), wk('menina', 0.85, 'point'), wk('mulher', 0.97, 'hold', 0.2),
      wk('bia', -2.3, 'cheer'), wk('duda', -2.18, 'cheer', -0.3), wk('bob', 2.25, 'point'), wk('rita', -1.35, 'hold'), wk('lia', -1.22, 'cheer', -0.3), wk('leo', 1.4, 'cheer'), wk('irma_loira', 1.55, 'wave', -0.25)],
  };
}

// ================================================================= HOUSE + YARD
// the boy's small house (Kenney house, scaled) with a fenced back yard turned into a training ground:
// treadmill, punching bag on a wooden frame, weights, tyres, the straw nest with a heat lamp where the egg hatched.
function treadmill(s, x, z, ry) { const g = new THREE.Group(); const dark = M(0x26282e, 0.6), belt = M(0x111214, 0.9), steel = M(0xb8bec8, 0.35, { metalness: 0.7 });
  const b = (w, h, d, m, px, py, pz, rx = 0) => { const o = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.3), m); o.position.set(px, py, pz); o.rotation.x = rx; o.castShadow = o.receiveShadow = true; g.add(o); };
  b(0.9, 0.16, 2.0, dark, 0, 0.12, 0); b(0.7, 0.04, 1.9, belt, 0, 0.21, 0);
  for (const sx of [-0.42, 0.42]) { b(0.06, 1.15, 0.06, steel, sx, 0.75, -0.85, -0.15); b(0.06, 0.06, 0.6, steel, sx, 1.28, -0.65); }
  b(0.9, 0.3, 0.12, dark, 0, 1.32, -0.95, -0.5); const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.18), glow(0x40ff80, 0.8)); scr.position.set(0, 1.36, -0.88); scr.rotation.x = -0.5; g.add(scr);
  g.position.set(x, 0, z); g.rotation.y = ry; s.add(g); return g; }
function punchingBag(s, x, z) { const g = new THREE.Group(), wood = M(0x7a5232, 0.8);
  const b = (w, h, d, px, py, pz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood); o.position.set(px, py, pz); o.castShadow = o.receiveShadow = true; g.add(o); };
  b(0.16, 2.6, 0.16, -0.9, 1.3, 0); b(0.16, 2.6, 0.16, 0.9, 1.3, 0); b(2.0, 0.16, 0.16, 0, 2.6, 0);
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6), M(0x999999, 0.3, { metalness: 0.8 })); chain.position.set(0, 2.32, 0); g.add(chain);
  const bag = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.75, 6, 16), M(0xb02a2a, 0.55)); bag.position.set(0, 1.6, 0); bag.castShadow = true; g.add(bag);
  for (const y of [1.25, 1.95]) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.265, 0.02, 6, 24), M(0x1a1a1a)); t.rotation.x = P / 2; t.position.set(0, y, 0); g.add(t); }
  g.position.set(x, 0, z); s.add(g); return g; }
function weights(s, x, z) { const g = new THREE.Group(), iron = M(0x2a2c30, 0.5, { metalness: 0.5 }), steel = M(0xc0c6ce, 0.3, { metalness: 0.8 });
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 8), steel); bar.rotation.z = P / 2; bar.position.set(0, 0.2, 0); g.add(bar);
  for (const sx of [-0.5, 0.5]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 20), iron); p.rotation.z = P / 2; p.position.set(sx, 0.2, 0); g.add(p); }
  for (let i = 0; i < 3; i++) { const d = new THREE.Group(); const h = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.26, 8), steel); h.rotation.z = P / 2; d.add(h); for (const sx of [-0.12, 0.12]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06 + i * 0.01, 0.06 + i * 0.01, 0.06, 12), iron); p.rotation.z = P / 2; p.position.x = sx; d.add(p); } d.position.set(-0.4 + i * 0.4, 0.07, 0.55); g.add(d); }
  // tiny chick-size dumbbell (for the Penosa)
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.position.set(x, 0, z); s.add(g); return g; }
function nest(s, x, z) { const g = new THREE.Group();
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.7), M(0x9a7044, 0.9)); crate.position.y = 0.175; crate.castShadow = crate.receiveShadow = true; g.add(crate);
  const straw = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.12, 8, 18), M(0xe0c060, 1)); straw.rotation.x = P / 2; straw.scale.z = 0.6; straw.position.y = 0.38; g.add(straw);
  for (let i = 0; i < 40; i++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 4), M(0xe8c868, 1)); st.position.set((rnd(i) - 0.5) * 0.7, 0.36 + rnd(i + 1) * 0.05, (rnd(i + 2) - 0.5) * 0.5); st.rotation.set(P / 2, rnd(i + 3) * 6, rnd(i + 4)); g.add(st); }
  const egg = grayEgg(0.1); egg.position.set(0, 0.34, 0); egg.rotation.z = 0.15; g.add(egg);
  // heat lamp on a bent pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 8), M(0x444a52, 0.4, { metalness: 0.6 })); pole.position.set(-0.55, 0.65, 0); g.add(pole);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 8), M(0x444a52, 0.4, { metalness: 0.6 })); arm.rotation.z = P / 2; arm.position.set(-0.3, 1.3, 0); g.add(arm);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.2, 16, 1, true), M(0xc0c6ce, 0.3, { metalness: 0.7, side: THREE.DoubleSide })); shade.position.set(-0.05, 1.2, 0); g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), glow(0xff8a30, 3)); bulb.position.set(-0.05, 1.12, 0); g.add(bulb);
  const l = new THREE.PointLight(0xff9a40, 3, 2.2, 2); l.position.set(-0.05, 1.0, 0); g.add(l);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.scale.setScalar(0.8); g.position.set(x, 0, z); s.add(g); return g; }
function woodFence(s, x0, z0, x1, z1) { const len = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0), n = Math.round(len / 0.2), wood = [M(0xb08a5a, 0.9), M(0x9a7448, 0.9)];
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; const h = 1.5 + rnd(i) * 0.08; const p = new THREE.Mesh(new THREE.BoxGeometry(0.17, h, 0.05), wood[i % 2]); p.position.set(x0 + (x1 - x0) * t, h / 2, z0 + (z1 - z0) * t); p.rotation.y = a + P / 2; p.castShadow = p.receiveShadow = true; s.add(p); }
  for (const y of [0.4, 1.2]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, len), wood[1]); r.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); r.rotation.y = a; s.add(r); } }
function grassTex() { const t = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#6aa84a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 7000; i++) { g.fillStyle = `rgba(${rnd(i) < 0.5 ? '80,140,50' : '140,200,90'},${0.2 + rnd(i + 1) * 0.3})`; g.fillRect(rnd(i + 2) * w, rnd(i + 3) * h, 2, 4 + rnd(i + 4) * 5); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 10); return t; }
function clothesline(s, x0, x1, z) { for (const x of [x0, x1]) cyl(s, 0.04, 0.04, 2.2, M(0x8a8a90, 0.4), x, 1.1, z, 8);
  const cols = [0x2f7fe0, 0xffffff, 0xe8453c, 0xf2c94c]; const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, x1 - x0, 4), M(0xdddddd)); wire.rotation.z = P / 2; wire.position.set((x0 + x1) / 2, 2.1, z); s.add(wire);
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.65), M(cols[i], 0.9, { side: THREE.DoubleSide })); c.position.set(x0 + 0.6 + i * (x1 - x0 - 1.2) / 3, 1.75, z); c.castShadow = true; s.add(c); } }
function tyre(s, x, z, y = 0.12, rx = P / 2) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.12, 10, 24), M(0x1c1c1e, 0.9)); t.rotation.x = rx; t.position.set(x, y, z); t.castShadow = t.receiveShadow = true; s.add(t); return t; }

// a plain one-storey house: walls, gable roof, door, windows with frames, gutter, little porch roof
export function simpleHouse(s, x, z, ry, w, d, wallC, roofC, opts = {}) {
  const g = new THREE.Group(), h = opts.h || 3.0, rise = opts.rise || 1.5, wallM = M(wallC, 0.85), roofM = M(roofC, 0.7), trim = M(0xf4f0e8, 0.6);
  const add = (geo, m, px, py, pz, rx = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.rotation.set(rx, 0, rz); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  add(new THREE.BoxGeometry(w, h, d), wallM, 0, h / 2, 0);
  add(new THREE.BoxGeometry(w + 0.2, 0.3, d + 0.2), M(0x8a8478, 0.9), 0, 0.15, 0);
  const tri = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, rise)]);
  for (const sx of [-w / 2, w / 2 - 0.01]) { const gb = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.01, bevelEnabled: false }), wallM); gb.rotation.y = P / 2; gb.position.set(sx, h, 0); gb.castShadow = true; g.add(gb); }
  const slope = Math.hypot(d / 2, rise), ang = Math.atan2(rise, d / 2);
  for (const sd of [-1, 1]) add(new THREE.BoxGeometry(w + 0.5, 0.14, slope + 0.35), roofM, 0, h + rise / 2 + 0.05, sd * d / 4, sd * ang, 0);
  const ridge = add(new THREE.BoxGeometry(w + 0.55, 0.14, 0.2), M(roofC, 0.6), 0, h + rise + 0.05, 0);
  const front = d / 2 + 0.01;
  // door (front +z) and windows
  add(new THREE.BoxGeometry(1.0, 2.1, 0.08), M(opts.doorC || 0x8a4a2a, 0.6), opts.doorX || 0, 1.15, front);
  add(new THREE.SphereGeometry(0.05, 8, 6), M(0xffd34a, 0.3, { metalness: 0.8 }), (opts.doorX || 0) + 0.35, 1.15, front + 0.06);
  const win = (px, py, pz, ry2) => { const wg = new THREE.Group(); const fr = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 0.1), trim); wg.add(fr); const gl = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.11), new THREE.MeshStandardMaterial({ color: 0x8ab8e0, roughness: 0.1, metalness: 0.3, emissive: opts.lit ? 0xffc060 : 0x000000, emissiveIntensity: 0.6 })); wg.add(gl);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 0.12), trim); wg.add(bar); const sill = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.08, 0.2), trim); sill.position.set(0, -0.52, 0.06); wg.add(sill); wg.position.set(px, py, pz); wg.rotation.y = ry2; g.add(wg); };
  for (const wx of opts.windows || [-w / 3, w / 3]) win(wx, 1.6, front, 0);
  win(0, 1.6, -front, P);
  for (const sx of [-w / 2 - 0.01, w / 2 + 0.01]) win(0, 1.6, 0, sx > 0 ? P / 2 : -P / 2);
  if (opts.porch) { add(new THREE.BoxGeometry(2.0, 0.1, 1.2), roofM, opts.doorX || 0, 2.6, front + 0.55, 0.2); for (const px of [-0.9, 0.9]) add(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 8), trim, (opts.doorX || 0) + px, 1.3, front + 1.05); }
  add(new THREE.BoxGeometry(0.5, 1.2, 0.5), M(0x9a4a3a, 0.8), w / 3, h + rise * 0.7, -d / 5);  // chimney
  g.position.set(x, 0, z); g.rotation.y = ry; s.add(g); return g;
}
export async function buildHouse(s) {
  skyAndFog(s, '#3a96f2', '#9ad4ff', '#eef8ff', 0xdcefff, 30, 90); clouds(s, 9, 20, -55); s.userData.exposure = 0.85; s.userData.env = 0.3;
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), M(0xffffff, 1, { map: grassTex() })); yard.rotation.x = -P / 2; yard.position.y = -0.01; yard.receiveShadow = true; s.add(yard);
  // the boy's house: small and simple, back door opening onto the yard (+z)
  simpleHouse(s, 0, -5.4, 0, 7.5, 5.5, 0xf2d8a8, 0xb04a3a, { porch: true, windows: [-2.4, 2.4], doorC: 0x3a6a9a });
  box(s, 1.6, 0.18, 0.9, M(0xa8a49c, 0.9), 0, 0.09, -2.15);
  // neighbours: other simple houses in different colours, trees, a lamp post over the fence
  simpleHouse(s, -10.5, -6.5, 0.15, 6.5, 5, 0xa8d0e8, 0x4a5a7a); simpleHouse(s, 10.5, -6.8, -0.15, 6.5, 5, 0xe8b8c8, 0x6a3a4a);
  simpleHouse(s, -12, 9, P - 0.1, 6.5, 5, 0xd8e8b0, 0x8a5a2a); simpleHouse(s, 12, 9.5, P + 0.1, 6.5, 5, 0xf0e0c0, 0x3a6a4a);
  for (const [x, z, sc] of [[-7.5, 11.5, 6], [6.5, 12, 7], [-9, 1.5, 6], [9, 2, 6], [1.5, 14, 7], [-3, 15, 6]]) await put(s, KC('grass-trees-tall'), x, z, rnd(x) * 6, sc, -0.05);
  await put(s, C('streetlight'), 6.4, 7.0, P, K, 0);
  // fenced yard x[-5.5,5.5] z[-2.6,6]
  woodFence(s, -5.5, -2.6, -5.5, 6); woodFence(s, 5.5, -2.6, 5.5, 6); woodFence(s, -5.5, 6, 5.5, 6);
  // training ground
  const tm = treadmill(s, -2.8, 1.6, 0.3);
  punchingBag(s, 2.9, 1.4);
  weights(s, 0.4, 3.6);
  tyre(s, -1.6, 4.4); tyre(s, -0.9, 4.95); tyre(s, -2.3, 5.05); tyre(s, 4.4, 5.2, 0.32, 0.2);
  const ns = nest(s, -4.3, -1.5);
  clothesline(s, 1.8, 5.0, -1.9);
  const sg = textPanel([{ t: 'CT DA PENOSA', size: 0.42, y: 0.54, color: '#3a2414' }], 2.2, 0.6, { bg: '#e8d8b0', bg2: '#d8c090', frame: '#7a5232', px: 512, lit: 0.05 }); sg.position.set(0, 1.25, 5.94); sg.rotation.y = P; s.add(sg);
  cyl(s, 0.18, 0.15, 0.3, M(0x2a9e5a, 0.5), 4.6, 0.15, -0.9); cyl(s, 0.2, 0.17, 0.3, M(0x8a8f99, 0.4, { metalness: 0.5 }), -4.8, 0.15, 3.2); cyl(s, 0.18, 0.18, 0.02, M(0xf2c94c, 0.8), -4.8, 0.31, 3.2);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), M(0xe8453c, 0.5)); ball.position.set(1.8, 0.17, 5.2); ball.castShadow = true; s.add(ball);
  // flower bed along the house wall
  for (let i = 0; i < 14; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), M([0xe8453c, 0xf2c94c, 0xffffff, 0xe86f9c][i % 4], 0.6)); f.position.set(-3.4 + i * 0.5 + (i > 6 ? 0.9 : 0), 0.35, -2.4); s.add(f); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 4), M(0x3a8a3a)); st.position.set(f.position.x, 0.15, -2.4); s.add(st); }
  const doorL = new THREE.PointLight(0xffe0a0, 2, 5, 2); doorL.position.set(0, 2.6, -2.0); s.add(doorL);
  return { house: [0, -5.4], door: [0, -2.7], treadmill: [-2.8, 1.6, 0.3], bag: [2.9, 1.4], weights: [0.4, 3.6], nest: [-4.3, -1.5], egg: [-4.3, 0.34, -1.5], sign: [0, 1.25, 5.94], crowd: [], chickens: [] };
}

export async function buildHouseChuva(s) {
  const a = await buildHouse(s); s.background = new THREE.Color(0x6a7684); s.fog = new THREE.Fog(0x6a7684, 8, 40); s.userData.exposure = 0.75; s.userData.key = 0.7; s.userData.env = 0.2;
  s.add(FXrain(0, 2, 18, 16, 9, 6000)); s.add(FXsplash(0, 2, 11, 8, 90)); for (const [x, z, r] of [[1.2, 2.6, 0.9], [-2.0, 4.2, 0.7], [3.6, 4.0, 0.6], [-1.0, 0.0, 0.8]]) puddle(s, x, z, r);
  return a; }
export async function buildHouseNoite(s) {
  const a = await buildHouse(s); s.background = new THREE.Color(0x0b1430); s.fog = new THREE.Fog(0x0b1430, 15, 60); s.userData.exposure = 0.8; s.userData.key = 0.25; s.userData.env = 0.06;
  const moon = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false })); moon.position.set(-14, 20, -40); moon.lookAt(0, 2, 0); s.add(moon);
  for (let i = 0; i < 200; i++) { const st = new THREE.Mesh(new THREE.CircleGeometry(0.06 + rnd(i) * 0.06, 5), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false })); st.position.set((rnd(i + 1) - 0.5) * 120, 12 + rnd(i + 2) * 40, -45 - rnd(i + 3) * 10); st.lookAt(0, 0, 0); s.add(st); }
  s.add(new THREE.HemisphereLight(0x3a4a8a, 0x101018, 0.6));
  for (const [x, y, z, c, i] of [[0, 2.6, -2.0, 0xffd890, 4], [-2.4, 1.6, -2.5, 0xffc060, 2], [2.4, 1.6, -2.5, 0xffc060, 2], [6.4, 6.5, 7.0, 0xfff0d0, 6]]) { const l = new THREE.PointLight(c, i, 9, 1.6); l.position.set(x, y, z); s.add(l); }
  for (const x of [-2.4, 2.4]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.8), new THREE.MeshBasicMaterial({ color: 0xffd070 })); w.position.set(x, 1.6, -2.57); s.add(w); }
  return a; }

// ================================================================= BEDROOM (night / morning)
async function bedroom(s, night) {
  s.background = new THREE.Color(night ? 0x0b1430 : 0xbfe3ff); s.userData.exposure = night ? 0.9 : 0.9; s.userData.env = night ? 0.08 : 0.3; s.userData.key = night ? 0.25 : 1.6;
  const W = 6, D = 5, Hh = 3.0;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), M(0xa8784a, 0.7)); floor.rotation.x = -P / 2; floor.receiveShadow = true; s.add(floor);
  for (let i = 0; i < 12; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.02, D), M(0x7a5232, 0.8)); l.rotation.x = -P / 2; l.position.set(-W / 2 + i * 0.5, 0.002, 0); s.add(l); }
  const wallTex = canvasTex(512, 256, (g, w, h) => { g.fillStyle = night ? '#6a86b8' : '#9ac4e8'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.12)'; for (let x = 0; x < w; x += 40) g.fillRect(x, 0, 14, h); });
  const wallM = M(0xffffff, 0.9, { map: wallTex });
  // back wall with a window cut-out (4 boxes around the hole), left wall, right wall
  const wz = -D / 2, wx0 = 0.6, wx1 = 2.2, wy0 = 1.0, wy1 = 2.4;
  box(s, W, wy0, 0.15, wallM, 0, wy0 / 2, wz, 0, false); box(s, W, Hh - wy1, 0.15, wallM, 0, (wy1 + Hh) / 2, wz, 0, false);
  box(s, wx0 + W / 2, wy1 - wy0, 0.15, wallM, (-W / 2 + wx0) / 2, (wy0 + wy1) / 2, wz, 0, false); box(s, W / 2 - wx1, wy1 - wy0, 0.15, wallM, (wx1 + W / 2) / 2, (wy0 + wy1) / 2, wz, 0, false);
  box(s, 0.15, Hh, D, wallM, -W / 2, Hh / 2, 0, 0, false); box(s, 0.15, Hh, D, wallM, W / 2, Hh / 2, 0, 0, false);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), M(0xf0ece4, 0.9)); ceil.rotation.x = P / 2; ceil.position.y = Hh; s.add(ceil);
  // window frame + view outside (moon and stars, or morning sky with the sun)
  const frm = M(0xf4f4f6, 0.5); box(s, wx1 - wx0 + 0.16, 0.08, 0.22, frm, (wx0 + wx1) / 2, wy0, wz + 0.02); box(s, wx1 - wx0 + 0.16, 0.08, 0.22, frm, (wx0 + wx1) / 2, wy1, wz + 0.02); box(s, 0.06, wy1 - wy0, 0.2, frm, (wx0 + wx1) / 2, (wy0 + wy1) / 2, wz + 0.02);
  const view = new THREE.Mesh(new THREE.PlaneGeometry(9, 6), new THREE.MeshBasicMaterial({ map: canvasTex(512, 340, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); if (night) { gr.addColorStop(0, '#050a24'); gr.addColorStop(1, '#1a2a5a'); } else { gr.addColorStop(0, '#6ab8ff'); gr.addColorStop(0.7, '#ffd8a0'); gr.addColorStop(1, '#ffb070'); } g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (night) { for (let i = 0; i < 140; i++) { g.fillStyle = `rgba(255,255,255,${0.4 + rnd(i) * 0.6})`; g.fillRect(rnd(i + 1) * w, rnd(i + 2) * h * 0.8, 2, 2); } g.fillStyle = '#fff6d8'; g.shadowColor = '#fff6d8'; g.shadowBlur = 30; g.beginPath(); g.arc(w * 0.62, h * 0.32, 34, 0, 7); g.fill(); g.shadowBlur = 0; g.fillStyle = '#e8dcb8'; g.beginPath(); g.arc(w * 0.6, h * 0.3, 7, 0, 7); g.arc(w * 0.65, h * 0.36, 5, 0, 7); g.fill(); }
    else { g.fillStyle = '#fff2c0'; g.shadowColor = '#ffe080'; g.shadowBlur = 50; g.beginPath(); g.arc(w * 0.5, h * 0.78, 40, 0, 7); g.fill(); g.shadowBlur = 0; }
    g.fillStyle = night ? '#0a1028' : '#5a6a8a'; for (let i = 0; i < 12; i++) { const bw = 30 + rnd(i) * 40, bh = 40 + rnd(i + 5) * 90; g.fillRect(i * 45, h - bh, bw, bh); if (night) { g.fillStyle = '#ffd870'; for (let k = 0; k < 4; k++) g.fillRect(i * 45 + 6 + (k % 2) * 14, h - bh + 10 + Math.floor(k / 2) * 18, 6, 8); g.fillStyle = '#0a1028'; } } }) }));
  view.position.set((wx0 + wx1) / 2, 1.8, wz - 3); s.add(view);
  // curtains
  for (const x of [wx0 - 0.25, wx1 + 0.25]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.7, 0.06), M(0xe8453c, 0.9)); c.position.set(x, 1.8, wz + 0.12); c.castShadow = true; s.add(c); }
  // furniture
  await put(s, F('bed_single_A'), -1.9, -1.0, 0, FS, 0);
  await put(s, F('cabinet_small'), -0.8, -2.12, 0, FS, 0);          // night stand, top at y = 0.72 (same as the bed)
  await put(s, F('table_medium'), 1.9, -1.4, 0, FS * 0.9, 0);
  await put(s, F('chair_A_wood'), 1.9, -0.5, P, FS, 0);
  await put(s, F('rug_rectangle_stripes_A'), 0.2, 0.6, 0, FS, 0.005);
  // wall shelf over the desk with books, a jar of corn and a toy chicken
  box(s, 0.28, 0.05, 1.4, M(0x7a5232, 0.7), 2.83, 1.75, 0.2); for (let i = 0; i < 7; i++) box(s, 0.2, 0.24 + rnd(i) * 0.06, 0.07, M([0xe8453c, 0x2f7fe0, 0xf2c94c, 0x5cc7a0, 0x8e6fe0][i % 5], 0.7), 2.83, 1.9, -0.35 + i * 0.08);
  cyl(s, 0.08, 0.08, 0.18, M(0xdfe8f0, 0.1, { transparent: true, opacity: 0.6 }), 2.83, 1.87, 0.5); cyl(s, 0.07, 0.07, 0.12, M(0xf2c94c, 0.8), 2.83, 1.84, 0.5);
  await put(s, F('cactus_small_A'), 2.83, 0.75, 0, FS * 0.6, 1.775);
  await put(s, F('book_set'), 1.6, -1.4, 0.3, FS, 0.72);
  await put(s, F('lamp_table'), 2.4, -1.75, 0, FS * 0.6, 0.72);
  await put(s, F('pictureframe_large_A'), W / 2 - 0.09, 1.6, -P / 2, FS * 0.8, 1.1);
  // posters of famous chickens + a ribbon on the wall over the bed
  const poster = (txt, c, x, y, z, ry) => { const p = textPanel([{ t: txt, size: 0.13, y: 0.86, color: '#fff' }], 0.6, 0.8, { bg: c, bg2: '#101010', px: 256, lit: night ? 0.15 : 0.05, draw: (g, w, h) => { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(w / 2, h * 0.45, w * 0.22, h * 0.2, 0, 0, 7); g.fill(); g.fillStyle = '#e8453c'; g.beginPath(); g.moveTo(w * 0.45, h * 0.24); g.lineTo(w * 0.5, h * 0.15); g.lineTo(w * 0.55, h * 0.24); g.fill(); bolt(g, w * 0.78, h * 0.3, w * 0.12); } }); p.position.set(x, y, z); p.rotation.y = ry; s.add(p); };
  poster('CAMPEÃ', '#2f6fd0', -2.6, 1.9, wz + 0.09, 0); poster('LENDA', '#8a3cff', -1.6, 2.0, wz + 0.09, 0); poster('TROVÃO', '#e0a018', -W / 2 + 0.09, 1.9, 0.8, P / 2);
  // the trophy: on the night stand next to the bed. The Penosa sleeps on it (scene 9)
  const tr = trophy(0.85); tr.position.set(-0.8, 0.72, -2.15); s.add(tr);   // standing on the night stand
  // a shoebox bed for the chick with a little blanket
  box(s, 0.6, 0.22, 0.4, M(0xd8a060, 0.8), -0.45, 0.11, 0.1); box(s, 0.5, 0.04, 0.3, M(0x5cc7a0, 0.9), -0.45, 0.23, 0.1);
  // clothes and toys on the floor
  const sock = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.16, 4, 8), M(0xffffff, 0.9)); sock.rotation.set(P / 2, 0, 0.6); sock.position.set(0.0, 0.05, 1.4); s.add(sock);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), M(0x2f7fe0, 0.5)); ball.position.set(-0.6, 0.12, 1.6); ball.castShadow = true; s.add(ball);
  // lights: moonlight through the window (cool) + bed lamp (warm); morning: sunbeam
  if (night) { const moon = new THREE.SpotLight(0x8aa8ff, 30, 12, 0.5, 0.6, 1.2); moon.position.set(1.4, 3.2, wz - 2.5); moon.target.position.set(-1.0, 0.6, -0.6); moon.castShadow = true; s.add(moon); s.add(moon.target);
    const lamp = new THREE.PointLight(0xffb060, 1.6, 4, 2); lamp.position.set(2.4, 1.3, -1.6); s.add(lamp); s.add(new THREE.HemisphereLight(0x3a4a8a, 0x1a1020, 0.5)); }
  else { const sun = new THREE.SpotLight(0xffd8a0, 60, 14, 0.5, 0.5, 1.2); sun.position.set(1.4, 2.6, wz - 3); sun.target.position.set(-0.8, 0.6, 0.2); sun.castShadow = true; s.add(sun); s.add(sun.target); s.add(new THREE.HemisphereLight(0xffe8c8, 0x8a6040, 0.9)); }
  return { bed: [-1.9, -1.0], trophy: [-0.8, 0.72, -2.15], window: [(wx0 + wx1) / 2, 1.7, wz], desk: [1.9, -1.4], shoebox: [-0.45, 0.1], crowd: [], chickens: [] };
}
export async function buildBedroom(s) { return bedroom(s, true); }
export async function buildBedroomDia(s) { return bedroom(s, false); }

// ================================================================= CITY: the giant banner in the sky
// a square with a fountain surrounded by buildings; people stop and look up at two airships carrying
// the "TORNEIO LENDÁRIO" banner over the rooftops.
function airship(s, x, y, z, c = 0xe8e4dc) { const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), M(c, 0.5)); hull.scale.set(4.2, 1.5, 1.5); g.add(hull);
  for (const [sx, sy, sz, rx] of [[-3.8, 1.1, 0, 0], [-3.8, -1.1, 0, 0], [-3.8, 0, 1.1, P / 2], [-3.8, 0, -1.1, P / 2]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.08), M(0x8a3cff, 0.6)); f.position.set(sx, sy, sz); f.rotation.x = rx; g.add(f); }
  const gond = new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.5, 0.6, 2, 0.1), M(0x30343c, 0.5)); gond.position.y = -1.7; g.add(gond);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.52, 1.52, 0.4, 32, 1, true), M(0xffd34a, 0.4)); stripe.rotation.z = P / 2; stripe.scale.set(1, 1, 1); g.add(stripe);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); g.position.set(x, y, z); s.add(g); return g; }
export async function buildCity(s) {
  skyAndFog(s, '#2a7ae8', '#8fcfff', '#ffe8c8', 0xe0eeff, 50, 140); clouds(s, 12, 30, -80); s.userData.exposure = 0.85; s.userData.env = 0.3;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), M(0x8a8f96, 1)); ground.rotation.x = -P / 2; ground.position.y = -0.02; ground.receiveShadow = true; s.add(ground);
  // square paving + fountain
  const pav = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#c8bca8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#a89c88'; g.lineWidth = 3; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); } }); pav.wrapS = pav.wrapT = THREE.RepeatWrapping; pav.repeat.set(6, 6);
  const sq = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), M(0xffffff, 0.9, { map: pav })); sq.rotation.x = -P / 2; sq.position.y = 0.005; sq.receiveShadow = true; s.add(sq);
  { const stone = M(0xd8d0c0, 0.7), water = new THREE.MeshStandardMaterial({ color: 0x5ab8e8, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.85 });
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.7, 40, 1, true), stone); basin.position.set(0, 0.35, -4); basin.castShadow = basin.receiveShadow = true; s.add(basin);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(3.25, 0.18, 8, 40), stone); rim.rotation.x = P / 2; rim.position.set(0, 0.7, -4); s.add(rim);
    const wat = new THREE.Mesh(new THREE.CircleGeometry(3.2, 40), water); wat.rotation.x = -P / 2; wat.position.set(0, 0.55, -4); s.add(wat);
    cyl(s, 0.35, 0.5, 1.6, stone, 0, 0.8, -4); const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.4, 0.4, 28), stone); bowl.position.set(0, 1.7, -4); bowl.castShadow = true; s.add(bowl);
    const spray = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xd8f0ff, transparent: true, opacity: 0.55, roughness: 0.1, side: THREE.DoubleSide })); spray.position.set(0, 2.6, -4); spray.rotation.x = P; s.add(spray);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), water); top.position.set(0, 3.3, -4); s.add(top); }
  // buildings around the square (KayKit city, same as the street)
  const ring = [['building_A_withoutBase', -14, -20, 0], ['building_E_withoutBase', -4, -21, 0], ['building_D_withoutBase', 6, -20, 0], ['building_H_withoutBase', 15, -20, 0], ['building_C_withoutBase', -22, -8, P / 2], ['building_G_withoutBase', -22, 4, P / 2], ['building_B_withoutBase', 22, -8, -P / 2], ['building_F_withoutBase', 22, 4, -P / 2]];
  for (const [b, x, z, ry] of ring) await put(s, C(b), x, z, ry, K * 1.2, -0.4);
  for (let i = 0; i < 12; i++) await put(s, C(['building_C', 'building_D', 'building_G', 'building_H'][i % 4] + '_withoutBase'), -50 + i * 9, -36 - (i % 3) * 5, 0, K * (1.4 + (i % 2) * 0.4), -0.5);
  for (const [x, z] of [[-10, -8], [10, -8], [-10, 6], [10, 6]]) await put(s, C('streetlight'), x, z, 0, K, 0);
  for (const [x, z, ry] of [[-6, 4, 0.2], [6, 4, -0.2]]) await put(s, C('bench'), x, z, ry, K, 0);
  for (const x of [-15, -8, 8, 15]) await put(s, C('bush'), x, -14, 0, K, 0);
  await put(s, C('car_taxi'), -17, 10, P / 2, K, 0); await put(s, C('car_sedan'), 14, 11, -P / 2, K, 0);
  // airships with the banner hung between them
  const y = 24, z = -32; airship(s, -15, y, z); airship(s, 15, y, z);
  const ban = textPanel([{ t: '⚡ TORNEIO LENDÁRIO ⚡', size: 0.3, y: 0.38, color: '#ffe27a', glow: '#ffb000' }, { t: 'o vencedor ganha o OVO DO TROVÃO', size: 0.16, y: 0.75, color: '#ffffff' }], 22, 6, { bg: '#4a1490', bg2: '#1e0640', px: 2048, lit: 0.9 }); ban.position.set(0, y - 3.2, z); s.add(ban);
  for (const sx of [-11, 11]) { const ropeG = new THREE.CylinderGeometry(0.04, 0.04, 4.6, 4); const r = new THREE.Mesh(ropeG, M(0x333333)); r.position.set(sx, y - 0.9 + 0.2, z); r.rotation.z = sx > 0 ? -0.5 : 0.5; s.add(r); }
  // golden egg emblem on the banner corner
  const em = thunderEgg(1.2); em.position.set(0, y - 0.2, z + 0.6); em.scale.setScalar(1); s.add(em);
  // people in the square looking up (front people from the cast + blocky crowd behind)
  const spots = []; for (let i = 0; i < 70; i++) { const a = rnd(i) * 2 * P, r = 6 + rnd(i + 1) * 12; const x = Math.sin(a) * r, zz = Math.cos(a) * r - 4; if (zz > 6 || zz < -15) continue; spots.push([x, 0, zz, P + (rnd(i + 2) - 0.5) * 0.8, rnd(i + 3) < 0.4 ? 2 : 0, rnd(i + 4) < 0.25 ? 1 : 0]); }
  blockCrowd(s, spots, 11);
  return { banner: [0, y - 3.2, z], fountain: [0, -4],
    crowd: [['menina', -1.6, 3.2, P, ['lookUp', 'pointUp']], ['mulher', -2.3, 3.0, P * 0.97, ['lookUp', 'hold']], ['menino_bone', 2.2, 2.6, -P * 0.95, ['lookUp', 'cheer']], ['vovo', 3.6, 3.4, -P * 0.9, ['lookUp']], ['afro', 4.2, 3.0, -P * 0.88, ['lookUp', 'pointUp']], ['bia', -4.2, 1.6, P * 0.9, ['lookUp']], ['duda', -4.8, 1.9, P * 0.88, ['lookUp', 'pointUp']], ['bob', 0.6, 4.6, P, ['lookUp', 'wave']]],
    chickens: [[-3.2, 3.6, 2.6, 'fogo'], [3.0, 2.0, -2.6, 'raio']] };
}
