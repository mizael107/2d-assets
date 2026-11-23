// R6 boy assembled from the Tripo parts kit (ref/pecas_lite.glb: pieces laid out side by side in one mesh)
// + face head and hands taken from ref/boy_r6_lite.glb. Every piece is a whole, separate object, so the
// rig never cuts cloth: each part just rotates at its joint. Kit units: ground y=0, faces +Z.
import * as THREE from 'three';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
const clamp01 = (x) => Math.min(1, Math.max(0, x)), ease = (x) => x * x * (3 - 2 * x);

// pieces of the kit, found by their bbox center (x, y) in the laid-out sheet
export const KIT = {
  hair: [[-0.389, 0.561], [-0.236, 0.557], [-0.091, 0.555]], head: [-0.409, 0.418],
  torso: [-0.141, 0.365], armR: [-0.313, 0.362], armL: [0.029, 0.361],
  pants: [-0.408, 0.122],
};

// new geometry holding only the vertices used by these triangles
function compact(geo, list) {
  const map = new Map(), out = new THREE.BufferGeometry(), idx = [];
  for (const v of list) { if (!map.has(v)) map.set(v, map.size); idx.push(map.get(v)); }
  const order = [...map.keys()];
  for (const [name, a] of Object.entries(geo.attributes)) {
    const arr = new Float32Array(order.length * a.itemSize), get = ['getX', 'getY', 'getZ', 'getW'];   // works for interleaved data too
    order.forEach((v, i) => { for (let k = 0; k < a.itemSize; k++) arr[i * a.itemSize + k] = a[get[k]](v); });
    out.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize));
  }
  out.setIndex(idx); return out;
}
function components(geo) {
  const pos = geo.attributes.position, idx = geo.index.array, n = pos.count, par = new Int32Array(n).map((_, i) => i);
  const find = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  const key = new Map();
  for (let i = 0; i < n; i++) { const k = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`; if (key.has(k)) par[find(i)] = find(key.get(k)); else key.set(k, i); }
  for (let t = 0; t < idx.length; t += 3) { par[find(idx[t + 1])] = find(idx[t]); par[find(idx[t + 2])] = find(idx[t]); }
  const comps = new Map();
  for (let t = 0; t < idx.length; t += 3) { const r = find(idx[t]); if (!comps.has(r)) comps.set(r, []); comps.get(r).push(idx[t], idx[t + 1], idx[t + 2]); }
  return [...comps.values()].map(list => { const g = compact(geo, list); g.computeBoundingBox(); const bb = g.boundingBox; return { g, bb, cx: (bb.min.x + bb.max.x) / 2, cy: (bb.min.y + bb.max.y) / 2 }; });
}
const pick = (comps, [x, y]) => comps.reduce((best, c) => { const d = (c.cx - x) ** 2 + (c.cy - y) ** 2; return d < best.d ? { d, c } : best; }, { d: 1e9 }).c;

// move a geometry so that its bbox (min.y / center x,z) lands where we want
function placeGeo(g, { x = 0, ymin = 0, z = 0, s = 1, sy = 1, ry = 0 }) {
  g = g.clone(); g.computeBoundingBox(); const bb = g.boundingBox, c = bb.getCenter(new THREE.Vector3());
  g.translate(-c.x, -bb.min.y, -c.z); if (ry) g.rotateY(ry); g.scale(s, s * sy, s); g.translate(x, ymin, z); g.computeBoundingBox(); return g;
}


// split a geometry into its +x and -x halves (triangles by centroid); both halves keep the middle strip so no gap shows
function splitX(g) {
  const pos = g.attributes.position, idx = g.index.array, P = [], N = [];
  for (let t = 0; t < idx.length; t += 3) {
    const x = (pos.getX(idx[t]) + pos.getX(idx[t + 1]) + pos.getX(idx[t + 2])) / 3;
    if (x >= -0.004) P.push(idx[t], idx[t + 1], idx[t + 2]); if (x <= 0.004) N.push(idx[t], idx[t + 1], idx[t + 2]);
  }
  return { pos: compact(g, P), neg: compact(g, N) };
}
function keepRange(g, y0, y1) {
  const pos = g.attributes.position, idx = g.index.array, keep = [];
  for (let t = 0; t < idx.length; t += 3) { const y = (pos.getY(idx[t]) + pos.getY(idx[t + 1]) + pos.getY(idx[t + 2])) / 3; if (y > y0 && y < y1) keep.push(idx[t], idx[t + 1], idx[t + 2]); }
  return compact(g, keep);
}
// keep only the triangles above a height (used to drop the old mouth/cheeks from the face mask)
function keepAbove(g, y0) {
  const pos = g.attributes.position, idx = g.index ? g.index.array : [...Array(pos.count).keys()], keep = [];
  for (let t = 0; t < idx.length; t += 3) { const y = (pos.getY(idx[t]) + pos.getY(idx[t + 1]) + pos.getY(idx[t + 2])) / 3; if (y > y0) keep.push(idx[t], idx[t + 1], idx[t + 2]); }
  return compact(g, keep);
}
// drawn Roblox-style mouth, projected on the skull as a decal; its texture is swapped for each expression
const MOUTHS = {};
// whole face drawn on a canvas (Roblox style): eyes in the middle of the head, brows, mouth below.
// kind = mouth/expression, blink = eyes closed
function mouthTex(kind, blink = false, style = 'boy') {
  const key = style + kind + (blink ? '_b' : '');
  if (MOUTHS[key]) return MOUTHS[key];
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const ink = '#2b1810'; x.lineCap = 'round'; x.lineJoin = 'round';
  const EY = 232, EX = 94, ER = 46;                       // eye centre height, half distance, radius
  const sad = kind === 'sad', scared = kind === 'o', mad = kind === 'mad' || kind === 'yell';
  for (const sgn of [-1, 1]) {
    const cx = 256 + sgn * EX;
    if (blink) { x.strokeStyle = ink; x.lineWidth = 14; x.beginPath(); x.moveTo(cx - 34, EY + 6); x.quadraticCurveTo(cx, EY + 26, cx + 34, EY + 6); x.stroke(); }
    else {
      const ry = scared ? ER * 1.25 : ER * 1.18, rx = scared ? ER * 0.95 : ER;
      x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(cx, EY, rx + 7, ry + 7, 0, 0, Math.PI * 2); x.fill();   // white rim
      x.fillStyle = style === 'kaio' ? '#2e7d4f' : '#3b2216'; x.beginPath(); x.ellipse(cx, EY + 3, rx, ry, 0, 0, Math.PI * 2); x.fill();          // iris
      x.fillStyle = '#140a06'; x.beginPath(); x.ellipse(cx, EY + 8, rx * 0.55, ry * 0.6, 0, 0, Math.PI * 2); x.fill(); // pupil
      x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(cx - rx * 0.32, EY - ry * 0.38, rx * 0.3, ry * 0.26, 0, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.arc(cx + rx * 0.35, EY + ry * 0.35, rx * 0.13, 0, Math.PI * 2); x.fill();
      if (mad) {                                            // furious: lid slants down toward the nose
        x.save(); x.beginPath(); x.ellipse(cx, EY, rx + 8, ry + 8, 0, 0, Math.PI * 2); x.clip(); x.fillStyle = style === 'kaio' ? '#f1c39b' : '#e9b48a';
        x.beginPath(); x.moveTo(cx - sgn * 70, EY - 4); x.lineTo(cx + sgn * 70, EY - 52); x.lineTo(cx + sgn * 70, EY - 120); x.lineTo(cx - sgn * 70, EY - 120); x.fill(); x.restore();
        x.strokeStyle = ink; x.lineWidth = 12; x.beginPath(); x.moveTo(cx - sgn * (rx + 4), EY - 8); x.lineTo(cx + sgn * (rx + 6), EY - 44); x.stroke();
      }
      else if (style === 'kaio' && !scared) {                    // smug half-closed lids
        x.save(); x.beginPath(); x.ellipse(cx, EY, rx + 8, ry + 8, 0, 0, Math.PI * 2); x.clip(); x.fillStyle = '#f1c39b'; x.fillRect(cx - 80, EY - 90, 160, 82 - (kind === 'happy' ? 20 : 0)); x.restore();
        x.strokeStyle = ink; x.lineWidth = 11; x.beginPath(); x.moveTo(cx - rx - 6, EY - 6); x.quadraticCurveTo(cx, EY - 14, cx + rx + 6, EY - 8); x.stroke();
      }
    }
    // brows
    if (mad) { x.strokeStyle = ink; x.lineWidth = 24; x.beginPath(); x.moveTo(cx - sgn * 40, EY - 40); x.lineTo(cx + sgn * 42, EY - 92); x.stroke(); continue; }
    x.strokeStyle = ink; x.lineWidth = 19; x.beginPath();
    const by = EY - 74, tilt = sad ? 16 : scared ? -12 : kind === 'happy' ? -6 : style === 'kaio' ? -14 : 0;
    x.moveTo(cx - sgn * 34, by - tilt * sgn * -1 + (sad ? 10 : 0)); x.quadraticCurveTo(cx, by - 12 - (scared ? 10 : 0), cx + sgn * 34, by + (sad ? -6 : 0) + tilt * 0.3);
    x.stroke();
  }
  // mouth
  const MY = 368; x.strokeStyle = ink; x.fillStyle = ink; x.lineWidth = 14;
  const open = (w, h, y) => { x.beginPath(); x.moveTo(256 - w, y); x.quadraticCurveTo(256, y + 6, 256 + w, y); x.quadraticCurveTo(256, y + h * 2, 256 - w, y); x.fill();
    x.save(); x.clip(); x.fillStyle = '#e06a6a'; x.beginPath(); x.ellipse(256, y + h * 1.25, w * 0.6, h * 0.5, 0, 0, Math.PI * 2); x.fill(); x.restore(); };
  if (kind === 'smirk') { x.beginPath(); x.moveTo(218, MY + 8); x.quadraticCurveTo(262, MY + 22, 304, MY - 12); x.stroke(); }
  else if (kind === 'smile') { x.beginPath(); x.moveTo(212, MY - 6); x.quadraticCurveTo(256, MY + 34, 300, MY - 6); x.stroke(); }
  else if (kind === 'neutral') { x.beginPath(); x.moveTo(226, MY + 6); x.quadraticCurveTo(256, MY + 12, 286, MY + 6); x.stroke(); }
  else if (kind === 'sad') { x.beginPath(); x.moveTo(218, MY + 26); x.quadraticCurveTo(256, MY - 8, 294, MY + 26); x.stroke(); }
  else if (kind === 'talk') open(34, 20, MY - 6);
  else if (kind === 'happy') open(48, 30, MY - 14);
  else if (kind === 'o') { x.beginPath(); x.ellipse(256, MY + 8, 20, 26, 0, 0, Math.PI * 2); x.fill(); }
  else if (kind === 'mad') {                              // gritted teeth, corners down
    x.beginPath(); x.moveTo(206, MY + 22); x.quadraticCurveTo(256, MY - 14, 306, MY + 22); x.lineTo(296, MY + 40); x.quadraticCurveTo(256, MY + 14, 216, MY + 40); x.closePath(); x.fill();
    x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(218, MY + 22); x.quadraticCurveTo(256, MY - 2, 294, MY + 22); x.lineTo(290, MY + 30); x.quadraticCurveTo(256, MY + 12, 222, MY + 30); x.closePath(); x.fill();
    x.strokeStyle = ink; x.lineWidth = 5; for (const tx of [240, 256, 272]) { x.beginPath(); x.moveTo(tx, MY + 6); x.lineTo(tx, MY + 30); x.stroke(); } }
  else if (kind === 'yell') {                             // shouting: wide open, corners down, teeth on top
    x.beginPath(); x.moveTo(186, MY + 30); x.quadraticCurveTo(256, MY - 44, 326, MY + 30); x.quadraticCurveTo(256, MY + 120, 186, MY + 30); x.fill();
    x.save(); x.clip(); x.fillStyle = '#e06a6a'; x.beginPath(); x.ellipse(256, MY + 78, 48, 24, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#ffffff'; x.fillRect(180, MY - 44, 152, 54); x.restore(); }
  if (mad) { x.fillStyle = 'rgba(230,40,40,0.35)'; for (const sg of [-1, 1]) { x.beginPath(); x.ellipse(256 + sg * 118, 318, 44, 24, 0, 0, Math.PI * 2); x.fill(); } }   // red cheeks
  if (mad) {                                              // cartoon anger mark on the forehead
    x.strokeStyle = '#e02424'; x.lineWidth = 12; const ax = 368, ay = 98;
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { x.beginPath(); x.moveTo(ax + dx * 12, ay + dy * 36); x.quadraticCurveTo(ax + dx * 12, ay + dy * 12, ax + dx * 36, ay + dy * 12); x.stroke(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; MOUTHS[key] = t; return t;
}
function makeMouth(skullGeo, at, w) {
  const m = new THREE.Mesh(skullGeo, new THREE.MeshBasicMaterial()); m.updateMatrixWorld(true);
  const geo = new DecalGeometry(m, at, new THREE.Euler(0, 0, 0), new THREE.Vector3(w, w, 0.08));
  const mat = new THREE.MeshStandardMaterial({ map: mouthTex('smile', false, 'boy'), transparent: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -4, depthWrite: false });
  return { geo, mat };
}

// recolour the black kit cloth: dark folds -> dark colour, lit folds -> light colour; bright bits (shoes, metal) kept
function tintMat(base, dark, light, gain = 12, keep = 0.25) {
  const m = base.clone(); const d = new THREE.Color(dark), l = new THREE.Color(light);
  m.onBeforeCompile = (sh) => { sh.uniforms.uD = { value: d }; sh.uniforms.uL = { value: l };
    sh.fragmentShader = 'uniform vec3 uD, uL;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      { float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)); if (lum < ${keep.toFixed(3)}) diffuseColor.rgb = mix(uD, uL, clamp(lum * ${gain.toFixed(1)}, 0.0, 1.0)); }`); };
  m.customProgramCacheKey = () => 'tint' + dark + '_' + light + '_' + gain + '_' + keep; return m;
}

