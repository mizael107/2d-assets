// (Navegador) Biblioteca de recursos: carregar, normalizar, posicionar e montar cenários
// a partir do catálogo (assets/roblox/catalogo.json). Formatos: GLB/GLTF, OBJ(+MTL), FBX
// e JSON de peças Roblox (gerado por src/roblox/import-rbx.mjs).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildRobloxModel } from './to-three.js';

const cache = new Map();
export async function loadCatalog(url = '/assets/roblox/catalogo.json') { return (await fetch(url)).json(); }

// Carrega o arquivo de um item do catálogo (com cache) e devolve { object, animations }.
export async function loadAssetFile(file) {
  if (cache.has(file)) return cache.get(file);
  const ext = file.split('.').pop().toLowerCase(); let res;
  if (ext === 'glb' || ext === 'gltf') { const g = await new GLTFLoader().loadAsync(file); res = { object: g.scene, animations: g.animations }; }
  else if (ext === 'obj') {
    const mtl = file.replace(/\.obj$/i, '.mtl'); const loader = new OBJLoader();
    if ((await fetch(mtl, { method: 'HEAD' })).ok) { const m = await new MTLLoader().loadAsync(mtl); m.preload(); loader.setMaterials(m); }
    res = { object: await loader.loadAsync(file), animations: [] };
  } else if (ext === 'fbx') { const f = await new FBXLoader().loadAsync(file); res = { object: f, animations: f.animations }; }
  else if (ext === 'json') { const data = await (await fetch(file)).json(); res = { object: buildRobloxModel(data), animations: [] }; }
  else throw new Error(`formato sem carregador: ${ext}`);
  res.object.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  cache.set(file, res); return res;
}

// Instância pronta para a cena: cópia independente (com esqueleto próprio), na escala do
// catálogo, apoiada no chão (base em y=0) e centralizada em x/z.
export async function instantiate(entry, { position = [0, 0, 0], rotationY = 0, scale = 1, ground = true } = {}) {
  const { object, animations } = await loadAssetFile('/' + entry.arquivo.replace(/^\//, ''));
  const obj = SkeletonUtils.clone(object); const wrap = new THREE.Group(); wrap.name = entry.id; wrap.add(obj);
  obj.scale.multiplyScalar((entry.escala ?? 1) * scale);
  obj.updateMatrixWorld(true);
  if (ground) { const b = new THREE.Box3().setFromObject(obj, true); const c = b.getCenter(new THREE.Vector3()); obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= b.min.y; }
  wrap.position.set(...position); wrap.rotation.y = rotationY;
  wrap.userData.asset = { id: entry.id, licenca: entry.licenca?.tipo, animations };
  return wrap;
}

// Monta um cenário a partir de um layout:
// [{ id: 'casa-blocos', pos: [x, 0, z], rotY: 0.5, scale: 1 }, { id: 'arvore-blocos', grid: { from:[..], to:[..], step: 6 } }, ...]
// Cada item é apoiado no chão (base em y = pos.y). Pisos/chãos que devem ficar com o TOPO em y=0
// precisam de pos.y = -espessura (ex.: chao-pinos tem 0,2 m: use y = -0.2), senão cobrem a rua.
export async function buildLayout(scene, catalog, layout) {
  const byId = Object.fromEntries(catalog.itens.map((e) => [e.id, e])); const placed = [];
  for (const item of layout) {
    const entry = byId[item.id]; if (!entry) throw new Error(`item fora do catálogo: ${item.id}`);
    const spots = item.grid ? gridSpots(item.grid) : [{ pos: item.pos ?? [0, 0, 0], rotY: item.rotY ?? 0 }];
    for (const s of spots) { const o = await instantiate(entry, { position: s.pos, rotationY: s.rotY ?? item.rotY ?? 0, scale: item.scale ?? 1 }); scene.add(o); placed.push(o); }
  }
  return placed;
}
function gridSpots({ from, to, step, jitter = 0, seed = 1 }) {
  const out = []; let s = seed;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - 0.5; };
  for (let x = from[0]; x <= to[0] + 1e-6; x += step) for (let z = from[2]; z <= to[2] + 1e-6; z += step) out.push({ pos: [x + r() * jitter, from[1] ?? 0, z + r() * jitter], rotY: r() * jitter });
  return out;
}

// Otimização para render: junta malhas estáticas que compartilham material (menos draw calls).
// Personagens (SkinnedMesh) e objetos marcados com userData.keep ficam de fora.
export function optimizeStatic(root) {
  root.updateMatrixWorld(true);
  const groups = new Map(); const toRemove = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || o.userData.keep || Array.isArray(o.material)) return;
    let p = o.parent, skip = false; while (p) { if (p.isBone || p.userData.keep) skip = true; p = p.parent; }
    if (skip) return;
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) return; // sem UV não junta (mantém como está)
    (groups.get(o.material) ?? groups.set(o.material, []).get(o.material)).push(g); toRemove.push(o);
  });
  const before = toRemove.length;
  toRemove.forEach((o) => o.parent.remove(o));
  const merged = new THREE.Group(); merged.name = 'estatico_otimizado';
  for (const [mat, geos] of groups) { const m = new THREE.Mesh(mergeGeometries(geos), mat); m.castShadow = m.receiveShadow = true; merged.add(m); }
  root.add(merged);
  return { malhasAntes: before, malhasDepois: groups.size };
}
