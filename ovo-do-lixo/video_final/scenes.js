// Scenarios for "O Ovo do Lixo" built from CC0 KayKit / Kenney pieces + procedural props.
// World units: the boy is 1.95 tall; KayKit pieces are scaled by K = 4 (a car becomes ~3.8 long).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const K = 4;
const cache = {};
async function kit(path) { if (!cache[path]) cache[path] = (await new GLTFLoader().loadAsync(path)).scene; return cache[path]; }
export async function put(s, path, x, z, ry = 0, sc = K, y = 0, tint = null) {
  const g = (await kit(path)).clone(true); g.scale.setScalar(sc); g.position.set(x, y, z); g.rotation.y = ry;
  g.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; if (tint) { o.material = o.material.clone(); o.material.color.multiplyScalar(tint); } } }); s.add(g); return g;
}
export const C = (p) => `assets/city/${p}.gltf`;
export const M = (c, r = 0.8, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra });
export const rnd = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

export function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

export function skyAndFog(s, top = '#2f8cf0', mid = '#8fcfff', low = '#e8f5ff', fog = 0xd8ecff, near = 30, far = 90) {
  s.background = canvasTex(2, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, top); gr.addColorStop(0.6, mid); gr.addColorStop(1, low); g.fillStyle = gr; g.fillRect(0, 0, 2, 256); });
  s.fog = new THREE.Fog(fog, near, far);
}
export function clouds(s, n = 10, y = 22, z = -60) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.3 });
  for (let i = 0; i < n; i++) { const c = new THREE.Group(); for (let j = 0; j < 4; j++) { const b = new THREE.Mesh(new THREE.SphereGeometry(2, 12, 8), m); b.scale.set(1.6 + j * 0.3, 0.8, 1); b.position.set(j * 3 - 4.5, (j % 2) * 0.7, 0); c.add(b); }
    c.position.set(-60 + i * 13 + rnd(i) * 5, y + rnd(i + 3) * 8, z - rnd(i + 7) * 15); s.add(c); }
}

