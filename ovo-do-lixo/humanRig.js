// Auto-rig for the Tripo blocky protagonist (single mesh, faces +Z, feet at y=0, height ~0.65).
import * as THREE from 'three';

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeInOut = (x) => x * x * (3 - 2 * x);

// joints measured on the model
const J = {
  hips: [0, 0.205, 0], spine: [0, 0.30, 0], chest: [0, 0.37, 0], head: [0, 0.44, -0.005],
  shoulderL: [0.125, 0.395, 0], elbowL: [0.168, 0.31, 0], shoulderR: [-0.125, 0.395, 0], elbowR: [-0.168, 0.31, 0],
  legL: [0.085, 0.205, 0], kneeL: [0.085, 0.105, 0], legR: [-0.085, 0.205, 0], kneeR: [-0.085, 0.105, 0],
};
const PARENT = { hips: 'root', spine: 'hips', chest: 'spine', head: 'chest', shoulderL: 'chest', elbowL: 'shoulderL', shoulderR: 'chest', elbowR: 'shoulderR', legL: 'hips', kneeL: 'legL', legR: 'hips', kneeR: 'legR' };

export function buildHuman(baseScene, opts = {}) {
  let src; baseScene.traverse(n => { if (n.isMesh && !src) src = n; });
  src.updateWorldMatrix(true, false);
  const geo = src.geometry.clone(); geo.applyMatrix4(src.matrixWorld);   // bake node translation
  const pos = geo.attributes.position, N = pos.count;

  const B = { root: new THREE.Bone() }; B.root.name = 'root'; B.root.userData.rest = new THREE.Vector3();
  for (const k of Object.keys(J)) { const b = new THREE.Bone(); b.name = k; b.userData.rest = new THREE.Vector3(...J[k]); B[k] = b; }
  for (const [c, p] of Object.entries(PARENT)) { B[p].add(B[c]); B[c].position.copy(B[c].userData.rest).sub(B[p].userData.rest); }
  const order = ['root', ...Object.keys(J)]; const bones = order.map(k => B[k]); const I = Object.fromEntries(order.map((k, i) => [k, i]));

  // ---- weights ----
  const si = new Uint16Array(N * 4), sw = new Float32Array(N * 4);
  const set = (i, list) => { list.sort((a, b) => b[1] - a[1]); const tot = list.slice(0, 4).reduce((a, b) => a + b[1], 0) || 1; list.slice(0, 4).forEach(([bn, w], k) => { si[i * 4 + k] = I[bn]; sw[i * 4 + k] = w / tot; }); };
  for (let i = 0; i < N; i++) {
    const x = pos.getX(i), y = pos.getY(i), ax = Math.abs(x), side = x >= 0 ? 'L' : 'R';
    const torsoHalf = 0.098;
    if (y < 0.215 && ax < 0.16) {                                   // legs
      const k = ss(0.09, 0.125, y);                                 // 1 = thigh, 0 = shin
      const h = ss(0.19, 0.225, y);                                 // blend into hips at the top
      set(i, [['knee' + side, (1 - k) * (1 - h)], ['leg' + side, k * (1 - h)], ['hips', h]]);
    } else if (ax > torsoHalf + 0.004 && y > 0.205 && y < 0.415) {  // arms
      const sh = ss(0.37, 0.405, y) * ss(0.13, 0.105, ax);           // blend to chest near the shoulder
      const e = ss(0.29, 0.33, y);                                   // 1 = upper arm, 0 = forearm
      set(i, [['elbow' + side, (1 - e) * (1 - sh)], ['shoulder' + side, e * (1 - sh)], ['chest', sh]]);
    } else if (y > 0.43) {                                           // head (+ neck blend)
      const h = ss(0.425, 0.455, y);
      set(i, [['head', h], ['chest', 1 - h]]);
    } else {                                                         // torso
      const a = ss(0.24, 0.29, y), b = ss(0.33, 0.37, y);
      set(i, [['hips', 1 - a], ['spine', a * (1 - b)], ['chest', b]]);
    }
  }
  // cut the faces that glue the inner sleeve to the side of the hoodie (they stretch when the arm moves)
  {
    const reg = (i) => { const x = pos.getX(i), y = pos.getY(i), ax = Math.abs(x);
      if (y < 0.215 && ax < 0.16) return 0; if (ax > 0.102 && y > 0.205 && y < 0.415) return 1; if (y > 0.43) return 2; return 3; };
    const idx = geo.index.array, keep = [];
    for (let t = 0; t < idx.length; t += 3) {
      const r = [reg(idx[t]), reg(idx[t + 1]), reg(idx[t + 2])];
      const cy = (pos.getY(idx[t]) + pos.getY(idx[t + 1]) + pos.getY(idx[t + 2])) / 3;
      const bridge = r.includes(1) && r.some(q => q !== 1) && cy < 0.375;
      if (!bridge) keep.push(idx[t], idx[t + 1], idx[t + 2]);
    }
    geo.setIndex(keep);
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  const mat = src.material.clone(); mat.side = THREE.DoubleSide;
  const mesh = new THREE.SkinnedMesh(geo, mat);
  mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
  mesh.add(B.root); mesh.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton(bones));

  const holder = new THREE.Group(); holder.add(mesh); holder.scale.setScalar(opts.scale || 3);

  // ---- poses ----
  const V0 = new THREE.Vector3();
  const rest = () => bones.forEach(b => { b.position.copy(b.userData.rest).sub(b.parent.isBone ? b.parent.userData.rest : V0); b.rotation.set(0, 0, 0); b.scale.set(1, 1, 1); });
  const GAIT = { walk: { f: 1.7, A: 0.42, knee: 0.75, arm: 0.45, bob: 0.006, lean: 0.04 }, run: { f: 2.8, A: 0.75, knee: 1.4, arm: 0.95, bob: 0.014, lean: 0.22 } };
  const LEG = 0.205;
  const gaitSpeed = (g) => 4 * LEG * Math.sin(g.A) * g.f;

  function gait(g, t) {
    const ph = t * g.f * Math.PI * 2, s = Math.sin(ph), c = Math.cos(ph);
    // legs: forward = negative x-rotation; knee bends while the leg swings forward (lifted)
    B.legL.rotation.x = -g.A * s; B.legR.rotation.x = g.A * s;
    B.kneeL.rotation.x = g.knee * Math.max(0, c) ** 1.5; B.kneeR.rotation.x = g.knee * Math.max(0, -c) ** 1.5;
    // arms swing opposite to legs, elbows slightly bent
    B.shoulderL.rotation.x = g.arm * s; B.shoulderR.rotation.x = -g.arm * s;
    B.shoulderL.rotation.z = -0.12; B.shoulderR.rotation.z = 0.12;              // bring arms closer to the body
    B.elbowL.rotation.x = -0.35 - 0.25 * Math.max(0, s); B.elbowR.rotation.x = -0.35 - 0.25 * Math.max(0, -s);
    // body: bob twice per cycle, hip sway, counter-rotation of chest
    B.hips.position.y += -g.bob * Math.abs(c) + g.bob;
    B.hips.rotation.y = 0.12 * s * g.A; B.chest.rotation.y = -0.2 * s * g.A;
    B.hips.rotation.z = 0.03 * s; B.spine.rotation.x = g.lean;
    B.head.rotation.x = -g.lean * 0.6; B.head.rotation.y = 0.05 * s;
  }

  function computePose(state, t) {
    rest();
    const br = Math.sin(t * 2.0);
    if (state === 'idle') {
      B.chest.scale.set(1 + br * 0.008, 1 + br * 0.006, 1 + br * 0.01);
      B.shoulderL.rotation.z = -0.15 + br * 0.02; B.shoulderR.rotation.z = 0.15 - br * 0.02;
      B.elbowL.rotation.x = -0.15; B.elbowR.rotation.x = -0.15;
      const w = Math.sin(t * 0.6); B.hips.rotation.z = 0.03 * w; B.hips.position.x += 0.004 * w; B.spine.rotation.z = -0.025 * w;
      B.legL.rotation.z = 0.03 * w; B.legR.rotation.z = 0.03 * w;
      B.head.rotation.y = 0.25 * Math.sin(t * 0.45); B.head.rotation.x = 0.04 * Math.sin(t * 0.8);
    } else if (state === 'walk' || state === 'run') {
      gait(GAIT[state], t);
      if (state === 'run') { B.elbowL.rotation.x -= 0.6; B.elbowR.rotation.x -= 0.6; }
    } else if (state === 'celebrate') {                 // jump with both arms up
      const c = (t * 1.3) % 1; const up = Math.sin(Math.PI * clamp01(c / 0.6));
      const crouch = c > 0.6 ? Math.sin(Math.PI * (c - 0.6) / 0.4) : 0;
      B.root.position.y += 0.06 * up; B.hips.position.y -= 0.02 * crouch;
      B.legL.rotation.x = -0.5 * crouch; B.legR.rotation.x = -0.5 * crouch; B.kneeL.rotation.x = 1.0 * crouch; B.kneeR.rotation.x = 1.0 * crouch;
      const arm = 2.1 + 0.25 * up;
      B.shoulderL.rotation.z = arm; B.shoulderR.rotation.z = -arm; B.shoulderL.rotation.x = -0.2; B.shoulderR.rotation.x = -0.2;
      B.elbowL.rotation.z = 0.3 * Math.sin(t * 9); B.elbowR.rotation.z = -0.3 * Math.sin(t * 9);
      B.head.rotation.x = -0.25 * up; B.spine.rotation.x = -0.08 * up;
    } else if (state === 'scared') {                    // flinch back, arms up to protect
      const k = 0.85 + 0.15 * Math.sin(t * 18);          // trembling
      B.spine.rotation.x = -0.18; B.hips.position.z -= 0.01; B.head.rotation.x = 0.1;
      B.shoulderL.rotation.x = -1.3 * k; B.shoulderR.rotation.x = -1.3 * k; B.shoulderL.rotation.z = -0.25; B.shoulderR.rotation.z = 0.25;
      B.elbowL.rotation.x = -1.2; B.elbowR.rotation.x = -1.2;
      B.legL.rotation.x = 0.15; B.kneeL.rotation.x = 0.3; B.legR.rotation.x = -0.1; B.kneeR.rotation.x = 0.15;
      B.root.position.x += 0.002 * Math.sin(t * 40);
    } else if (state === 'point') {                     // point forward with the right arm
      B.shoulderR.rotation.x = -1.05; B.shoulderR.rotation.z = 0.12; B.elbowR.rotation.x = -0.1; B.spine.rotation.x = 0.06; B.head.rotation.x = 0.2;
      B.shoulderL.rotation.z = -0.15; B.chest.rotation.y = -0.15; B.head.rotation.y = -0.1;
    }
  }

  let cur = null, prev = null, changeT = -10;
  const snap = () => bones.map(b => [b.position.clone(), b.quaternion.clone(), b.scale.clone()]);
  holder.userData = {
    bones: B,
    speed(state) { return GAIT[state] ? gaitSpeed(GAIT[state]) * holder.scale.x : 0; },
    pose(state, t) {
      if (state !== cur) { prev = cur; cur = state; changeT = t; }
      const w = prev ? clamp01((t - changeT) / 0.25) : 1;
      if (w < 1) {
        computePose(prev, t); const A = snap(); computePose(cur, t); const Bp = snap(); const e = easeInOut(w);
        bones.forEach((b, i) => { b.position.lerpVectors(A[i][0], Bp[i][0], e); b.quaternion.slerpQuaternions(A[i][1], Bp[i][1], e); b.scale.lerpVectors(A[i][2], Bp[i][2], e); });
      } else computePose(cur, t);
    },
  };
  return holder;
}
