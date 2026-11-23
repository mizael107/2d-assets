// Penosa look: drawn eyes (sleepy by default, expressions, blink), gray eggshell piece on the bum,
// feather tuft on the head, fluffy wing tips and chibi proportions. Everything is attached to the
// Chickensoft rig bones on the BASE scene (rest pose), so every clone carries it and follows the animation.
import * as THREE from 'three';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';

export const PENOSA = { body: 0xffd04d, feather: 0xffc93a, shell: 0xbdb8ae, shellH: 0.42, shellZig: 0.07, shellTeeth: 5, shellOff: 0.018, shellFront: 0.25, shellHalfW: 0.3, tailLen: 0.16, boneScale: { 'DEF-head': 1.22, 'DEF-spine001': 0.93, 'DEF-thighL': 0.86, 'DEF-thighR': 0.86 } };

// ---------- eyes drawn on a canvas ----------
const TEX = {};
export function penFaceTex(kind = 'sleepy', blink = false) {
  const key = kind + (blink ? '_b' : '');
  if (TEX[key]) return TEX[key];
  const W = 768, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const ink = '#24140c', lid = '#f2bf3e', lidLine = '#c98a1e';
  const EX = 168, EY = 250, R = 92;                                   // eye centre offset, height, radius
  x.lineCap = 'round'; x.lineJoin = 'round';
  if (kind.startsWith('mean')) return meanFaceTex(kind, blink, key);
  const tired = kind === 'sleepy' || kind === 'sleep';
  for (const sg of [-1, 1]) {
    const cx = W / 2 + sg * EX;
    // dark circles under the eyes (olheiras)
    if (tired || kind === 'sad') { x.strokeStyle = 'rgba(120,70,110,0.45)'; x.lineWidth = 16; x.beginPath(); x.arc(cx, EY + 18, R * 0.95, Math.PI * 0.22, Math.PI * 0.78); x.stroke();
      x.strokeStyle = 'rgba(120,70,110,0.25)'; x.lineWidth = 12; x.beginPath(); x.arc(cx, EY + 34, R * 0.85, Math.PI * 0.28, Math.PI * 0.72); x.stroke(); }
    const closed = blink || kind === 'sleep' || kind === 'happy';
    if (closed) {
      x.strokeStyle = ink; x.lineWidth = 20; x.beginPath();
      if (kind === 'happy') { x.moveTo(cx - 62, EY + 20); x.quadraticCurveTo(cx, EY - 60, cx + 62, EY + 20); }
      else { x.moveTo(cx - 64, EY + 6); x.quadraticCurveTo(cx, EY + 52, cx + 64, EY + 6); }
      x.stroke(); continue;
    }
    const big = kind === 'surprised' ? 1.18 : 1, rx = R * big, ry = R * 1.08 * big;
    const power = kind === 'power';
    // eye
    x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(cx, EY, rx + 10, ry + 10, 0, 0, Math.PI * 2); x.fill();
    if (power) {                                                       // awakened: red iris, gold ring, slit pupil
      const g = x.createRadialGradient(cx, EY, 4, cx, EY, rx);
      g.addColorStop(0, '#ffd23a'); g.addColorStop(0.22, '#ff2a10'); g.addColorStop(0.55, '#d00808'); g.addColorStop(0.8, '#7a0000'); g.addColorStop(0.86, '#ffcc33'); g.addColorStop(1, '#ff9d00');
      x.fillStyle = g; x.beginPath(); x.ellipse(cx, EY + 4, rx, ry, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#1a0402'; x.beginPath(); x.ellipse(cx, EY + 6, rx * 0.13, ry * 0.62, 0, 0, Math.PI * 2); x.fill();
      x.strokeStyle = '#ffe066'; x.lineWidth = 9; x.beginPath(); x.ellipse(cx, EY + 4, rx * 0.97, ry * 0.97, 0, 0, Math.PI * 2); x.stroke();
    } else {
      x.fillStyle = '#2a170d'; x.beginPath(); x.ellipse(cx, EY + 4, rx, ry, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#0d0603'; const pr = kind === 'surprised' ? 0.32 : 0.55; x.beginPath(); x.ellipse(cx, EY + 12, rx * pr, ry * pr * 1.05, 0, 0, Math.PI * 2); x.fill();
    }
    x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(cx - rx * 0.33, EY - ry * 0.36, rx * 0.3, ry * 0.25, -0.3, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(cx + rx * 0.36, EY + ry * 0.36, rx * 0.12, 0, Math.PI * 2); x.fill();
    // eyelids (body-coloured) for sleepy / angry / sad
    const lidCut = (yTop) => { x.save(); x.beginPath(); x.ellipse(cx, EY, rx + 11, ry + 11, 0, 0, Math.PI * 2); x.clip(); x.fillStyle = lid; x.beginPath(); yTop(); x.fill();
      x.restore(); };
    if (kind === 'sleepy') {
      lidCut(() => { x.rect(cx - R * 2, EY - R * 2, R * 4, R * 2 + 6); });
      x.strokeStyle = lidLine; x.lineWidth = 14; x.beginPath(); x.moveTo(cx - rx - 8, EY + 6); x.quadraticCurveTo(cx, EY + 16, cx + rx + 8, EY + 6); x.stroke();
    } else if (kind === 'angry' || kind === 'power') {
      lidCut(() => { x.moveTo(cx - R * 2, EY - R * 2); x.lineTo(cx + R * 2, EY - R * 2); x.lineTo(cx + sg * -R * 1.2, EY - R * 0.05); x.lineTo(cx + sg * R * 1.2, EY - R * 0.75); x.closePath(); });
      x.strokeStyle = power ? '#5a1200' : ink; x.lineWidth = 18; x.beginPath(); x.moveTo(cx + sg * R * 1.1, EY - R * 1.25); x.lineTo(cx - sg * R * 0.9, EY - R * 0.55); x.stroke();
    } else if (kind === 'sad') {
      lidCut(() => { x.moveTo(cx - R * 2, EY - R * 2); x.lineTo(cx + R * 2, EY - R * 2); x.lineTo(cx + sg * R * 1.2, EY - R * 0.1); x.lineTo(cx - sg * R * 1.2, EY - R * 0.8); x.closePath(); });
      x.fillStyle = 'rgba(110,190,255,0.9)'; x.beginPath(); x.ellipse(cx + sg * 20, EY + ry + 34, 16, 24, 0, 0, Math.PI * 2); x.fill();
    }
  }
  if (kind === 'sleep') { x.fillStyle = ink; x.font = 'bold 70px sans-serif'; x.fillText('z', W - 120, 90); x.font = 'bold 50px sans-serif'; x.fillText('z', W - 70, 40); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; TEX[key] = t; return t;
}


// Sombra's face: narrow mean eyes, violet iris with a thin pupil, heavy slanted brows
function meanFaceTex(kind, blink, key) {
  const W = 768, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const EX = 165, EY = 262, R = 84, lid = '#1d1a22', ink = '#0a0808'; x.lineCap = 'round'; x.lineJoin = 'round';
  const laugh = kind === 'meanLaugh', rage = kind === 'meanRage';
  for (const sg of [-1, 1]) {
    const cx = W / 2 + sg * EX;
    if (blink || laugh) {                              // closed: smug arc
      x.strokeStyle = ink; x.lineWidth = 20; x.beginPath(); x.moveTo(cx - 60, EY + 10); x.quadraticCurveTo(cx, laugh ? EY - 34 : EY + 34, cx + 60, EY + 10); x.stroke();
    } else {
      const rx = R, ry = R * 1.02;
      x.fillStyle = '#fff6ff'; x.beginPath(); x.ellipse(cx, EY, rx + 9, ry + 9, 0, 0, Math.PI * 2); x.fill();
      const g = x.createRadialGradient(cx, EY, 4, cx, EY, rx);
      g.addColorStop(0, rage ? '#ffe14a' : '#fff4b0'); g.addColorStop(0.35, rage ? '#ff2a2a' : '#ffb800'); g.addColorStop(1, rage ? '#6a0000' : '#7a4300');
      x.fillStyle = g; x.beginPath(); x.ellipse(cx, EY + 4, rx, ry, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#0a0210'; x.beginPath(); x.ellipse(cx, EY + 6, rx * 0.12, ry * 0.6, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(cx - rx * 0.32, EY - ry * 0.12, rx * 0.2, ry * 0.16, -0.3, 0, Math.PI * 2); x.fill();
      // heavy upper lid slanting down to the middle (mean look) + lower lid squint
      x.save(); x.beginPath(); x.ellipse(cx, EY, rx + 10, ry + 10, 0, 0, Math.PI * 2); x.clip(); x.fillStyle = lid;
      x.beginPath(); x.moveTo(cx - R * 2, EY - R * 2); x.lineTo(cx + R * 2, EY - R * 2); x.lineTo(cx + R * 2 * sg * -1, EY - R * 0.02); x.lineTo(cx + R * 1.3 * sg, EY - R * 0.62); x.closePath(); x.fill();
      x.beginPath(); x.rect(cx - R * 2, EY + R * 0.62, R * 4, R); x.fill(); x.restore();
    }
    x.strokeStyle = ink; x.lineWidth = 26; x.beginPath(); x.moveTo(cx + sg * R * 1.25, EY - R * 1.15); x.lineTo(cx - sg * R * 0.75, EY - R * 0.45); x.stroke();
  }
  // scar over the right eye
  x.strokeStyle = 'rgba(220,180,120,0.9)'; x.lineWidth = 10; x.beginPath(); x.moveTo(W / 2 + EX + 40, EY - 140); x.lineTo(W / 2 + EX - 20, EY + 70); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; TEX[key] = t; return t;
}

// ---------- geometry helpers ----------
function shellGeo(r) {                       // cup of eggshell with a zig-zag broken rim (opening at -y)
  const g = new THREE.SphereGeometry(r, 28, 12, 0, Math.PI * 2, 0, 1.35), p = g.attributes.position;
  const rimY = r * Math.cos(1.35);
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i); if (Math.abs(y - rimY) > 1e-5) continue;
    const a = Math.atan2(p.getZ(i), p.getX(i)), k = Math.round(a / (Math.PI * 2) * 14);
    const zig = (Math.abs(((a / (Math.PI * 2)) * 14) - k) < 0.25 ? 1 : -1) * r * 0.12;
    p.setY(i, y + zig);
  }
  g.scale(1, 1.15, 1); g.translate(0, -rimY * 1.15, 0); g.computeVertexNormals(); return g;   // rim sits at y=0, dome toward +y
}
function featherGeo(len, wid) { const g = new THREE.SphereGeometry(1, 12, 10); g.scale(wid, len, wid * 0.45); g.translate(0, len * 0.85, 0); return g; }


// tapered strand that rises and curls forward (+z)
function strandGeo(L, r) {
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, L * 0.55, L * 0.05), new THREE.Vector3(0, L * 0.95, L * 0.4), new THREE.Vector3(0, L * 0.85, L * 0.8), new THREE.Vector3(0, L * 0.6, L * 0.95)]);
  const T = 24, R = 8, g = new THREE.TubeGeometry(curve, T, r, R, false), p = g.attributes.position;
  for (let i = 0; i <= T; i++) { const c = curve.getPointAt(i / T), k = Math.max(0.08, 1 - i / T) ** 0.7;
    for (let j = 0; j <= R; j++) { const v = i * (R + 1) + j; p.setXYZ(v, c.x + (p.getX(v) - c.x) * k, c.y + (p.getY(v) - c.y) * k, c.z + (p.getZ(v) - c.z) * k); } }
  g.computeVertexNormals(); return g;
}
// copy of the lower-front body surface (rest pose), pushed a little outward, with a zig-zag top edge
function bellyShellGeo(base, m, box, size, C) {
  let sk; base.traverse(o => { if (o.isSkinnedMesh) sk = o; });
  const g = sk.geometry, pos = g.attributes.position, nor = g.attributes.normal, col = g.attributes.color, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
  const names = sk.skeleton.bones.map(b => b.name), limb = (bi) => /arm|hand|thigh|shin|foot|toe/.test(names[bi]);
  const M = m.matrixWorld, N3 = new THREE.Matrix3().getNormalMatrix(M);
  const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
  const P = (i) => new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(M);
  const Nn = (i) => new THREE.Vector3().fromBufferAttribute(nor, i).applyMatrix3(N3).normalize();
  const cut = (v) => { const th = Math.atan2(v.x - cx, v.z - cz), w = (th / Math.PI) * C.shellTeeth, fr = w - Math.floor(w);
    return box.min.y + size.y * C.shellH + size.y * C.shellZig * (Math.abs(fr - 0.5) * 2 - 0.5) - size.y * 0.06 * Math.min(1, Math.abs(th) / 2.2); };
  const ok = (i) => { const v = P(i), n = Nn(i);
    if (col && (col.getY(i) > 0.4 || col.getX(i) > 0.4)) return false;
    for (let k = 0; k < 4; k++) if (sw.getComponent(i, k) > 0.2 && limb(si.getComponent(i, k))) return false;
    return v.y < cut(v) && n.z > C.shellFront && Math.abs(v.x - cx) < size.x * C.shellHalfW; };
  const idx = g.index.array, out = [], nrm = [], off = size.x * C.shellOff;
  for (let t = 0; t < idx.length; t += 3) {
    const tri = [idx[t], idx[t + 1], idx[t + 2]]; if (!tri.every(ok)) continue;
    for (const i of tri) { const n = Nn(i), v = P(i).addScaledVector(n, off); out.push(v.x, v.y, v.z); nrm.push(n.x, n.y, n.z); }   // smooth body normals
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(out, 3)); sg.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); return sg;
}

