import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ---------- helpers ----------
const matCache = {};
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache[key]) matCache[key] = new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...opts });
  return matCache[key];
}
export function rbox(w, h, d, color, r = 0.06, opts) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.01, h / 2.01, d / 2.01)), color.isMaterial ? color : mat(color, opts));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function at(obj, x, y, z, rx = 0, ry = 0, rz = 0) { obj.position.set(x, y, z); obj.rotation.set(rx, ry, rz); return obj; }

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function decal(w, h, tex, emissive = false) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6, depthWrite: false,
      ...(emissive ? { emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1 } : {}) }));
  m.renderOrder = 2;
  return m;
}

// ---------- faces (drawn on 512x512, plane covers front of head) ----------
function eye(g, x, y, rx, ry, iris, look = 0) {
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill();
  g.lineWidth = 7; g.strokeStyle = '#1a1a1a'; g.stroke();
  g.fillStyle = iris; g.beginPath(); g.ellipse(x + look, y + 6, rx * 0.68, ry * 0.72, 0, 0, 7); g.fill();
  g.fillStyle = '#111'; g.beginPath(); g.ellipse(x + look, y + 8, rx * 0.36, ry * 0.4, 0, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x + look - rx * 0.28, y - ry * 0.18, rx * 0.2, ry * 0.18, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(x + look + rx * 0.22, y + ry * 0.3, rx * 0.09, ry * 0.08, 0, 0, 7); g.fill();
}
function brow(g, x1, y1, x2, y2, w = 16) {
  g.strokeStyle = '#2a1a10'; g.lineWidth = w; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
}
const FACES = {
  menino: (g) => {
    eye(g, 175, 250, 52, 62, '#5a3a1e', 4); eye(g, 337, 250, 52, 62, '#5a3a1e', 4);
    brow(g, 125, 170, 220, 160); brow(g, 292, 160, 387, 170);
    // smile, determined
    g.strokeStyle = '#3a1a10'; g.lineWidth = 12; g.lineCap = 'round';
    g.beginPath(); g.moveTo(205, 380); g.quadraticCurveTo(256, 420, 312, 375); g.stroke();
    // cheeks
    g.fillStyle = 'rgba(255,120,110,0.35)';
    g.beginPath(); g.ellipse(115, 345, 34, 20, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(397, 345, 34, 20, 0, 0, 7); g.fill();
    // band-aid on cheek
    g.save(); g.translate(395, 330); g.rotate(-0.5);
    g.fillStyle = '#f2c08a'; g.strokeStyle = '#b07a48'; g.lineWidth = 4;
    g.fillRect(-42, -15, 84, 30); g.strokeRect(-42, -15, 84, 30);
    g.fillStyle = '#e8a870'; g.fillRect(-14, -12, 28, 24);
    g.restore();
  },
  kaio: (g) => {
    // half-lidded smug eyes
    for (const x of [175, 337]) {
      eye(g, x, 255, 50, 54, '#3d8fd6', -6);
      g.fillStyle = '#e9b48c'; g.fillRect(x - 60, 190, 120, 50); // eyelid
      g.strokeStyle = '#1a1a1a'; g.lineWidth = 8; g.beginPath(); g.moveTo(x - 52, 240); g.lineTo(x + 52, 240); g.stroke();
    }
    brow(g, 120, 175, 225, 190); brow(g, 290, 172, 392, 150); // one raised
    // smirk
    g.strokeStyle = '#3a1a10'; g.lineWidth = 12; g.lineCap = 'round';
    g.beginPath(); g.moveTo(210, 390); g.quadraticCurveTo(280, 400, 320, 360); g.stroke();
  },
};
function faceTex(name) { return canvasTex(512, 512, (g) => FACES[name](g)); }

function chickenEye(g, x, y, mode, color, flip) {
  if (mode === 'sleep') {
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 12; g.lineCap = 'round';
    g.beginPath(); g.arc(x, y - 10, 34, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  } else if (mode === 'glow') {
    g.fillStyle = '#111'; g.beginPath(); g.ellipse(x, y, 50, 56, 0, 0, 7); g.fill();
    g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 40;
    g.beginPath(); g.ellipse(x, y, 40, 46, 0, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, y, 16, 20, 0, 0, 7); g.fill(); g.shadowBlur = 0;
    // angry lid
    g.fillStyle = '#000'; g.beginPath();
    if (flip) { g.moveTo(x - 60, y - 70); g.lineTo(x + 50, y - 20); g.lineTo(x + 60, y - 70); }
    else { g.moveTo(x + 60, y - 70); g.lineTo(x - 50, y - 20); g.lineTo(x - 60, y - 70); }
    g.fill();
  }
}
function chickenFaceTex(mode, color = '#c040ff', crack = false) {
  return canvasTex(512, 512, (g) => {
    chickenEye(g, 150, 215, mode, color, false);
    chickenEye(g, 362, 215, mode, color, true);
    if (mode === 'sleep') {
      g.fillStyle = 'rgba(255,130,140,0.45)';
      g.beginPath(); g.ellipse(95, 300, 40, 24, 0, 0, 7); g.fill();
      g.beginPath(); g.ellipse(417, 300, 40, 24, 0, 0, 7); g.fill();
    }
    if (crack) {
      const glow = mode === 'glow';
      g.strokeStyle = glow ? '#ffe14a' : '#4a4a4a'; g.lineWidth = glow ? 16 : 10; g.lineJoin = 'round';
      if (glow) { g.shadowColor = '#ffd000'; g.shadowBlur = 30; }
      g.beginPath(); g.moveTo(230, 30); g.lineTo(265, 75); g.lineTo(240, 115); g.lineTo(275, 140); g.stroke();
      g.shadowBlur = 0;
    }
  });
}

// ---------- humanoid ----------
function humanoid(o) {
  const root = new THREE.Group(); root.name = o.name;
  const body = new THREE.Group(); root.add(body);
  const S = o.scale || 1;
  const legH = 1.0, torsoH = 1.05, torsoW = 1.05, torsoD = 0.55, armW = 0.44, headS = 0.95;

  // legs (pivot at hip)
  const legs = [];
  for (const side of [-1, 1]) {
    const hip = at(new THREE.Group(), side * 0.26, legH, 0);
    const leg = at(rbox(0.5, legH - 0.18, 0.52, o.pants, 0.06), 0, -(legH - 0.18) / 2, 0);
    const shoe = at(rbox(0.54, 0.22, 0.64, o.shoe, 0.07), 0, -legH + 0.11, 0.05);
    const sole = at(rbox(0.55, 0.06, 0.65, o.sole || 0xffffff, 0.02), 0, -legH + 0.03, 0.05);
    hip.add(leg, shoe, sole);
    if (o.shoeStripe) hip.add(at(rbox(0.56, 0.06, 0.4, o.shoeStripe, 0.02), 0, -legH + 0.15, 0.05));
    if (o.cuff) hip.add(at(rbox(0.53, 0.1, 0.55, o.cuff, 0.03), 0, -legH + 0.27, 0));
    body.add(hip); legs.push(hip);
  }
  // torso
  const torso = at(rbox(torsoW, torsoH, torsoD, o.shirt, 0.08), 0, legH + torsoH / 2, 0);
  body.add(torso);
  if (o.belt) body.add(at(rbox(torsoW + 0.02, 0.12, torsoD + 0.02, o.belt, 0.03), 0, legH + 0.06, 0));
  // arms (pivot at shoulder)
  const arms = [];
  for (const side of [-1, 1]) {
    const sh = at(new THREE.Group(), side * (torsoW / 2 + armW / 2 + 0.01), legH + torsoH - 0.12, 0);
    const sleeveLen = o.longSleeve ? 0.82 : 0.42;
    sh.add(at(rbox(armW + 0.03, sleeveLen, torsoD - 0.04, o.sleeve || o.shirt, 0.07), 0, -sleeveLen / 2 + 0.12, 0));
    const skinLen = 0.95 - sleeveLen;
    sh.add(at(rbox(armW, skinLen, torsoD - 0.1, o.skin, 0.07), 0, -sleeveLen - skinLen / 2 + 0.12, 0));
    if (o.wristband && side === 1) sh.add(at(rbox(armW + 0.04, 0.1, torsoD - 0.06, o.wristband, 0.03), 0, -0.55, 0));
    body.add(sh); arms.push(sh);
  }
  // neck + head
  body.add(at(rbox(0.38, 0.12, 0.3, o.skin, 0.04), 0, legH + torsoH + 0.05, 0));
  const head = at(new THREE.Group(), 0, legH + torsoH + 0.1 + headS / 2, 0);
  head.add(rbox(headS, headS, headS * 0.92, o.skin, 0.16));
  const face = at(decal(headS * 0.86, headS * 0.86, faceTex(o.face)), 0, -0.02, headS * 0.46 + 0.006);
  head.add(face);
  // ears
  for (const s of [-1, 1]) head.add(at(rbox(0.08, 0.2, 0.14, o.skin, 0.03), s * (headS / 2 + 0.02), -0.02, 0));
  body.add(head);
  o.hair(head, headS);
  if (o.extras) o.extras({ body, torso, head, arms, legs, legH, torsoH, torsoW, torsoD });
  root.scale.setScalar(S);
  root.userData = { head, arms, legs, body, torso };
  return root;
}

// ---------- the boy (narrator) ----------
export function makeMenino() {
  const HAIR = 0x4a2c1a, HAIR2 = 0x5c3822;
  return humanoid({
    name: 'menino', face: 'menino', skin: 0xf2c79e,
    shirt: 0x3fa34d, sleeve: 0x3fa34d, pants: 0x3d63a8, cuff: 0x5579bd,
    shoe: 0xffffff, shoeStripe: 0xe03a3a, sole: 0xdedede, wristband: 0xffc93a,
    hair(head, s) {
      const top = s / 2;
      head.add(at(rbox(s + 0.06, 0.2, s * 0.96, HAIR, 0.07), 0, top + 0.02, -0.01));
      head.add(at(rbox(s + 0.06, s * 0.55, 0.16, HAIR, 0.06), 0, top - s * 0.25, -s * 0.46));
      for (const sd of [-1, 1]) head.add(at(rbox(0.12, s * 0.42, s * 0.8, HAIR, 0.05), sd * (s / 2 + 0.03), top - 0.18, -0.06));
      // messy tufts
      const tufts = [[-0.3, 0.2, 0.25, 0.4, 0.3], [-0.05, 0.25, 0.3, -0.2, 0.1], [0.25, 0.2, 0.22, 0.5, -0.4],
        [-0.18, 0.18, -0.15, -0.5, 0.3], [0.15, 0.22, -0.2, 0.3, -0.2], [0.0, 0.18, 0.0, 0.1, 0.6]];
      tufts.forEach(([x, y, z, rx, rz], i) => head.add(at(rbox(0.26, 0.32, 0.26, i % 2 ? HAIR : HAIR2, 0.06), x, top + y, z, rx, 0, rz)));
      // fringe falling on forehead (above eyes)
      for (const [x, rz] of [[-0.28, 0.35], [-0.06, -0.15], [0.2, 0.3]]) head.add(at(rbox(0.24, 0.22, 0.12, HAIR, 0.05), x, top - 0.05, s * 0.44, 0.2, 0, rz));
    },
    extras({ torso, torsoD }) {
      // egg logo on shirt: cracked gray egg
      const tex = canvasTex(256, 256, (g) => {
        g.fillStyle = '#d9d9d9'; g.strokeStyle = '#1e1e1e'; g.lineWidth = 10;
        g.beginPath(); g.ellipse(128, 136, 70, 92, 0, 0, 7); g.fill(); g.stroke();
        g.lineWidth = 8; g.beginPath(); g.moveTo(80, 120); g.lineTo(105, 140); g.lineTo(125, 112); g.lineTo(150, 142); g.lineTo(178, 118); g.stroke();
      });
      torso.add(at(decal(0.42, 0.42, tex), 0, 0.05, torsoD / 2 + 0.006));
      // backpack straps
      for (const s of [-1, 1]) torso.add(at(rbox(0.1, 1.0, 0.04, 0x2b2b2b, 0.02), s * 0.3, 0.02, torsoD / 2 + 0.01));
      const pack = at(rbox(0.8, 0.85, 0.32, 0xf28c28, 0.1), 0, 0.0, -torsoD / 2 - 0.15);
      pack.add(at(rbox(0.6, 0.35, 0.1, 0xd9731a, 0.05), 0, -0.17, -0.18));
      torso.add(pack);
    },
  });
}

// ---------- the rival ----------
export function makeKaio() {
  const HAIR = 0xf3cf4f, HAIR2 = 0xe5b832;
  const k = humanoid({
    name: 'kaio', face: 'kaio', skin: 0xe9b48c, scale: 1.08,
    shirt: 0x5b2a86, sleeve: 0x5b2a86, longSleeve: true, pants: 0x1f1f28, shoe: 0x151515, shoeStripe: 0xb04dff, sole: 0xffffff, belt: 0x111111,
    hair(head, s) {
      const top = s / 2;
      head.add(at(rbox(s + 0.05, 0.16, s * 0.95, HAIR, 0.06), 0, top + 0.02, -0.02));
      head.add(at(rbox(s + 0.05, s * 0.5, 0.14, HAIR, 0.05), 0, top - s * 0.24, -s * 0.46));
      for (const sd of [-1, 1]) head.add(at(rbox(0.1, s * 0.3, s * 0.75, HAIR2, 0.04), sd * (s / 2 + 0.03), top - 0.12, -0.08));
      // big swept quiff
      head.add(at(rbox(s * 0.9, 0.3, 0.55, HAIR, 0.12), 0.02, top + 0.2, 0.15, -0.5, 0, 0.08));
      head.add(at(rbox(s * 0.75, 0.26, 0.45, HAIR2, 0.1), 0.06, top + 0.32, 0.32, -0.8, 0, 0.12));
      // sunglasses resting on hair
      const gl = new THREE.Group();
      for (const sd of [-1, 1]) gl.add(at(rbox(0.32, 0.16, 0.06, 0x111111, 0.04, { roughness: 0.2, metalness: 0.4 }), sd * 0.2, 0, 0));
      gl.add(at(rbox(0.1, 0.04, 0.04, 0x222222, 0.01), 0, 0.03, 0));
      head.add(at(gl, 0, top + 0.08, s * 0.47, -0.25));
    },
    extras({ torso, torsoD, torsoW, torsoH }) {
      // jacket: open zip, white tee inside, purple chicken emblem
      torso.add(at(rbox(0.4, torsoH - 0.06, 0.04, 0xf2f2f2, 0.02), 0, 0, torsoD / 2 + 0.005));
      torso.add(at(rbox(0.04, torsoH - 0.06, 0.05, 0xcfcfcf, 0.01), -0.22, 0, torsoD / 2 + 0.01));
      torso.add(at(rbox(0.04, torsoH - 0.06, 0.05, 0xcfcfcf, 0.01), 0.22, 0, torsoD / 2 + 0.01));
      torso.add(at(rbox(torsoW + 0.06, 0.16, torsoD + 0.06, 0x3d1b5c, 0.05), 0, torsoH / 2 - 0.05, 0)); // collar
      const tex = canvasTex(256, 256, (g) => {
        g.fillStyle = '#c040ff'; g.beginPath(); g.arc(128, 128, 110, 0, 7); g.fill();
        g.fillStyle = '#1a0a26'; g.font = 'bold 150px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('K', 128, 138);
      });
      torso.add(at(decal(0.3, 0.3, tex), 0, -0.1, torsoD / 2 + 0.02));
      // gold chain
      torso.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 8, 24, Math.PI), mat(0xffcc33, { metalness: 0.8, roughness: 0.25 })), 0, torsoH / 2 - 0.06, torsoD / 2 + 0.03, 0, 0, Math.PI));
    },
  });
  return k;
}

