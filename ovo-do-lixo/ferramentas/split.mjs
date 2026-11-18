import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
const [inp, out, mode, thr] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp);
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const pos = prim.getAttribute('POSITION').getArray(), idx = prim.getIndices().getArray();
if (mode === 'hist') {
  const h = {}; for (let i = 0; i < idx.length; i += 3) { const x = (pos[idx[i]*3] + pos[idx[i+1]*3] + pos[idx[i+2]*3]) / 3; const b = Math.round(x * 20) / 20; h[b] = (h[b] || 0) + 1; }
  console.log(Object.entries(h).sort((a,b)=>a[0]-b[0]).map(([k,v])=>`${k}:${v}`).join('  ')); process.exit();
}
const keep = []; let minX = 1e9, maxX = -1e9;
for (let i = 0; i < idx.length; i += 3) {
  const x = (pos[idx[i]*3] + pos[idx[i+1]*3] + pos[idx[i+2]*3]) / 3;
  if (x < +thr) { keep.push(idx[i], idx[i+1], idx[i+2]); for (const k of [idx[i],idx[i+1],idx[i+2]]) { minX = Math.min(minX, pos[k*3]); maxX = Math.max(maxX, pos[k*3]); } }
}
prim.getIndices().setArray(new Uint32Array(keep));
const cx = (minX + maxX) / 2;
doc.getRoot().listNodes().forEach(n => { if (n.getMesh()) n.setTranslation([-cx, 0, 0]); });
const { prune } = await import('@gltf-transform/functions');
await doc.transform(prune());
await io.write(out, doc); console.log('kept tris', keep.length / 3, 'x range', minX.toFixed(3), maxX.toFixed(3));
