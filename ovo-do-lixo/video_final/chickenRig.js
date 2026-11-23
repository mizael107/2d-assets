// Auto-rig for the Tripo chicken (single mesh, faces +X in model space).
// Builds a skeleton by region (body, head, tail, wings, legs), recolors feathers per variant,
// adds eyelids / eggshell, and exposes a pose(state, t) function for animation.
import * as THREE from 'three';

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// measured on the model (see analysis): eyes, head, legs
const EYE = { x: 0.17, y: 0.757, z: 0.084, r: 0.042, n: [0.55, 0.3, 0.8] };

// Common chickens of the city: same model, different feathers / comb / tail / eyes / effect.
// feather: [dark, light] gradient (null keeps original gray)
// comb / tail: [base, tip] gradient (null keeps original) — 'rainbow' for arco-íris
// eye: pupil color, ring: eye-ring color, glow: which parts emit light, fx: aura effect
export const VARIANTS = {
  comum:    { feather: null, comb: null, tail: null, eye: null, ring: null },
  caipira:  { feather: [0x3a1c0c, 0xd09050], comb: null, tail: [0x0c1a10, 0x2f6a45], eye: 0xd98a1a, ring: null },
  preta:    { feather: [0x08080b, 0x44474f], comb: null, tail: [0x050608, 0x2a3c7a], eye: 0xf0c020, ring: null },
  branca:   { feather: [0xa8a49e, 0xffffff], comb: null, tail: [0xd8d4ce, 0xffffff], eye: 0x3a2412, ring: null },
  raio:     { feather: [0xa87a08, 0xfff4cc], comb: [0xffb000, 0xfffbe0], tail: [0xc08a00, 0xfff2a0], eye: 0xffe040, ring: 0xffc000, glow: { comb: 0.9, tail: 0.7, eye: 0.7, body: 0.04, color: 0xffb000 }, fx: 'raio' },
  fogo:     { feather: [0x4a0802, 0xff8a30], comb: [0xff2a00, 0xffe040], tail: [0x8a1000, 0xffd030], eye: 0xff6a10, ring: 0xffc020, glow: { comb: 1.2, tail: 1.0, eye: 0.7, body: 0.05, color: 0xff4a00 }, fx: 'fogo' },
  gelo:     { feather: [0x23517e, 0xeaf8ff], comb: [0x3ab8ff, 0xeafcff], tail: [0x1e6ab0, 0xf0fcff], eye: 0x0aa0ff, ring: 0x7ad8ff, glow: { comb: 0.6, tail: 0.5, eye: 0.7, body: 0.03, color: 0x60c8ff }, fx: 'gelo' },
  sombra:   { feather: [0x0e0418, 0x8a46c8], comb: [0x14041f, 0xc050ff], tail: [0x0a0212, 0xb040ff], eye: 0xff40ff, ring: 0x8a20d0, glow: { comb: 0.7, tail: 0.8, eye: 0.8, body: 0.05, color: 0x7a20c0 }, fx: 'sombra' },
  arcoiris: { feather: [0x6a5a9a, 0xfff0fb], comb: 'rainbow', tail: 'rainbow', eye: 0xff3fa8, ring: 0xffffff, glow: { comb: 0.5, tail: 0.5, eye: 0.6, body: 0.02, color: 0xff80d0 }, fx: 'brilho' },
};