// rest-pose (bind) copy of the skinned mesh, for ray casts and decals
function restMesh(base) { let sk; base.traverse(o => { if (o.isSkinnedMesh) sk = o; }); base.updateMatrixWorld(true); const m = new THREE.Mesh(sk.geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); m.matrixWorld.copy(sk.matrixWorld); m.matrixAutoUpdate = false; return { m, sk }; }
function hit(m, from, dir) { const rc = new THREE.Raycaster(from, dir.clone().normalize()); const h = rc.intersectObject(m, false)[0]; if (!h) return null; const n = h.face.normal.clone().transformDirection(m.matrixWorld); return { p: h.point, n }; }
function attach(bone, obj) {                // keep the world transform it has at rest, re-parented under the bone
  bone.updateMatrixWorld(true); obj.updateMatrixWorld(true);
  obj.applyMatrix4(bone.matrixWorld.clone().invert()); bone.add(obj);
}

export function dressPenosa(base, cfg = {}) {
  const C = Object.assign({}, PENOSA, cfg);
  const { m } = restMesh(base);
  const B = (n) => base.getObjectByName(n);
  const head = B('DEF-head'), eyeL = B('DEF-eyeL'), eyeR = B('DEF-eyeR');
  const pL = eyeL.getWorldPosition(new THREE.Vector3()), pR = eyeR.getWorldPosition(new THREE.Vector3());
  const span = pL.distanceTo(pR), mid = pL.clone().add(pR).multiplyScalar(0.5);
  const box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3());

  // eyes decal
  const fh = hit(m, new THREE.Vector3(mid.x, mid.y, box.max.z + 1), new THREE.Vector3(0, 0, -1));
  const at = fh ? fh.p : mid;
  const dg = new DecalGeometry(m, at, new THREE.Euler(0, 0, 0), new THREE.Vector3(span * 2.5, span * 2.5 / 1.5, span * 1.6));
  const faceMat = new THREE.MeshStandardMaterial({ map: penFaceTex('sleepy'), transparent: true, roughness: 0.55, polygonOffset: true, polygonOffsetFactor: -4, depthWrite: false });
  const face = new THREE.Mesh(dg, faceMat); face.name = 'penFace'; attach(head, face);

  // gray eggshell: the lower front of the body wrapped by a piece of shell that follows the body's curve,
  // broken top edge in zig-zag (as if she never fully came out of the egg)
  { const shell = new THREE.Mesh(bellyShellGeo(base, m, box, size, C), new THREE.MeshStandardMaterial({ color: C.shell, roughness: 0.42, side: THREE.DoubleSide }));
    shell.castShadow = true; shell.receiveShadow = true; shell.name = 'penShell'; attach(B('DEF-spine'), shell); }

  const featherMat = new THREE.MeshStandardMaterial({ color: C.feather, roughness: 0.7 });
  const fluffMat = new THREE.MeshStandardMaterial({ color: C.body, roughness: 0.7 });

  // fluffy tail: a little fan of round feathers on the tail bone (moves with the tail animation)
  { const t1 = B('DEF-tail001'), t2 = B('DEF-tail002');
    if (t1 && t2) {
      const p1 = t1.getWorldPosition(new THREE.Vector3()), p2 = t2.getWorldPosition(new THREE.Vector3());
      const g = new THREE.Group(); g.position.copy(p2);
      const dir = new THREE.Vector3(0, 0.85, -0.55).normalize();
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      const L = size.y * C.tailLen;
      [[-0.75, 0.75], [-0.38, 0.92], [0, 1.0], [0.38, 0.92], [0.75, 0.75]].forEach(([a, l], i) => {
        const f = new THREE.Mesh(featherGeo(L * l, size.x * 0.085), i % 2 ? featherMat : fluffMat); f.rotation.set(-0.25, 0, a); f.castShadow = true; g.add(f); });
      const puff = new THREE.Mesh(new THREE.SphereGeometry(size.x * 0.1, 16, 12), fluffMat); puff.castShadow = true; g.add(puff);
      g.name = 'penTail'; attach(t2, g);
    } }

  // fluffy wing tips
  for (const sd of ['L', 'R']) {
    const hand = B('DEF-hand' + sd), fore = B('DEF-forearm' + sd); if (!hand) continue;
    const wp = hand.getWorldPosition(new THREE.Vector3());
    const g = new THREE.Group(); g.position.copy(wp);
    const dir = wp.clone().sub(fore.getWorldPosition(new THREE.Vector3())).normalize();
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    [[-0.5, 0.9], [0, 1.1], [0.5, 0.85]].forEach(([a, l]) => { const f = new THREE.Mesh(featherGeo(size.y * 0.12 * l, size.x * 0.06), featherMat); f.rotation.set(0, 0, a); f.castShadow = true; g.add(f); });
    g.name = 'penWing' + sd; attach(hand, g);
  }
  // ---- evolved form parts (hidden; shown by the transformation) ----
  const red = new THREE.MeshStandardMaterial({ color: 0xe8261a, roughness: 0.45, emissive: 0x5a0800 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffb81c, roughness: 0.35, metalness: 0.2, emissive: 0x6a3a00 });
  { const t2 = B('DEF-tail002');
    if (t2) {
      const g = new THREE.Group(); g.position.copy(t2.getWorldPosition(new THREE.Vector3()));
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0.9, -0.45).normalize());
      const L = size.y * 0.3;
      [-1.0, -0.66, -0.33, 0, 0.33, 0.66, 1.0].forEach((a, i) => {
        const l = 1 - Math.abs(a) * 0.3, f = new THREE.Mesh(featherGeo(L * l, size.x * 0.075), i % 2 ? red : gold); f.rotation.set(-0.35, 0, a); f.castShadow = true; g.add(f);
        const tip = new THREE.Mesh(featherGeo(L * l * 0.35, size.x * 0.05), i % 2 ? gold : red); tip.position.set(-Math.sin(a) * L * l * 1.25, Math.cos(a) * L * l * 1.25, 0); tip.rotation.set(-0.35, 0, a); g.add(tip); });
      g.name = 'penEvoTail'; g.visible = false; attach(t2, g);
    } }
  const orange = new THREE.MeshStandardMaterial({ color: 0xff7a10, roughness: 0.4, emissive: 0x5a2000 });
  for (const sd of ['L', 'R']) {
    const hand = B('DEF-hand' + sd), fore = B('DEF-forearm' + sd), up = B('DEF-upper_arm' + sd); if (!hand) continue;
    const sgn = sd === 'L' ? 1 : -1;
    const wing = (bone, from, n, len, wid, spread, mats, name) => {
      const wp = bone.getWorldPosition(new THREE.Vector3()), g = new THREE.Group(); g.position.copy(wp);
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), wp.clone().sub(from.getWorldPosition(new THREE.Vector3())).normalize());
      for (let i = 0; i < n; i++) {
        const u = n === 1 ? 0 : i / (n - 1) - 0.5, l = 1 - Math.abs(u) * 0.45;
        const f = new THREE.Mesh(featherGeo(size.y * len * l, size.x * wid), mats[i % mats.length]);
        f.rotation.set(0.12 * Math.abs(u), 0, u * spread); f.position.z = -Math.abs(u) * size.x * 0.02; f.castShadow = true; g.add(f);
      }
      g.name = name; g.visible = false; attach(bone, g);
    };
    wing(hand, fore, 7, 0.17, 0.06, 1.9, [gold, red, orange], 'penEvoWing' + sd);          // long primaries fanned at the tip
    wing(fore, up || fore, 5, 0.11, 0.055, 1.5, [red, gold], 'penEvoWing2' + sd);           // shorter layer along the wing
  }
  base.userData.dress = { boneScale: C.boneScale, evoScale: { 'DEF-comb001': 1.45 } };
  return true;
}

