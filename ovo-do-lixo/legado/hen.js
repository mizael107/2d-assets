// Sculpted cartoon hen (procedural). Round body, relief feathers, big eyes with red rim.
import * as THREE from 'three';

// ---------- feather textures (color + bump) ----------
function featherMaps(o) {
  const N = 1024;
  const col = document.createElement('canvas'); col.width = col.height = N;
  const bmp = document.createElement('canvas'); bmp.width = bmp.height = N;
  const c = col.getContext('2d'), b = bmp.getContext('2d');
  c.fillStyle = o.base; c.fillRect(0, 0, N, N);
  b.fillStyle = '#606060'; b.fillRect(0, 0, N, N);
  const cols = o.cols || 14, rows = o.rows || 12;
  const fw = N / cols, fh = N / rows;
  let seed = o.seed || 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let r = rows; r >= -1; r--) {
    for (let k = -1; k <= cols; k++) {
      const x = (k + (r % 2 ? 0.5 : 0)) * fw + (rnd() - 0.5) * fw * 0.35;
      const y = r * fh + (rnd() - 0.5) * fh * 0.3;
      const w = fw * (0.58 + rnd() * 0.12), h = fh * (1.15 + rnd() * 0.25);
      // vertical position in texture decides tone (v=0 top of body) -> chest lighter
      const t = Math.min(1, Math.max(0, y / N));
      const shape = (g) => {
        g.beginPath(); g.moveTo(x - w, y);
        g.bezierCurveTo(x - w, y + h * 0.9, x + w, y + h * 0.9, x + w, y);
        g.lineTo(x + w * 0.8, y - h * 0.3); g.lineTo(x - w * 0.8, y - h * 0.3); g.closePath();
      };
      // color: soft gradient center->edge
      const gr = c.createRadialGradient(x, y + h * 0.25, 2, x, y + h * 0.3, w * 1.1);
      gr.addColorStop(0, o.light); gr.addColorStop(0.75, o.mid); gr.addColorStop(1, o.edge);
      shape(c); c.fillStyle = gr; c.fill();
      // markings: dark chevron / lace (fewer on chest)
      if (o.mark && rnd() > (o.markChestFade ? t * 0.9 : 0.15)) {
        c.save(); c.filter = `blur(${fw * 0.03}px)`; c.globalAlpha = 0.55 + rnd() * 0.35;
        c.strokeStyle = o.mark; c.lineWidth = fw * (0.06 + rnd() * 0.05); c.lineCap = 'round';
        c.beginPath(); c.moveTo(x - w * 0.7, y + h * 0.2); c.bezierCurveTo(x - w * 0.55, y + h * 0.62, x + w * 0.55, y + h * 0.62, x + w * 0.7, y + h * 0.2); c.stroke();
        c.restore();
      }
      if (o.tip) { // glowing / colored tip band
        c.save(); c.filter = `blur(${fw * 0.025}px)`; c.globalAlpha = 0.8; c.strokeStyle = o.tip; c.lineWidth = fw * 0.06;
        c.beginPath(); c.moveTo(x - w * 0.92, y + h * 0.05); c.bezierCurveTo(x - w * 0.9, y + h * 0.85, x + w * 0.9, y + h * 0.85, x + w * 0.92, y + h * 0.05); c.stroke(); c.restore();
      }
      // bump: raised center, deep edge
      const gb = b.createRadialGradient(x, y + h * 0.2, 2, x, y + h * 0.25, w * 1.05);
      gb.addColorStop(0, '#ffffff'); gb.addColorStop(0.6, '#c8c8c8'); gb.addColorStop(1, '#5a5a5a');
      shape(b); b.fillStyle = gb; b.fill();
      b.strokeStyle = 'rgba(255,255,255,0.18)'; b.lineWidth = 3;
      for (let i = -3; i <= 3; i++) { b.beginPath(); b.moveTo(x, y - h * 0.1); b.lineTo(x + i * w * 0.22, y + h * 0.55); b.stroke(); } // barbs
    }
  }
  const mk = (cv, srgb) => { const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  return { map: mk(col, true), bump: mk(bmp, false) };
}

