// Testa cada ferramenta individualmente e depois o pipeline integrado.
// Uso: npm run test:tools   (arquivos de teste ficam numa pasta temporária, apagada no fim)
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CHROMIUM_PATH, CHROMIUM_ARGS } from '../pipeline/config.mjs';
import { launchBrowser } from '../pipeline/browser.mjs';
import { startServer, IMPORT_MAP } from '../pipeline/server.mjs';
import { renderFrames } from '../pipeline/render.mjs';
import { framesToMp4, normalizeAudio, mixAudio, muxVideoAudio, probe } from '../pipeline/ffmpeg.mjs';

const tmp = await mkdtemp(join(tmpdir(), 'test-tools-'));
const results = [];
async function test(name, fn) {
  const t0 = Date.now();
  try { results.push({ name, ok: true, detail: await fn(), ms: Date.now() - t0 }); }
  catch (e) { results.push({ name, ok: false, detail: String(e?.message || e).split('\n')[0], ms: Date.now() - t0 }); }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const sh = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

// 1. Node.js
await test('Node.js', () => {
  const major = Number(process.versions.node.split('.')[0]);
  assert(major >= 18, `versão ${process.version} < 18`);
  return `${process.version} (ES modules, fetch, crypto OK)`;
});

// 2. npm
await test('npm', () => `${sh('npm', ['-v'])}, dependências: ${sh('npm', ['ls', '--depth=0', '--parseable']).split('\n').length - 1} pacotes`);

// 3. Chromium headless (binário direto, sem Playwright)
await test('Chromium headless', () => {
  const version = sh(CHROMIUM_PATH, ['--version']);
  const dom = sh(CHROMIUM_PATH, ['--headless', '--no-sandbox', '--disable-gpu', '--dump-dom', 'data:text/html,<p id=x>headless-ok</p>']);
  assert(dom.includes('headless-ok'), 'DOM não renderizado');
  return `${version}, --headless renderizou o DOM`;
});

// 4. Playwright controlando o Chromium (navegação, JS, screenshot, WebGL)
await test('Playwright → Chromium', async () => {
  const b = await launchBrowser();
  try {
    const p = await b.newPage({ viewport: { width: 640, height: 360 } });
    await p.setContent('<h1 style="color:red">pw</h1><canvas id=c></canvas>');
    const text = await p.textContent('h1');
    const gl = await p.evaluate(() => {
      const g = document.getElementById('c').getContext('webgl2');
      if (!g) return null;
      const dbg = g.getExtension('WEBGL_debug_renderer_info');
      return { renderer: dbg ? g.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER), maxTex: g.getParameter(g.MAX_TEXTURE_SIZE) };
    });
    const shot = await p.screenshot();
    assert(text === 'pw' && shot.length > 1000, 'controle da página falhou');
    assert(gl, 'WebGL2 indisponível');
    return `Chromium ${b.version()} via Playwright, headless, WebGL2 via ${gl.renderer.split('(')[0].trim()} (textura máx ${gl.maxTex}px)`;
  } finally { await b.close(); }
});

// 5. Three.js no Node (cena, keyframes, AnimationMixer)
await test('Three.js (Node: animação por keyframes)', async () => {
  const THREE = await import('three');
  const obj = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  const track = new THREE.VectorKeyframeTrack('.position', [0, 2], [0, 0, 0, 10, 0, 0]);
  const clip = new THREE.AnimationClip('move', 2, [track]);
  const mixer = new THREE.AnimationMixer(obj);
  mixer.clipAction(clip).play();
  mixer.update(1);
  assert(Math.abs(obj.position.x - 5) < 1e-6, `interpolação errada: x=${obj.position.x}`);
  return `r${THREE.REVISION}, AnimationMixer interpolou x=5 em t=1s`;
});

// 6. Three.js no Chromium: exporta e recarrega GLB animado (formato dos personagens)
await test('Three.js (Chromium: GLTFExporter + GLTFLoader)', async () => {
  const page = `<!doctype html>${IMPORT_MAP}<script type="module">
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const m = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()); m.name = 'Cubo';
const clip = new THREE.AnimationClip('girar', 1, [new THREE.NumberKeyframeTrack('Cubo.rotation[y]', [0, 1], [0, Math.PI])]);
const scene = new THREE.Scene(); scene.add(m);
const glb = await new GLTFExporter().parseAsync(scene, { binary: true, animations: [clip] });
const gltf = await new GLTFLoader().parseAsync(glb, '');
window.result = { bytes: glb.byteLength, anims: gltf.animations.map(a => a.name), meshes: gltf.scene.getObjectByName('Cubo') ? 1 : 0 };
</script>`;
  const { server, url } = await startServer({ '/': page });
  const b = await launchBrowser();
  try {
    const p = await b.newPage();
    await p.goto(url + '/');
    const r = await p.waitForFunction(() => window.result, null, { timeout: 30000 }).then((h) => h.jsonValue());
    assert(r.meshes === 1 && r.anims.includes('girar'), JSON.stringify(r));
    return `GLB de ${r.bytes} bytes exportado e recarregado com a animação "${r.anims[0]}"`;
  } finally { await b.close(); server.close(); }
});