// ---------- chickens ----------
function chicken(o) {
  const root = new THREE.Group(); root.name = o.name;
  const S = o.size;
  const bodyG = new THREE.Group(); root.add(bodyG);
  const legH = 0.35 * S;
  for (const s of [-1, 1]) {
    const leg = at(new THREE.Group(), s * 0.2 * S, legH, 0);
    leg.add(at(rbox(0.1 * S, legH, 0.1 * S, o.legs, 0.02 * S), 0, -legH / 2, 0));
    for (const a of [-0.45, 0, 0.45]) leg.add(at(rbox(0.07 * S, 0.05 * S, 0.24 * S, o.legs, 0.015 * S), Math.sin(a) * 0.09 * S, -legH + 0.025 * S, 0.08 * S, 0, a, 0));
    bodyG.add(leg);
  }
  const bw = 0.9 * S, bh = 0.85 * S, bd = 0.95 * S;
  const body = at(rbox(bw, bh, bd, o.color, 0.2 * S, o.matOpts), 0, legH + bh / 2, -0.05 * S);
  bodyG.add(body);
  // chest fluff
  bodyG.add(at(rbox(bw * 0.7, bh * 0.55, 0.1 * S, o.color2 || o.color, 0.05 * S, o.matOpts), 0, legH + bh * 0.42, bd / 2 - 0.035 * S));
  // wings
  const wings = [];
  for (const s of [-1, 1]) {
    const w = at(new THREE.Group(), s * (bw / 2 + 0.02 * S), legH + bh * 0.72, -0.08 * S, -0.25, 0, s * 0.06);
    w.add(at(rbox(0.09 * S, bh * 0.42, bd * 0.6, o.wing || o.color, 0.04 * S, o.matOpts), 0, -bh * 0.2, 0));
    w.add(at(rbox(0.08 * S, bh * 0.16, bd * 0.32, o.wingTip || o.wing || o.color, 0.03 * S, o.matOpts), 0, -bh * 0.36, -bd * 0.26));
    bodyG.add(w); wings.push(w);
  }
  // tail
  for (const [y, rx, l] of [[0.35, -0.6, 0.5], [0.15, -0.9, 0.45], [0.5, -0.35, 0.38]])
    bodyG.add(at(rbox(0.3 * S, l * S, 0.14 * S, o.tail || o.color, 0.05 * S, o.matOpts), 0, legH + bh * 0.6 + y * S * 0.4, -bd / 2 - 0.08 * S, rx));
  // head
  const hs = 0.7 * S;
  const head = at(new THREE.Group(), 0, legH + bh + hs * 0.32, bd * 0.2);
  head.add(rbox(hs, hs, hs, o.color, 0.14 * S, o.matOpts));
  head.add(at(decal(hs * 0.98, hs * 0.98, o.faceTex, o.faceGlow), 0, 0.02 * S, hs / 2 + 0.006));
  // beak
  head.add(at(rbox(0.24 * S, 0.1 * S, 0.22 * S, 0xf5b52a, 0.03 * S), 0, -0.06 * S, hs / 2 + 0.07 * S));
  head.add(at(rbox(0.2 * S, 0.07 * S, 0.17 * S, 0xe08a1a, 0.025 * S), 0, -0.135 * S, hs / 2 + 0.05 * S));
  // wattle
  head.add(at(rbox(0.12 * S, 0.16 * S, 0.08 * S, 0xe0353a, 0.04 * S), 0, -0.25 * S, hs / 2 + 0.02 * S));
  // comb
  const cs = o.comb || 1;
  [[-0.1, 0.08, 0.14], [0.02, 0.14, 0.2], [0.13, 0.1, 0.15]].forEach(([z, y, h]) =>
    head.add(at(rbox(0.1 * S * cs, h * S * cs, 0.14 * S * cs, 0xe0353a, 0.04 * S), 0, hs / 2 + y * S * cs * 0.6, z * S * cs)));
  bodyG.add(head);
  if (o.extras) o.extras({ root, bodyG, head, body, wings, S, hs, legH, bh, bd, bw });
  root.userData = { head, wings, body: bodyG };
  return root;
}