// ---------- eggs ----------
export function eggGeo(r = 0.12) {
  // smooth chicken-egg profile: wide round bottom, narrower round top
  const pts = []; for (let i = 0; i <= 40; i++) { const a = Math.PI * i / 40; const y = -Math.cos(a), rr = Math.sin(a) * (1 + 0.16 * Math.cos(a)); pts.push(new THREE.Vector2(Math.max(rr, 1e-4) * r, (y + 1) * r * 1.32)); }
  const g = new THREE.LatheGeometry(pts, 40); g.computeVertexNormals(); return g;
}
export const EGG_LOOKS = {
  dourado: { color: 0xffc83a, metalness: 0.9, roughness: 0.2, emissive: 0x8a5a00, emissiveIntensity: 0.6 },
  roxo: { color: 0x8a3cff, metalness: 0.2, roughness: 0.25, emissive: 0x5a10d0, emissiveIntensity: 0.9 },
  fogo: { color: 0xff6a1a, roughness: 0.3, emissive: 0xff3a00, emissiveIntensity: 1.0 },
  gelo: { color: 0xbfeaff, roughness: 0.1, metalness: 0.1, emissive: 0x3aa0ff, emissiveIntensity: 0.5, transparent: true, opacity: 0.85 },
  raio: { color: 0xfff15a, roughness: 0.25, emissive: 0xffd000, emissiveIntensity: 0.9 },
  arcoiris: { color: 0xffffff, roughness: 0.3, emissive: 0xffffff, emissiveIntensity: 0.35 },
};
function rainbowTex() { return canvasTex(64, 256, (g, w, h) => { const cs = ['#ff3b3b', '#ff9a1a', '#ffe23a', '#3bd35a', '#3aa0ff', '#8a4bff']; cs.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * h / cs.length, w, h / cs.length + 1); }); }); }
function boltTex() { return canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#ffe94a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffffff'; g.lineWidth = 10; for (let k = 0; k < 3; k++) { g.beginPath(); let x = 30 + k * 90, y = 0; g.moveTo(x, y); while (y < h) { x += (Math.random() - 0.5) * 50; y += 30; g.lineTo(x, y); } g.stroke(); } }); }
export function makeEgg(kind, r = 0.12) {
  const o = { ...EGG_LOOKS[kind] }; if (kind === 'arcoiris') o.map = rainbowTex(); if (kind === 'raio') o.map = boltTex();
  const m = new THREE.Mesh(eggGeo(r), new THREE.MeshStandardMaterial(o)); m.castShadow = true; return m;
}
// the hero's egg: small, cracked, no colour at all
export function grayEgg(r = 0.075) {
  const crack = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#76756f'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '60,60,58' : '210,208,200'},${Math.random() * 0.22})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(90,88,84,0.35)'; g.beginPath(); g.ellipse(Math.random() * w, 40 + Math.random() * 180, 6 + Math.random() * 10, 4 + Math.random() * 6, 0, 0, 7); g.fill(); }
    // zigzag crack right round the egg, upper third
    const zig = () => { g.beginPath(); for (let x = -10, k = 0; x <= w + 10; x += 14 + ((k * 37) % 17), k++) g.lineTo(x, 92 + (k % 2 ? -1 : 1) * (6 + ((k * 53) % 13)) + Math.sin(k) * 8); g.stroke(); };
    g.lineJoin = 'miter'; g.strokeStyle = '#141312'; g.lineWidth = 7; zig(); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2; g.save(); g.translate(0, 6); zig(); g.restore();
    g.strokeStyle = '#141312'; g.lineWidth = 3; g.beginPath(); g.moveTo(120, 100); g.lineTo(132, 130); g.lineTo(124, 158); g.stroke(); g.beginPath(); g.moveTo(330, 84); g.lineTo(342, 60); g.stroke(); });
  const m = new THREE.Mesh(eggGeo(r), new THREE.MeshStandardMaterial({ map: crack, roughness: 0.85 })); m.castShadow = m.receiveShadow = true; m.name = 'grayEgg'; return m;
}

// ---------- props ----------
export function sign(text, sub, w = 5, h = 1.3) {
  const tex = canvasTex(1024, 270, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#5a2a8a'); gr.addColorStop(1, '#2a0f4a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#ffd34a'; g.lineWidth = 14; g.strokeRect(10, 10, W - 20, H - 20);
    g.font = 'bold 88px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#ffe27a'; g.shadowColor = '#ffb000'; g.shadowBlur = 25; g.fillText(text, W / 2, 140);
    g.shadowBlur = 0; g.font = 'bold 54px sans-serif'; g.fillStyle = '#ffffff'; g.fillText(sub, W / 2, 222);
    const egg = (x, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, 112, 22, 30, 0, 0, Math.PI * 2); g.fill(); }; egg(48, '#ffc83a'); egg(W - 48, '#a35cff');
  });
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, 0.18, 2, 0.05), [M(0x2a0f4a), M(0x2a0f4a), M(0x2a0f4a), M(0x2a0f4a), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.55, roughness: 0.5 }), M(0x2a0f4a)]);
  m.castShadow = true; return m;
}
function priceTag(txt) { const t = canvasTex(128, 64, (g) => { g.fillStyle = '#fff8e0'; g.fillRect(0, 0, 128, 64); g.fillStyle = '#c01818'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.fillText(txt, 64, 44); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.14), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 })); return m; }
// tiered display with eggs on velvet cushions under glass domes
function eggStand() {
  const g = new THREE.Group(); const wood = M(0x6b3d22, 0.6), velvet = M(0x8a1030, 0.9), glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false });
  const kinds = [['dourado', 'raio', 'roxo'], ['fogo', 'arcoiris', 'gelo']], prices = [['$9.999', '$7.500', '$8.200'], ['$6.900', '$12.000', '$6.500']];
  [[0, 0.85, 0.2], [1, 1.35, -0.25]].forEach(([row, y, z]) => {
    const step = new THREE.Mesh(new RoundedBoxGeometry(2.6, y, 0.55, 2, 0.04), wood); step.position.set(0, y / 2, z); step.castShadow = step.receiveShadow = true; g.add(step);
    kinds[row].forEach((k, i) => { const x = (i - 1) * 0.82;
      const cush = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.08, 20), velvet); cush.position.set(x, y + 0.04, z); g.add(cush);
      const egg = makeEgg(k, 0.12); egg.position.set(x, y + 0.08, z); g.add(egg);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), glass); dome.scale.y = 1.6; dome.position.set(x, y + 0.08, z); g.add(dome);
      const light = new THREE.PointLight(new THREE.Color(EGG_LOOKS[k].emissive || 0xffffff), 1.2, 1.4, 2); light.position.set(x, y + 0.35, z + 0.1); g.add(light);
      const tag = priceTag(prices[row][i]); tag.position.set(x, y - 0.12, z + 0.28); g.add(tag); });
  });
  return g;
}
export function trashBag(c = 0x22262b, sz = 0.45) { const m = new THREE.Mesh(new THREE.SphereGeometry(sz, 28, 20), M(c, 0.3, { metalness: 0.15 })); m.scale.set(1, 0.78, 0.92);
  const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + 0.06 * Math.sin(p.getX(i) * 11 / sz * 0.45 + p.getY(i) * 7) + 0.04 * Math.sin(p.getZ(i) * 17); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } m.geometry.computeVertexNormals();
  const knot = new THREE.Mesh(new THREE.ConeGeometry(sz * 0.22, sz * 0.5, 8), M(c, 0.35)); knot.position.y = sz * 0.85; m.add(knot); m.castShadow = m.receiveShadow = true; return m; }
