// (Navegador) Constrói no Three.js as peças importadas de um arquivo Roblox
// (JSON de src/roblox/import-rbx.mjs). Converte studs em metros, aplica CFrame, cores
// e materiais (com texturas procedurais próprias) e agrupa por material para render rápido.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { robloxMaterial } from './materials.js';

// Cunha (WedgePart): rampa baixa na frente (-Z) e alta atrás (+Z), como no Roblox.
// ConvexGeometry calcula a orientação das faces corretamente.
const wedgeGeometry = () => new ConvexGeometry([[-.5, -.5, -.5], [.5, -.5, -.5], [.5, -.5, .5], [-.5, -.5, .5], [-.5, .5, .5], [.5, .5, .5]].map((p) => new THREE.Vector3(...p)));
// Cunha de canto (CornerWedgePart): pirâmide com o pico num canto superior (aproximação).
const cornerWedgeGeometry = () => new ConvexGeometry([[-.5, -.5, -.5], [.5, -.5, -.5], [.5, -.5, .5], [-.5, -.5, .5], [.5, .5, -.5]].map((p) => new THREE.Vector3(...p)));
// Coordenadas de textura por projeção (para formas que não trazem UV).
function ensureUV(g) {
  if (g.attributes.uv) return g;
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const [u, v] = ay >= ax && ay >= az ? [p.getX(i), p.getZ(i)] : ax >= az ? [p.getZ(i), p.getY(i)] : [p.getX(i), p.getY(i)];
    uv[i * 2] = u + 0.5; uv[i * 2 + 1] = v + 0.5;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}
const UNIT = {
  Block: () => new THREE.BoxGeometry(1, 1, 1),
  Ball: () => new THREE.SphereGeometry(0.5, 24, 16),
  Cylinder: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 24).rotateZ(Math.PI / 2), // cilindro do Roblox fica no eixo X
  Wedge: wedgeGeometry, CornerWedge: cornerWedgeGeometry,
  Placeholder: () => new THREE.BoxGeometry(1, 1, 1),
};

// Matriz do CFrame (rotação 3×3 em linhas) com posição convertida para metros.
export function cframeMatrix(cf, scale) {
  const r = cf.rot;
  return new THREE.Matrix4().set(r[0], r[1], r[2], cf.pos[0] * scale, r[3], r[4], r[5], cf.pos[1] * scale, r[6], r[7], r[8], cf.pos[2] * scale, 0, 0, 0, 1);
}

// merge=true junta todas as peças do mesmo material/cor num único mesh (bem mais rápido).
export function buildRobloxModel(data, { scale = data.studEmMetros ?? 0.28, merge = true, castShadow = true } = {}) {
  const group = new THREE.Group(); group.name = data.fonte ?? 'roblox';
  const buckets = new Map(); const stats = { pecas: 0, placeholders: 0, malhas: 0 };
  for (const p of data.pecas) {
    if (p.transparency >= 1) continue;
    let geo = (UNIT[p.shape] ?? UNIT.Block)(); geo = ensureUV(geo.index ? geo.toNonIndexed() : geo);
    const s = p.size.map((v) => v * scale);
    geo.applyMatrix4(new THREE.Matrix4().makeScale(...s));
    // Coordenadas de textura em metros (o tamanho da textura não estica com a peça).
    const uv = geo.attributes.uv; if (uv) for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(s[0], s[2]), uv.getY(i) * s[1]);
    geo.applyMatrix4(cframeMatrix(p.cframe, scale));
    if (p.shape === 'Placeholder') stats.placeholders++;
    const key = `${p.material}|${p.color.join(',')}|${p.transparency}|${p.shape === 'Placeholder'}`;
    if (!buckets.has(key)) buckets.set(key, { mat: robloxMaterial(p.material, p.color, { transparency: p.transparency, reflectance: p.reflectance, placeholder: p.shape === 'Placeholder' }), geos: [], names: [] });
    buckets.get(key).geos.push(geo.index ? geo.toNonIndexed() : geo); buckets.get(key).names.push(p.name);
    stats.pecas++;
  }
  for (const [key, b] of buckets) {
    const meshes = merge ? [new THREE.Mesh(mergeGeometries(b.geos.map((g) => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k); return g; })), b.mat)] : b.geos.map((g) => new THREE.Mesh(g, b.mat));
    meshes.forEach((m, i) => { m.name = merge ? key.split('|')[0] : b.names[i]; m.castShadow = castShadow && b.mat.opacity > 0.5; m.receiveShadow = true; group.add(m); stats.malhas++; });
  }
  group.userData.roblox = { ...stats, fonte: data.fonte, formato: data.formato };
  return group;
}
