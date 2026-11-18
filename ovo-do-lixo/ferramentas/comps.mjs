import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, weld } from '@gltf-transform/functions';
const [inp, out, mode, xmaxS] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp);
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const pos = prim.getAttribute('POSITION').getArray(), idx = prim.getIndices().getArray();
// union-find over vertices; also merge vertices at identical positions (UV seams)
const n = pos.length / 3, par = new Int32Array(n).map((_, i) => i);
const find = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
const uni = (a, b) => { a = find(a); b = find(b); if (a !== b) par[a] = b; };
const key = new Map();
for (let i = 0; i < n; i++) { const k = `${Math.round(pos[i*3]*1e4)},${Math.round(pos[i*3+1]*1e4)},${Math.round(pos[i*3+2]*1e4)}`; if (key.has(k)) uni(i, key.get(k)); else key.set(k, i); }
for (let i = 0; i < idx.length; i += 3) { uni(idx[i], idx[i+1]); uni(idx[i], idx[i+2]); }
const comps = new Map();
for (let i = 0; i < idx.length; i += 3) { const r = find(idx[i]); if (!comps.has(r)) comps.set(r, { tris: 0, mn: [1e9,1e9,1e9], mx: [-1e9,-1e9,-1e9] }); const c = comps.get(r); c.tris++;
  for (const v of [idx[i], idx[i+1], idx[i+2]]) for (let k = 0; k < 3; k++) { c.mn[k] = Math.min(c.mn[k], pos[v*3+k]); c.mx[k] = Math.max(c.mx[k], pos[v*3+k]); } }
const list = [...comps.entries()].sort((a, b) => b[1].tris - a[1].tris);
if (mode === 'list') { list.slice(0, 25).forEach(([r, c]) => console.log(c.tris, 'x', c.mn[0].toFixed(2), c.mx[0].toFixed(2), 'y', c.mn[1].toFixed(2), c.mx[1].toFixed(2), 'z', c.mn[2].toFixed(2), c.mx[2].toFixed(2))); console.log('components', list.length); process.exit(); }
// select: components whose center x < xmax and that are part of the standing row (max y > 0.3 or center y > 0.2 and min z < 0)
const xmax = +xmaxS; const sel = new Set();
for (const [r, c] of list) { const cx = (c.mn[0] + c.mx[0]) / 2, cy = (c.mn[1] + c.mx[1]) / 2, cz = (c.mn[2] + c.mx[2]) / 2; if (cx < xmax && cy > 0.2 && cz < 0.03) sel.add(r); }
const keep = []; const mn = [1e9,1e9,1e9], mx = [-1e9,-1e9,-1e9];
for (let i = 0; i < idx.length; i += 3) if (sel.has(find(idx[i]))) { keep.push(idx[i], idx[i+1], idx[i+2]); for (const v of [idx[i],idx[i+1],idx[i+2]]) for (let k=0;k<3;k++){ mn[k]=Math.min(mn[k],pos[v*3+k]); mx[k]=Math.max(mx[k],pos[v*3+k]); } }
prim.getIndices().setArray(new Uint32Array(keep));
doc.getRoot().listNodes().forEach(nd => { if (nd.getMesh()) nd.setTranslation([-(mn[0]+mx[0])/2, -mn[1], -(mn[2]+mx[2])/2]); });
await doc.transform(prune()); await io.write(out, doc);
console.log('kept comps', sel.size, 'tris', keep.length / 3, 'bbox', mn.map(v=>v.toFixed(3)), mx.map(v=>v.toFixed(3)));
