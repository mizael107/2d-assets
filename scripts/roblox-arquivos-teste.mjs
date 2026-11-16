// Gera arquivos Roblox DE AUTORIA DO ESTÚDIO para testar o importador (não vêm da Creator Store):
//   assets/roblox/_fontes/teste-casa.rbxm    (binário, gravado com rbxm-parser)
//   assets/roblox/_fontes/teste-praca.rbxlx  (XML, no formato de arquivo do Roblox Studio)
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import * as R from 'rbxm-parser';
import { ROOT } from '../pipeline/config.mjs';

const OUT = join(ROOT, 'assets/roblox/_fontes'); await mkdir(OUT, { recursive: true });
const I = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const RZ90 = [0, -1, 0, 1, 0, 0, 0, 0, 1];               // cilindro em pé (o cilindro do Roblox é no eixo X)
const RY = (deg) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };

// ---------- casa (binário) ----------
const MAT = R.Material;
const casa = [
  // [classe, nome, tamanho, posição, rotação, cor, material, extra]
  ['Part', 'Piso', [16, 1, 14], [0, 0.5, 0], I, [120, 110, 100], MAT.Concrete],
  ['Part', 'ParedeFundo', [16, 9, 1], [0, 5.5, -6.5], I, [190, 90, 70], MAT.Brick],
  ['Part', 'ParedeEsq', [1, 9, 12], [-7.5, 5.5, 0], I, [190, 90, 70], MAT.Brick],
  ['Part', 'ParedeDir', [1, 9, 12], [7.5, 5.5, 0], I, [190, 90, 70], MAT.Brick],
  ['Part', 'FrenteEsq', [5, 9, 1], [-5.5, 5.5, 6.5], I, [190, 90, 70], MAT.Brick],
  ['Part', 'FrenteDir', [5, 9, 1], [5.5, 5.5, 6.5], I, [190, 90, 70], MAT.Brick],
  ['Part', 'FrenteTopo', [6, 2, 1], [0, 9, 6.5], I, [190, 90, 70], MAT.Brick],
  ['Part', 'Porta', [4, 7, 0.4], [0, 4.5, 6.6], I, [110, 70, 40], MAT.Wood],
  ['Part', 'Janela', [3, 3, 0.2], [-5.5, 6, 7.05], I, [170, 210, 240], MAT.Glass, { Transparency: 0.4 }],
  ['WedgePart', 'TelhadoFrente', [17, 5, 8], [0, 12.5, 3.5], RY(180), [70, 60, 80], MAT.WoodPlanks],
  ['WedgePart', 'TelhadoFundo', [17, 5, 8], [0, 12.5, -3.5], I, [70, 60, 80], MAT.WoodPlanks],
  ['Part', 'Chamine', [2, 5, 2], [4.5, 13, -3], I, [150, 70, 55], MAT.Brick],
  ['MeshPart', 'VasoDetalhado', [1.5, 2, 1.5], [-4, 2, 8.5], I, [90, 140, 70], MAT.Plastic, { MeshId: 'rbxassetid://0000000001' }],
];
const file = new R.RobloxFile(); const model = new R.Model(); model.Name = 'CasaTeste';
for (const [cls, name, size, pos, rot, rgb, mat, extra = {}] of casa) {
  const p = new R[cls](); p.Name = name; p.Size = new R.Vector3(...size); p.CFrame = new R.CFrame(new R.Vector3(...pos), rot);
  p.Color3uint8 = R.Color3.FromRGB(...rgb); p.Material = mat; p.Anchored = true;
  for (const [k, v] of Object.entries(extra)) p[k] = v;
  p.Parent = model;
}
file.AddRoot(model);
await writeFile(join(OUT, 'teste-casa.rbxm'), file.WriteToBuffer());

