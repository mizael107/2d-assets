// (Node) Importa arquivos do Roblox (.rbxm/.rbxl binários e .rbxmx/.rbxlx em XML) para um
// JSON neutro com as PEÇAS geométricas (Part, WedgePart, CornerWedgePart, TrussPart,
// SpawnLocation, Seat...), prontas para virar malhas no Three.js (src/roblox/to-three.js).
//
// O que vem do arquivo: posição/rotação (CFrame), tamanho, cor, material, transparência,
// forma, hierarquia (Model/Folder) e referências a recursos externos (MeshId, TextureID,
// Decal, Sound, Animation). Os ARQUIVOS desses recursos não estão dentro do .rbxm: são IDs
// (rbxassetid://123) que o Roblox baixa da nuvem com login. Eles saem listados em
// "dependencias" e só são resolvidos se você colocar o arquivo no projeto (ver meshMap).
import { readFile } from 'node:fs/promises';
import { extname, basename } from 'node:path';
import * as R from 'rbxm-parser';
import { XMLParser } from 'fast-xml-parser';

export const STUD_M = 0.28; // 1 stud ≈ 0,28 m (convenção usada pela própria Roblox para avatares)

// Enum Material (valor numérico -> nome). Mesmo número no binário e no XML.
export const MATERIALS = {
  256: 'Plastic', 272: 'SmoothPlastic', 288: 'Neon', 512: 'Wood', 528: 'WoodPlanks', 784: 'Marble', 800: 'Slate',
  816: 'Concrete', 832: 'Granite', 848: 'Brick', 864: 'Pebble', 880: 'Cobblestone', 896: 'Rock', 912: 'Sandstone',
  1040: 'CorrodedMetal', 1056: 'DiamondPlate', 1072: 'Foil', 1088: 'Metal', 1280: 'Grass', 1296: 'Sand', 1312: 'Fabric',
  1328: 'Snow', 1344: 'Mud', 1360: 'Ground', 1376: 'Asphalt', 1392: 'Salt', 1536: 'Ice', 1552: 'Glacier', 1568: 'Glass',
  1584: 'ForceField', 1792: 'Air', 2048: 'Water',
  // Materiais mais novos (Cardboard, Carpet, CeramicTiles, Leather...) não estão nesta tabela:
  // no binário o nome vem direto do rbxm-parser; no XML, um número desconhecido vira Plastic.
};
const SHAPES = { 0: 'Ball', 1: 'Block', 2: 'Cylinder', 3: 'Wedge', 4: 'CornerWedge' };
const GEOMETRY_CLASSES = new Set(['Part', 'WedgePart', 'CornerWedgePart', 'TrussPart', 'SpawnLocation', 'Seat', 'VehicleSeat', 'MeshPart', 'UnionOperation', 'PartOperation', 'NegateOperation']);
const DEP_PROPS = { MeshId: 'malha', TextureID: 'textura', TextureId: 'textura', Texture: 'textura', SoundId: 'som', AnimationId: 'animacao', SkyboxBk: 'textura' };

// ---------- binário (.rbxm/.rbxl) via rbxm-parser ----------
function fromBinary(buf) {
  const file = R.RobloxFile.ReadFromBuffer(buf);
  if (!file) throw new Error('arquivo binário Roblox inválido');
  const out = [];
  const walk = (inst, path) => {
    const p = [...path, inst.Name];
    const node = { className: inst.ClassName, name: inst.Name, path: p.join('/'), props: {} };
    const get = (k) => { try { return inst[k]; } catch { return undefined; } };
    const cf = get('CFrame'), size = get('Size'), col = get('Color3uint8'), mat = get('Material'), shape = get('Shape');
    if (cf) node.props.cframe = { pos: [cf.Position.X, cf.Position.Y, cf.Position.Z], rot: [...cf.Orientation] };
    if (size) node.props.size = [size.X, size.Y, size.Z];
    if (col) node.props.color = [col.R, col.G, col.B].map((v) => (v <= 1 && !Number.isInteger(v) ? Math.round(v * 255) : v));
    if (mat) node.props.material = mat._name ?? MATERIALS[mat._value] ?? 'Plastic';
    if (shape) node.props.shape = shape._name;
    for (const k of ['Transparency', 'Reflectance', 'Anchored']) { const v = get(k); if (v !== undefined) node.props[k.toLowerCase()] = v; }
    for (const k of Object.keys(DEP_PROPS)) { const v = get(k); if (typeof v === 'string' && v) node.props[k] = v; else if (v?.Uri) node.props[k] = v.Uri; }
    out.push(node);
    for (const c of inst.Children ?? inst.GetChildren?.() ?? []) walk(c, p);
  };
  for (const r of file.Roots) walk(r, []);
  return out;
}

