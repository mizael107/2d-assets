// (Navegador) Materiais no estilo Roblox, com texturas procedurais PRÓPRIAS (desenhadas em
// canvas): não usa nenhuma textura oficial do Roblox. Cada material do enum Material vira
// um MeshStandardMaterial com rugosidade, metalicidade, brilho e um padrão de superfície.
import * as THREE from 'three';
import { rng } from '../utils/random.js';

const cache = new Map();
function canvasTexture(kind, seed = 1) {
  if (cache.has(kind)) return cache.get(kind);
  const S = 256; const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); const r = rng(seed);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S);
  const shade = (a) => `rgba(0,0,0,${a})`;
  if (kind === 'studs') { // pinos clássicos de blocos de montar (padrão genérico)
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const cx = x * 64 + 32, cy = y * 64 + 32; g.fillStyle = shade(0.12); g.beginPath(); g.arc(cx + 2, cy + 3, 18, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(cx - 2, cy - 2, 16, 0, 7); g.fill(); }
  } else if (kind === 'wood') {
    for (let y = 0; y < S; y += 2) { g.fillStyle = shade(0.04 + 0.08 * Math.abs(Math.sin(y * 0.09 + Math.sin(y * 0.02) * 3))); g.fillRect(0, y, S, 2); }
    for (let i = 0; i < 4; i++) { g.fillStyle = shade(0.18); g.fillRect(0, i * 64, S, 2); }
  } else if (kind === 'brick') {
    g.fillStyle = shade(0.28); for (let y = 0; y < S; y += 32) { g.fillRect(0, y, S, 4); for (let x = (y / 32) % 2 ? 0 : 32; x < S; x += 64) g.fillRect(x, y, 4, 32); }
    for (let i = 0; i < 600; i++) { g.fillStyle = shade(r() * 0.08); g.fillRect(r() * S, r() * S, 3, 3); }
  } else if (kind === 'noise' || kind === 'grass' || kind === 'concrete' || kind === 'sand') {
    const n = kind === 'grass' ? 4000 : 2500, a = kind === 'concrete' ? 0.07 : 0.12;
    for (let i = 0; i < n; i++) { g.fillStyle = r() < 0.5 ? shade(r() * a) : `rgba(255,255,255,${r() * a})`; const w = kind === 'grass' ? 2 : 3; g.fillRect(r() * S, r() * S, w, kind === 'grass' ? 6 : w); }
  } else if (kind === 'plate') {
    g.strokeStyle = shade(0.25); g.lineWidth = 6; for (let y = 16; y < S; y += 64) for (let x = 16; x < S; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20, y + 20); g.moveTo(x + 32, y + 40); g.lineTo(x + 52, y + 20); g.stroke(); }
  } else if (kind === 'fabric') {
    for (let y = 0; y < S; y += 4) { g.fillStyle = shade(0.05); g.fillRect(0, y, S, 1); g.fillRect(y, 0, 1, S); }
  } else if (kind === 'tiles') {
    g.fillStyle = shade(0.2); for (let i = 0; i < S; i += 64) { g.fillRect(i, 0, 3, S); g.fillRect(0, i, S, 3); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  cache.set(kind, t); return t;
}

// material Roblox -> aparência
export const MATERIAL_LOOK = {
  Plastic: { rough: 0.55, tex: 'studs', repeat: 1.2 }, SmoothPlastic: { rough: 0.45 },
  Neon: { rough: 0.3, emissive: 2.2 }, Glass: { rough: 0.05, opacity: 0.35, metal: 0 }, ForceField: { rough: 0.2, opacity: 0.25, emissive: 1 },
  Wood: { rough: 0.8, tex: 'wood', repeat: 1 }, WoodPlanks: { rough: 0.8, tex: 'wood', repeat: 1.5 },
  Brick: { rough: 0.9, tex: 'brick', repeat: 1.2 }, Cobblestone: { rough: 0.95, tex: 'brick', repeat: 2 }, Pebble: { rough: 0.95, tex: 'noise', repeat: 2 },
  Concrete: { rough: 0.92, tex: 'concrete', repeat: 1 }, Asphalt: { rough: 0.95, tex: 'concrete', repeat: 2 }, Slate: { rough: 0.9, tex: 'noise' }, Granite: { rough: 0.85, tex: 'noise' }, Marble: { rough: 0.3, tex: 'noise' }, Rock: { rough: 0.95, tex: 'noise' },
  Grass: { rough: 1, tex: 'grass', repeat: 1.5 }, Ground: { rough: 1, tex: 'noise' }, Mud: { rough: 0.9, tex: 'noise' }, Sand: { rough: 1, tex: 'sand' }, Snow: { rough: 0.9, tex: 'noise' },
  Metal: { rough: 0.35, metal: 0.8 }, CorrodedMetal: { rough: 0.7, metal: 0.6, tex: 'noise' }, DiamondPlate: { rough: 0.4, metal: 0.8, tex: 'plate', repeat: 2 }, Foil: { rough: 0.25, metal: 0.9 },
  Fabric: { rough: 1, tex: 'fabric', repeat: 3 }, Carpet: { rough: 1, tex: 'fabric', repeat: 2 }, CeramicTiles: { rough: 0.3, tex: 'tiles', repeat: 1 }, Ice: { rough: 0.15, opacity: 0.8 },
};

export function robloxMaterial(name, rgb, { transparency = 0, reflectance = 0, placeholder = false } = {}) {
  const L = MATERIAL_LOOK[name] ?? MATERIAL_LOOK.Plastic;
  const color = new THREE.Color(`rgb(${rgb[0]},${rgb[1]},${rgb[2]})`);
  const opacity = Math.min(L.opacity ?? 1, 1 - transparency);
  const m = new THREE.MeshStandardMaterial({
    color, roughness: Math.max(0.05, L.rough - reflectance * 0.5), metalness: Math.min(1, (L.metal ?? 0) + reflectance * 0.5),
    transparent: opacity < 1, opacity, name: `roblox_${name}`,
  });
  if (L.tex) { m.map = canvasTexture(L.tex).clone(); m.map.needsUpdate = true; m.map.repeat.set(L.repeat ?? 1, L.repeat ?? 1); }
  if (L.emissive) { m.emissive = color.clone(); m.emissiveIntensity = L.emissive; }
  if (placeholder) { m.wireframe = false; m.color.set('#ff00ff'); m.name = 'malha_faltando'; } // magenta = MeshPart sem arquivo local
  return m;
}