function scraps(s, x0, z0, w, d, n, seed = 1) {
  const cols = [0xd8d2c0, 0x8a6a40, 0xb03030, 0x3a6a3a, 0xe0c040, 0x6a6a70];
  for (let i = 0; i < n; i++) { const a = rnd(i * 3 + seed), b = rnd(i * 7 + seed), t = rnd(i * 11 + seed);
    const m = t < 0.4 ? new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.16), M(cols[i % cols.length], 0.9, { side: THREE.DoubleSide }))
      : t < 0.7 ? new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 10), M(cols[(i + 2) % cols.length], 0.4, { metalness: 0.5 }))
      : new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 0), M(0xe8e4d8, 1));
    if (t < 0.4) m.rotation.x = -Math.PI / 2 + 0.2; else if (t < 0.7) { m.rotation.z = Math.PI / 2; m.rotation.y = a * 6; }
    m.position.set(x0 + a * w, t < 0.4 ? 0.012 : 0.05, z0 + b * d); m.rotation.z += a; m.receiveShadow = m.castShadow = true; s.add(m); }
}
export function puddle(s, x, z, r) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshStandardMaterial({ color: 0x4a5560, roughness: 0.05, metalness: 0.6 })); m.rotation.x = -Math.PI / 2; m.scale.y = 0.6; m.position.set(x, 0.006, z); s.add(m); }