// ---------- transformation effects (world units; the group follows the character) ----------
function radialTex(inner, outer) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, inner); g.addColorStop(0.35, outer); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const rnd = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
export function makeEvoFX(H, shellColor = 0xbdb8ae, pal = {}) {
  const group = new THREE.Group();
  const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex(pal.auraIn || 'rgba(255,240,170,0.9)', pal.auraOut || 'rgba(255,170,20,0.45)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  aura.position.y = H * 0.5; group.add(aura);
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex('rgba(255,255,255,1)', 'rgba(255,230,160,0.8)'), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true })); flash.renderOrder = 6;
  flash.position.y = H * 0.5; group.add(flash);
  // sparks rising
  const NS = 40, sp = new THREE.BufferGeometry(); sp.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NS * 3), 3));
  const sparks = new THREE.Points(sp, new THREE.PointsMaterial({ map: radialTex('rgba(255,255,220,1)', 'rgba(255,190,40,0.9)'), size: H * 0.06, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, color: pal.spark || 0xffe08a }));
  group.add(sparks);
  // lightning bolts (jagged tubes, re-drawn every few frames)
  const boltMat = new THREE.MeshBasicMaterial({ color: pal.bolt || 0xfff3b0, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
  const bolts = []; for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.BufferGeometry(), boltMat); group.add(m); bolts.push(m); }
  // eggshell shards
  const shardMat = new THREE.MeshStandardMaterial({ color: shellColor, roughness: 0.45, side: THREE.DoubleSide });
  const shards = []; for (let i = 0; i < 16; i++) {
    const g = new THREE.BufferGeometry(), a = H * (0.05 + 0.05 * rnd(i)); g.setAttribute('position', new THREE.Float32BufferAttribute([0, a, 0, -a * 0.8, -a * 0.6, a * 0.15, a * 0.9, -a * 0.5, -a * 0.1], 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, shardMat); m.castShadow = true; group.add(m); shards.push(m); }
  let lastBolt = -1;
  function update(t, evo, breakT) {
    const on = evo > 0.001;
    aura.visible = on; aura.material.opacity = Math.min(1, evo) * (0.55 + 0.15 * Math.sin(t * 9) + 0.1 * Math.sin(t * 23));
    aura.scale.setScalar(H * (1.9 + 0.12 * Math.sin(t * 6)));
    const df = breakT != null ? t - breakT : 99;
    flash.visible = df > -0.15 && df < 0.6; const fk = df < 0 ? (df + 0.15) / 0.15 : Math.max(0, 1 - df / 0.6);
    flash.material.opacity = fk; flash.scale.setScalar(H * (1.2 + 3.5 * Math.max(0, df + 0.15)));
    // sparks
    const P = sp.attributes.position; sparks.visible = on;
    for (let i = 0; i < NS; i++) { const life = 1.4, ph = ((t * 0.9 + rnd(i) * life) % life) / life, ang = rnd(i + 50) * Math.PI * 2, r = H * (0.35 + 0.3 * rnd(i + 9));
      P.setXYZ(i, Math.cos(ang) * r * (1 - ph * 0.3), H * (0.05 + ph * 1.3), Math.sin(ang) * r * (1 - ph * 0.3)); }
    P.needsUpdate = true; sparks.material.opacity = Math.min(1, evo);
    // bolts
    const fr = Math.floor(t * 12);
    bolts.forEach((b, i) => { b.visible = on && rnd(fr * 7 + i) < 0.55 * evo + 0.1; });
    if (on && fr !== lastBolt) { lastBolt = fr;
      bolts.forEach((b, i) => { const pts = []; const ang = rnd(fr * 3 + i) * Math.PI * 2, r0 = H * 0.42, y0 = H * (0.15 + 0.7 * rnd(fr + i * 5));
        let p = new THREE.Vector3(Math.cos(ang) * r0, y0, Math.sin(ang) * r0); pts.push(p.clone());
        for (let k = 0; k < 6; k++) { p = p.clone().add(new THREE.Vector3((rnd(fr + k + i * 13) - 0.5) * H * 0.18, H * (0.06 + 0.06 * rnd(fr * 2 + k)), (rnd(fr * 5 + k + i) - 0.5) * H * 0.18)); pts.push(p.clone()); }
        const path = new THREE.CurvePath(); for (let k = 0; k < pts.length - 1; k++) path.add(new THREE.LineCurve3(pts[k], pts[k + 1]));
        b.geometry.dispose(); b.geometry = new THREE.TubeGeometry(path, 24, H * 0.007, 4, false); }); }
    // shards fly out from the belly, fall with gravity, then vanish
    shards.forEach((m, i) => { const st = df; m.visible = st >= 0 && st < 1.3;
      if (!m.visible) return; const a = (i / shards.length) * Math.PI * 1.2 - Math.PI * 0.1 + rnd(i) * 0.3, sp0 = H * (1.6 + 1.6 * rnd(i + 3));
      m.position.set(Math.sin(a) * sp0 * st, H * 0.28 + H * (1.8 + rnd(i + 7)) * st - 4.9 * st * st * (H / 0.75), Math.cos(a) * sp0 * st * 0.9 + H * 0.2);
      m.position.y = Math.max(H * 0.02, m.position.y); m.rotation.set(st * (6 + 6 * rnd(i)), st * 5 * rnd(i + 1), st * 4); });
  }
  return { group, update };
}