// ---------- praça (XML .rbxlx) ----------
const MAT_ID = { Grass: 1280, Asphalt: 1376, Concrete: 816, Wood: 512, WoodPlanks: 528, Metal: 1088, Neon: 288, Plastic: 256, SmoothPlastic: 272, Glass: 1568, Brick: 848, Cobblestone: 880 };
const SHAPE = { Ball: 0, Block: 1, Cylinder: 2 };
let ref = 0;
const part = (name, size, pos, rgb, mat, { rot = I, shape = 'Block', cls = 'Part', transparency = 0 } = {}) => `
<Item class="${cls}" referent="RBX${++ref}"><Properties>
 <string name="Name">${name}</string><bool name="Anchored">true</bool>
 <CoordinateFrame name="CFrame"><X>${pos[0]}</X><Y>${pos[1]}</Y><Z>${pos[2]}</Z>${['R00', 'R01', 'R02', 'R10', 'R11', 'R12', 'R20', 'R21', 'R22'].map((k, i) => `<${k}>${rot[i]}</${k}>`).join('')}</CoordinateFrame>
 <Vector3 name="size"><X>${size[0]}</X><Y>${size[1]}</Y><Z>${size[2]}</Z></Vector3>
 <Color3uint8 name="Color3uint8">${(0xff000000 | (rgb[0] << 16) | (rgb[1] << 8) | rgb[2]) >>> 0}</Color3uint8>
 <token name="Material">${MAT_ID[mat]}</token>${cls === 'Part' ? `<token name="shape">${SHAPE[shape]}</token>` : ''}
 <float name="Transparency">${transparency}</float>
</Properties></Item>`;
const folder = (name, items) => `<Item class="Model" referent="RBX${++ref}"><Properties><string name="Name">${name}</string></Properties>${items.join('')}</Item>`;
const arvore = (x, z, h = 10) => folder(`Arvore_${x}_${z}`, [
  part('Tronco', [h, 1.6, 1.6], [x, h / 2, z], [100, 70, 45], 'Wood', { rot: RZ90, shape: 'Cylinder' }),
  part('Copa', [9, 9, 9], [x, h + 2.5, z], [70, 150, 70], 'Grass', { shape: 'Ball' }),
]);
const poste = (x, z) => folder(`Poste_${x}_${z}`, [
  part('Haste', [12, 0.8, 0.8], [x, 6, z], [60, 60, 70], 'Metal', { rot: RZ90, shape: 'Cylinder' }),
  part('Lampada', [1.8, 1.8, 1.8], [x, 12.6, z], [255, 220, 150], 'Neon', { shape: 'Ball' }),
]);
const banco = (x, z, ang) => folder(`Banco_${x}_${z}`, [
  part('Assento', [6, 0.6, 2], [x, 1.8, z], [140, 95, 55], 'WoodPlanks', { rot: RY(ang) }),
  part('Encosto', [6, 2, 0.5], [x - Math.sin(ang * Math.PI / 180) * 0.9, 3, z - Math.cos(ang * Math.PI / 180) * 0.9], [140, 95, 55], 'WoodPlanks', { rot: RY(ang) }),
  part('Pe1', [0.5, 1.5, 1.8], [x - 2.4 * Math.cos(ang * Math.PI / 180), 0.75, z + 2.4 * Math.sin(ang * Math.PI / 180)], [50, 50, 55], 'Metal', { rot: RY(ang) }),
  part('Pe2', [0.5, 1.5, 1.8], [x + 2.4 * Math.cos(ang * Math.PI / 180), 0.75, z - 2.4 * Math.sin(ang * Math.PI / 180)], [50, 50, 55], 'Metal', { rot: RY(ang) }),
]);
const praca = folder('PracaTeste', [
  part('Gramado', [120, 1, 120], [0, -0.5, 0], [90, 160, 80], 'Grass'),
  part('Rua', [120, 0.2, 18], [0, 0.1, 30], [55, 55, 60], 'Asphalt'),
  ...[-50, -30, -10, 10, 30, 50].map((x) => part(`Faixa_${x}`, [8, 0.05, 1], [x, 0.23, 30], [240, 230, 120], 'SmoothPlastic')),
  part('Calcada', [120, 0.6, 6], [0, 0.3, 18], [190, 185, 175], 'Concrete'),
  part('PisoPraca', [44, 0.4, 44], [0, 0.2, -10], [175, 160, 140], 'Cobblestone'),
  folder('Fonte', [
    part('Base', [3, 18, 18], [0, 1.5, -10], [200, 200, 205], 'Concrete', { rot: RZ90, shape: 'Cylinder' }),
    part('Agua', [0.4, 16, 16], [0, 2.9, -10], [80, 150, 220], 'Glass', { rot: RZ90, shape: 'Cylinder', transparency: 0.3 }),
    part('Coluna', [6, 2, 2], [0, 5, -10], [200, 200, 205], 'Concrete', { rot: RZ90, shape: 'Cylinder' }),
  ]),
  arvore(-16, -24), arvore(16, -24), arvore(-18, 4, 12), arvore(18, 6, 9),
  poste(-14, 12), poste(14, 12),
  banco(-9, 2, 0), banco(9, 2, 0),
  part('Placa', [12, 3, 0.5], [0, 9, -30], [255, 80, 160], 'Neon'),
  part('PlacaSuporte', [1, 8, 1], [0, 4, -30.5], [60, 60, 70], 'Metal'),
  part('Spawn', [6, 1, 6], [0, 0.9, 0], [200, 200, 200], 'SmoothPlastic', { cls: 'SpawnLocation' }),
]);
const xml = `<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" version="4">${praca}</roblox>`;
await writeFile(join(OUT, 'teste-praca.rbxlx'), xml);
console.log('gerados:', join(OUT, 'teste-casa.rbxm'), join(OUT, 'teste-praca.rbxlx'));
