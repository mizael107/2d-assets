// Converte FBX/OBJ/GLTF/JSON-Roblox (ou .rbxm/.rbxl/.rbxmx/.rbxlx) para GLB.
// Uso: node scripts/converter-para-glb.mjs <arquivo dentro do projeto> <saida.glb>
import { writeFile } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import { ROOT } from '../pipeline/config.mjs';
import { browserTask } from '../src/utils/browser-task.mjs';
import { importRobloxFile } from '../src/roblox/import-rbx.mjs';

let [src, out] = process.argv.slice(2);
if (!src || !out) { console.log('uso: node scripts/converter-para-glb.mjs <arquivo> <saida.glb>'); process.exit(1); }
let rel = relative(ROOT, join(process.cwd(), src));
if (['.rbxm', '.rbxl', '.rbxmx', '.rbxlx'].includes(extname(src).toLowerCase())) {
  const data = await importRobloxFile(join(ROOT, rel)); rel = rel + '.json';
  await writeFile(join(ROOT, rel), JSON.stringify(data));
  console.log(`Roblox: ${data.pecas.length} peças; dependências sem arquivo: ${data.dependencias.filter((d) => !d.resolvido).length}`);
}
const r = await browserTask('/scenes/roblox/tasks.js', 'convertToGLB', ['/' + rel]);
await writeFile(out, Buffer.from(r.base64, 'base64'));
console.log(`GLB gravado: ${out} (${(Buffer.from(r.base64, 'base64').length / 1024).toFixed(0)} KB) animações: ${r.animacoes.join(', ') || 'nenhuma'}`);