function featherMat(o, repeat = [1, 1]) {
  const { map, bump } = featherMaps(o);
  map.repeat.set(...repeat); bump.repeat.set(...repeat);
  return new THREE.MeshPhysicalMaterial({
    map, bumpMap: bump, bumpScale: o.bumpScale ?? 1.8, roughness: 0.85,
    sheen: 0.6, sheenRoughness: 0.6, sheenColor: new THREE.Color(o.sheen || '#ffffff'),
    emissive: o.emissive ? new THREE.Color(o.emissive) : new THREE.Color(0), emissiveMap: o.emissive ? map : null,
    emissiveIntensity: o.emissiveIntensity || 0,
  });
}
const smooth = (color, rough = 0.55, extra = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: rough, clearcoat: 0.2, clearcoatRoughness: 0.5, ...extra });

function mesh(geo, m, cast = true) { const x = new THREE.Mesh(geo, m); x.castShadow = cast; x.receiveShadow = true; return x; }
function at(o, x, y, z, rx = 0, ry = 0, rz = 0, s) { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); if (s) Array.isArray(s) ? o.scale.set(...s) : o.scale.setScalar(s); return o; }

// deformed sphere
function blob(rx, ry, rz, deform, seg = [96, 64]) {
  const g = new THREE.SphereGeometry(1, seg[0], seg[1]);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    if (deform) deform(v);
    p.setXYZ(i, v.x * rx, v.y * ry, v.z * rz);
  }
  g.computeVertexNormals(); return g;
}

// single long feather (for wings / tail): flattened, tapered ellipsoid
function featherGeo(len, wid) {
  return blob(wid, len, wid * 0.22, (v) => { // taper toward tip (y+), round base
    const t = (v.y + 1) / 2; v.x *= 1 - 0.35 * t * t; v.z *= 1 - 0.3 * t;
  }, [32, 24]);
}

