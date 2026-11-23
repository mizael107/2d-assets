// R6 rig for the multi-part Tripo boy (boy_r6_lite.glb): 12 meshes, faces +Z, feet at y=0, height ~0.98.
// Parts are rigid (no skinning). Hands/shoes/face are separate meshes; hoodie and pants are split with overlap bands.
import * as THREE from 'three';
const clamp01 = (x) => Math.min(1, Math.max(0, x)), ease = (x) => x * x * (3 - 2 * x);

const PIV = { torso: [0, 0.3, 0], head: [0, 0.68, 0], armL: [0.185, 0.635, -0.01], armR: [-0.185, 0.635, -0.01], legL: [0.1, 0.3, 0], legR: [-0.1, 0.3, 0] };
const REST_ARM = 0.22;   // A-pose: lower the arms a bit toward the body at rest

function hoodiePart(x, y) {          // sleeve boundary follows the shoulder line
  const ax = Math.abs(x); const edge = y < 0.56 ? 0.148 : 0.148 + (y - 0.56) * 0.55;
  return ax > edge ? (x > 0 ? 'armL' : 'armR') : 'torso';
}

export function buildR6v2(scene, opts = {}) {
  const meshes = []; scene.traverse(o => { if (o.isMesh) meshes.push(o); });
  const groups = { head: [], torso: [], armL: [], armR: [], legL: [], legR: [] };
  const add = (part, geo, mat) => groups[part].push([geo, mat]);
  for (const m of meshes) {
    m.updateWorldMatrix(true, false);
    const g = m.geometry.clone(); g.applyMatrix4(m.matrixWorld); g.computeBoundingBox();
    const bb = g.boundingBox, cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2, w = bb.max.x - bb.min.x;
    const mat = m.material.clone(); mat.side = THREE.DoubleSide;
    if (cy > 0.68 || (cy > 0.66 && w < 0.25)) { add('head', g, mat); continue; }                   // hair, face, eyes
    if (w < 0.2 && cy > 0.3 && cy < 0.5 && Math.abs(cx) > 0.2) { add(cx > 0 ? 'armL' : 'armR', g, mat); continue; } // hands
    if (cy < 0.1) { add(cx > 0 ? 'legL' : 'legR', g, mat); continue; }                           // shoes
    if (w < 0.1) { add('torso', g, mat); continue; }                                             // drawstrings
    const pos = g.attributes.position, idx = g.index.array, buckets = {};
    const push = (k, a, b, c) => (buckets[k] = buckets[k] || []).push(a, b, c);
    const isHoodie = cy > 0.45;
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t], b = idx[t + 1], c = idx[t + 2];
      const x = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3, y = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3;
      if (isHoodie) {
        const p = hoodiePart(x, y); push(p, a, b, c);
        // overlap bands: torso keeps the shoulder cap, the arm keeps a strip of the hoodie side
        if (p !== 'torso' && y > 0.6 && Math.abs(x) < 0.175) push('torso', a, b, c);
        if (p === 'torso' && Math.abs(x) > 0.13 && y > 0.52 && y < 0.6) push(x > 0 ? 'armL' : 'armR', a, b, c);
      } else {                                                                                   // pants
        const leg = x > 0 ? 'legL' : 'legR';
        if (y < 0.33) push(leg, a, b, c);
        if (y > 0.27) push('torso', a, b, c);
      }
    }
    for (const [k, list] of Object.entries(buckets)) { const gg = g.clone(); gg.setIndex(list); add(k, gg, mat); }
  }
  const P = {}, root = new THREE.Group();
  for (const [k, list] of Object.entries(groups)) {
    const piv = new THREE.Group(); piv.position.set(...PIV[k]);
    for (const [g, mat] of list) { const me = new THREE.Mesh(g, mat); me.castShadow = me.receiveShadow = true; me.position.set(-PIV[k][0], -PIV[k][1], -PIV[k][2]); piv.add(me); }
    P[k] = piv;
  }
  root.add(P.torso, P.legL, P.legR);
  for (const n of ['head', 'armL', 'armR']) { P[n].position.set(PIV[n][0] - PIV.torso[0], PIV[n][1] - PIV.torso[1], PIV[n][2] - PIV.torso[2]); P.torso.add(P[n]); }
  const holder = new THREE.Group(); holder.add(root); holder.scale.setScalar((opts.height || 1.95) / 0.978);

  const GAIT = { walk: { f: 1.25, A: 0.45, arm: 0.45 }, run: { f: 2.2, A: 0.85, arm: 0.95 } }, LEG = 0.3;
  const reset = () => { for (const k in P) P[k].rotation.set(0, 0, 0); root.position.set(0, 0, 0); P.armL.rotation.z = -REST_ARM; P.armR.rotation.z = REST_ARM; };
  function compute(st, t) {
    reset(); const br = Math.sin(t * 2.0);
    if (st === 'idle') { P.armL.rotation.x = 0.04 * br; P.armR.rotation.x = -0.04 * br; P.head.rotation.y = 0.25 * Math.sin(t * 0.5); P.head.rotation.x = 0.03 * Math.sin(t * 0.9); }
    else if (st === 'walk' || st === 'run') {
      const G = GAIT[st], s = Math.sin(t * G.f * Math.PI * 2);
      P.legL.rotation.x = -G.A * s; P.legR.rotation.x = G.A * s; P.armL.rotation.x = G.arm * s; P.armR.rotation.x = -G.arm * s;
      root.position.y = (1 - Math.cos(G.A)) * LEG - (1 - Math.cos(G.A * s)) * LEG;
      P.torso.rotation.x = st === 'run' ? 0.12 : 0.03; P.torso.rotation.y = 0.05 * s;
    } else if (st === 'jump' || st === 'celebrate') {
      const c = (t * 1.4) % 1, up = Math.sin(Math.PI * clamp01(c / 0.65)); root.position.y = 0.1 * up;
      const a = st === 'celebrate' ? 2.5 + 0.15 * Math.sin(t * 10) : 2.2 * up;
      P.armL.rotation.z = -REST_ARM + a * 0.95; P.armR.rotation.z = REST_ARM - a * 0.95;
      P.legL.rotation.x = -0.3 * up; P.legR.rotation.x = 0.12 * up; P.head.rotation.x = -0.12 * up;
    } else if (st === 'point') { P.armR.rotation.x = -1.4; P.armR.rotation.z = -0.05; P.torso.rotation.y = -0.1; P.head.rotation.y = -0.15; }
    else if (st === 'scared') { const sh = Math.sin(t * 38) * 0.04; P.armL.rotation.x = -1.5 + sh; P.armR.rotation.x = -1.5 - sh; P.torso.rotation.x = -0.1; P.head.rotation.x = 0.1 + sh; }
    else if (st === 'cry') { const sob = Math.max(0, Math.sin(t * 6)) * 0.08; P.armL.rotation.x = -2.2; P.armR.rotation.x = -2.2; P.armL.rotation.z = -0.5; P.armR.rotation.z = 0.5; P.head.rotation.x = 0.35 + sob; P.torso.rotation.x = 0.1 + sob * 0.5; }
    else if (st === 'wave') { P.armR.rotation.z = -2.6 + 0.25 * Math.sin(t * 9); P.head.rotation.z = 0.08; }
  }
  let cur = null, prev = null, ct = 0;
  const all = [root, ...Object.values(P)], snap = () => all.map(o => [o.position.clone(), o.quaternion.clone()]);
  holder.userData = {
    parts: P,
    speed(st) { const G = GAIT[st]; return G ? 4 * LEG * Math.sin(G.A) * G.f * holder.scale.x : 0; },
    pose(st, t) {
      if (st !== cur) { prev = cur; cur = st; ct = t; }
      const w = prev ? clamp01((t - ct) / 0.2) : 1;
      if (w < 1) { compute(prev, t); const A = snap(); compute(cur, t); const B = snap(); const e = ease(w); all.forEach((o, i) => { o.position.lerpVectors(A[i][0], B[i][0], e); o.quaternion.slerpQuaternions(A[i][1], B[i][1], e); }); }
      else compute(cur, t);
    },
  };
  return holder;
}