// ================= STREET + EGG SHOP + ALLEY =================
// layout: road along x at z in [-4, 4]; front sidewalk z in [-12, -4] with the shop row facing +z at z = -12;
// the alley runs back (to -z) between the shop and its left neighbour.
export async function buildStreet(s) {
  skyAndFog(s); clouds(s); s.userData.exposure = 0.82; s.userData.env = 0.3;
  const anchors = {};
  // ground: road tiles + sidewalk slabs (tiles sunk so their top is y = 0)
  const TY = -0.1 * K;
  for (let x = -40; x <= 40; x += 2 * K) {
    await put(s, C(x === 0 ? 'road_straight_crossing' : 'road_straight'), x, 0, Math.PI / 2, K, TY);
    await put(s, C('base'), x, -2 * K, 0, K, TY, 0.72); await put(s, C('base'), x, 2 * K, 0, K, TY, 0.72);
    await put(s, C('base'), x, -4 * K, 0, K, TY, 0.72);
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), M(0x6d7278, 1)); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true; s.add(ground);
  // building row behind the front sidewalk (facing the street, +z). Shop = building_E (striped awning)
  const row = [['building_C_withoutBase', -26], ['building_G_withoutBase', -18], ['building_A_withoutBase', -10], ['building_E_withoutBase', 0], ['building_D_withoutBase', 10], ['building_H_withoutBase', 18], ['building_B_withoutBase', 26]];
  for (const [b, x] of row) { const g = await put(s, C(b), x + (x === 0 ? 0 : (x < 0 ? -1.2 : 1.2)), -13, 0, K, -0.4); if (b === 'building_E_withoutBase') anchors.shop = g; }
  // back row (far side of the street, seen in reverse shots) and a skyline for depth
  for (const [b, x] of [['building_F_withoutBase', -20], ['building_H_withoutBase', -10], ['building_B_withoutBase', 0], ['building_C_withoutBase', 10], ['building_G_withoutBase', 20]]) await put(s, C(b), x, 13, Math.PI, K, -0.4);
  for (let i = 0; i < 12; i++) { const b = ['building_C', 'building_D', 'building_G', 'building_H'][i % 4]; await put(s, C(b + '_withoutBase'), -44 + i * 8, -30 - (i % 3) * 4, 0, K * (1.1 + (i % 2) * 0.3), -0.5); }
  // egg shop: sign, display stand, warm light from the window, people looking
  const sg = sign('OVOS LENDÁRIOS', 'os mais brilhantes da cidade', 6.4, 1.6); sg.position.set(0, 5.05, -9.65); s.add(sg);
  const stand = eggStand(); stand.position.set(0, 0, -8.6); s.add(stand); anchors.stand = [0, -8.6];
  const shopLight = new THREE.PointLight(0xffd08a, 6, 9, 2); shopLight.position.set(0, 2.6, -8.2); s.add(shopLight);
  // street furniture along the front sidewalk
  for (const x of [-21, -7, 7, 21]) await put(s, C('streetlight'), x, -4.6, Math.PI, K, 0);
  for (const x of [-15, 13]) await put(s, C('bench'), x, -5.0, 0, K, 0);
  await put(s, C('firehydrant'), 5.2, -4.8, 0.3, K, 0);
  for (const x of [-12.5, -6.0, 5.8, 15.5]) await put(s, C('bush'), x, -6.2, 0, K, 0);
  await put(s, C('trafficlight_C'), 4.6, -4.4, Math.PI, K, 0);
  // cars
  await put(s, C('car_taxi'), -12, -2.2, Math.PI / 2, K, 0); await put(s, C('car_sedan'), 12, -2.2, Math.PI / 2, K, 0);
  await put(s, C('car_hatchback'), -6, 2.2, -Math.PI / 2, K, 0); await put(s, C('car_police'), 22, 2.2, -Math.PI / 2, K, 0);
  // the alley: between the shop (x ~ 0) and the building on its left (x ~ -11): back to z = -24
  const AX = -6.4; anchors.alley = [AX, -16];
  for (const wx of [AX - 2.4, AX + 2.4]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7, 8.6), M(0x8a6450, 0.95)); w.position.set(wx, 3.5, -19.9); w.castShadow = w.receiveShadow = true; s.add(w); }
  const wallM = M(0x7a5a48, 0.95);
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(5.2, 7, 0.4), wallM); backWall.position.set(AX, 3.5, -24); backWall.receiveShadow = true; s.add(backWall);
  for (let i = 0; i < 6; i++) { const brick = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.05), M(0x5e4033, 1)); brick.position.set(AX - 2 + rnd(i) * 4, 0.8 + rnd(i + 5) * 4, -23.78); s.add(brick); }
  const alleyFloor = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 14), M(0x55585c, 1)); alleyFloor.rotation.x = -Math.PI / 2; alleyFloor.position.set(AX, 0.004, -18); alleyFloor.receiveShadow = true; s.add(alleyFloor);
  await put(s, C('dumpster'), AX + 1.2, -21.5, 0.1, K, 0);
  await put(s, C('box_A'), AX - 1.6, -22.6, 0.4, K, 0); await put(s, C('box_B'), AX - 1.1, -21.4, 1.1, K, 0); await put(s, C('box_A'), AX - 1.7, -22.5, 0.9, K * 0.8, 0.8);
  const bags = [[AX - 0.2, -20.2, 0.5, 0x23272c], [AX + 0.5, -19.6, 0.42, 0x2d3a2a], [AX - 0.9, -19.9, 0.38, 0x23272c], [AX + 0.1, -19.0, 0.33, 0x3a3f46]];
  for (const [x, z, sz, c] of bags) { const b = trashBag(c, sz); b.position.set(x, sz * 0.72, z); b.rotation.y = x * 3; s.add(b); }
  await put(s, C('trash_A'), AX + 1.5, -19.4, 0.5, K, 0); await put(s, C('trash_B'), AX - 1.6, -19.2, 0, K, 0);
  scraps(s, AX - 2.2, -23, 4.4, 8, 26, 3); puddle(s, AX + 0.8, -17.2, 0.7);
  const egg = grayEgg(0.1); egg.position.set(AX - 0.35, 0.0, -18.35); egg.rotation.set(0, 0.5, 0.1); s.add(egg);
  const eggL = new THREE.PointLight(0xfff0d0, 1.2, 2.2, 2); eggL.position.set(AX - 0.1, 0.9, -17.6); s.add(eggL); anchors.egg = egg.position.toArray();
  const alleyLamp = new THREE.PointLight(0xffe0b0, 2.5, 7, 2); alleyLamp.position.set(AX + 1.5, 4.2, -21); s.add(alleyLamp);
  const lampBox = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.3), M(0x333333, 0.5, { emissive: 0xffe0b0, emissiveIntensity: 0.6 })); lampBox.position.set(AX + 1.5, 4.4, -23.7); s.add(lampBox);
  // who is here and why (eggs shop street): buyers at the window, kids who already have a chicken, people passing by
  const P = Math.PI;
  anchors.crowd = [
    ['armando', 0.9, -9.45, 0, 'hands'],               // vendedor atrás da vitrine
    ['menina', -1.2, -7.4, P * 0.97, 'point'],                // menina aponta o ovo dourado...
    ['mulher', -0.4, -7.6, P * 1.03, 'holdR'],          // ...com a mãe do lado
    ['bia', 1.15, -7.4, P * 1.02, null],                 // as irmãs olhando a vitrine
    ['duda', 1.75, -7.2, -P * 0.9, 'point'],
    ['menino_bone', -2.6, -6.6, P * 0.8, 'cheer'],       // menino com a galinha de raio, se exibindo
    ['vovo', -3.6, -6.9, P * 0.7, 'holdR'],              // vovô com o neto e a galinha de fogo
    ['afro', -4.3, -6.5, P * 0.6, 'point'],
    ['leo', 3.0, -6.6, -P * 0.75, 'shrug'],              // menino que não tem dinheiro pro ovo
    ['bob', 4.0, -6.9, -P * 0.7, null],
    ['rita', -9.5, -6.3, P / 2, 'walk'],                 // passando pela calçada
    ['lia', 7.8, -6.4, -P / 2, 'walk'],
    ['irma_loira', 9.6, -6.9, -P * 0.65, 'wave'],
  ];
  anchors.chickens = [[-2.95, -6.0, 2.6, 'raio'], [-4.8, -5.9, 2.2, 'fogo'], [3.5, -6.1, -2.4, 'gelo'], [9.0, -6.3, -0.8, 'comum']];
  return anchors;
}