// ---------- eye ----------
function makeEye(o, side) {
  const g = new THREE.Group();
  const R = 0.15;
  g.add(mesh(new THREE.SphereGeometry(R, 32, 24), smooth(0xffffff, 0.15, { clearcoat: 1, clearcoatRoughness: 0.05 })));
  // red rim (like reference)
  const rim = mesh(new THREE.SphereGeometry(R * 1.1, 32, 24), smooth(o.rim || 0xd8352a, 0.5));
  rim.position.z = -R * 0.3; g.add(rim);
  if (o.eyeMode === 'sleep') {
    const lid = mesh(new THREE.SphereGeometry(R * 1.06, 32, 24), o.lidMat);
    g.add(lid);
    const lash = mesh(new THREE.TorusGeometry(R * 0.85, R * 0.07, 8, 24, Math.PI * 0.8), smooth(0x1a1a1a, 0.6));
    lash.position.set(0, -R * 0.1, R * 0.7); lash.rotation.z = Math.PI * 1.1; g.add(lash);
  } else {
    const irisCol = o.iris || 0x2a1a10;
    const irisMat = o.glow ? smooth(irisCol, 0.3, { emissive: new THREE.Color(irisCol), emissiveIntensity: 2.2 }) : smooth(irisCol, 0.2, { clearcoat: 1 });
    const iris = mesh(new THREE.SphereGeometry(R * 0.66, 24, 16), irisMat);
    iris.position.set(0, 0.0, R * 0.55); iris.scale.z = 0.6; g.add(iris);
    const pupil = mesh(new THREE.SphereGeometry(R * 0.32, 16, 12), smooth(o.glow ? 0xffffff : 0x050505, 0.1, o.glow ? { emissive: 0xffffff, emissiveIntensity: 1.5 } : {}));
    pupil.position.set(0, 0, R * 0.8); pupil.scale.z = 0.5; g.add(pupil);
    const hl = mesh(new THREE.SphereGeometry(R * 0.12, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hl.position.set(-R * 0.25 * side, R * 0.25, R * 0.92); g.add(hl);
    if (o.angry) { // heavy upper lid slanting down to the center
      const lid = mesh(new THREE.SphereGeometry(R * 1.07, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), o.lidMat);
      lid.rotation.set(0.35, 0, side * 0.5); g.add(lid);
    }
  }
  return g;
}

// ---------- hen ----------
export function makeHen(o) {
  const root = new THREE.Group(); root.name = o.name;
  const body = new THREE.Group(); root.add(body);
  const fm = featherMat({ cols: 9, rows: 8, ...o.feathers }, [2, 1.4]);
  const fmHead = featherMat({ ...o.feathers, cols: 12, rows: 10, bumpScale: 1.2, mark: o.feathers.headMark ?? o.feathers.mark, seed: 3 }, [2, 1.4]);
  const fmWing = featherMat({ ...o.feathers, ...(o.wingFeathers || {}), cols: 10, rows: 6, seed: 11 }, [1, 1]);
  const legH = 0.42;

  // body: egg shape, fuller chest/bottom, rising toward tail
  const bodyGeo = blob(0.82, 0.86, 1.0, (v) => {
    if (v.z > 0) { v.z *= 1 + 0.12 * (1 - Math.abs(v.y)); }            // round chest
    if (v.y < 0) { v.x *= 1.06; v.z *= 1.04; }                          // heavy bottom
    if (v.z < 0 && v.y > -0.2) { v.y += 0.35 * (-v.z) * (v.y + 0.2); v.z *= 0.92; } // back rises to tail
  });
  const torso = at(mesh(bodyGeo, fm), 0, legH + 0.78, 0, 0.0); body.add(torso);
  // neck + head
  body.add(at(mesh(blob(0.5, 0.62, 0.5, (v) => { if (v.y < 0) { v.x *= 1.25; v.z *= 1.2; } }), fmHead), 0, legH + 1.38, 0.36, -0.35));
  const head = at(new THREE.Group(), 0, legH + 1.86, 0.52); body.add(head);
  head.add(mesh(blob(0.4, 0.42, 0.44, (v) => { if (v.z > 0) v.z *= 1.05; }), fmHead));
  // beak
  const beakMat = smooth(0xf2c21b, 0.4, { clearcoat: 0.6 });
  const beakTop = at(mesh(new THREE.ConeGeometry(0.11, 0.3, 24), beakMat), 0, -0.01, 0.53, Math.PI / 2 + 0.25, 0, 0, [1.25, 1, 0.7]);
  const beakBot = at(mesh(new THREE.ConeGeometry(0.08, 0.2, 20), smooth(0xe0a812, 0.45)), 0, -0.09, 0.47, Math.PI / 2 + 0.55, 0, 0, [1.1, 1, 0.6]);
  head.add(beakTop, beakBot);
  // comb: row of lobes
  const red = smooth(0xd31f1f, 0.45, { clearcoat: 0.4 });
  const cs = o.combScale || 1;
  [[-0.2, 0.33, 0.1, 0.4], [-0.02, 0.45, 0.13, 0.15], [0.16, 0.48, 0.14, -0.1], [0.32, 0.4, 0.12, -0.35], [0.42, 0.28, 0.09, -0.6]].forEach(([z, y, r, rx]) =>
    head.add(at(mesh(new THREE.SphereGeometry(r, 24, 16), red), 0, y * cs * 0.95 + 0.0, z * cs - 0.05, rx, 0, 0, [0.55, 1.25, 0.95].map(s => s * cs))));
  // wattles
  for (const s of [-1, 1]) head.add(at(mesh(new THREE.SphereGeometry(0.075, 20, 16), red), s * 0.045, -0.25, 0.4, 0.3, 0, 0, [0.8, 1.5, 0.7]));
  // eyes on the sides of the head
  const lidMat = fmHead;
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = makeEye({ ...o.eyes, lidMat: o.lidColor ? smooth(o.lidColor, 0.7) : lidMat }, s);
    const ang = s * 0.62;
    e.position.set(Math.sin(ang) * 0.33, 0.08, Math.cos(ang) * 0.33 + 0.03);
    e.rotation.y = ang * 0.7;
    head.add(e); eyes.push(e);
  }
  if (o.brows) for (const s of [-1, 1]) {
    head.add(at(mesh(new THREE.CapsuleGeometry(0.035, 0.18, 6, 12), smooth(o.brows, 0.6)), s * 0.25, 0.26, 0.33, 0, s * 0.6, s * (Math.PI / 2 - 0.45)));
  }

  // wings: layered fan of feathers + covert
  const wings = [];
  for (const s of [-1, 1]) {
    const w = at(new THREE.Group(), s * 0.74, legH + 1.0, 0.05, 0, 0, 0); // shoulder pivot
    const fan = new THREE.Group();
    const n = 6;
    for (let i = 0; i < n; i++) {
      const f = mesh(featherGeo(0.5 + i * 0.03, 0.18), fmWing);
      // fan pointing back & down
      f.position.set(0, -0.18 - i * 0.02, -0.12 - i * 0.07);
      f.rotation.set(-1.25 - i * 0.12, 0, 0);
      fan.add(f);
    }
    fan.add(at(mesh(blob(0.13, 0.4, 0.5), fmWing), 0, -0.1, -0.08, -0.2));
    fan.rotation.set(0, 0, s * 0.12); fan.position.x = s * 0.04;
    w.add(fan); body.add(w); wings.push(w);
  }
  // tail: upright fan
  const tail = at(new THREE.Group(), 0, legH + 1.15, -0.72, 0.0); body.add(tail);
  const fmTail = featherMat({ ...o.feathers, ...(o.tailFeathers || {}), cols: 8, rows: 5, seed: 19 }, [1, 1]);
  for (let i = 0; i < 7; i++) {
    const a = (i - 3) * 0.22;
    tail.add(at(mesh(featherGeo(0.62 - Math.abs(i - 3) * 0.05, 0.2), fmTail), Math.sin(a) * 0.3, 0.45, -0.08 - Math.abs(i - 3) * 0.03, -0.35, 0, -a * 1.1));
  }
  // legs
  const legMat = smooth(0xf0b21a, 0.5, { clearcoat: 0.3 });
  const legs = [];
  for (const s of [-1, 1]) {
    const L = at(new THREE.Group(), s * 0.26, legH + 0.12, 0.08); body.add(L);
    L.add(at(mesh(new THREE.CylinderGeometry(0.055, 0.065, legH + 0.1, 16), legMat), 0, -(legH + 0.1) / 2, 0));
    for (const a of [-0.55, 0, 0.55]) {
      const toe = mesh(new THREE.CapsuleGeometry(0.035, 0.24, 6, 12), legMat);
      at(toe, Math.sin(a) * 0.14, -legH - 0.06, Math.cos(a) * 0.14, Math.PI / 2, 0, -a); L.add(toe);
    }
    L.add(at(mesh(new THREE.CapsuleGeometry(0.03, 0.12, 6, 10), legMat), 0, -legH - 0.06, -0.1, Math.PI / 2 - 0.3, 0, 0));
    legs.push(L);
  }
  if (o.extras) o.extras({ root, body, head, torso, wings, tail, eyes, legH });
  root.scale.setScalar(o.size || 1);
  root.userData = { head, wings, tail, legs, eyes, body };
  return root;
}

// ---------- cast ----------
export function makePenosa() {
  return makeHen({
    name: 'penosa', size: 0.42,
    feathers: { base: '#8f949a', light: '#c4c8cc', mid: '#9ea3a8', edge: '#6c7177', mark: 'rgba(60,64,70,0.75)', markChestFade: true, sheen: '#dfe6ee' },
    tailFeathers: { light: '#9aa3ad', mid: '#7f8892', edge: '#5d656e' },
    eyes: { eyeMode: 'sleep', rim: 0xcf4a3a }, combScale: 0.75, lidColor: 0xa9aeb3,
    extras({ head }) {
      // a piece of the gray eggshell stuck on her head
      const shell = mesh(new THREE.SphereGeometry(0.2, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), new THREE.MeshPhysicalMaterial({ color: 0xb9b6ae, roughness: 0.7, side: THREE.DoubleSide }));
      // jagged rim
      const p = shell.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < 0.08) { const a = Math.atan2(p.getZ(i), p.getX(i)); p.setY(i, y + Math.abs(Math.sin(a * 5)) * 0.05); } }
      shell.geometry.computeVertexNormals();
      at(shell, -0.1, 0.36, -0.05, 0.2, 0, 0.45); head.add(shell);
      // crack line on the shell
      const crack = mesh(new THREE.TorusGeometry(0.19, 0.008, 6, 30, 1.2), smooth(0x3a3a3a));
      at(crack, -0.1, 0.43, -0.03, Math.PI / 2 - 0.2, 0, 0.45); head.add(crack);
    },
  });
}