// ======================= SOMBRA (Kaio's chicken) =======================
export const SOMBRA_DEFAULTS = 0;
export const SOMBRA = { body: 0x16131a, leg: 0x1e1a22, comb: 0xc8102e, feathers: [0x141217, 0x1c1920, 0x0e0d10, 0x221e27], lace: 0xffbf2e,
  featherCount: 1800, crestH: 0.24, featherLen: 0.04, featherWid: 0.024,
  boneScale: { 'DEF-head': 1.0, 'DEF-spine001': 1.08, 'DEF-thighL': 1.12, 'DEF-thighR': 1.12, 'DEF-comb001': 0.02, 'DEF-upper_armL': 1.3, 'DEF-upper_armR': 1.3 } };
export function dressSombra(base, cfg = {}) {
  const C = Object.assign({}, SOMBRA, cfg);
  const { m } = restMesh(base);
  const B = (n) => base.getObjectByName(n);
  const head = B('DEF-head'), eyeL = B('DEF-eyeL'), eyeR = B('DEF-eyeR');
  const pL = eyeL.getWorldPosition(new THREE.Vector3()), pR = eyeR.getWorldPosition(new THREE.Vector3());
  const span = pL.distanceTo(pR), mid = pL.clone().add(pR).multiplyScalar(0.5);
  const box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3());
  // face
  const fh = hit(m, new THREE.Vector3(mid.x, mid.y, box.max.z + 1), new THREE.Vector3(0, 0, -1));
  const dg = new DecalGeometry(m, fh ? fh.p : mid, new THREE.Euler(0, 0, 0), new THREE.Vector3(span * 2.5, span * 2.5 / 1.5, span * 1.6));
  const face = new THREE.Mesh(dg, new THREE.MeshStandardMaterial({ map: penFaceTex('mean'), transparent: true, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -4, depthWrite: false }));
  face.name = 'penFace'; attach(head, face);
  // small feathers glued all over the body, overlapping like scales, pointing down and back
  let sk; base.traverse(o => { if (o.isSkinnedMesh) sk = o; });
  const g = sk.geometry, pos = g.attributes.position, nor = g.attributes.normal, col = g.attributes.color, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
  const bones = sk.skeleton.bones, M = m.matrixWorld, N3 = new THREE.Matrix3().getNormalMatrix(M);
  const byBone = new Map(), faceR = span * 1.25;
  const step = Math.max(1, Math.floor(pos.count / C.featherCount));
  for (let i = 0; i < pos.count; i += step) {
    const j = Math.min(pos.count - 1, i + Math.floor(rnd(i) * step));
    if (col && (col.getX(j) > 0.3 || col.getY(j) > 0.3 || col.getZ(j) > 0.3)) continue;   // comb, legs/beak, eyes
    let bi = 0, bw = -1; for (let k = 0; k < 4; k++) { const w = sw.getComponent(j, k); if (w > bw) { bw = w; bi = si.getComponent(j, k); } }
    const bn = bones[bi].name; if (/thigh|shin|foot|toe|tongue|beak|eye|comb/.test(bn)) continue;
    const p = new THREE.Vector3().fromBufferAttribute(pos, j).applyMatrix4(M), n = new THREE.Vector3().fromBufferAttribute(nor, j).applyMatrix3(N3).normalize();
    if (n.z > 0.2 && p.distanceTo(mid) < faceR) continue;                                     // keep the face clear
    if (!byBone.has(bi)) byBone.set(bi, []); byBone.get(bi).push([p, n, j]);
  }
  const len = size.y * C.featherLen, wid = size.x * C.featherWid;
  const fg = new THREE.SphereGeometry(1, 8, 6); fg.scale(wid, len, wid * 0.22); fg.translate(0, len * 0.75, 0);
  const fm = new THREE.MeshStandardMaterial({ roughness: 0.32, metalness: 0.45 });
  const pal = C.feathers.map(c => new THREE.Color(c));
  const laceMat = new THREE.MeshStandardMaterial({ color: C.lace, roughness: 0.28, metalness: 0.8, emissive: 0x3a2400 });
  for (const [bi, list] of byBone) {
    const im = new THREE.InstancedMesh(fg, fm, list.length), lace = new THREE.InstancedMesh(fg, laceMat, list.length); im.castShadow = true;
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    list.forEach(([p, n, j], k) => {
      let down = new THREE.Vector3(0, -1, -0.7); down.addScaledVector(n, -down.dot(n)); if (down.lengthSq() < 1e-4) down.set(0, 0, -1); down.normalize();
      const xAx = new THREE.Vector3().crossVectors(down, n).normalize(), zAx = new THREE.Vector3().crossVectors(xAx, down).normalize();
      mtx.makeBasis(xAx, down, zAx); q.setFromRotationMatrix(mtx); q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.07));
      const s0 = 0.75 + 0.5 * rnd(j + 3), base0 = p.clone().addScaledVector(n, -wid * 0.12);
      sc.set(s0, s0, s0); mtx.compose(base0, q, sc); im.setMatrixAt(k, mtx);
      sc.set(s0 * 1.22, s0 * 1.12, s0); mtx.compose(base0.clone().addScaledVector(n, -wid * 0.06), q, sc); lace.setMatrixAt(k, mtx);   // gold edge peeking out
      im.setColorAt(k, pal[Math.floor(rnd(j + 11) * pal.length)]);
    });
    im.instanceMatrix.needsUpdate = true; lace.instanceMatrix.needsUpdate = true; im.name = 'sombraFeathers'; lace.name = 'sombraLace';
    attach(bones[bi], im); attach(bones[bi], lace);
  }
  // stylish crest: blades swept back like a flame mohawk (crimson with gold edge and glowing tips), replaces the round comb
  { const hc = head.getWorldPosition(new THREE.Vector3());
    const crest = new THREE.Group();
    // top of the skull without the old comb: highest non-comb vertex near the middle line
    { let sk2; base.traverse(o => { if (o.isSkinnedMesh) sk2 = o; }); const gp = sk2.geometry.attributes.position, gc = sk2.geometry.attributes.color, v = new THREE.Vector3(); let best = null;
      const zc = hc.z + (mid.z - hc.z) * 0.45;
      for (let i = 0; i < gp.count; i++) { if (gc && gc.getX(i) > 0.2) continue; v.fromBufferAttribute(gp, i).applyMatrix4(m.matrixWorld);
        if (Math.abs(v.x) < size.x * 0.06 && Math.abs(v.z - zc) < size.z * 0.12 && (!best || v.y > best.y)) best = v.clone(); }
      if (best) crest.position.copy(best).add(new THREE.Vector3(0, -size.y * 0.015, 0)); }
    const crim = new THREE.MeshStandardMaterial({ color: 0xc4102c, roughness: 0.35, metalness: 0.25, emissive: 0x300004 });
    const gold2 = new THREE.MeshStandardMaterial({ color: 0xffc23a, roughness: 0.25, metalness: 0.85, emissive: 0x6a4200 });
    const tipM = new THREE.MeshStandardMaterial({ color: 0xffe27a, emissive: 0xffa000, emissiveIntensity: 1.4 });
    const H0 = size.y * C.crestH;
    const crimSide = new THREE.MeshStandardMaterial({ color: 0x9a0a20, roughness: 0.4, metalness: 0.3 });
    const red = new THREE.Mesh(crestShapeGeo(H0, size.x * 0.03), [crim, crimSide]); red.castShadow = true; crest.add(red);   // faces red, sides/bevel gold = gold outline
    crest.name = 'sombraCrest'; attach(head, crest); }

  // tail: long arched sickle feathers (black blade + gold shaft + glowing gold tip) over a layer of shorter coverts
  const blk = new THREE.MeshStandardMaterial({ color: 0x121014, roughness: 0.3, metalness: 0.5 });
  const gld = new THREE.MeshStandardMaterial({ color: 0xffc23a, roughness: 0.25, metalness: 0.85, emissive: 0x6a4200 });
  const glow = new THREE.MeshStandardMaterial({ color: 0xffe27a, emissive: 0xffb000, emissiveIntensity: 1.6, roughness: 0.3 });
  { const t2 = B('DEF-tail002'); if (t2) {
      const tg = new THREE.Group(); tg.position.copy(t2.getWorldPosition(new THREE.Vector3()));
      const L = size.y * 0.5;
      [[-0.55, 0.85, 0.15], [-0.28, 0.95, 0.05], [0, 1.0, 0], [0.28, 0.95, -0.05], [0.55, 0.85, -0.15]].forEach(([ry, l, rz]) => {
        const f = new THREE.Group(); f.rotation.set(0, ry, rz);
        const blade = new THREE.Mesh(sickleGeo(L * l, size.x * 0.075, 0.38), blk); blade.castShadow = true; f.add(blade);
        const shaft = new THREE.Mesh(sickleGeo(L * l * 0.98, size.x * 0.022, 1.9), gld); f.add(shaft);
        const tip = new THREE.Mesh(new THREE.SphereGeometry(size.x * 0.03, 12, 8), glow); tip.position.copy(sickleTip(L * l * 0.93)); f.add(tip);
        tg.add(f); });
      [[-0.7, 0.42], [-0.35, 0.5], [0, 0.55], [0.35, 0.5], [0.7, 0.42], [-0.15, 0.36], [0.15, 0.36]].forEach(([ry, l], i) => {
        const f = new THREE.Mesh(sickleGeo(L * l, size.x * 0.06, 0.4), i % 2 ? gld : blk); f.rotation.set(0.25, ry, 0); f.castShadow = true; tg.add(f); });
      tg.name = 'penTail'; attach(t2, tg); } }
  // wings: big fan of black feathers with gold edge at the tip + a second row along the forearm
  const wingBlk = new THREE.MeshStandardMaterial({ color: 0x141217, roughness: 0.3, metalness: 0.5 });
  for (const sd of ['L', 'R']) {
    const hand = B('DEF-hand' + sd), fore = B('DEF-forearm' + sd), up = B('DEF-upper_arm' + sd); if (!hand) continue;
    const row = (bone, from, n, len, wid, spread, name) => {
      const wp = bone.getWorldPosition(new THREE.Vector3()), wg = new THREE.Group(); wg.position.copy(wp);
      wg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), wp.clone().sub(from.getWorldPosition(new THREE.Vector3())).normalize());
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1) - 0.5, l = 1 - Math.abs(u) * 0.4, L = size.y * len * l;
        const f = new THREE.Group(); f.rotation.set(0.1 * Math.abs(u), 0, u * spread); f.position.z = -Math.abs(u) * size.x * 0.03;
        const blk = new THREE.Mesh(wingFeatherGeo(L, size.x * wid), wingBlk); blk.castShadow = true; f.add(blk);
        const edge = new THREE.Mesh(wingFeatherGeo(L * 1.08, size.x * wid * 1.25), gld); edge.position.z = -size.x * 0.006; f.add(edge);
        const back = new THREE.Mesh(wingFeatherGeo(L, size.x * wid), wingBlk); back.position.z = -size.x * 0.012; f.add(back);
        wg.add(f);
      }
      wg.name = name; attach(bone, wg);
    };
    row(hand, fore, 7, 0.24, 0.06, 1.8, 'penWing' + sd);
    row(fore, up || fore, 5, 0.15, 0.055, 1.3, 'sombraWing2' + sd);
  }
  base.userData.dress = { boneScale: C.boneScale, defaultFace: 'mean', sparks: { color: 0xffd34a, bolt: 0xfff0a0, level: 0.45 } };
  return true;
}
function spikeGeo(len, wid) { const g = new THREE.ConeGeometry(wid, len, 8, 1); g.scale(1, 1, 0.35); g.translate(0, len / 2, 0); return g; }

