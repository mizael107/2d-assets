// (Navegador) Tarefas da biblioteca Roblox, chamadas por scripts/roblox-biblioteca.mjs.
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { KIT, blockyClips } from '@studio/roblox/blocky-kit.js';
import { buildRobloxModel } from '@studio/roblox/to-three.js';
import { loadAssetFile } from '@studio/roblox/assets.js';

const b64 = (ab) => { let s = ''; const u = new Uint8Array(ab); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
async function toGLB(object, animations = []) {
  const scene = new THREE.Scene(); scene.add(object); object.updateMatrixWorld(true);
  return b64(await new GLTFExporter().parseAsync(scene, { binary: true, animations }));
}

export async function exportKit(id) {
  const k = KIT[id]; const obj = k.make();
  const clips = k.animacoes ? blockyClips() : [];
  return { base64: await toGLB(obj, clips), animacoes: clips.map((c) => c.name) };
}
// updateMatrixWorld antes de exportar: sem isso o OBJ sai com as peças na origem.
export async function exportKitOBJ(id) { const o = KIT[id].make(); o.updateMatrixWorld(true); return new OBJExporter().parse(o); }

// JSON de peças Roblox -> GLB (com materiais/texturas aplicados e peças agrupadas).
export async function robloxJsonToGLB(url) {
  const data = await (await fetch(url)).json();
  const g = buildRobloxModel(data);
  return { base64: await toGLB(g), stats: g.userData.roblox };
}

// Recarrega arquivos pelos carregadores genéricos e mede (prova de importação).
export async function reload(files) {
  const out = {};
  for (const f of files) {
    const { object, animations } = await loadAssetFile(f);
    let meshes = 0, tris = 0; object.traverse((o) => { if (o.isMesh) { meshes++; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } });
    const s = new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
    out[f] = { malhas: meshes, triangulos: Math.round(tris), tamanho: s.toArray().map((v) => +v.toFixed(2)), animacoes: animations.map((a) => a.name) };
  }
  return out;
}

// Conversor genérico: qualquer formato com carregador (FBX, OBJ, GLTF, JSON Roblox) -> GLB.
export async function convertToGLB(url) {
  const { object, animations } = await loadAssetFile(url);
  return { base64: await toGLB(object.clone(), animations), animacoes: animations.map((a) => a.name) };
}