export function makePenosa() {
  const p = chicken({
    name: 'penosa', size: 0.55, color: 0x9a9a9a, color2: 0xb3b3b3, wing: 0x878787, wingTip: 0x707070, tail: 0x7c7c7c, legs: 0xd9a24a,
    faceTex: chickenFaceTex('sleep', null, true), comb: 0.7,
    extras({ head, hs, S, root }) {
      // Zzz
      const tex = canvasTex(256, 256, (g) => {
        g.fillStyle = '#ffffff'; g.strokeStyle = '#2a3a6a'; g.lineWidth = 10; g.font = 'bold 90px Arial Black, Arial';
        for (const [t, x, y, s] of [['z', 40, 220, 70], ['z', 110, 150, 95], ['Z', 170, 80, 120]]) { g.font = `bold ${s}px Arial`; g.strokeText(t, x, y); g.fillText(t, x, y); }
      });
      const z = at(decal(0.6, 0.6, tex), 0.35, hs + 0.25, 0.1); z.name = 'zzz'; head.add(z);
      // bubble
      const bub = at(new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.6, roughness: 0.1 })), 0.16 * S, -0.02 * S, hs / 2 + 0.06);
      head.add(bub);
      // gray dust specks / scuff
      head.add(at(rbox(0.1 * S, 0.06 * S, 0.02, 0x6b6b6b, 0.01), -0.2 * S, -0.18 * S, hs / 2 + 0.005));
    },
  });
  return p;
}