// 7. Render de animação 3D (pipeline/render.mjs): sombras, luzes, AnimationMixer
const framesDir = join(tmp, 'frames');
let framesPattern;
await test('Render de animação 3D (Chromium headless + WebGL)', async () => {
  const sceneCode = `
async function setupScene(THREE, renderer) {
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x87ceeb);
  const camera = new THREE.PerspectiveCamera(45, 16/9, 0.1, 100); camera.position.set(4, 3, 6); camera.lookAt(0, 0.5, 0);
  const sun = new THREE.DirectionalLight(0xffffff, 2.5); sun.position.set(5, 8, 4); sun.castShadow = true; scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444422, 0.8));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshStandardMaterial({ color: 0x55aa55 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xff7700 }));
  box.name = 'box'; box.castShadow = true; scene.add(box);
  const clip = new THREE.AnimationClip('pulo', 1, [
    new THREE.VectorKeyframeTrack('box.position', [0, 0.5, 1], [0, 0.5, 0, 0, 2, 0, 0, 0.5, 0]),
    new THREE.NumberKeyframeTrack('box.rotation[y]', [0, 1], [0, Math.PI]),
  ]);
  const mixer = new THREE.AnimationMixer(scene); const action = mixer.clipAction(clip); action.play();
  return { scene, camera, update: (t) => { mixer.setTime(t); } };
}`;
  const r = await renderFrames(sceneCode, { outDir: framesDir, seconds: 1, fps: 24, width: 640, height: 360 });
  framesPattern = r.pattern;
  const hash = async (i) => createHash('md5').update(await readFile(join(framesDir, `f${String(i).padStart(5, '0')}.png`))).digest('hex');
  const [h0, h12] = [await hash(0), await hash(12)];
  assert(h0 !== h12, 'quadros idênticos: animação não aconteceu');
  return `${r.frames} quadros 640x360, quadro 0 ≠ quadro 12 (movimento confirmado)`;
});

// 8. FFmpeg: vídeo MP4
const videoOut = join(tmp, 'video.mp4');
await test('FFmpeg (vídeo MP4 H.264)', async () => {
  assert(framesPattern, 'sem quadros do teste anterior');
  framesToMp4(framesPattern, videoOut, { fps: 24 });
  const v = probe(videoOut).streams.find((s) => s.codec_type === 'video');
  assert(v?.codec_name === 'h264', 'codec inesperado');
  return `${v.codec_name} ${v.width}x${v.height} @ ${v.r_frame_rate} fps, ${(await stat(videoOut)).size} bytes`;
});

// 9. FFmpeg: áudio (gerar, normalizar volume, mixar trilhas)
const audioOut = join(tmp, 'mix.m4a');
await test('FFmpeg (áudio: loudnorm + mixagem AAC)', async () => {
  const voice = join(tmp, 'voz.wav'), sfx = join(tmp, 'sfx.wav'), norm = join(tmp, 'voz.m4a');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', voice]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anoisesrc=d=0.3:a=0.3', sfx]);
  normalizeAudio(voice, norm);
  mixAudio([{ file: norm, volume: 1 }, { file: sfx, volume: 0.5, delayMs: 500 }], audioOut);
  const info = probe(audioOut);
  const a = info.streams.find((s) => s.codec_type === 'audio');
  assert(a?.codec_name === 'aac', 'codec inesperado');
  return `voz normalizada (-14 LUFS) + efeito com atraso de 500 ms → ${a.codec_name} ${a.sample_rate} Hz, ${Number(info.format.duration).toFixed(2)}s`;
});

// 10. FFmpeg: vídeo + áudio no MP4 final
await test('FFmpeg (MP4 final com vídeo + áudio)', async () => {
  const final = join(tmp, 'final.mp4');
  muxVideoAudio(videoOut, audioOut, final);
  const kinds = probe(final).streams.map((s) => `${s.codec_type}:${s.codec_name}`);
  assert(kinds.includes('video:h264') && kinds.includes('audio:aac'), kinds.join(','));
  return kinds.join(' + ');
});

await rm(tmp, { recursive: true, force: true });
const pad = Math.max(...results.map((r) => r.name.length));
for (const r of results) console.log(`${r.ok ? 'OK  ' : 'ERRO'}  ${r.name.padEnd(pad)}  ${r.detail}  (${r.ms} ms)`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} teste(s) falharam.` : `\nTodos os ${results.length} testes passaram.`);
process.exit(failed ? 1 : 0);
