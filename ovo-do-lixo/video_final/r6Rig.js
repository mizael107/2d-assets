// Roblox R6-style rig: the boy is cut into 6 rigid parts (head, torso, 2 arms, 2 legs) that only rotate at the joints.
// Nothing deforms, so legs/hands can't bend wrong. Model faces +Z, feet at y=0, height ~0.65 (Tripo units).
import * as THREE from 'three';

const J = { hip: 0.205, legX: 0.06, shoulderY: 0.395, shoulderX: 0.112, neck: 0.432 };
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (x) => x * x * (3 - 2 * x);

function partOf(x, y) {
  const ax = Math.abs(x);
  if (y > 0.43) return 'head';
  if (ax > 0.1 && y > 0.205 && y < 0.415) return x > 0 ? 'armL' : 'armR';
  if (y < 0.212) return x > 0 ? 'legL' : 'legR';
  return 'torso';
}

export function buildR6(baseScene, opts = {}) {
  let src; baseScene.traverse(n => { if (n.isMesh && !src) src = n; });
  src.updateWorldMatrix(true, false);
  const g = src.geometry.clone(); g.applyMatrix4(src.matrixWorld);
  const pos = g.attributes.position, idx = g.index.array;
  const buckets = { head: [], torso: [], armL: [], armR: [], legL: [], legR: [] };
  // connected pieces (merging vertices at the same spot): small pieces sitting mostly above the neck are hair -> head
  const n = pos.count, par = new Int32Array(n).map((_, i) => i);
  const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  const key = new Map();
  for (let i = 0; i < n; i++) { const k = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`; if (key.has(k)) par[find(i)] = find(key.get(k)); else key.set(k, i); }
  for (let t = 0; t < idx.length; t += 3) { par[find(idx[t + 1])] = find(idx[t]); par[find(idx[t + 2])] = find(idx[t]); }
  const comp = new Map();
  for (let i = 0; i < n; i++) { const r = find(i); const c = comp.get(r) || { y: 0, n: 0, ymax: -1 }; c.y += pos.getY(i); c.n++; c.ymax = Math.max(c.ymax, pos.getY(i)); comp.set(r, c); }
  const isHair = (v) => { const c = comp.get(find(v)); return c.n < n * 0.2 && c.y / c.n > 0.36; };
  // every limb also keeps a band of cloth that overlaps into the torso (and the torso keeps its own),
  // so when a part rotates the cut edge stays hidden inside the neighbour instead of looking torn
  const OV = 0.035;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    if (isHair(a)) { buckets.head.push(a, b, c); continue; }
    const cx = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3, cy = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3;
    const ax = Math.abs(cx), side = cx > 0 ? 'L' : 'R';
    let main = partOf(cx, cy);
    if (main.startsWith('arm')) {
      const pv = [a, b, c].map(v => partOf(pos.getX(v), pos.getY(v)));
      if (pv.includes('head')) main = 'head';
      else if (pv.some(q => !q.startsWith('arm')) || [a, b, c].some(v => Math.abs(pos.getX(v)) < 0.109)) main = 'torso';
    }
    // shoulder: the round top of the sleeve stays on the torso; the arm swings out from under it (both keep an overlap band)
    if (main.startsWith('arm') && cy > 0.375) { buckets.torso.push(a, b, c); if (cy < 0.392) buckets[main].push(a, b, c); continue; }
    if (main === 'torso' && ax > 0.1 && cy > 0.35 && cy < 0.376) buckets['arm' + side].push(a, b, c);
    buckets[main].push(a, b, c);
    // overlaps
    if (main === 'torso' && cy < J.hip + OV && cy > J.hip - 0.01) buckets['leg' + side].push(a, b, c);        // pants waist also on the leg
    if (main.startsWith('leg') && cy > J.hip - OV) buckets.torso.push(a, b, c);                                  // leg top also on torso
    if (main === 'head' && cy < J.neck + 0.015) buckets.torso.push(a, b, c);                                   // neck
  }
  const mat = src.material.clone(); mat.side = THREE.DoubleSide;
  const pivots = {
    torso: [0, J.hip, 0], head: [0, J.neck, 0],
    armL: [J.shoulderX, J.shoulderY, 0], armR: [-J.shoulderX, J.shoulderY, 0],
    legL: [J.legX, J.hip, 0], legR: [-J.legX, J.hip, 0],
  };
  const root = new THREE.Group();            // moves the whole body (bob / jump)
  const P = {};
  for (const [name, list] of Object.entries(buckets)) {
    const geo = g.clone(); geo.setIndex(list);
    const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = mesh.receiveShadow = true;
    const piv = new THREE.Group(); piv.position.set(...pivots[name]);
    mesh.position.set(-pivots[name][0], -pivots[name][1], -pivots[name][2]);
    piv.add(mesh); P[name] = piv;
  }
  // hierarchy: root > torso > (head, arms); root > legs
  root.add(P.torso, P.legL, P.legR);
  for (const n of ['head', 'armL', 'armR']) { const w = new THREE.Vector3(...pivots[n]); P[n].position.copy(w.sub(new THREE.Vector3(...pivots.torso))); P.torso.add(P[n]); }
  const holder = new THREE.Group(); holder.add(root);
  holder.scale.setScalar((opts.height || 1.95) / 0.648);

  const GAIT = { walk: { f: 1.25, A: 0.45, arm: 0.45 }, run: { f: 2.2, A: 0.85, arm: 0.95 } };
  const LEG = J.hip;
  const reset = () => { for (const k in P) P[k].rotation.set(0, 0, 0); root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); };

  function compute(st, t) {
    reset();
    const br = Math.sin(t * 2.0);
    if (st === 'idle') {
      P.armL.rotation.x = 0.04 * br; P.armR.rotation.x = -0.04 * br;
      P.head.rotation.y = 0.25 * Math.sin(t * 0.5); P.head.rotation.x = 0.03 * Math.sin(t * 0.9);
      P.torso.rotation.x = 0.01 * br;
    } else if (st === 'walk' || st === 'run') {
      const G = GAIT[st], ph = t * G.f * Math.PI * 2, s = Math.sin(ph);
      P.legL.rotation.x = -G.A * s; P.legR.rotation.x = G.A * s;
      P.armL.rotation.x = G.arm * s; P.armR.rotation.x = -G.arm * s;
      root.position.y = (1 - Math.cos(G.A * s)) * LEG * -1 + (1 - Math.cos(G.A)) * LEG;   // keeps the planted foot on the ground
      P.torso.rotation.x = st === 'run' ? 0.12 : 0.03; P.head.rotation.x = st === 'run' ? -0.08 : 0;
      P.torso.rotation.y = 0.05 * s;
    } else if (st === 'jump' || st === 'celebrate') {
      const c = (t * 1.4) % 1, up = Math.sin(Math.PI * clamp01(c / 0.65));
      root.position.y = 0.09 * up;
      const arms = st === 'celebrate' ? 2.45 + 0.2 * Math.sin(t * 10) : 2.3 * up;
      P.armL.rotation.x = -arms * 0.75; P.armR.rotation.x = -arms * 0.75;
      P.armL.rotation.z = arms * 0.25; P.armR.rotation.z = -arms * 0.25;
      P.legL.rotation.x = -0.35 * up; P.legR.rotation.x = 0.15 * up;
      P.head.rotation.x = -0.15 * up;
    } else if (st === 'point') {
      P.armR.rotation.x = -1.45; P.armR.rotation.z = -0.1;
      P.torso.rotation.y = -0.12; P.head.rotation.y = -0.15;
      P.armL.rotation.x = 0.05 * br;
    } else if (st === 'scared') {
      const sh = Math.sin(t * 38) * 0.04;
      P.armL.rotation.x = -1.6 + sh; P.armR.rotation.x = -1.6 - sh; P.armL.rotation.z = -0.35; P.armR.rotation.z = 0.35;
      P.torso.rotation.x = -0.12; P.head.rotation.x = 0.12 + sh;
      P.legL.rotation.x = 0.12; P.legR.rotation.x = -0.12;
    } else if (st === 'cry') {
      const sob = Math.max(0, Math.sin(t * 6)) * 0.08;
      P.armL.rotation.x = -2.3; P.armR.rotation.x = -2.3; P.armL.rotation.z = -0.55; P.armR.rotation.z = 0.55;
      P.head.rotation.x = 0.35 + sob; P.torso.rotation.x = 0.12 + sob * 0.5;
    } else if (st === 'wave') {
      P.armR.rotation.z = -2.6; P.armR.rotation.x = -0.2 + 0.0; P.armR.rotation.y = 0.4 * Math.sin(t * 9);
      P.head.rotation.z = 0.08;
    }
  }

  let cur = null, prev = null, ct = 0;
  const snap = () => [root, ...Object.values(P)].map(o => [o.position.clone(), o.quaternion.clone()]);
  holder.userData = {
    parts: P,
    speed(st) { const G = GAIT[st]; return G ? 4 * LEG * Math.sin(G.A) * G.f * holder.scale.x : 0; },
    pose(st, t) {
      if (st !== cur) { prev = cur; cur = st; ct = t; }
      const w = prev ? clamp01((t - ct) / 0.2) : 1;
      if (w < 1) {
        compute(prev, t); const A = snap(); compute(cur, t); const B = snap(); const e = ease(w);
        [root, ...Object.values(P)].forEach((o, i) => { o.position.lerpVectors(A[i][0], B[i][0], e); o.quaternion.slerpQuaternions(A[i][1], B[i][1], e); });
      } else compute(cur, t);
    },
  };
  return holder;
}