export function makePenosaDesperta() {
  return makeHen({
    name: 'penosaDesperta', size: 0.55,
    feathers: { base: '#f4f1ea', light: '#ffffff', mid: '#f2efe8', edge: '#d8d2c4', tip: '#ffc21a', sheen: '#fff6d8', emissive: '#ffcf40', emissiveIntensity: 0.04, mark: 'rgba(220,170,60,0.5)' },
    wingFeathers: { tip: '#ffb000', edge: '#e8b23a' },
    tailFeathers: { light: '#fff3c2', mid: '#ffd85a', edge: '#e0a000', tip: '#fff6d0' },
    eyes: { iris: 0xffb400, glow: true, angry: true, rim: 0xe8a000 }, brows: 0x6b4a10, lidColor: 0xf3efe6,
    extras({ body, legH }) {
      const goldMat = new THREE.MeshBasicMaterial({ color: 0xffd23a });
      const aura = new THREE.Group(); aura.name = 'aura';
      const sh = new THREE.Shape([[0, 0], [0.16, 0], [0.08, -0.22], [0.2, -0.22], [-0.04, -0.6], [0.03, -0.3], [-0.08, -0.3]].map(([x, y]) => new THREE.Vector2(x, y)));
      const boltGeo = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false });
      const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,220,80,0.9)'); gr.addColorStop(1, 'rgba(255,200,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI + (i - 2.5) * 0.55, rr = 1.3;
        const bolt = new THREE.Group();
        bolt.add(mesh(boltGeo, goldMat, false));
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        glow.scale.set(0.55, 0.55, 1); glow.material.opacity = 0.6; glow.position.set(0.05, -0.3, 0); bolt.add(glow);
        aura.add(at(bolt, Math.sin(a) * rr, legH + 1.3 + (i % 3) * 0.35, Math.cos(a) * rr * 0.7, 0, a + Math.PI, (i % 2 ? 0.3 : -0.3), 1.3));
      }
      body.add(aura);
      const l = new THREE.PointLight(0xffc040, 2, 3); l.position.set(0, legH + 1.2, 1.2); body.add(l);
    },
  });
}

