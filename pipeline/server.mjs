// Servidor HTTP local: entrega node_modules (three) e os arquivos do projeto
// para páginas renderizadas no Chromium, que não carregam módulos ES via file://.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { ROOT } from './config.mjs';

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.hdr': 'application/octet-stream',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
};

// Import map que expõe three e os addons (GLTFLoader, OrbitControls etc.).
export const IMPORT_MAP = `<script type="importmap">{"imports":{
  "three":"/node_modules/three/build/three.module.js",
  "three/addons/":"/node_modules/three/examples/jsm/"}}</script>`;

// pages: { '/caminho': 'conteúdo html' } servidos antes dos arquivos.
export function startServer(pages = {}) {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (pages[path] !== undefined) { res.setHeader('content-type', 'text/html'); return res.end(pages[path]); }
    const file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
    try { res.setHeader('content-type', TYPES[extname(file)] || 'application/octet-stream'); res.end(await readFile(file)); }
    catch { res.statusCode = 404; res.end(); }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ server, url: `http://127.0.0.1:${server.address().port}` })));
}
