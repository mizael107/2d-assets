import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';
const [inp, out, xmaxS, mode] = process.argv.slice(2); const xmax = +xmaxS;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp);
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const pos = prim.getAttribute('POSITION').getArray(), idx = prim.getIndices().getArray();
const keep = []; const h = {}; let mn = [1e9,1e9,1e9], mx = [-1e9,-1e9,-1e9];
for (let i = 0; i < idx.length; i += 3) {
  const c = [0,1,2].map(k => (pos[idx[i]*3+k] + pos[idx[i+1]*3+k] + pos[idx[i+2]*3+k]) / 3);
  if (!(c[2] < 0.0 && c[1] > 0.2)) continue;
  const b = Math.round(c[0]*40)/40; h[b] = (h[b]||0)+1;
  if (c[0] < xmax) { keep.push(idx[i], idx[i+1], idx[i+2]); for (const v of [idx[i],idx[i+1],idx[i+2]]) for (let k=0;k<3;k++){ mn[k]=Math.min(mn[k],pos[v*3+k]); mx[k]=Math.max(mx[k],pos[v*3+k]); } }
}
if (mode === 'hist') { console.log(Object.entries(h).sort((a,b)=>a[0]-b[0]).map(([k,v])=>`${(+k).toFixed(3)}:${v}`).join('  ')); process.exit(); }
prim.getIndices().setArray(new Uint32Array(keep));
doc.getRoot().listNodes().forEach(n => { if (n.getMesh()) n.setTranslation([-(mn[0]+mx[0])/2, -mn[1], -(mn[2]+mx[2])/2]); });
await doc.transform(prune()); await io.write(out, doc);
console.log('tris', keep.length/3, 'bbox', mn.map(v=>v.toFixed(3)), mx.map(v=>v.toFixed(3)));