export function makePenosaDesperta() {
  const gold = { emissive: 0xffb000, emissiveIntensity: 0.0 };
  return chicken({
    name: 'penosaDesperta', size: 0.75, color: 0xfafafa, color2: 0xffffff, wing: 0xf3f3f3, wingTip: 0xffd23a, tail: 0xffd23a, legs: 0xffc23a,
    faceTex: chickenFaceTex('glow', '#ffcc00', true), faceGlow: true, comb: 0.9,
    extras({ bodyG, body, wings, S, hs, legH, bh, bd, bw }) {
      const goldMat = mat(0xffd21a, { emissive: 0xffaa00, emissiveIntensity: 0.9 });
      // lightning stripes on body sides
      for (const s of [-1, 1]) {
        const g = new THREE.Group();
        [[0, 0.1, 0.5], [0.12, -0.05, -0.6], [0, -0.2, 0.5]].forEach(([z, y, r]) => g.add(at(rbox(0.03, 0.08 * S, 0.3 * S, goldMat, 0.01), 0, y * S, z * S, r)));
        bodyG.add(at(g, s * (bw / 2 + 0.12 * S), legH + bh * 0.4, 0.05 * S));
      }
      // aura bolts around
      const bolts = new THREE.Group(); bolts.name = 'aura';
      for (let i = 0; i < 8; i++) {
        const a = Math.PI * (0.05 + 0.9 * i / 7) * -1, r = 1.0 * S + (i % 2) * 0.12 * S; // half ring behind
        const b = new THREE.Group();
        b.add(at(rbox(0.035, 0.22 * S, 0.035, goldMat, 0.01), 0, 0, 0, 0, 0, 0.5));
        b.add(at(rbox(0.035, 0.16 * S, 0.035, goldMat, 0.01), 0.02 * S, -0.16 * S, 0, 0, 0, -0.6));
        b.add(at(rbox(0.035, 0.18 * S, 0.035, goldMat, 0.01), 0.0, -0.3 * S, 0, 0, 0, 0.5));
        bolts.add(at(b, Math.cos(a) * r, legH + bh * (0.4 + (i % 3) * 0.4), Math.sin(a) * r * 0.8));
      }
      bodyG.add(bolts);
      const light = new THREE.PointLight(0xffc040, 6, 4 * S); light.position.set(0, legH + bh, 0.6 * S); bodyG.add(light);
    },
  });
}

