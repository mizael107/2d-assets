import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(process.argv[2]);
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const pos = prim.getAttribute('POSITION').getArray(), idx = prim.getIndices().getArray();
const g = {}; let mn = [1e9,1e9,1e9], mx = [-1e9,-1e9,-1e9];
for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], pos[i+k]); mx[k] = Math.max(mx[k], pos[i+k]); }
console.log('bbox', mn.map(v=>v.toFixed(2)), mx.map(v=>v.toFixed(2)));
for (let i = 0; i < idx.length; i += 3) { const c = [0,1,2].map(k => (pos[idx[i]*3+k] + pos[idx[i+1]*3+k] + pos[idx[i+2]*3+k]) / 3);
  const key = `${Math.floor(c[2]*10)/10}|${Math.floor(c[1]*10)/10}`; g[key] = (g[key]||0) + 1; }
// print z (rows) vs y (cols)
const zs = [...new Set(Object.keys(g).map(k=>+k.split('|')[0]))].sort((a,b)=>a-b), ys = [...new Set(Object.keys(g).map(k=>+k.split('|')[1]))].sort((a,b)=>a-b);
console.log('z\\y ' + ys.map(y=>y.toFixed(1).padStart(6)).join(''));
for (const z of zs) console.log(z.toFixed(1).padStart(5) + ys.map(y => String(g[`${z}|${y}`]||'').padStart(6)).join(''));
