// (Navegador) Kit de recursos "estilo blocos" DE AUTORIA DO ESTÚDIO, inspirado na estética
// de jogos de blocos (formas simples, cores sólidas, pinos). Não reproduz personagens,
// logotipos nem modelos oficiais do Roblox: é uma biblioteca própria, livre para uso.
// Medidas em metros. Cada função devolve um THREE.Object3D com a base em y = 0.
import * as THREE from 'three';
import { robloxMaterial } from './materials.js';

const M = (mat, hex, o) => robloxMaterial(mat, new THREE.Color(hex).toArray().map((v) => Math.round(v * 255)), o);
const blk = (w, h, d, mat, x = 0, y = 0, z = 0, name) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; if (name) m.name = name; return m; };
const cyl = (r, h, mat, x = 0, y = 0, z = 0, seg = 16) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m; };
const grp = (name, ...kids) => { const g = new THREE.Group(); g.name = name; kids.forEach((k) => g.add(k)); return g; };

// ---------- personagem blocado com esqueleto (6 ossos) e animações ----------
export function blockyCharacter({ name = 'boneco_blocos', head = '#f2c38b', shirt = '#d9534f', pants = '#2f4f8f', hair = '#3a2a1a' } = {}) {
  const root = new THREE.Bone(); root.name = 'raiz'; root.position.y = 1.0;
  const bone = (n, x, y, z, p) => { const b = new THREE.Bone(); b.name = n; b.position.set(x, y, z); p.add(b); return b; };
  const neck = bone('cabeca', 0, 0.55, 0, root);
  const armL = bone('braco_E', 0.36, 0.5, 0, root), armR = bone('braco_D', -0.36, 0.5, 0, root);
  const legL = bone('perna_E', 0.12, -0.05, 0, root), legR = bone('perna_D', -0.12, -0.05, 0, root);
  const ms = { pele: M('SmoothPlastic', head), camisa: M('SmoothPlastic', shirt), calca: M('SmoothPlastic', pants), cabelo: M('SmoothPlastic', hair) };
  // Peças rígidas presas aos ossos (o GLTF guarda como nós filhos dos ossos).
  root.add(blk(0.5, 0.6, 0.26, ms.camisa, 0, 0.25, 0, 'tronco'));
  neck.add(blk(0.42, 0.42, 0.42, ms.pele, 0, 0.21, 0, 'cabeca_bloco'));
  neck.add(blk(0.44, 0.12, 0.44, ms.cabelo, 0, 0.42, -0.01, 'cabelo'));
  const face = new THREE.Group(); face.name = 'rosto'; face.position.set(0, 0.22, 0.212); neck.add(face);
  const preto = new THREE.MeshBasicMaterial({ color: '#111', name: 'olho' });
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.01), preto); e.name = sx > 0 ? 'olho_E' : 'olho_D'; e.position.set(sx * 0.08, 0.03, 0); face.add(e); }
  const boca = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 0.01), preto); boca.name = 'boca'; boca.position.set(0, -0.08, 0); face.add(boca);
  for (const [b, m] of [[armL, ms.camisa], [armR, ms.camisa]]) b.add(blk(0.2, 0.6, 0.24, m, 0, -0.25, 0, `${b.name}_bloco`));
  for (const b of [legL, legR]) b.add(blk(0.23, 0.95, 0.25, ms.calca, 0, -0.475, 0, `${b.name}_bloco`));
  const g = grp(name, root); g.userData.kit = { tipo: 'personagem', ossos: 6 };
  return { root: g, bones: { raiz: root, cabeca: neck, braco_E: armL, braco_D: armR, perna_E: legL, perna_D: legR }, face };
}

// Animações do personagem blocado (balanço de braços e pernas, como bonecos de blocos).
export function blockyClips() {
  const q = (x) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), x);
  const clip = (name, dur, fn) => {
    const n = 25, t = [...Array(n)].map((_, i) => (i / (n - 1)) * dur), tracks = {};
    t.forEach((tt) => { for (const [b, a] of Object.entries(fn(tt))) (tracks[b] ??= []).push(...q(a).toArray()); });
    return new THREE.AnimationClip(name, dur, Object.entries(tracks).map(([b, v]) => new THREE.QuaternionKeyframeTrack(`${b}.quaternion`, t, v)));
  };
  const w = (dur, amp) => (t) => { const s = Math.sin((t / dur) * Math.PI * 2) * amp; return { braco_E: s, braco_D: -s, perna_E: -s, perna_D: s }; };
  return [clip('andar', 0.8, w(0.8, 0.7)), clip('correr', 0.5, w(0.5, 1.1)), clip('parado', 2, (t) => ({ cabeca: 0.05 * Math.sin(t * Math.PI), braco_E: 0.04 * Math.sin(t * Math.PI), braco_D: -0.04 * Math.sin(t * Math.PI) })),
    clip('acenar', 1, (t) => ({ braco_D: -2.8 + 0.3 * Math.sin((t / 1) * Math.PI * 4) }))];
}