export function makeSombra() {
  return makeHen({
    name: 'sombra', size: 1.15,
    feathers: { base: '#2a1838', light: '#5b3a78', mid: '#3d2554', edge: '#1a0e24', tip: '#b04dff', sheen: '#c58cff', emissive: '#a040ff', emissiveIntensity: 0.15, mark: 'rgba(20,8,30,0.8)' },
    tailFeathers: { light: '#7a3ab0', mid: '#4e2275', edge: '#200c30', tip: '#d07aff' },
    eyes: { iris: 0xe040ff, glow: true, angry: true, rim: 0x6a1a80 }, brows: 0x12061a, lidColor: 0x3a2350, combScale: 1.15,
    extras({ body, legH }) {
      const m = new THREE.MeshBasicMaterial({ color: 0xc060ff, transparent: true, opacity: 0.85 });
      const aura = new THREE.Group(); aura.name = 'aura';
      for (let i = 0; i < 16; i++) {
        const a = i * 2.39, r = 1.2 + (i % 3) * 0.15, s = 0.05 + (i % 3) * 0.03;
        aura.add(at(mesh(new THREE.BoxGeometry(s, s, s), m, false), Math.cos(a) * r, legH + 0.3 + (i / 16) * 2.0, Math.sin(a) * r * 0.8, i, i * 0.7, 0));
      }
      body.add(aura);
      const l = new THREE.PointLight(0xb040ff, 3, 3); l.position.set(0, legH + 2.2, 1.0); body.add(l);
    },
  });
}

export const HENS = { penosa: makePenosa, penosaDesperta: makePenosaDesperta, sombra: makeSombra };
