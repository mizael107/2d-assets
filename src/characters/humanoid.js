// Personagem humanoide procedural com esqueleto de verdade (SkinnedMesh + Skeleton).
// Estilo: cabeça esférica grande, membros em cápsula, rosto em decalques simples
// (olhos de ponto, sobrancelhas grossas, boca), como na referência de estilo do projeto.
//
// Serve para: blocking/animatic, testes de movimento e personagem final em estilo toon.
// Pode ser exportado como GLB (GLTFExporter) e reaproveitado. Personagens externos
// (GLB/VRM/Mixamo) entram por characters/loader.js.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Proporções em metros (escala 1 ≈ 1,45 m, personagem "cabeçudo").
export const HUMANOID_DIMENSIONS = {
  hipsY: 0.88, thigh: 0.4, shin: 0.4, ankle: 0.06,
  spine: 0.12, chest: 0.2, neck: 0.04, headRadius: 0.24,
  shoulderX: 0.17, upperArm: 0.27, foreArm: 0.25, hipX: 0.1,
};
export const BONES = ['hips', 'spine', 'chest', 'neck', 'head',
  'upperArm_L', 'foreArm_L', 'hand_L', 'upperArm_R', 'foreArm_R', 'hand_R',
  'thigh_L', 'shin_L', 'foot_L', 'thigh_R', 'shin_R', 'foot_R'];

const D = HUMANOID_DIMENSIONS;