export function buildKitBoy(kitScene, boyScene, opts = {}) {
  const LOOK = opts.look || {};
  const L = Object.assign({ hair: 0, skullS: 1.02, neck: 0.02, neckSink: 0.056, faceAt: 0.46, faceW: 0.1, hairS: 1.12, hairDy: -0.084, hairDz: -0.03, handS: 0.5, pantsSX: 1.22, pantsSY: 1.08, waist: 0.06, waistCut: 0.03, kneeAt: 0.5, kneeBand: 0.016, armX: 0.134, armDy: -0.018, pivIn: 0.045, pivDown: 0.014 }, opts.layout || {});
  let km; kitScene.traverse(o => { if (o.isMesh && !km) km = o; });
  km.updateWorldMatrix(true, false);
  const kg = km.geometry.clone(); kg.applyMatrix4(km.matrixWorld);
  const comps = components(kg), kmat = km.material.clone(); kmat.side = THREE.DoubleSide;
  const topMat = LOOK.top ? tintMat(kmat, ...LOOK.top) : kmat, legMat = LOOK.legs ? tintMat(kmat, ...LOOK.legs) : kmat, hairMat = LOOK.hairColor ? tintMat(kmat, ...LOOK.hairColor, 10, 1.1) : kmat;
  const boy = {}; boyScene.traverse(o => { if (o.isMesh) { o.updateWorldMatrix(true, false); const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); const m = o.material.clone(); m.side = THREE.DoubleSide; boy[o.name] = [g, m]; } });
  const bpart = (i) => boy[`tripo_part_${i}`] || Object.values(boy)[i];

  // ---- layout (kit units) ----
  // legs: the full cargo pants of the kit (shoes included), cut down the middle so each leg can swing
  const pants = pick(comps, KIT.pants).g; pants.computeBoundingBox();
  const pb = pants.boundingBox, pcx = (pb.min.x + pb.max.x) / 2, pcz = (pb.min.z + pb.max.z) / 2;
  pants.translate(-pcx, -pb.min.y, -pcz); pants.scale(L.pantsSX, L.pantsSY, L.pantsSX);
  const LEG_TOP = (pb.max.y - pb.min.y) * L.pantsSY, LX = (pb.max.x - pb.min.x) * L.pantsSX / 4;
  const halves = splitX(pants);
  const HIP = LEG_TOP, CUT = HIP - L.waistCut, KNEE = LEG_TOP * L.kneeAt;
  const TOR_Y = HIP - L.waist, TOR_H = 0.215, TOP = TOR_Y + TOR_H, AX = L.armX, ARM_H = 0.18, ARM_Y = TOP + L.armDy - ARM_H;
  const parts = { head: [], torso: [], armL: [], armR: [], legL: [], legR: [], kneeL: [], kneeR: [] };
  const k = (name) => pick(comps, KIT[name]).g;
  parts.torso.push([placeGeo(k('torso'), { ymin: TOR_Y }), topMat]);
  parts.armL.push([placeGeo(k('armL'), { x: AX, ymin: ARM_Y }), topMat]);
  parts.armR.push([placeGeo(k('armR'), { x: -AX, ymin: ARM_Y }), topMat]);
  // each leg: open waistband removed (hidden under the hoodie anyway), thigh + shin with an overlap band at the knee
  for (const [side, half] of [['L', halves.pos], ['R', halves.neg]]) {
    const leg = keepRange(half, -1, CUT);
    parts['leg' + side].push([keepRange(leg, KNEE - L.kneeBand, 9), legMat]);
    parts['knee' + side].push([keepRange(leg, -1, KNEE + L.kneeBand), legMat]);
  }
  // hands (boy parts 7 = +x, 4 = -x) just under the cuffs
  const [hL, hLm] = bpart(7), [hR, hRm] = bpart(4);
  parts.armL.push([placeGeo(hL, { x: AX, ymin: ARM_Y + 0.02 - 0.111 * L.handS, s: L.handS }), hLm]);
  parts.armR.push([placeGeo(hR, { x: -AX, ymin: ARM_Y + 0.02 - 0.111 * L.handS, s: L.handS }), hRm]);
  // head: kit skull (blank skin, neck sunk into the hood) + upper half of the boy's face (eyes, brows) + drawn mouth
  const HEAD_Y = TOP - L.neckSink;
  const skull = placeGeo(pick(comps, KIT.head).g, { ymin: HEAD_Y, s: L.skullS }); skull.computeBoundingBox();
  const sb = skull.boundingBox; parts.head.push([skull, kmat]);
  const faceY = sb.min.y + L.neck + (sb.max.y - sb.min.y - L.neck) * L.faceAt;
  const mouth = makeMouth(skull, new THREE.Vector3(0, faceY, sb.max.z), L.faceW);
  parts.head.push([mouth.geo, mouth.mat]);
  const headTop = sb.max.y;
  const hairG = pick(comps, KIT.hair[L.hair]).g; hairG.computeBoundingBox();
  parts.head.push([placeGeo(hairG, { ymin: headTop + L.hairDy, z: L.hairDz, s: L.hairS, sy: L.hairSY || 1 }), hairMat]);

  const PIV = { torso: [0, HIP - 0.02, 0], head: [0, TOP, 0], armL: [AX - L.pivIn, ARM_Y + ARM_H - L.pivDown, 0], armR: [-AX + L.pivIn, ARM_Y + ARM_H - L.pivDown, 0], legL: [LX, CUT - 0.012, 0], legR: [-LX, CUT - 0.012, 0], kneeL: [LX, KNEE, 0.004], kneeR: [-LX, KNEE, 0.004] };
  const P = {}, root = new THREE.Group();
  for (const [name, list] of Object.entries(parts)) {
    const piv = new THREE.Group(); piv.position.set(...PIV[name]);
    for (const [g, m] of list) { const me = new THREE.Mesh(g, m); me.castShadow = me.receiveShadow = true; me.position.set(-PIV[name][0], -PIV[name][1], -PIV[name][2]); piv.add(me); }
    P[name] = piv;
  }
  root.add(P.torso, P.legL, P.legR);
  for (const n of ['head', 'armL', 'armR']) { P[n].position.set(PIV[n][0] - PIV.torso[0], PIV[n][1] - PIV.torso[1], PIV[n][2] - PIV.torso[2]); P.torso.add(P[n]); }
  for (const sd of ['L', 'R']) { const kn = P['knee' + sd], lg = P['leg' + sd]; kn.position.set(PIV['knee' + sd][0] - PIV['leg' + sd][0], PIV['knee' + sd][1] - PIV['leg' + sd][1], PIV['knee' + sd][2] - PIV['leg' + sd][2]); lg.add(kn); }
  // hand anchors at the bottom of each arm (props are parented here)
  const hands = {}; root.updateMatrixWorld(true);
  for (const sd of ['L', 'R']) { const a = P['arm' + sd], bb = new THREE.Box3(); a.traverse(o => { if (o.isMesh) { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); bb.union(b); } });
    const lo = a.worldToLocal(new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.min.y + (bb.max.y - bb.min.y) * 0.04, (bb.min.z + bb.max.z) / 2)); const h = new THREE.Object3D(); h.position.copy(lo); a.add(h); hands[sd] = h; }
  const fullH = headTop + 0.05;
  const holder = new THREE.Group(); holder.add(root); holder.scale.setScalar((opts.height || 1.95) / fullH);

  // ---- motion: R6 parts + knees, hip turn, side sway, head that stays steady and a slight lag on the arms ----
  const LEG = PIV.legL[1], REST_ARM = 0.07;
  const GAIT = { walk: { f: 1.15, A: 0.42, arm: 0.42, K: 0.75, lean: 0.04, bob: 0.006 }, run: { f: 2.0, A: 0.72, arm: 0.9, K: 1.35, lean: 0.17, bob: 0.014 } };
  const reset = () => { for (const kk in P) P[kk].rotation.set(0, 0, 0); root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); P.armL.rotation.z = REST_ARM; P.armR.rotation.z = -REST_ARM; };
  const pos01 = (x) => Math.max(0, x);
  function compute(st, t) {
    reset(); const br = Math.sin(t * 2.0);
    if (st === 'idle') {
      const w = Math.sin(t * 0.55);                                   // slow weight shift from one leg to the other
      root.position.x = 0.006 * w; P.torso.rotation.z = -0.02 * w; P.torso.rotation.x = 0.012 * br;
      P.kneeL.rotation.x = 0.1 * pos01(-w); P.kneeR.rotation.x = 0.1 * pos01(w); P.legL.rotation.x = -0.04 * pos01(-w); P.legR.rotation.x = -0.04 * pos01(w);
      root.position.y = -0.003 * Math.abs(w);
      P.armL.rotation.x = 0.05 * Math.sin(t * 2 + 0.4); P.armR.rotation.x = 0.05 * Math.sin(t * 2 + 1.1); P.armL.rotation.z += 0.03 * br; P.armR.rotation.z -= 0.03 * br;
      P.head.rotation.y = 0.28 * Math.sin(t * 0.45) * Math.sin(t * 0.17 + 1); P.head.rotation.x = 0.04 * Math.sin(t * 0.8) - 0.012 * br; P.head.rotation.z = 0.02 * w;
    } else if (st === 'walk' || st === 'run') {
      const G = GAIT[st], ph = t * G.f * Math.PI * 2, s = Math.sin(ph), c = Math.cos(ph);
      P.legL.rotation.x = -G.A * s; P.legR.rotation.x = G.A * s;
      P.kneeL.rotation.x = 0.06 + G.K * pos01(c) ** 1.4; P.kneeR.rotation.x = 0.06 + G.K * pos01(-c) ** 1.4;   // knee bends while the leg swings forward
      if (st === 'run') { P.legL.rotation.x -= 0.15; P.legR.rotation.x -= 0.15; }
      P.armL.rotation.x = G.arm * Math.sin(ph - 0.3); P.armR.rotation.x = -G.arm * Math.sin(ph - 0.3);
      P.armL.rotation.z += 0.04 * Math.abs(s); P.armR.rotation.z -= 0.04 * Math.abs(s);
      if (st === 'run') { P.armL.rotation.x -= 0.25; P.armR.rotation.x -= 0.25; }
      root.position.y = (1 - Math.cos(G.A)) * LEG - (1 - Math.cos(G.A * s)) * LEG - G.bob * (1 - Math.abs(c));
      root.position.x = 0.007 * s;                                     // weight over the planted foot
      root.rotation.y = 0.1 * G.A * s;                                 // hips turn with the stride...
      P.torso.rotation.y = -0.22 * G.A * s;                            // ...shoulders turn the other way
      P.torso.rotation.z = -0.025 * s; P.torso.rotation.x = G.lean + 0.015 * Math.cos(2 * ph);
      P.head.rotation.y = -(root.rotation.y + P.torso.rotation.y) * 0.85; P.head.rotation.x = -G.lean * 0.6 + 0.02 * Math.sin(2 * ph - 0.6); P.head.rotation.z = 0.02 * s;
    } else if (st === 'jump' || st === 'celebrate') {
      const cyc = (t * 1.4) % 1, up = Math.sin(Math.PI * clamp01(cyc / 0.65)), crouch = cyc > 0.65 ? Math.sin(Math.PI * (cyc - 0.65) / 0.35) : 0;
      root.position.y = 0.035 * up - 0.012 * crouch;
      const a = st === 'celebrate' ? 2.2 + 0.12 * Math.sin(t * 10) : 2.2 * up;
      P.armL.rotation.z = a; P.armR.rotation.z = -a;
      P.legL.rotation.x = -0.25 * up - 0.2 * crouch; P.legR.rotation.x = 0.1 * up - 0.2 * crouch;
      P.kneeL.rotation.x = 0.45 * up + 0.4 * crouch; P.kneeR.rotation.x = 0.2 * up + 0.4 * crouch;
      P.torso.rotation.x = 0.06 * crouch - 0.04 * up; P.head.rotation.x = -0.12 * up; P.head.rotation.z = 0.06 * Math.sin(t * 5);
    } else if (st === 'point') {
      P.armR.rotation.x = -1.45 + 0.03 * br; P.armR.rotation.z = -0.05; P.torso.rotation.y = -0.12; P.torso.rotation.x = 0.04; P.head.rotation.y = -0.15; P.head.rotation.x = 0.03 * br;
      P.armL.rotation.x = 0.06; P.legR.rotation.x = -0.12; P.kneeR.rotation.x = 0.1; P.kneeL.rotation.x = 0.06;
    } else if (st === 'scared') {
      const sh = Math.sin(t * 38) * 0.035; P.armL.rotation.x = -1.5 + sh; P.armR.rotation.x = -1.5 - sh; P.armL.rotation.z = -0.2; P.armR.rotation.z = 0.2;
      P.torso.rotation.x = -0.12; P.head.rotation.x = 0.1 + sh; root.position.y = -0.01;
      P.legL.rotation.x = -0.15; P.kneeL.rotation.x = 0.3; P.legR.rotation.x = 0.1; P.kneeR.rotation.x = 0.18;
    } else if (st === 'cry') {
      const sob = Math.max(0, Math.sin(t * 6)) * 0.08; P.armL.rotation.x = -2.2; P.armR.rotation.x = -2.2; P.armL.rotation.z = -0.45; P.armR.rotation.z = 0.45;
      P.head.rotation.x = 0.35 + sob; P.torso.rotation.x = 0.12 + sob * 0.5; P.kneeL.rotation.x = 0.12; P.kneeR.rotation.x = 0.12; root.position.y = -0.004;
    } else if (st === 'wave') {
      P.armR.rotation.z = -2.5 + 0.25 * Math.sin(t * 9); P.head.rotation.z = 0.08; P.torso.rotation.z = 0.04; P.kneeL.rotation.x = 0.08;
    } else if (st === 'cross') {                                       // arms crossed, weight on one leg, chin up (Kaio)
      P.armL.rotation.x = -1.3; P.armL.rotation.z = -0.62; P.armR.rotation.x = -1.18; P.armR.rotation.z = 0.62;
      P.head.rotation.x = -0.1; P.head.rotation.y = 0.12 * Math.sin(t * 0.5); P.torso.rotation.x = -0.04; root.position.x = 0.01; P.legR.rotation.z = -0.08; P.kneeL.rotation.x = 0.12;
    } else if (st === 'fallBack') {                                    // falling on his back (Kaio at the end)
      root.rotation.x = -0.75; root.position.y = -LEG * 0.55; root.position.z = -LEG * 0.25;
      P.legL.rotation.x = -1.0; P.legR.rotation.x = -0.6; P.kneeL.rotation.x = 0.5; P.kneeR.rotation.x = 0.2;
      P.armL.rotation.z = 2.3; P.armR.rotation.z = -2.0; P.armL.rotation.x = -0.6; P.armR.rotation.x = -0.3; P.head.rotation.x = 0.35;
    } else if (st === 'sit') {                                         // sitting on the ground holding something on the lap
      root.position.y = -LEG * 0.93; P.legL.rotation.x = -1.45; P.legR.rotation.x = -1.45; P.legL.rotation.z = 0.12; P.legR.rotation.z = -0.12;
      P.armL.rotation.x = -0.75; P.armR.rotation.x = -0.75; P.armL.rotation.z = -0.32; P.armR.rotation.z = 0.32; P.head.rotation.x = 0.28; P.torso.rotation.x = 0.08 + 0.01 * br;
    } else if (st === 'pickup') {                                      // crouched, right hand reaching to the floor
      root.position.y = -LEG * 0.42; P.legL.rotation.x = -1.15; P.kneeL.rotation.x = 1.85; P.legR.rotation.x = -0.6; P.kneeR.rotation.x = 1.6;
      P.torso.rotation.x = 0.55; P.armR.rotation.x = -0.35; P.armR.rotation.z = 0.12; P.armL.rotation.x = -0.2; P.armL.rotation.z = 0.25; P.head.rotation.x = 0.15;
    } else if (st === 'holdUp') {                                      // both hands up holding the prize
      const b = 0.02 * Math.sin(t * 6); P.armL.rotation.z = 2.75; P.armR.rotation.z = -2.75; P.armL.rotation.x = -0.25; P.armR.rotation.x = -0.25;
      P.head.rotation.x = -0.35; P.torso.rotation.x = -0.08; root.position.y = b; P.kneeL.rotation.x = 0.06;
    } else if (st === 'lookUp') {
      P.head.rotation.x = -0.55; P.torso.rotation.x = -0.1; P.armR.rotation.x = -2.6; P.armR.rotation.z = -0.1; P.armL.rotation.x = 0.05;
    } else if (st === 'laugh') {                                       // leaning back laughing, pointing
      const h = Math.abs(Math.sin(t * 9)) * 0.05; P.torso.rotation.x = -0.18 - h; P.head.rotation.x = -0.2 - h; P.armR.rotation.x = -1.4; P.armR.rotation.z = -0.05;
      P.armL.rotation.x = -0.6; P.armL.rotation.z = -0.55; P.kneeL.rotation.x = 0.08;
    } else if (st === 'sad') {
      P.head.rotation.x = 0.4; P.torso.rotation.x = 0.14; P.armL.rotation.z = 0.02; P.armR.rotation.z = -0.02; P.armL.rotation.x = 0.1; P.armR.rotation.x = 0.1;
    } else if (st === 'carry' || st === 'carryWalk') {               // carrying something in both arms (walking or standing)
      if (st === 'carryWalk') compute('walk', t); else { P.head.rotation.x = 0.25; }
      P.armL.rotation.x = -1.05; P.armR.rotation.x = -1.05; P.armL.rotation.z = -0.38; P.armR.rotation.z = 0.38; P.head.rotation.x = 0.28; P.torso.rotation.x = 0.03;
    } else if (st === 'angry') {                                      // furious: fists down, leaning in, stamping his feet
      const st8 = Math.sin(t * 9), up = Math.max(0, st8), dn = Math.max(0, -st8);
      P.armL.rotation.z = 0.32; P.armR.rotation.z = -0.32; P.armL.rotation.x = 0.25 + 0.15 * up; P.armR.rotation.x = 0.25 + 0.15 * dn;
      P.torso.rotation.x = 0.16; P.head.rotation.x = -0.12 + 0.05 * Math.sin(t * 17); P.head.rotation.y = 0.1 * Math.sin(t * 3);
      P.legL.rotation.x = -0.45 * up; P.kneeL.rotation.x = 0.8 * up; P.legR.rotation.x = -0.45 * dn; P.kneeR.rotation.x = 0.8 * dn; root.position.y = -0.01 * Math.abs(st8);
    } else if (st === 'cheer') {
      P.armR.rotation.z = -2.6; P.armR.rotation.x = -0.4; P.armL.rotation.x = -0.9; P.head.rotation.x = -0.1; root.position.y = 0.02 * Math.abs(Math.sin(t * 6));
    }
  }
  const MOUTH_OF = { idle: 'smile', walk: 'smile', run: 'o', jump: 'happy', celebrate: 'happy', point: 'talk', scared: 'o', cry: 'sad', wave: 'happy', cross: 'smirk', fallBack: 'o', sit: 'smile', pickup: 'neutral', holdUp: 'happy', lookUp: 'o', laugh: 'happy', sad: 'sad', cheer: 'happy', carry: 'smile', carryWalk: 'smile', angry: 'mad' };
  let cur = null, prev = null, ct = 0;
  const all = [root, ...Object.values(P)], snap = () => all.map(o => [o.position.clone(), o.quaternion.clone()]);
  holder.userData = {
    parts: P, hands,
    speed(st) { const G = GAIT[st]; return G ? 4 * LEG * Math.sin(G.A) * G.f * holder.scale.x : 0; },
    // o = { mouth: 'smile'|'talk'|'happy'|'o'|'sad'|'neutral', talk: true }  (talk = mouth opens and closes)
    pose(st, t, o = {}) {
      let mk = o.mouth || (LOOK.mouth && (MOUTH_OF[st] === 'smile' || !MOUTH_OF[st]) ? LOOK.mouth : MOUTH_OF[st]) || 'smile';
      if (o.talk && (mk === 'mad' || mk === 'yell')) { const v = Math.sin(t * 13) + 0.6 * Math.sin(t * 21.3); mk = v > -0.6 ? 'yell' : 'mad'; }
      else if (o.talk) { const v = Math.sin(t * 15) + 0.6 * Math.sin(t * 23.7); mk = v > 0.5 ? 'happy' : v > -0.3 ? 'talk' : (mk === 'sad' ? 'sad' : 'neutral'); }
      const blink = ((t + 1.6) % 3.7) < 0.12 && mk !== 'o';
      mouth.mat.map = mouthTex(mk, blink, LOOK.face || 'boy');
      if (st !== cur) { prev = cur; cur = st; ct = t; }
      const w = prev ? clamp01((t - ct) / 0.2) : 1;
      if (w < 1) { compute(prev, t); const A = snap(); compute(cur, t); const B = snap(); const e = ease(w); all.forEach((o, i) => { o.position.lerpVectors(A[i][0], B[i][0], e); o.quaternion.slerpQuaternions(A[i][1], B[i][1], e); }); }
      else compute(cur, t);
    },
  };
  return holder;
}