export function makeSombra() {
  const purple = 0x5a2a86;
  return chicken({
    name: 'sombra', size: 1.9, color: purple, color2: 0x6e3aa0, wing: 0x3f1a5e, wingTip: 0x9b3dff, tail: 0x8a2be2, legs: 0x5a4a2a,
    faceTex: chickenFaceTex('glow', '#d050ff'), faceGlow: true, comb: 1.15,
    extras({ bodyG, S, legH, bh, bw, bd }) {
      const glowMat = mat(0xb24dff, { emissive: 0xa020ff, emissiveIntensity: 1.2 });
      // glowing seams on wings / body
      for (const s of [-1, 1]) {
        bodyG.add(at(rbox(0.03, 0.05 * S, bd * 0.6, glowMat, 0.01), s * (bw / 2 + 0.11 * S), legH + bh * 0.42, -0.05 * S));
        bodyG.add(at(rbox(0.03, 0.05 * S, bd * 0.45, glowMat, 0.01), s * (bw / 2 + 0.11 * S), legH + bh * 0.3, -0.1 * S));
      }
      // floating purple cubes
      const cubes = new THREE.Group(); cubes.name = 'aura';
      for (let i = 0; i < 14; i++) {
        const a = i * 2.39, r = 0.8 * S + (i % 3) * 0.12 * S;
        const c = rbox(0.08 * S * (0.6 + (i % 3) * 0.3), 0.08 * S * (0.6 + (i % 3) * 0.3), 0.08 * S * (0.6 + (i % 3) * 0.3), glowMat, 0.01);
        cubes.add(at(c, Math.cos(a) * r, legH + (i / 14) * bh * 1.5, Math.sin(a) * r * 0.7, i, i * 0.5, 0));
      }
      bodyG.add(cubes);
      const light = new THREE.PointLight(0xb040ff, 3, 1.6 * S); light.position.set(0, legH + bh * 1.3, 0.9 * S); bodyG.add(light);
    },
  });
}

export const BUILDERS = { menino: makeMenino, kaio: makeKaio, penosa: makePenosa, penosaDesperta: makePenosaDesperta, sombra: makeSombra };
