// Testa o pipeline: Node -> Three.js (Chromium/WebGL via Playwright) -> FFmpeg.
// Uso: npm run check   (não produz vídeo final; usa uma pasta temporária)
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const CHROMIUM = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const results = [];
const ok = (name, detail) => results.push({ name, ok: true, detail });
const fail = (name, err) => results.push({ name, ok: false, detail: String(err?.message || err).split('\n')[0] });

// 1. Node / npm
ok('Node.js', process.version);
try { ok('npm', execFileSync('npm', ['-v']).toString().trim()); } catch (e) { fail('npm', e); }

// 2. Three.js (Node)
try { const THREE = await import('three'); ok('Three.js (Node)', `r${THREE.REVISION}`); } catch (e) { fail('Three.js (Node)', e); }

// 3. FFmpeg
try { ok('FFmpeg', execFileSync('ffmpeg', ['-version']).toString().split('\n')[0]); } catch (e) { fail('FFmpeg', e); }

// 4. Chromium + Playwright + render WebGL do Three.js
const page = `<!doctype html><html><body style="margin:0">
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script>
<script type="module">
import * as THREE from 'three';
const r = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
r.setSize(320, 180); document.body.appendChild(r.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x203040);
const cam = new THREE.PerspectiveCamera(50, 16/9, 0.1, 100); cam.position.z = 3;
const cube = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ color: 0xff8800 }));
scene.add(cube, new THREE.AmbientLight(0xffffff, 0.5));
const l = new THREE.DirectionalLight(0xffffff, 2); l.position.set(2, 3, 4); scene.add(l);
window.renderFrame = (i) => { cube.rotation.set(i * 0.1, i * 0.15, 0); r.render(scene, cam); return r.domElement.toDataURL('image/png'); };
window.ready = true;
</script></body></html>`;
const types = { '.js': 'text/javascript', '.html': 'text/html' };
const server = createServer(async (req, res) => {
  if (req.url === '/') { res.setHeader('content-type', 'text/html'); return res.end(page); }
  try { const f = join(root, decodeURIComponent(req.url)); res.setHeader('content-type', types[extname(f)] || 'application/octet-stream'); res.end(await readFile(f)); }
  catch { res.statusCode = 404; res.end(); }
}).listen(0);
const port = server.address().port;
const tmp = await mkdtemp(join(tmpdir(), 'check-env-'));
let browser;
try {
  browser = await chromium.launch({ executablePath: CHROMIUM, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  ok('Chromium (Playwright)', `${browser.version()} em ${CHROMIUM}`);
  const p = await browser.newPage();
  await p.goto(`http://127.0.0.1:${port}/`);
  await p.waitForFunction('window.ready === true', null, { timeout: 15000 });
  const { writeFile } = await import('node:fs/promises');
  const frames = 24;
  for (let i = 0; i < frames; i++) {
    const url = await p.evaluate((i) => window.renderFrame(i), i);
    await writeFile(join(tmp, `f${String(i).padStart(3, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  ok('Render Three.js/WebGL', `${frames} quadros 320x180 gerados`);
  const out = join(tmp, 'teste.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '24', '-i', join(tmp, 'f%03d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', out]);
  const dur = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).toString().trim();
  ok('FFmpeg (montagem MP4)', `${(await stat(out)).size} bytes, ${dur}s, H.264`);
} catch (e) { fail('Pipeline Chromium/Three/FFmpeg', e); }
finally { await browser?.close(); server.close(); await rm(tmp, { recursive: true, force: true }); }

for (const r of results) console.log(`${r.ok ? 'OK  ' : 'ERRO'}  ${r.name}: ${r.detail}`);
console.log('NOTA  Nixly MCP: é um conector do Claude, não um pacote; testado pelo Claude, não por este script.');
process.exit(results.every((r) => r.ok) ? 0 : 1);