// ---------- XML (.rbxmx/.rbxlx) ----------
const num = (v) => Number(typeof v === 'object' ? v['#text'] : v);
function fromXml(text) {
  const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@', isArray: (n) => n === 'Item' || ['string', 'bool', 'float', 'token', 'int', 'Content', 'CoordinateFrame', 'Vector3', 'Color3uint8', 'Color3', 'double', 'int64', 'BinaryString', 'ProtectedString'].includes(n) }).parse(text);
  const out = [];
  const propsOf = (P) => {
    const props = {}; const all = (t) => (P?.[t] ?? []);
    const named = (t, name) => all(t).find((x) => x['@name'] === name);
    const cf = named('CoordinateFrame', 'CFrame');
    if (cf) props.cframe = { pos: ['X', 'Y', 'Z'].map((k) => num(cf[k])), rot: ['R00', 'R01', 'R02', 'R10', 'R11', 'R12', 'R20', 'R21', 'R22'].map((k) => num(cf[k])) };
    const size = named('Vector3', 'size') ?? named('Vector3', 'Size');
    if (size) props.size = ['X', 'Y', 'Z'].map((k) => num(size[k]));
    const c8 = named('Color3uint8', 'Color3uint8'); const c3 = named('Color3', 'Color');
    if (c8) { const v = num(c8) >>> 0; props.color = [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
    else if (c3) props.color = ['R', 'G', 'B'].map((k) => Math.round(num(c3[k]) * 255));
    const mat = named('token', 'Material'); if (mat) props.material = MATERIALS[num(mat)] ?? 'Plastic';
    const shape = named('token', 'shape') ?? named('token', 'Shape'); if (shape) props.shape = SHAPES[num(shape)] ?? 'Block';
    for (const [k, t] of [['Transparency', 'float'], ['Reflectance', 'float'], ['Anchored', 'bool']]) { const v = named(t, k); if (v !== undefined) props[k.toLowerCase()] = t === 'bool' ? String(v['#text'] ?? v).trim() === 'true' : num(v); }
    for (const c of all('Content')) { const k = c['@name']; if (DEP_PROPS[k]) { const url = c.url ?? c['#text']; if (url && String(url).trim()) props[k] = String(typeof url === 'object' ? url['#text'] : url).trim(); } }
    const name = named('string', 'Name'); props.__name = name ? String(name['#text'] ?? name) : undefined;
    return props;
  };
  const walk = (item, path) => {
    const props = propsOf(item.Properties); const name = props.__name ?? item['@class']; delete props.__name;
    const p = [...path, name];
    out.push({ className: item['@class'], name, path: p.join('/'), props });
    for (const c of item.Item ?? []) walk(c, p);
  };
  for (const it of xml.roblox?.Item ?? []) walk(it, []);
  return out;
}

// ---------- normalização ----------
export async function importRobloxFile(path, { meshMap = {} } = {}) {
  const ext = extname(path).toLowerCase();
  const buf = await readFile(path);
  const isBinary = buf.subarray(0, 8).toString('latin1') === '<roblox!';
  const format = { '.rbxm': 'rbxm', '.rbxl': 'rbxl', '.rbxmx': 'rbxmx', '.rbxlx': 'rbxlx' }[ext];
  if (!format) throw new Error(`extensão não suportada: ${ext}`);
  const nodes = isBinary ? fromBinary(buf) : fromXml(buf.toString('utf8'));
  const parts = []; const unsupported = {}; const deps = []; const classes = {};
  for (const n of nodes) {
    classes[n.className] = (classes[n.className] ?? 0) + 1;
    for (const k of Object.keys(DEP_PROPS)) if (n.props[k]) deps.push({ tipo: DEP_PROPS[k], id: n.props[k], em: n.path, resolvido: !!meshMap[n.props[k]] });
    if (!GEOMETRY_CLASSES.has(n.className) || !n.props.size || !n.props.cframe) continue;
    let shape = n.props.shape ?? 'Block';
    if (n.className === 'WedgePart') shape = 'Wedge';
    if (n.className === 'CornerWedgePart') shape = 'CornerWedge';
    if (['MeshPart', 'UnionOperation', 'PartOperation'].includes(n.className)) { shape = meshMap[n.props.MeshId] ? 'Mesh' : 'Placeholder'; unsupported[n.className] = (unsupported[n.className] ?? 0) + 1; }
    parts.push({ name: n.name, path: n.path, className: n.className, shape, size: n.props.size, cframe: n.props.cframe,
      color: n.props.color ?? [163, 162, 165], material: n.props.material ?? 'Plastic', transparency: n.props.transparency ?? 0,
      reflectance: n.props.reflectance ?? 0, meshFile: meshMap[n.props.MeshId] ?? null });
  }
  // Caixa envolvente em studs (aproximada pelos centros ± meio tamanho).
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const p of parts) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i], p.cframe.pos[i] - p.size[i] / 2); max[i] = Math.max(max[i], p.cframe.pos[i] + p.size[i] / 2); }
  return {
    fonte: basename(path), formato: format, binario: isBinary, unidade: 'stud', studEmMetros: STUD_M,
    totalInstancias: nodes.length, classes, pecas: parts,
    semGeometriaLocal: unsupported, // MeshPart/Union: a malha está na nuvem do Roblox
    dependencias: deps,
    dimensoesStuds: parts.length ? max.map((v, i) => +(v - min[i]).toFixed(2)) : [0, 0, 0],
    dimensoesMetros: parts.length ? max.map((v, i) => +((v - min[i]) * STUD_M).toFixed(2)) : [0, 0, 0],
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await importRobloxFile(process.argv[2]);
  console.log(JSON.stringify({ ...r, pecas: `${r.pecas.length} peças` }, null, 1));
}