// arched feather: rises back and up, then curls down (local: back = -z, up = +y); flatten = width factor across the blade
function sicklePts(L) { return [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, L * 0.45, -L * 0.25), new THREE.Vector3(0, L * 0.75, -L * 0.7), new THREE.Vector3(0, L * 0.62, -L * 1.1), new THREE.Vector3(0, L * 0.25, -L * 1.3)]; }
function sickleTip(L) { const p = sicklePts(L); return p[p.length - 1].clone(); }
function sickleGeo(L, r, flatten) {
  const curve = new THREE.CatmullRomCurve3(sicklePts(L)), T = 32, R = 8, g = new THREE.TubeGeometry(curve, T, r, R, false), p = g.attributes.position;
  for (let i = 0; i <= T; i++) { const c = curve.getPointAt(i / T), k = Math.sin(Math.PI * Math.min(1, 0.12 + i / T * 0.95)) ** 0.6;
    for (let j = 0; j <= R; j++) { const v = i * (R + 1) + j; p.setXYZ(v, c.x + (p.getX(v) - c.x) * k * flatten, c.y + (p.getY(v) - c.y) * k, c.z + (p.getZ(v) - c.z) * k); } }
  g.computeVertexNormals(); return g;
}

// crest blade: rises, then sweeps back (local back = -z)
function crestPts(L) { return [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, L * 0.55, -L * 0.1), new THREE.Vector3(0, L * 0.9, -L * 0.42), new THREE.Vector3(0, L * 1.0, -L * 0.85)]; }
function crestGeo(L, r, flatten) {
  const curve = new THREE.CatmullRomCurve3(crestPts(L)), T = 24, R = 8, g = new THREE.TubeGeometry(curve, T, r, R, false), p = g.attributes.position;
  for (let i = 0; i <= T; i++) { const c = curve.getPointAt(i / T), k = Math.max(0.05, 1 - i / T) ** 0.8;
    for (let j = 0; j <= R; j++) { const v = i * (R + 1) + j; p.setXYZ(v, c.x + (p.getX(v) - c.x) * k * flatten, c.y + (p.getY(v) - c.y) * k, c.z + (p.getZ(v) - c.z) * k); } }
  g.computeVertexNormals(); return g;
}