// ---------- construções ----------
export function blockyHouse({ wall = '#e8d9b5', roof = '#b5523b', door = '#7a4a2a', w = 7, d = 6, h = 3.2 } = {}) {
  const wallM = M('Brick', wall), roofM = M('WoodPlanks', roof), doorM = M('Wood', door), glass = M('Glass', '#a8d8f0'), trim = M('SmoothPlastic', '#ffffff');
  const g = grp('casa_blocos', blk(w, h, d, wallM, 0, h / 2, 0, 'paredes'), blk(w + 0.3, 0.2, d + 0.3, trim, 0, h, 0, 'beiral'));
  for (let i = 0; i < 6; i++) { const s = 1 - i / 6; g.add(blk((w + 0.6) * s, 0.35, d + 0.6, roofM, 0, h + 0.1 + i * 0.35, 0, `telhado_${i}`)); }
  g.add(blk(1.1, 2.1, 0.12, doorM, 0, 1.05, d / 2 + 0.03, 'porta'));
  for (const sx of [-1, 1]) { g.add(blk(1.2, 1.0, 0.1, glass, sx * w * 0.3, 1.8, d / 2 + 0.03, 'janela')); g.add(blk(1.4, 0.12, 0.16, trim, sx * w * 0.3, 1.25, d / 2 + 0.05, 'peitoril')); }
  g.add(blk(0.7, 1.6, 0.7, M('Brick', '#8a4a3a'), w * 0.28, h + 1.4, -d * 0.2, 'chamine'));
  return g;
}
export function blockyBuilding({ floors = 5, color = '#8fa3b8', w = 8, d = 8 } = {}) {
  const fh = 3; const g = grp('predio_blocos', blk(w, floors * fh, d, M('Concrete', color), 0, (floors * fh) / 2, 0, 'corpo'));
  const glass = M('Glass', '#bfe3ff'); const lit = M('Neon', '#ffd98a');
  for (let f = 0; f < floors; f++) for (let i = -1; i <= 1; i++) for (const [z, ry] of [[d / 2 + 0.03, 0], [-d / 2 - 0.03, 0]]) g.add(blk(1.6, 1.4, 0.08, (f * 3 + i + 7) % 5 === 0 ? lit : glass, i * 2.5, f * fh + 1.7, z, 'janela'));
  g.add(blk(w + 0.4, 0.4, d + 0.4, M('Concrete', '#5f6b78'), 0, floors * fh + 0.2, 0, 'cobertura'));
  return g;
}
export function blockyTree({ height = 4, crown = '#3f8f3f', trunk = '#6b4a2b', style = 'blocos' } = {}) {
  const g = grp('arvore_blocos', blk(0.5, height * 0.55, 0.5, M('Wood', trunk), 0, height * 0.275, 0, 'tronco'));
  const cm = M('Grass', crown);
  if (style === 'bola') { const s = new THREE.Mesh(new THREE.SphereGeometry(height * 0.32, 16, 12), cm); s.position.y = height * 0.72; s.castShadow = true; g.add(s); }
  else { g.add(blk(height * 0.6, height * 0.35, height * 0.6, cm, 0, height * 0.65, 0, 'copa1'), blk(height * 0.4, height * 0.25, height * 0.4, cm, 0, height * 0.92, 0, 'copa2')); }
  return g;
}
export function blockyCar({ body = '#2b6cd4', w = 1.8, l = 3.8 } = {}) {
  const bm = M('SmoothPlastic', body), glass = M('Glass', '#9fd0ff'), tire = M('SmoothPlastic', '#1d1d1f'), rim = M('Metal', '#c8c8c8'), light = M('Neon', '#fff3c4'), back = M('Neon', '#ff3030');
  const g = grp('carro_blocos', blk(w, 0.55, l, bm, 0, 0.6, 0, 'carroceria'), blk(w * 0.92, 0.5, l * 0.5, bm, 0, 1.12, -0.1, 'cabine'),
    blk(w * 0.94, 0.42, 0.05, glass, 0, 1.12, l * 0.15 + 0.01, 'parabrisa'), blk(w * 0.94, 0.4, 0.05, glass, 0, 1.12, -l * 0.35 - 0.01, 'vidro_traseiro'));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const t = cyl(0.33, 0.25, tire, sx * (w / 2 - 0.05), 0.33, sz * l * 0.32, 18); t.rotation.z = Math.PI / 2; t.name = 'roda'; g.add(t); const r2 = cyl(0.17, 0.27, rim, sx * (w / 2 - 0.05), 0.33, sz * l * 0.32, 12); r2.rotation.z = Math.PI / 2; g.add(r2); }
  for (const sx of [-1, 1]) { g.add(blk(0.3, 0.15, 0.05, light, sx * 0.6, 0.7, l / 2 + 0.01, 'farol')); g.add(blk(0.3, 0.15, 0.05, back, sx * 0.6, 0.7, -l / 2 - 0.01, 'lanterna')); }
  return g;
}
export function blockyRoad({ length = 12, width = 7 } = {}) {
  const g = grp('rua_blocos', blk(width, 0.06, length, M('Asphalt', '#3a3a3f'), 0, 0.03, 0, 'asfalto'));
  for (let z = -length / 2 + 1; z < length / 2; z += 3) g.add(blk(0.15, 0.065, 1.5, M('SmoothPlastic', '#f2e27a'), 0, 0.035, z + 0.75, 'faixa'));
  for (const sx of [-1, 1]) g.add(blk(1.6, 0.18, length, M('Concrete', '#c9c4ba'), sx * (width / 2 + 0.8), 0.09, 0, 'calcada'));
  return g;
}
export function blockyLamp() {
  return grp('poste_blocos', cyl(0.08, 4, M('Metal', '#3c3f45'), 0, 2, 0, 10), blk(0.9, 0.12, 0.25, M('Metal', '#3c3f45'), 0.35, 4, 0, 'braco'), blk(0.35, 0.18, 0.35, M('Neon', '#ffe2a0'), 0.7, 3.9, 0, 'lampada'));
}
export function blockyBench() {
  const wood = M('WoodPlanks', '#9a6a3a'), metal = M('Metal', '#3a3a3a');
  return grp('banco_blocos', blk(1.8, 0.1, 0.5, wood, 0, 0.45, 0, 'assento'), blk(1.8, 0.45, 0.08, wood, 0, 0.75, -0.22, 'encosto'), blk(0.08, 0.45, 0.45, metal, -0.8, 0.22, 0), blk(0.08, 0.45, 0.45, metal, 0.8, 0.22, 0));
}
export function blockyFence({ length = 4 } = {}) {
  const w = M('Wood', '#d8c8a8'); const g = grp('cerca_blocos');
  for (let x = -length / 2; x <= length / 2 + 0.01; x += 0.5) g.add(blk(0.1, 1, 0.08, w, x, 0.5, 0, 'estaca'));
  g.add(blk(length + 0.1, 0.1, 0.05, w, 0, 0.7, 0.05, 'travessa'), blk(length + 0.1, 0.1, 0.05, w, 0, 0.35, 0.05, 'travessa'));
  return g;
}
export function blockyTable() {
  const wd = M('Wood', '#8a5a32');
  return grp('mesa_blocos', blk(1.4, 0.08, 0.8, wd, 0, 0.75, 0, 'tampo'), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => blk(0.08, 0.72, 0.08, wd, x * 0.62, 0.36, z * 0.34, 'perna')));
}
export function blockyBaseplate({ size = 40, color = '#5aa05a' } = {}) {
  return grp('chao_pinos', blk(size, 0.2, size, M('Plastic', color), 0, -0.1, 0, 'chao'));
}

// Catálogo do kit: id -> { construtor, categoria }
export const KIT = {
  'personagem-blocos': { make: () => blockyCharacter().root, categoria: 'characters', animacoes: true },
  'casa-blocos': { make: blockyHouse, categoria: 'houses' },
  'predio-blocos': { make: blockyBuilding, categoria: 'cities' },
  'arvore-blocos': { make: blockyTree, categoria: 'forests' },
  'arvore-bola': { make: () => blockyTree({ style: 'bola', height: 5 }), categoria: 'forests' },
  'carro-blocos': { make: blockyCar, categoria: 'vehicles' },
  'rua-blocos': { make: blockyRoad, categoria: 'streets' },
  'poste-blocos': { make: blockyLamp, categoria: 'streets' },
  'banco-blocos': { make: blockyBench, categoria: 'props' },
  'cerca-blocos': { make: blockyFence, categoria: 'props' },
  'mesa-blocos': { make: blockyTable, categoria: 'interiors' },
  'chao-pinos': { make: blockyBaseplate, categoria: 'maps' },
};