export function createHumanoid({
  name = 'personagem', skin = '#f1a056', shirt = '#d8c7a6', pants = '#4a3424', shoes = '#e8e2d6',
  hair = '#1d1712', hairStyle = 'bowl', scale = 1, eyeColor = '#111111',
} = {}) {
  // ---------- esqueleto ----------
  const bones = {};
  const mk = (n, x, y, z, parent) => { const b = new THREE.Bone(); b.name = n; b.position.set(x, y, z); bones[n] = b; parent?.add(b); return b; };
  mk('hips', 0, D.hipsY, 0);
  mk('spine', 0, D.spine, 0, bones.hips);
  mk('chest', 0, D.chest, 0, bones.spine);
  mk('neck', 0, 0.2, 0, bones.chest);
  mk('head', 0, D.neck, 0, bones.neck);
  for (const [side, sx] of [['L', 1], ['R', -1]]) {
    mk(`upperArm_${side}`, sx * D.shoulderX, 0.15, 0, bones.chest);
    mk(`foreArm_${side}`, 0, -D.upperArm, 0, bones[`upperArm_${side}`]);
    mk(`hand_${side}`, 0, -D.foreArm, 0, bones[`foreArm_${side}`]);
    mk(`thigh_${side}`, sx * D.hipX, -0.02, 0, bones.hips);
    mk(`shin_${side}`, 0, -D.thigh, 0, bones[`thigh_${side}`]);
    mk(`foot_${side}`, 0, -D.shin, 0, bones[`shin_${side}`]);
  }
  bones.hips.updateMatrixWorld(true);
  const boneList = BONES.map((n) => bones[n]);
  const idx = Object.fromEntries(BONES.map((n, i) => [n, i]));
  const wp = (n) => bones[n].getWorldPosition(new THREE.Vector3());

  // ---------- malha (cada peça presa 100% a um osso: skinning rígido) ----------
  const parts = { skin: [], shirt: [], pants: [], shoes: [], hair: [] };
  const add = (group, geo, boneName) => {
    const n = geo.attributes.position.count;
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(n * 4).fill(0).map((_, i) => (i % 4 === 0 ? idx[boneName] : 0)), 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Array(n * 4).fill(0).map((_, i) => (i % 4 === 0 ? 1 : 0)), 4));
    parts[group].push(geo.index ? geo.toNonIndexed() : geo);
  };
  // Cápsula entre dois pontos.
  const capsule = (a, b, r) => {
    const len = a.distanceTo(b);
    const g = new THREE.CapsuleGeometry(r, Math.max(0.001, len), 6, 12);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    g.applyMatrix4(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)));
    return g;
  };
  const sphere = (c, r, sx = 1, sy = 1, sz = 1) => { const g = new THREE.SphereGeometry(r, 24, 16); g.scale(sx, sy, sz); g.translate(c.x, c.y, c.z); return g; };

  const headC = wp('head').add(new THREE.Vector3(0, D.headRadius * 0.85, 0));
  add('skin', sphere(headC, D.headRadius), 'head');
  add('skin', capsule(wp('neck'), wp('head'), 0.05), 'neck');
  add('shirt', capsule(wp('hips').add(new THREE.Vector3(0, 0.02, 0)), wp('spine'), 0.15), 'hips');
  add('shirt', capsule(wp('spine'), wp('chest').add(new THREE.Vector3(0, 0.08, 0)), 0.16), 'chest');
  for (const s of ['L', 'R']) {
    add('shirt', capsule(wp(`upperArm_${s}`), wp(`foreArm_${s}`), 0.055), `upperArm_${s}`);
    add('shirt', capsule(wp(`foreArm_${s}`), wp(`hand_${s}`), 0.05), `foreArm_${s}`);
    add('skin', sphere(wp(`hand_${s}`).add(new THREE.Vector3(0, -0.04, 0)), 0.055, 1, 1.2, 0.8), `hand_${s}`);
    add('pants', capsule(wp(`thigh_${s}`), wp(`shin_${s}`), 0.075), `thigh_${s}`);
    add('pants', capsule(wp(`shin_${s}`), wp(`foot_${s}`), 0.065), `shin_${s}`);
    const f = wp(`foot_${s}`);
    const shoe = new THREE.BoxGeometry(0.11, D.ankle, 0.2); shoe.translate(f.x, D.ankle / 2, f.z + 0.04);
    add('shoes', shoe, `foot_${s}`);
  }
  if (hairStyle === 'bowl') {
    const cap = new THREE.SphereGeometry(D.headRadius * 1.04, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42);
    cap.rotateX(-0.25); cap.translate(headC.x, headC.y + 0.01, headC.z - 0.01);
    add('hair', cap, 'head');
  }
  const mats = {
    skin: new THREE.MeshStandardMaterial({ color: skin, roughness: 0.75, name: 'pele' }),
    shirt: new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.9, name: 'camisa' }),
    pants: new THREE.MeshStandardMaterial({ color: pants, roughness: 0.9, name: 'calca' }),
    shoes: new THREE.MeshStandardMaterial({ color: shoes, roughness: 0.6, name: 'sapato' }),
    hair: new THREE.MeshStandardMaterial({ color: hair, roughness: 0.6, name: 'cabelo' }),
  };
  const groups = Object.keys(parts).filter((k) => parts[k].length);
  const geo = mergeGeometries(groups.map((k) => mergeGeometries(parts[k])), true);
  const mesh = new THREE.SkinnedMesh(geo, groups.map((k) => mats[k]));
  mesh.name = `${name}_corpo`;
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.add(bones.hips);
  mesh.bind(new THREE.Skeleton(boneList));

  // ---------- rosto (filhos do osso da cabeça, animáveis por escala/rotação) ----------
  const face = new THREE.Group(); face.name = 'rosto';
  face.position.set(0, D.headRadius * 0.85, 0);
  bones.head.add(face);
  const dark = new THREE.MeshBasicMaterial({ color: eyeColor, name: 'olho' });
  const R = D.headRadius;
  const onSurface = (x, y) => new THREE.Vector3(x, y, Math.sqrt(Math.max(0, R * R - x * x - y * y)) - 0.004);
  const eyes = {}, brows = {};
  for (const [s, sx] of [['L', 1], ['R', -1]]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), dark); e.name = `olho_${s}`;
    e.position.copy(onSurface(sx * 0.075, 0.02)); e.scale.set(1, 1.15, 0.5); face.add(e); eyes[s] = e;
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.018, 0.02), new THREE.MeshBasicMaterial({ color: hair, name: 'sobrancelha' }));
    b.name = `sobrancelha_${s}`; b.position.copy(onSurface(sx * 0.08, 0.085)); face.add(b); brows[s] = b;
  }
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 8), new THREE.MeshBasicMaterial({ color: '#5a1f1a', name: 'boca' }));
  mouth.name = 'boca'; mouth.position.copy(onSurface(0, -0.07)); mouth.scale.set(1, 0.12, 0.35); face.add(mouth);

  const root = new THREE.Group(); root.name = name; root.scale.setScalar(scale);
  root.add(mesh);
  root.userData.humanoid = true;
  return { root, mesh, bones, face: { group: face, eyes, brows, mouth }, materials: mats, dimensions: D, scale };
}

// Altura da sola de cada pé no mundo (para verificar se o pé está no chão).
export function footSoles(character) {
  const out = {};
  for (const s of ['L', 'R']) {
    const p = character.bones[`foot_${s}`].getWorldPosition(new THREE.Vector3());
    out[s] = { x: p.x, y: p.y - D.ankle * character.scale, z: p.z };
  }
  return out;
}