// flat pointed feather (wider in the middle, sharp tip), grows along +y
function wingFeatherGeo(len, wid) {
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(wid, len * 0.35, wid * 0.55, len * 0.8); sh.lineTo(0, len); sh.lineTo(-wid * 0.55, len * 0.8); sh.quadraticCurveTo(-wid, len * 0.35, 0, 0);
  const g = new THREE.ExtrudeGeometry(sh, { depth: wid * 0.12, bevelEnabled: true, bevelThickness: wid * 0.06, bevelSize: wid * 0.06, bevelSegments: 2, curveSegments: 8 });
  g.translate(0, 0, -wid * 0.06); return g;
}

// solid flame crest silhouette (side profile), spikes swept back; extruded sideways (thickness along x)
function crestShapeGeo(L, thick, grow = 0) {
  const sh = new THREE.Shape(), P = (x, y) => [x * L, y * L];
  sh.moveTo(...P(-0.18, 0));
  sh.quadraticCurveTo(...P(-0.2, 0.45), ...P(0.02, 0.78));          // front spike
  sh.quadraticCurveTo(...P(0.12, 0.5), ...P(0.2, 0.52));
  sh.quadraticCurveTo(...P(0.22, 0.82), ...P(0.42, 1.0));           // tallest spike
  sh.quadraticCurveTo(...P(0.45, 0.66), ...P(0.55, 0.6));
  sh.quadraticCurveTo(...P(0.62, 0.8), ...P(0.85, 0.86));           // third spike, swept back
  sh.quadraticCurveTo(...P(0.8, 0.55), ...P(0.9, 0.42));
  sh.quadraticCurveTo(...P(1.0, 0.5), ...P(1.18, 0.5));             // last flick
  sh.quadraticCurveTo(...P(0.95, 0.2), ...P(0.85, 0));
  sh.lineTo(...P(-0.18, 0));
  const g = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: true, bevelThickness: thick * 0.5 + grow, bevelSize: L * 0.018 + grow, bevelSegments: 2, curveSegments: 12 });
  g.translate(0, 0, -thick / 2); g.rotateY(Math.PI / 2);            // profile x -> back (-z)
  return g;
}