const col = (h) => new THREE.Color(h);
function recolor(material, v) {
  const m = material.clone();
  const g = v.glow || {};
  const U = {
    uFeat: { value: v.feather ? 1 : 0 }, uFD: { value: col(v.feather ? v.feather[0] : 0) }, uFL: { value: col(v.feather ? v.feather[1] : 0) },
    uComb: { value: v.comb === 'rainbow' ? 2 : v.comb ? 1 : 0 }, uCA: { value: col(Array.isArray(v.comb) ? v.comb[0] : 0) }, uCB: { value: col(Array.isArray(v.comb) ? v.comb[1] : 0) },
    uTail: { value: v.tail === 'rainbow' ? 2 : v.tail ? 1 : 0 }, uTA: { value: col(Array.isArray(v.tail) ? v.tail[0] : 0) }, uTB: { value: col(Array.isArray(v.tail) ? v.tail[1] : 0) },
    uEyeOn: { value: v.eye != null ? 1 : 0 }, uEye: { value: col(v.eye ?? 0) }, uRingOn: { value: v.ring != null ? 1 : 0 }, uRing: { value: col(v.ring ?? 0) },
    uGComb: { value: g.comb || 0 }, uGTail: { value: g.tail || 0 }, uGEye: { value: g.eye || 0 }, uGBody: { value: g.body || 0 }, uGCol: { value: col(g.color || 0) },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vMP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vMP = position;');
    sh.fragmentShader = `varying vec3 vMP;
uniform float uFeat, uComb, uTail, uEyeOn, uRingOn, uGComb, uGTail, uGEye, uGBody;
uniform vec3 uFD, uFL, uCA, uCB, uTA, uTB, uEye, uRing, uGCol;
vec3 hsv2rgb(vec3 c){ vec3 p = abs(fract(c.xxx + vec3(0., 2./3., 1./3.)) * 6. - 3.); return c.z * mix(vec3(1.), clamp(p - 1., 0., 1.), c.y); }
` + sh.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
  vec3 eGlow = vec3(0.);
  {
    vec3 c = diffuseColor.rgb;
    float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
    float sat = (mx - mn) / (mx + 1e-4);
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    float isRed = smoothstep(0.12, 0.25, c.r - max(c.g, c.b)) * step(0.3, sat);
    float isYel = smoothstep(0.12, 0.25, min(c.r, c.g) - c.b) * step(0.35, sat) * (1. - isRed);
    vec3 p = vMP;
    // eyes (both sides)
    vec3 ec = vec3(0.168, 0.758, sign(p.z) * 0.084);
    float de = length(p - ec);
    float eyeM = 1. - smoothstep(0.028, 0.036, de);
    // regions
    float combM = isRed * smoothstep(0.80, 0.83, p.y) * (1. - eyeM);
    float wattM = isRed * (1. - combM) * (1. - eyeM) * step(0.5, p.y);
    float tailM = smoothstep(-0.17, -0.25, p.x) * smoothstep(0.40, 0.48, p.y);
    float featM = (1. - isRed) * (1. - isYel) * (1. - eyeM) * step(0.07, p.y);
    vec3 outc = c;
    // feathers
    if (uFeat > 0.5) outc = mix(outc, mix(uFD, uFL, smoothstep(0.04, 0.88, lum)), featM);
    // tail feathers: gradient base -> tip (tip = further back / higher)
    float tt = clamp((-p.x - 0.2) / 0.16 * 0.6 + (p.y - 0.45) / 0.25 * 0.4, 0., 1.);
    float tm = tailM * featM;
    if (uTail > 1.5) { vec3 rb = hsv2rgb(vec3(fract(p.z * 2.2 + 0.5 + tt * 0.25), 0.75, 1.0)); outc = mix(outc, rb * (0.45 + 0.65 * lum), tm); eGlow += rb * uGTail * tm * tt; }
    else if (uTail > 0.5) { vec3 tc = mix(uTA, uTB, tt) * (0.55 + 0.6 * lum); outc = mix(outc, tc, tm); eGlow += mix(uTA, uTB, tt) * uGTail * tm * tt; }
    // comb: gradient bottom -> top
    float ct = clamp((p.y - 0.82) / 0.15, 0., 1.);
    if (uComb > 1.5) { vec3 rb = hsv2rgb(vec3(fract((p.x + 0.1) * 2.6), 0.8, 1.0)); outc = mix(outc, rb * (0.5 + 0.6 * lum / max(mx, 0.2)), combM); eGlow += rb * uGComb * combM; }
    else if (uComb > 0.5) { vec3 cc = mix(uCA, uCB, ct) * (0.6 + 0.6 * lum / max(mx, 0.2)); outc = mix(outc, cc, combM); eGlow += mix(uCA, uCB, ct) * uGComb * combM * (0.4 + 0.6 * ct); }
    // eye: dark pupil -> color; red ring -> accent; keep whites
    float pupil = eyeM * (1. - smoothstep(0.18, 0.32, lum)) * (1. - isRed);
    float dp = length(p - vec3(0.171, 0.774, sign(p.z) * 0.0875));
    float core = (1. - smoothstep(0.0045, 0.0075, dp)) * eyeM;
    if (uEyeOn > 0.5) { outc = mix(outc, uEye * (0.85 + 0.3 * lum), pupil); eGlow += uEye * uGEye * pupil * (1. - core);
      outc = mix(outc, vec3(0.02), core * pupil); }
    float ring = eyeM * isRed;
    if (uRingOn > 0.5) { outc = mix(outc, uRing * (0.7 + 0.4 * lum), ring); eGlow += uRing * uGEye * 0.25 * ring; }
    eGlow += uGCol * uGBody * featM;
    diffuseColor.rgb = outc;
  }`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += eGlow;');
  };
  m.customProgramCacheKey = () => 'recolor2-' + JSON.stringify(v);
  return m;
}

export function buildChicken(baseScene, variant, profile) {
  const v = typeof variant === 'string' ? VARIANTS[variant] : variant;
  let src; baseScene.traverse(n => { if (n.isMesh && !src) src = n; });
  const geo = src.geometry.clone();
  if (profile && profile.rotateY) geo.rotateY(profile.rotateY);   // bring the model to face +X
  const pos = geo.attributes.position, N = pos.count;

  // ---- bones (model space, chicken faces +X) ----
  const mk = (name, x, y, z) => { const b = new THREE.Bone(); b.name = name; b.userData.rest = new THREE.Vector3(x, y, z); return b; };
  const BP = profile?.bones || {};
  const at3 = (n, d) => (BP[n] || d);
  const B = profile ? Object.fromEntries(['root', 'body', 'head', 'tail', 'wingL', 'wingR', 'legL', 'legR'].map(n => [n, mk(n, ...at3(n, [0, 0, 0]))])) : {
    root: mk('root', 0, 0, 0), body: mk('body', 0, 0.25, 0), head: mk('head', 0.06, 0.6, 0), tail: mk('tail', -0.2, 0.5, 0),
    wingL: mk('wingL', 0.06, 0.48, 0.21), wingR: mk('wingR', 0.06, 0.48, -0.21), legL: mk('legL', 0.12, 0.15, 0.1), legR: mk('legR', 0.12, 0.15, -0.1),
  };
  const parent = { body: 'root', head: 'body', tail: 'body', wingL: 'body', wingR: 'body', legL: 'root', legR: 'root' };
  for (const [c, p] of Object.entries(parent)) {
    B[p].add(B[c]); B[c].position.copy(B[c].userData.rest).sub(B[p].userData.rest);
  }
  const order = ['root', 'body', 'head', 'tail', 'wingL', 'wingR', 'legL', 'legR'];
  const bones = order.map(n => B[n]);
  const I = Object.fromEntries(order.map((n, i) => [n, i]));

  // ---- weights by region ----
  const si = new Uint16Array(N * 4), sw = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), az = Math.abs(z);
    const cand = profile ? profile.weights(x, y, z, ss) : [
      ['head', ss(0.57, 0.68, y) * ss(-0.2, -0.06, x)],
      ['tail', ss(-0.19, -0.29, x) * ss(0.36, 0.5, y)],
      [z > 0 ? 'wingL' : 'wingR', ss(0.2, 0.27, az) * ss(0.2, 0.28, y) * (1 - ss(0.5, 0.56, y)) * ss(-0.1, 0.0, x)],
      [z > 0 ? 'legL' : 'legR', 1 - ss(0.085, 0.16, y)],
    ];
    cand.sort((a, b) => b[1] - a[1]);
    const [pn, w] = cand[0];
    const bodyBone = y < (profile?.rootBelow ?? 0.16) ? 'root' : 'body';
    si[i * 4] = I[bodyBone]; sw[i * 4] = 1 - w;
    si[i * 4 + 1] = I[pn]; sw[i * 4 + 1] = w;
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));

  const mesh = new THREE.SkinnedMesh(geo, recolor(src.material, v));
  mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
  mesh.add(B.root);
  mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));

  // ---- props attached to the head bone ----
  const headRest = B.head.userData.rest;
  const lids = [];
  if (v.lids) {
    const lidMat = new THREE.MeshStandardMaterial({ color: 0x8f959c, roughness: 0.85 });
    const lashMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.6 });
    for (const s of [1, -1]) {
      const g = new THREE.Group();
      const n = new THREE.Vector3(EYE.n[0], EYE.n[1], s * EYE.n[2]).normalize();
      g.position.set(EYE.x, EYE.y, s * EYE.z).addScaledVector(n, -0.002).sub(headRest);
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      const lid = new THREE.Mesh(new THREE.SphereGeometry(EYE.r * 0.98, 32, 16), lidMat); lid.scale.z = 0.3; lid.castShadow = true;
      const lash = new THREE.Mesh(new THREE.TorusGeometry(EYE.r * 0.95, 0.0045, 6, 32, Math.PI), lashMat);
      lash.rotation.z = Math.PI; lash.position.z = EYE.r * 0.29; lash.position.y = -EYE.r * 0.05; lash.scale.y = 0.55;
      g.add(lid, lash); B.head.add(g); lids.push(g);
    }
  }
  if (v.shell) {
    const shellGeo = new THREE.SphereGeometry(0.075, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.45);
    const p = shellGeo.attributes.position;
    for (let i = 0; i < p.count; i++) { const yy = p.getY(i); if (yy < 0.03) { const a = Math.atan2(p.getZ(i), p.getX(i)); p.setY(i, yy + Math.abs(Math.sin(a * 4.5)) * 0.018); } }
    shellGeo.computeVertexNormals();
    const shell = new THREE.Mesh(shellGeo, new THREE.MeshStandardMaterial({ color: 0xb4b0a8, roughness: 0.65, side: THREE.DoubleSide }));
    shell.castShadow = true;
    shell.position.set(0.12, 0.865, 0.06).sub(headRest); shell.rotation.set(0.5, 0, -0.35);
    const crack = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.0025, 6, 24, 1.4), new THREE.MeshStandardMaterial({ color: 0x3a3a3a }));
    crack.position.y = 0.04; crack.rotation.x = Math.PI / 2; shell.add(crack);
    B.head.add(shell);
  }

  // ---- eye color: iris disc over the painted eye ----
  if (v.eyeDisc && v.eye != null) {
    const irisMat = new THREE.MeshStandardMaterial({ color: v.eye, roughness: 0.25,
      emissive: v.eyeGlow ? new THREE.Color(v.eye) : new THREE.Color(0), emissiveIntensity: v.eyeGlow ? 1.6 : 0 });
    const pupilMat = new THREE.MeshStandardMaterial({ color: v.eyeGlow ? 0xffffff : 0x080808, roughness: 0.2,
      emissive: v.eyeGlow ? new THREE.Color(0xffffff) : new THREE.Color(0), emissiveIntensity: v.eyeGlow ? 1.2 : 0 });
    for (const s of [1, -1]) {
      const n = new THREE.Vector3(EYE.n[0], EYE.n[1], s * EYE.n[2]).normalize();
      const g = new THREE.Group();
      g.position.set(0.171, 0.771, s * 0.087).addScaledVector(n, 0.004).sub(headRest);
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      const iris = new THREE.Mesh(new THREE.CircleGeometry(0.0135, 24), irisMat);
      const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.006, 20), pupilMat); pupil.position.z = 0.0006;
      g.add(iris, pupil); B.head.add(g);
    }
  }

  // ---- aura effects (animated in pose) ----
  const fx = new THREE.Group(); fx.name = 'fx';
  const fxItems = [];
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const sprite = (color, size, opacity = 0.9) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false })); sp.scale.set(size, size, 1); return sp; };
  if (v.fx === 'raio') {
    const sh = new THREE.Shape([[0, 0], [0.05, 0], [0.025, -0.07], [0.065, -0.07], [-0.015, -0.2], [0.01, -0.1], [-0.025, -0.1]].map(([a, b]) => new THREE.Vector2(a, b)));
    const geoB = new THREE.ExtrudeGeometry(sh, { depth: 0.008, bevelEnabled: false });
    const matB = new THREE.MeshBasicMaterial({ color: 0xfff060 });
    for (let i = 0; i < 6; i++) { const b = new THREE.Group(); b.add(new THREE.Mesh(geoB, matB), sprite(0xffd000, 0.12, 0.45)); b.children[1].position.set(0.02, -0.1, 0);
      fx.add(b); fxItems.push({ o: b, a: (i / 6) * Math.PI * 2, r: 0.42, h: 0.35 + (i % 3) * 0.18, k: i }); }
  } else if (v.fx === 'fogo') {
    for (let i = 0; i < 26; i++) { const c = [0xff3a00, 0xff7a10, 0xffc030][i % 3]; const sp = sprite(c, 0.08 + (i % 4) * 0.03, 0.7); fx.add(sp); fxItems.push({ o: sp, a: i * 2.39, r: 0.3 + (i % 3) * 0.06, h: 0, k: i, rise: true }); }
  } else if (v.fx === 'gelo') {
    const cm = new THREE.MeshStandardMaterial({ color: 0xbfefff, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85, emissive: 0x4ab8ff, emissiveIntensity: 0.6 });
    for (let i = 0; i < 12; i++) { const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.03 + (i % 3) * 0.012), cm); c.scale.y = 2.2; fx.add(c); fxItems.push({ o: c, a: i * 2.39, r: 0.4 + (i % 2) * 0.06, h: 0.15 + (i / 12) * 0.7, k: i }); }
    const snowM = new THREE.MeshBasicMaterial({ color: 0xe8f8ff }); for (let i = 0; i < 10; i++) { const sp = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), snowM); fx.add(sp); fxItems.push({ o: sp, a: i * 1.7, r: 0.35, h: 0.2 + (i / 10) * 0.8, k: i, snow: true }); }
  } else if (v.fx === 'sombra') {
    const m = new THREE.MeshBasicMaterial({ color: 0xc060ff, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 16; i++) { const sz = 0.02 + (i % 3) * 0.012; const c = new THREE.Mesh(new THREE.BoxGeometry(sz, sz, sz), m); fx.add(c); fxItems.push({ o: c, a: i * 2.39, r: 0.4 + (i % 3) * 0.05, h: 0.1 + (i / 16) * 0.9, k: i, spin: true }); }
  } else if (v.fx === 'brilho') {
    const cols = [0xff5050, 0xffb030, 0xfff050, 0x50ff80, 0x50b0ff, 0xb060ff];
    const star = new THREE.OctahedronGeometry(0.018); for (let i = 0; i < 18; i++) { const sp = new THREE.Mesh(star, new THREE.MeshBasicMaterial({ color: cols[i % 6] })); fx.add(sp); fxItems.push({ o: sp, a: i * 2.39, r: 0.42, h: 0.1 + (i / 18) * 0.9, k: i }); }
  }
  // ---- comb & tail accents (attached to bones, model space) ----
  const tipItems = [];
  const combPts = [[-0.07, 0.9], [0.0, 0.96], [0.07, 0.975], [0.14, 0.955], [0.2, 0.9]].map(([x, y]) => new THREE.Vector3(x, y, 0));
  const tailPts = [[-0.35, 0.68, 0.0], [-0.34, 0.66, 0.09], [-0.34, 0.66, -0.09], [-0.33, 0.6, 0.14], [-0.33, 0.6, -0.14]].map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const attach = (bone, obj, p) => { obj.position.copy(p).sub(bone.userData.rest); bone.add(obj); return obj; };
  if (v.fx === 'fogo') {
    for (const [bone, pts] of [[B.head, combPts], [B.tail, tailPts]]) pts.forEach((p, i) => {
      for (let k = 0; k < 3; k++) { const sp = sprite([0xff4000, 0xff9020, 0xffe060][k], 0.06, 0.85); const o = attach(bone, sp, p);
        tipItems.push((t) => { const ph = (t * 1.6 + i * 0.31 + k * 0.33) % 1; o.position.copy(p).sub(bone.userData.rest); o.position.y += ph * 0.09; o.material.opacity = 0.9 * (1 - ph); const sc = 0.07 * (1 - ph * 0.7); o.scale.set(sc, sc * 1.6, 1); }); }
    });
  } else if (v.fx === 'gelo') {
    const im = new THREE.MeshStandardMaterial({ color: 0xd8f6ff, roughness: 0.05, transparent: true, opacity: 0.9, emissive: 0x5ac8ff, emissiveIntensity: 0.7 });
    for (const [bone, pts, len] of [[B.head, combPts, 0.06], [B.tail, tailPts, 0.08]]) pts.forEach((p, i) => {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.012, len, 6), im); attach(bone, c, p);
      c.position.y += len * 0.4; if (bone === B.tail) { c.rotation.z = 0.9; c.position.x -= 0.02; }
    });
  } else if (v.fx === 'raio') {
    const bm = new THREE.MeshBasicMaterial({ color: 0xfff6a0 });
    for (const [bone, pts] of [[B.head, combPts], [B.tail, tailPts]]) pts.forEach((p, i) => {
      const z = new THREE.Group(); let px = 0, py = 0;
      for (let k = 0; k < 3; k++) { const dx = (k % 2 ? -1 : 1) * 0.012, dy = 0.022; const sg = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, Math.hypot(dx, dy), 4), bm); sg.position.set(px + dx / 2, py + dy / 2, 0); sg.rotation.z = -Math.atan2(dx, dy); z.add(sg); px += dx; py += dy; }
      z.add(sprite(0xffd000, 0.07, 0.6)); attach(bone, z, p);
      tipItems.push((t) => { z.visible = Math.sin(t * 17 + i * 2.3) > 0.1; z.rotation.y = t * 3 + i; });
    });
  } else if (v.fx === 'sombra') {
    const smokeTex = glowTex;
    for (const [bone, pts] of [[B.head, combPts], [B.tail, tailPts]]) pts.forEach((p, i) => {
      for (let k = 0; k < 2; k++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: k ? 0x2a0840 : 0xa040ff, transparent: true, opacity: 0.7, depthWrite: false })); const o = attach(bone, sp, p);
        tipItems.push((t) => { const ph = (t * 0.8 + i * 0.27 + k * 0.5) % 1; o.position.copy(p).sub(bone.userData.rest); o.position.y += ph * 0.12; o.position.x -= ph * 0.03; o.material.opacity = 0.75 * (1 - ph); const sc = 0.05 + ph * 0.07; o.scale.set(sc, sc, 1); }); }
    });
  } else if (v.fx === 'brilho') {
    const cols = [0xff5050, 0xffb030, 0xfff050, 0x50ff80, 0x50b0ff, 0xb060ff];
    tailPts.concat(combPts).forEach((p, i) => { const bone = i < tailPts.length ? B.tail : B.head; const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.012), new THREE.MeshBasicMaterial({ color: cols[i % 6] })); attach(bone, st, p);
      tipItems.push((t) => { const sc = 0.6 + 0.8 * (0.5 + 0.5 * Math.sin(t * 7 + i)); st.scale.setScalar(sc); st.rotation.set(t * 3, t * 2 + i, 0); st.position.copy(p).sub(bone.userData.rest); st.position.y += 0.03 + Math.sin(t * 3 + i) * 0.01; }); });
  }

  const animateFx = (t) => {
    tipItems.forEach(f => f(t));
    for (const it of fxItems) {
      const a = it.a + t * (it.spin ? 1.2 : 0.6);
      if (it.rise) { const ph = (t * 0.9 + it.k * 0.137) % 1; it.o.position.set(Math.cos(it.a) * it.r * (1 - ph * 0.5), 0.05 + ph * 0.85, Math.sin(it.a) * it.r * (1 - ph * 0.5)); it.o.material.opacity = 0.8 * (1 - ph); const s = (0.07 + (it.k % 4) * 0.03) * (1 - ph * 0.6); it.o.scale.set(s, s * 1.5, 1); continue; }
      if (it.snow) { const ph = (t * 0.25 + it.k * 0.1) % 1; it.o.position.set(Math.cos(a) * it.r, 1.0 - ph * 0.95, Math.sin(a) * it.r); continue; }
      it.o.position.set(Math.cos(a) * it.r, it.h + Math.sin(t * 2 + it.k) * 0.03, Math.sin(a) * it.r);
      if (it.spin) it.o.rotation.set(t * 2 + it.k, t * 1.5 + it.k, 0);
      if (v.fx === 'raio') { it.o.rotation.set(0, -a + Math.PI / 2, Math.sin(t * 9 + it.k) * 0.4); it.o.visible = Math.sin(t * 13 + it.k * 2.1) > -0.4; }
      if (v.fx === 'brilho') { const s = 0.6 + 0.6 * (0.5 + 0.5 * Math.sin(t * 6 + it.k)); it.o.scale.set(s, s, s); it.o.rotation.set(t * 3, t * 2 + it.k, 0); }
    }
  };
  animateFx(0);

  // orient to face +Z and scale
  const holder = new THREE.Group(); const inner = new THREE.Group();
  inner.rotation.y = -Math.PI / 2; inner.add(mesh); holder.add(inner);
  holder.scale.setScalar(v.scale || 1);
  holder.add(fx);
  if (v.glow) { const l = new THREE.PointLight(v.glow.color, 0.8, 2.0); l.position.set(0, 0.6, 0.8); holder.add(l); }

  // ---- procedural poses (natural chicken motion) ----
  const V0 = new THREE.Vector3();
  const rest = () => bones.forEach(b => { b.position.copy(b.userData.rest).sub(b.parent.isBone ? b.parent.userData.rest : V0); b.rotation.set(0, 0, 0); b.scale.set(1, 1, 1); });
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const easeInOut = (x) => x * x * (3 - 2 * x);
  const easeOutBack = (x) => { const c = 1.6; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const seed = [...JSON.stringify(v)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 9973, 7) / 97.3;
  const hash = (n) => { const x = Math.sin(n * 127.1 + seed) * 43758.5453; return x - Math.floor(x); };
  // gait settings (model units). speed = stride * freq / stanceFraction  -> feet never slide
  const phaseOff = hash(3.3) * 10, tempo = 0.88 + hash(5.1) * 0.24;   // each chicken has its own rhythm
  const GAITS = { walk: { L: 0.15, f: 1.7 * tempo, h: 0.045, stance: 0.62, bob: 0.014, roll: 0.07 }, run: { L: 0.24, f: 3.0 * tempo, h: 0.07, stance: 0.5, bob: 0.022, roll: 0.05 } };
  const gaitSpeed = (g) => g.L * g.f / g.stance;

  function legCycle(bone, ph, g) {          // ph in [0,1): stance then swing
    if (ph < g.stance) {                    // planted: foot slides back under the body at exactly body speed
      const s = ph / g.stance;
      bone.position.x += g.L * (0.5 - s);
      bone.rotation.z = 0.0;
    } else {                                // swing: lift, carry forward in an arc, toes curl then reach
      const s = (ph - g.stance) / (1 - g.stance), e = easeInOut(s);
      bone.position.x += g.L * (-0.5 + e);
      bone.position.y += g.h * Math.sin(Math.PI * s);
      bone.rotation.z = -0.5 * Math.sin(Math.PI * s) + 0.15 * Math.sin(Math.PI * s * 2);
    }
  }

  function gait(g, t) {
    const ph = (t * g.f) % 1;
    legCycle(B.legL, ph, g); legCycle(B.legR, (ph + 0.5) % 1, g);
    const step = (ph * 2) % 1;                                   // one step = half a cycle
    // body: lowest right after each foot lands, waddle toward the planted leg
    B.body.position.y += -g.bob * Math.cos(step * Math.PI * 2) * 0.5 - g.bob * 0.3;
    B.body.rotation.x = g.roll * Math.sin(ph * Math.PI * 2);    // roll side to side
    B.body.rotation.y = 0.04 * Math.sin(ph * Math.PI * 2);      // slight yaw
    B.body.rotation.z = -0.05;                                   // lean forward a bit
    // head stabilization: head holds still in the world, then thrusts forward
    const v = gaitSpeed(g), Ts = 1 / (2 * g.f), hold = 0.68;
    const A = v * Ts;
    let off;
    if (step < hold) off = -A * (step / hold);
    else off = -A * (1 - easeOutBack((step - hold) / (1 - hold)));
    B.head.position.x += off + A * 0.5 - B.body.position.y * 0;  // centered around rest
    B.head.position.y -= B.body.position.y - (B.body.userData.rest.y - B.root.userData.rest.y) ;  // cancel body bob
    B.head.rotation.z = 0.05 + (step >= hold ? -0.12 * Math.sin(Math.PI * (step - hold) / (1 - hold)) : 0);
    B.head.rotation.x = -B.body.rotation.x * 0.8;               // keep head level against the roll
    // tail and wings: follow-through with lag
    B.tail.rotation.z = 0.10 * Math.sin(step * Math.PI * 2 - 1.2);
    B.tail.rotation.y = 0.12 * Math.sin(ph * Math.PI * 2 - 0.9);
    B.wingL.rotation.x = -0.05 - 0.05 * Math.max(0, Math.sin(step * Math.PI * 2 - 1.0));
    B.wingR.rotation.x = 0.05 + 0.05 * Math.max(0, Math.sin(step * Math.PI * 2 - 1.0));
    return v;
  }

  // head that "looks around" in quick jerks, like real chickens
  function headLook(t, rate = 0.9, amtY = 0.6, amtZ = 0.2) {
    const k = Math.floor(t * rate), fr = t * rate - k;
    const tgt = (n) => [(hash(n) - 0.5) * 2 * amtY, (hash(n + 7.3) - 0.5) * 2 * amtZ];
    const a = tgt(k), b2 = tgt(k + 1), e = easeInOut(clamp01((fr - 0.82) / 0.18));   // hold, then snap
    B.head.rotation.y = a[0] + (b2[0] - a[0]) * e;
    B.head.rotation.z = a[1] + (b2[1] - a[1]) * e;
    B.head.rotation.x = 0.15 * (a[0] + (b2[0] - a[0]) * e);    // tilt with the turn
  }

  function computePose(state, t) {
    rest();
    const breathe = Math.sin(t * 2.4);
    B.body.scale.set(1 + breathe * 0.01, 1 + breathe * 0.012, 1 + breathe * 0.01);
    if (state === 'idle') {
      headLook(t);
      B.tail.rotation.y = 0.05 * Math.sin(t * 1.3); B.tail.rotation.z = 0.03 * Math.sin(t * 2.1);
      // weight shift between feet
      const w = Math.sin(t * 0.8); B.body.rotation.x = 0.03 * w; B.body.position.y -= 0.004 * Math.abs(w);
    } else if (state === 'walk' || state === 'run') {
      gait(GAITS[state], t);
      if (state === 'run') {                                     // correr assustada
        const fl = 0.5 + 0.7 * Math.abs(Math.sin(t * 14));
        B.body.rotation.z -= 0.18; B.wingL.rotation.x = -fl; B.wingR.rotation.x = fl; B.wingL.rotation.y = 0.3; B.wingR.rotation.y = 0.3;
        B.head.position.x += 0.05; B.head.rotation.z += 0.2; B.tail.rotation.z += 0.2;
      }
    } else if (state === 'flap') {
      const c = (t * 3.2) % 1;                                    // ~3 flaps per second
      const up = c < 0.4 ? easeInOut(c / 0.4) : 1 - easeInOut((c - 0.4) / 0.6);
      const a = 0.15 + 1.25 * up;
      B.wingL.rotation.x = -a; B.wingR.rotation.x = a;
      B.wingL.rotation.y = 0.3 * up; B.wingR.rotation.y = 0.3 * up;
      const hop = Math.max(0, Math.sin(t * 3.2 * Math.PI)) * 0.05;
      B.body.position.y += hop; B.root.position.y += hop * 0.6;
      B.head.rotation.z = 0.25 - 0.1 * up; B.body.rotation.z = 0.08 * up;
      B.tail.rotation.z = 0.2 * up;
      B.legL.rotation.z = -0.3 * Math.min(1, hop * 20); B.legR.rotation.z = -0.3 * Math.min(1, hop * 20);
    } else if (state === 'scratch') {                            // ciscar: rake the ground, then look down
      const c = (t * 0.62) % 1;                                  // one full scratch routine ~1.6 s
      const stroke = (leg, s0) => { const s = (c - s0) / 0.16; if (s < 0 || s > 1) return;
        if (s < 0.45) { const e = easeInOut(s / 0.45); leg.position.x += 0.06 * e; leg.position.y += 0.035 * Math.sin(Math.PI * e); leg.rotation.z = -0.4 * e; }
        else { const e = easeInOut((s - 0.45) / 0.55); leg.position.x += 0.06 - 0.17 * e; leg.rotation.z = -0.4 + 0.55 * e; } };
      stroke(B.legL, 0.0); stroke(B.legL, 0.17); stroke(B.legR, 0.36); stroke(B.legR, 0.53);
      const look = clamp01((c - 0.7) / 0.08) * (1 - clamp01((c - 0.95) / 0.05));
      const pk = c > 0.8 && c < 0.9 ? Math.sin(Math.PI * (c - 0.8) / 0.1) : 0;
      B.body.rotation.z = -0.12 - 0.15 * look; B.body.position.y -= 0.012;
      B.body.rotation.x = c < 0.36 ? -0.05 : c < 0.7 ? 0.05 : 0;  // shift weight to the standing leg
      B.head.rotation.z = -0.25 - 0.55 * look - 0.5 * pk; B.head.position.x += 0.03 * look + 0.05 * pk; B.head.position.y -= 0.03 * pk;
      B.tail.rotation.z = 0.1 + 0.15 * look;
    } else if (state === 'sit') {                                // deitar: settle down, legs tucked
      B.root.position.y -= 0.11; B.legL.position.y += 0.07; B.legR.position.y += 0.07;
      B.legL.rotation.z = -1.2; B.legR.rotation.z = -1.2;
      B.body.scale.set(1.04 + breathe * 0.012, 0.95 + breathe * 0.015, 1.05); B.body.rotation.z = 0.04;
      headLook(t, 0.45, 0.35, 0.1); B.head.position.y -= 0.02;
      B.tail.rotation.z = -0.05; B.wingL.rotation.x = 0.03; B.wingR.rotation.x = -0.03;
    } else if (state === 'preen') {                              // coçar as penas com o bico
      const side = Math.floor(t / 2.2) % 2 ? 1 : -1;            // alternate wing every ~2 s
      const nib = Math.sin(t * 22) * 0.06 * (0.5 + 0.5 * Math.sin(t * 3.1));
      B.head.rotation.y = side * (1.35 + nib); B.head.rotation.z = -0.45 + nib; B.head.position.y -= 0.03; B.head.position.x -= 0.06;
      (side > 0 ? B.wingL : B.wingR).rotation.x = -side * (0.18 + Math.abs(nib) * 1.5);
      B.body.rotation.x = side * 0.06; B.body.rotation.y = side * 0.12;
      B.tail.rotation.y = -side * 0.1;
    } else if (state === 'fight') {                              // brigar: puffed up, hopping kicks, wing beats
      const c = (t * 1.4) % 1;
      const hop = c < 0.5 ? Math.sin(Math.PI * c / 0.5) : 0;
      B.root.position.y += 0.11 * hop;
      B.body.scale.set(1.08, 1.08, 1.08);                       // feathers puffed
      B.body.rotation.z = 0.25 * hop - 0.05;
      B.legL.rotation.z = -0.9 * hop; B.legR.rotation.z = -0.9 * hop; B.legL.position.x += 0.08 * hop; B.legR.position.x += 0.08 * hop;
      const fl = 0.3 + 0.9 * Math.abs(Math.sin(t * 12)) * (0.4 + 0.6 * hop);
      B.wingL.rotation.x = -fl; B.wingR.rotation.x = fl;
      B.head.position.x += 0.04 + 0.04 * Math.sin(t * 9); B.head.rotation.z = 0.15 - 0.3 * Math.max(0, Math.sin(t * 9));
      B.tail.rotation.z = 0.25;
    } else if (state === 'sleep') {
      const b = Math.sin(t * 1.1);
      B.body.scale.set(1 + b * 0.02, 1 + b * 0.025, 1 + b * 0.02); B.body.position.y -= 0.04;
      B.head.rotation.z = -0.5 + b * 0.03; B.head.position.y -= 0.035; B.head.position.x -= 0.03; B.head.rotation.x = 0.2;
      B.tail.rotation.z = -0.12; B.wingL.rotation.x = 0.04; B.wingR.rotation.x = -0.04;
    } else if (state === 'peck') {                                // anticipation -> strike -> hold -> recover
      const c = (t * 1.2) % 1;
      let k;
      if (c < 0.25) k = -0.35 * easeInOut(c / 0.25);              // pull back
      else if (c < 0.36) k = -0.35 + 1.35 * easeInOut((c - 0.25) / 0.11);  // fast strike
      else if (c < 0.5) k = 1.0;                                  // contact
      else k = 1.0 - easeInOut((c - 0.5) / 0.5);                  // recover
      const kk = Math.max(0, k);
      B.head.rotation.z = -1.0 * kk + 0.25 * Math.min(0, k) * -1;
      B.head.position.x += 0.07 * k; B.head.position.y -= 0.05 * kk;
      B.body.rotation.z = -0.3 * kk; B.body.position.y -= 0.02 * kk;
      B.tail.rotation.z = 0.35 * kk; B.wingL.rotation.x = -0.12 * kk; B.wingR.rotation.x = 0.12 * kk;
    }
  }

  // smooth transitions: cross-fade from the previous pose for 0.3 s
  let curState = null, prevState = null, changeT = -10;
  const snap = () => bones.map(b => [b.position.clone(), b.quaternion.clone(), b.scale.clone()]);
  holder.userData = {
    bones: B, lids,
    setEyes(closed) { lids.forEach(l => (l.visible = closed)); },
    speed(state) { return GAITS[state] ? gaitSpeed(GAITS[state]) * (v.scale || 1) : 0; },   // world units / s
    pose(state, tGlobal) {
      animateFx(tGlobal); const t = tGlobal + phaseOff;
      if (state !== curState) { prevState = curState; curState = state; changeT = t; }
      const w = prevState ? clamp01((t - changeT) / 0.3) : 1;
      if (w < 1) {
        computePose(prevState, t); const A = snap();
        computePose(curState, t); const Bp = snap(); const e = easeInOut(w);
        bones.forEach((b, i) => { b.position.lerpVectors(A[i][0], Bp[i][0], e); b.quaternion.slerpQuaternions(A[i][1], Bp[i][1], e); b.scale.lerpVectors(A[i][2], Bp[i][2], e); });
      } else computePose(curState, t);
    },
  };
  holder.userData.setEyes(!!v.lids);
  return holder;
}

// Profile for the protagonist chick (Tripo baby chick, faces +Z originally, height ~0.98)
export const CHICK_PROFILE = {
  rotateY: Math.PI / 2,
  rootBelow: 0.11,
  bones: { root: [0, 0, 0], body: [0, 0.15, 0], head: [0.04, 0.5, 0], tail: [-0.26, 0.36, 0],
           wingL: [0.0, 0.42, 0.24], wingR: [0.0, 0.42, -0.24], legL: [0.05, 0.13, 0.1], legR: [0.05, 0.13, -0.1] },
  weights: (x, y, z, ss) => {
    const az = Math.abs(z);
    return [
      ['head', ss(0.46, 0.56, y)],
      ['tail', ss(-0.27, -0.34, x) * (1 - ss(0.5, 0.56, y)) * ss(0.2, 0.26, y)],
      [z > 0 ? 'wingL' : 'wingR', ss(0.19, 0.245, az) * ss(0.2, 0.26, y) * (1 - ss(0.45, 0.5, y))],
      [z > 0 ? 'legL' : 'legR', 1 - ss(0.09, 0.15, y)],
    ];
  },
};
