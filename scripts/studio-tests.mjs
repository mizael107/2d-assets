// Testes obrigatórios do estúdio (A–J). Uso: npm run test:studio [-- A C J]
// Resultados: output/testes/<teste>/ e output/testes/resultados.json
import { mkdir, writeFile, readFile, readdir, stat, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { dedup, prune, weld, resample, inspect } from '@gltf-transform/functions';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { ROOT } from '../pipeline/config.mjs';
import { renderScene, launchStudioBrowser } from '../src/rendering/render-scene.mjs';
import { produce } from '../src/rendering/produce.mjs';
import { browserTask } from '../src/utils/browser-task.mjs';
import { framesToMp4, probe } from '../pipeline/ffmpeg.mjs';
import { mixScene, processSound } from '../src/audio/mix.mjs';
import { guideVoice } from '../src/audio/voice.mjs';
import { envelope, onsets, loudnessStats } from '../src/audio/analyze.mjs';
import { checkFrames, checkProbes, checkAudioSync, contactSheet, diffImages } from '../src/validation/checks.mjs';
import { chunkCaptions } from '../src/effects/captions.js';
import { renderSceneParallel } from '../src/rendering/render-parallel.mjs';
import sharp from 'sharp';

const OUT = join(ROOT, 'output/testes'); await mkdir(OUT, { recursive: true });
const only = process.argv.slice(2).map((s) => s.toUpperCase());
const results = []; const deps = [];
const near = (a, b, tol) => Math.abs(a - b) <= tol;
async function test(id, name, fn) {
  if (only.length && !only.includes(id)) return;
  const t0 = Date.now(); const checks = [];
  const ok = (cond, label, value) => { checks.push({ ok: !!cond, label, value }); };
  try { await fn(ok, join(OUT, id)); } catch (e) { checks.push({ ok: false, label: 'exceção', value: String(e.message || e).slice(0, 400) }); }
  const passed = checks.length > 0 && checks.every((c) => c.ok);
  results.push({ id, name, passed, seconds: +((Date.now() - t0) / 1000).toFixed(1), checks });
  console.log(`${passed ? 'APROVADO ' : 'REPROVADO'}  ${id} ${name}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  for (const c of checks) console.log(`   ${c.ok ? '✓' : '✗'} ${c.label}${c.value !== undefined ? ': ' + (typeof c.value === 'string' ? c.value : JSON.stringify(c.value)) : ''}`);
}
const render = (entry, dir, o = {}) => renderScene({ entry, outDir: dir, fps: 30, width: 540, height: 960, ...o });
const P = (r, t) => r.probes.reduce((b, p) => (Math.abs(p.t - t) < Math.abs(b.t - t) ? p : b));

await test('A', 'Three.js: cena com objeto, luz e câmera', async (ok, dir) => {
  const r = await render('/scenes/tests/a-basica.js', dir);
  const f = await checkFrames(r.framesDir);
  ok(r.errors.length === 0, 'sem erros no navegador', r.errors.length);
  ok(r.frames === 30, 'quadros renderizados', r.frames);
  ok(f.issues.length === 0, 'sem quadro preto/estourado/congelado', f.issues.map((i) => i.code));
  const c = P(r, 0.5).onScreen.cubo; ok(Math.abs(c[0]) < 0.5 && Math.abs(c[1]) < 0.5, 'cubo no centro do quadro (NDC)', c);
  ok(r.info.gl?.startsWith('WebGL 2'), 'contexto WebGL', r.info.gl);
});

await test('B', 'GSAP: movimento suave', async (ok, dir) => {
  const r = await render('/scenes/tests/b-gsap.js', dir);
  const x = (t) => P(r, t).ball[0], y = (t) => P(r, t).ball[1];
  ok(near(x(0), -1.5, 1e-3) && near(x(2), 1.5, 1e-3), 'parte de -1,5 e chega em 1,5', [x(0), x(2)]);
  ok(near(x(1), 0, 0.01), 'metade do caminho em t=1 s (power2.inOut é simétrico)', x(1));
  const vStart = x(1 / 30) - x(0), vMid = x(1 + 1 / 30) - x(1);
  ok(vStart < vMid * 0.05, 'acelera suave: passo inicial < 5% do passo do meio', { inicio: +vStart.toFixed(5), meio: +vMid.toFixed(4) });
  const xs = r.probes.filter((p) => p.t <= 2).map((p) => p.ball[0]); ok(xs.every((v, i) => i === 0 || v >= xs[i - 1]), 'movimento sem voltar para trás (monotônico)');
  ok(near(y(2.3), 1.6, 0.02), 'quique sobe 0,8 m em t=2,3 s', y(2.3));
});

await test('C', 'Câmera: deslocamento, aproximação e rotação', async (ok, dir) => {
  const r = await render('/scenes/tests/c-camera.js', dir);
  const cam = (t) => P(r, t).camera; const dist = (p) => Math.hypot(p[0], p[1] - 1, p[2]);
  ok(near(dist(cam(0)) - dist(cam(1)), 3, 0.02), 'dolly in aproximou 3 m', +(dist(cam(0)) - dist(cam(1))).toFixed(3));
  const ang = (p) => Math.atan2(p[0], p[2]) * 180 / Math.PI; const da = ang(cam(2)) - ang(cam(1));
  ok(near(da, 90, 1), 'órbita girou 90° em volta do pilar', +da.toFixed(2));
  ok(near(P(r, 3.5).fov, 25, 0.01), 'zoom: FOV 40 → 25', P(r, 3.5).fov);
  ok(near(cam(3.97)[1], 6, 0.05), 'crane: câmera subiu a ~6 m (t=3,97 s, antes do acompanhamento assumir)', cam(3.97)[1]);
  const follow = r.probes.filter((p) => p.t > 4.1); ok(follow.every((p) => Math.abs(p.runnerNdc[0]) < 0.9 && Math.abs(p.runnerNdc[1]) < 0.9), 'acompanhamento manteve o alvo no quadro', follow.at(-1).runnerNdc);
  const cc = await browserTask('/scenes/tests/tasks.js', 'cameraControls');
  ok(Math.hypot(cc.end[0] - 4, cc.end[1] - 3, cc.end[2] - 4) < 0.05, 'camera-controls: transição suave até o enquadramento', cc.end);
  await contactSheet(r.framesDir, join(dir, 'folha.jpg'), { fps: 30 });
});

await test('D', 'Personagem: GLB com esqueleto, movimentos e rosto', async (ok, dir) => {
  const r = await render('/scenes/tests/d-personagem.js', dir);
  const pc = checkProbes(r.probes, {});
  ok(pc.issues.length === 0, 'pés não atravessam o chão nem flutuam no apoio', pc.issues.map((i) => i.message));
  const minFeet = Math.min(...r.probes.filter((p) => p.grounded).map((p) => Math.min(p.feet.L, p.feet.R)));
  ok(minFeet > -0.03, 'pé mais baixo durante caminhada/corrida (m)', +minFeet.toFixed(4));
  const air = Math.max(...r.probes.filter((p) => p.t > 3.6 && p.t < 4.3).map((p) => Math.min(p.feet.L, p.feet.R)));
  ok(air > 0.2, 'no pulo os dois pés saem do chão (m)', +air.toFixed(3));
  ok(r.probes.every((p) => Math.abs(p.onScreen.cabeca[0]) < 1 && Math.abs(p.onScreen.cabeca[1]) < 1), 'cabeça sempre no quadro');
  // GLB: exporta, otimiza com glTF-Transform e recarrega pelo loader do estúdio.
  const ex = await browserTask('/scenes/tests/tasks.js', 'exportHumanoid');
  const glbPath = join(ROOT, 'assets/characters/boneco-base.glb');
  await writeFile(glbPath, Buffer.from(ex.base64, 'base64'));
  ok(ex.bytes > 10000, 'GLB exportado com animações', `${(ex.bytes / 1024).toFixed(0)} KB: ${ex.clips.join(', ')}`);
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS); const doc = await io.read(glbPath);
  const before = inspect(doc); await doc.transform(dedup(), weld(), resample(), prune());
  const optPath = join(ROOT, 'assets/characters/boneco-base.otimizado.glb'); await io.write(optPath, doc);
  const sz = async (p) => (await stat(p)).size;
  ok((await sz(optPath)) < (await sz(glbPath)), 'glTF-Transform otimizou o GLB (bytes)', { antes: await sz(glbPath), depois: await sz(optPath), animacoes: before.animations.properties.length, malhas: before.meshes.properties.length });
  const ld = await browserTask('/scenes/tests/tasks.js', 'loadAndPlay', ['/assets/characters/boneco-base.otimizado.glb']);
  ok(ld.skinned >= 1 && ld.bones === 17 && ld.skeletons === 1, 'recarregado: malhas com esqueleto único de 17 ossos (glTF divide 1 malha por material)', { malhas: ld.skinned, ossos: ld.bones, esqueletos: ld.skeletons });
  ok(ld.animations.length === 8 && ld.thighAt0 !== ld.thighAtQuarter, 'clipe "andar" toca e move a coxa', ld);
  const vrm = await browserTask('/scenes/tests/tasks.js', 'vrmAvailable');
  ok(vrm.VRMLoaderPlugin === 'function', 'three-vrm carregado (plugin VRM registrado no loader)', `${vrm.expressionPresets.length} expressões, ${vrm.humanBones} ossos humanoides`);
  const vrms = (await readdir(join(ROOT, 'assets/characters'))).filter((f) => f.endsWith('.vrm'));
  if (!vrms.length) deps.push('Modelo .vrm para testar carregamento VRM real (nenhum em assets/characters/).');
  await contactSheet(r.framesDir, join(dir, 'folha.jpg'), { fps: 30 });
});

await test('E', 'Física: gravidade, colisão e contato', async (ok, dir) => {
  const r = await render('/scenes/tests/e-fisica.js', dir, { fps: 30 });
  const end = r.probes.at(-1).pos;
  ok(near(end.caixaA[1], 0.4, 0.02), 'caixa A (0,8 m) em repouso no chão: y = 0,4', end.caixaA[1]);
  ok(near(end.caixaB[1], 0.3, 0.03) || near(end.caixaB[1], 1.1, 0.05), 'caixa B em repouso (chão ou sobre A)', end.caixaB[1]);
  ok(end.bola[0] < 2.5, 'bola rolou e empurrou (x diminuiu)', end.bola[0]);
  const below = r.probes.flatMap((p) => Object.entries(p.objectsMinY).filter(([, y]) => y < -0.02)); ok(below.length === 0, 'nada atravessa o chão');
  ok(r.info.impacts.length >= 2, 'contatos detectados com tempo e força', r.info.impacts.map((c) => `${c.a}×${c.b} ${c.t.toFixed(2)}s Δv=${c.speed.toFixed(1)}`));
  ok(r.cues.length === r.info.impacts.length, 'impactos viram cues de som', r.cues.length);
  const b = await browserTask('/scenes/tests/tasks.js', 'bvh');
  ok(near(b.fastY, b.expected, 0.05) && near(b.fastY, b.slowY, 1e-3), 'three-mesh-bvh: altura do terreno correta', b);
  await contactSheet(r.framesDir, join(dir, 'folha.jpg'), { fps: 30 });
});

await test('F', 'Efeitos: partículas e pós-processamento', async (ok, dir) => {
  const on = await render('/scenes/tests/f-efeitos.js', join(dir, 'com'), { endFrame: 31, format: 'png' });
  const off = await render('/scenes/tests/f-efeitos.js', join(dir, 'sem'), { endFrame: 31, format: 'png', params: { fx: false } });
  ok(on.errors.length === 0 && off.errors.length === 0, 'sem erros de shader/navegador', [...on.errors, ...off.errors]);
  const d = await diffImages(join(on.framesDir, 'f00030.png'), join(off.framesDir, 'f00030.png'), join(dir, 'diferenca.png'));
  ok(d.changedPercent > 10, 'pós-processamento muda a imagem (% de pixels)', d.changedPercent);
  const f = await checkFrames(on.framesDir); ok(f.issues.length === 0, 'sem quadro estourado ou preto', f.issues.map((i) => i.code));
  const p0 = await diffImages(join(on.framesDir, 'f00000.png'), join(on.framesDir, 'f00030.png'));
  ok(p0.changedPercent > 0.5, 'partículas em movimento entre t=0 e t=1 s (% pixels)', p0.changedPercent);
  await copyFile(join(on.framesDir, 'f00030.png'), join(dir, 'com-efeitos.png')); await copyFile(join(off.framesDir, 'f00030.png'), join(dir, 'sem-efeitos.png'));
});

await test('G', 'Áudio: reprodução, síntese, filtros e mixagem', async (ok, dir) => {
  await mkdir(dir, { recursive: true });
  const sounds = (await readdir(join(ROOT, 'assets/sounds'), { recursive: true })).filter((f) => f.endsWith('.wav'));
  ok(sounds.length >= 10, 'biblioteca procedural (Tone.js) em assets/sounds', sounds.length);
  const h = await browserTask('/scenes/tests/tasks.js', 'howler', ['/assets/sounds/impacts/proc-impacto.wav']);
  ok(h.events.join() === 'load,play,end' && near(h.duration, 1.2, 0.05), 'Howler carregou, tocou e terminou o som', h);
  const voz = guideVoice('Ele acordou num mundo medieval. E a primeira coisa que viu foram letras.', join(dir, 'narracao.wav'));
  const vd = Number(probe(voz).format.duration); ok(vd > 2, 'voz-guia pt-BR (espeak-ng) gerada (s)', +vd.toFixed(2));
  const env = envelope(voz, 30); ok(env.filter((v) => v > 0.2).length > 20, 'envelope para sincronização labial (quadros com boca aberta)', env.filter((v) => v > 0.2).length);
  const fx = processSound(join(ROOT, 'assets/sounds/impacts/proc-impacto.wav'), join(dir, 'impacto-reverb.wav'), { reverb: 0.5, lowpass: 2500, gain: 0.8 });
  ok(Number(probe(fx).format.duration) > 1, 'filtro + reverb + volume aplicados');
  const cues = [{ t: 0.5, file: join(ROOT, 'assets/sounds/footsteps/proc-passo.wav'), gain: 0.6, sound: 'passo' }, { t: 2.0, file: join(ROOT, 'assets/sounds/impacts/proc-impacto.wav'), gain: 1, sound: 'impacto' }, { t: 3.3, file: join(ROOT, 'assets/sounds/animals/proc-passaro.wav'), gain: 0.5, sound: 'passaro' }];
  const m = mixScene({ duration: 5, beds: [{ file: join(ROOT, 'assets/sounds/music/proc-trilha.wav'), gain: 0.5, loop: true, fadeIn: 0.5, fadeOut: 1 }, { file: join(ROOT, 'assets/sounds/weather/proc-vento.wav'), gain: 0.3, loop: true }], narration: { file: voz, at: 0.3, gain: 1, duck: true }, cues, out: join(dir, 'mix.wav'), stems: true });
  const L = loudnessStats(m.out); ok(L.lufs !== null && near(L.lufs, -14, 1.5), 'mixagem final normalizada (LUFS)', L);
  const s = checkAudioSync(m.stem, cues); ok(s.issues.length === 0, 'efeitos no tempo certo (erro em ms)', s.report.map((x) => `${x.sound}:${x.errMs}`));
});

await test('H', 'Playwright: Chromium executa cena e ferramentas de depuração', async (ok, dir) => {
  const b = await launchStudioBrowser(); ok(b.version().startsWith('153'), 'Chromium aberto pelo Playwright (headless)', b.version()); await b.close();
  const dbg = await browserTask('/scenes/tests/tasks.js', 'debugTools');
  ok(dbg.guiControllers === 2 && dbg.statsDom, 'lil-gui (controles) e stats.js (desempenho) funcionando', dbg);
  const r = await render('/scenes/tests/a-basica.js', dir, { endFrame: 3, width: 1080, height: 1920, format: 'png' });
  ok(r.frames === 3 && r.width === 1080 && r.height === 1920, 'cena renderizada em 1080×1920 (9:16)', `${r.width}×${r.height}`);
  const mp = await browserTask('/scenes/tests/tasks.js', 'mediapipe', ['/assets/references/face_landmarker.task']);
  ok(mp.wasmHttp === 200 && mp.wasmCompiles === true, 'MediaPipe: WASM servido e compilado', mp);
  if (!String(mp.landmarker).startsWith('criado')) deps.push('MediaPipe FaceLandmarker: falta o modelo face_landmarker.task em assets/references/ (download manual do Google).');
});

await test('I', 'FFmpeg: MP4 com imagem e áudio', async (ok, dir) => {
  await mkdir(dir, { recursive: true });
  const img = join(OUT, 'A/frames/f00015.jpg'); const out = join(dir, 'imagem-com-audio.mp4');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-framerate', '30', '-i', img, '-i', join(ROOT, 'assets/sounds/music/proc-trilha.wav'), '-t', '3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
  const p = probe(out); const kinds = p.streams.map((s) => `${s.codec_type}:${s.codec_name}`);
  ok(kinds.includes('video:h264') && kinds.includes('audio:aac'), 'MP4 com vídeo H.264 e áudio AAC', kinds);
  ok(near(Number(p.format.duration), 3, 0.1), 'duração 3 s', Number(p.format.duration));
  const v = p.streams.find((s) => s.codec_type === 'video'); ok(v.width === 540 && v.height === 960, 'resolução vertical 9:16', `${v.width}×${v.height}`);
});

await test('J', 'Integração: cena animada com câmera, efeitos e áudio', async (ok, dir) => {
  await mkdir(dir, { recursive: true });
  const voz = guideVoice('O guri parou. Algo caiu do céu. E agora?', join(dir, 'narracao.wav'));
  const narrAt = 0.6; const fps = 30;
  const envRaw = envelope(voz, fps); const env = [...Array(Math.round(narrAt * fps)).fill(0), ...envRaw];
  const rep = await produce({
    spec: { entry: '/scenes/tests/j-integracao.js', seconds: 6, fps, width: 540, height: 960, params: { envelope: env } }, outDir: dir,
    soundMap: { passo: 'assets/sounds/footsteps/proc-passo.wav', impacto: 'assets/sounds/impacts/proc-impacto.wav', whoosh: 'assets/sounds/impacts/proc-whoosh.wav' },
    beds: [{ file: 'assets/sounds/music/proc-trilha.wav', gain: 0.45, loop: true, fadeIn: 0.8, fadeOut: 1.2 }, { file: 'assets/sounds/weather/proc-vento.wav', gain: 0.35, loop: true }],
    narration: { file: voz.replace(ROOT + '/', ''), at: narrAt, gain: 1.1, duck: true },
  });
  ok(rep.summary.ok, 'verificações automáticas sem erro', rep.summary.errors.map((e) => e.message));
  ok(rep.sections.video.info.audio === 'aac' && rep.sections.video.info.video === 'h264', 'MP4 final com vídeo + áudio', rep.sections.video.info);
  ok(rep.sections.sync.issues.length === 0, 'passos, impacto e whoosh sincronizados (erro em ms)', rep.sections.sync.report.map((x) => `${x.sound}@${x.t}:${x.errMs}`));
  ok(rep.cues.some((c) => c.sound === 'impacto'), 'impacto vem da física (tempo calculado pelo Rapier)', rep.cues.find((c) => c.sound === 'impacto'));
  ok(rep.sections.loudness.lufs !== null && near(rep.sections.loudness.lufs, -14, 1.5), 'loudness final', rep.sections.loudness.lufs);
  ok(true, 'tempo de render (s)', rep.renderSeconds);
});

await test('K', 'Legendas: estilo vídeo curto, sincronizadas com a narração', async (ok, dir) => {
  await mkdir(dir, { recursive: true });
  const voz = guideVoice('O guri parou. Algo caiu do céu. E agora?', join(dir, 'narracao.wav'));
  const dur = Number(probe(voz).format.duration); const at = 0.6;
  const caps = chunkCaptions('O guri *parou*. Algo *caiu* do céu. E *agora*?', at, at + dur, { maxWords: 3 });
  ok(caps.length >= 4 && caps.every((c) => c.words.length <= 3), 'texto dividido em blocos de até 3 palavras', caps.map((c) => c.words.map((w) => w.w).join(' ')));
  const env = [...Array(Math.round(at * 30)).fill(0), ...envelope(voz, 30)];
  const rep = await produce({ spec: { entry: '/scenes/tests/j-integracao.js', seconds: 6, fps: 30, width: 540, height: 960, params: { envelope: env, captions: caps } }, outDir: dir,
    soundMap: { passo: 'assets/sounds/footsteps/proc-passo.wav', impacto: 'assets/sounds/impacts/proc-impacto.wav', whoosh: 'assets/sounds/impacts/proc-whoosh.wav' },
    narration: { file: voz.replace(ROOT + '/', ''), at, gain: 1.1 }, workers: 4 });
  const meta = JSON.parse(await readFile(join(dir, 'meta.json'), 'utf8'));
  const shown = meta.probes.filter((p) => p.legenda); const first = shown[0];
  ok(first && Math.abs(first.t - at) <= 1 / 30 + 1e-6, 'primeira legenda aparece junto com a voz', first && { t: first.t, legenda: first.legenda });
  ok(meta.probes.filter((p) => p.t < at - 0.01).every((p) => !p.legenda), 'nenhuma legenda antes da fala');
  const key = caps.find((c) => c.words.some((w) => w.key)); const kf = Math.round(((key.t0 + key.t1) / 2) * 30);
  const img = await sharp(join(meta.framesDir, `f${String(kf).padStart(5, '0')}.jpg`)).extract({ left: 0, top: Math.round(960 * 0.6), width: 540, height: Math.round(960 * 0.24) }).raw().toBuffer();
  let yellow = 0; for (let i = 0; i < img.length; i += 3) if (img[i] > 200 && img[i + 1] > 150 && img[i + 1] < 210 && img[i + 2] < 110) yellow++;
  ok(yellow > 300, 'palavra-chave em amarelo no terço inferior (pixels)', yellow);
  ok(rep.legendas && (await readFile(rep.legendas, 'utf8')).includes('-->'), 'arquivo .srt gerado', rep.legendas);
  ok(rep.summary.ok, 'vídeo final aprovado nas verificações', rep.summary.errors.map((e) => e.message));
  await copyFile(join(meta.framesDir, `f${String(kf).padStart(5, '0')}.jpg`), join(dir, 'quadro-legenda.jpg'));
});

await test('L', 'Render em blocos paralelos = render contínuo', async (ok, dir) => {
  const base = { entry: '/scenes/tests/j-integracao.js', seconds: 6, fps: 30, width: 540, height: 960, format: 'png' };
  const seq = await renderScene({ ...base, outDir: join(dir, 'continuo') });
  const par = await renderSceneParallel({ ...base, outDir: join(dir, 'paralelo'), workers: 4, preroll: 2 });
  ok(par.frames === seq.frames && par.errors.length === 0, 'mesma quantidade de quadros, sem erros', { continuo: seq.frames, paralelo: par.frames, blocos: par.blocos });
  const sample = [0, 44, 45, 46, 89, 90, 91, 134, 135, 136, 179];
  const diffs = []; for (const f of sample) { const n = `f${String(f).padStart(5, '0')}.png`; diffs.push((await diffImages(join(seq.framesDir, n), join(par.framesDir, n))).changedPercent); }
  ok(Math.max(...diffs) < 0.5, 'quadros idênticos, inclusive nas emendas dos blocos (% pixels diferentes)', Object.fromEntries(sample.map((f, i) => [f, diffs[i]])));
  ok(true, 'tempo contínuo × paralelo (s)', { continuo: seq.renderSeconds, paralelo: par.renderSeconds, ganho: +(seq.renderSeconds / par.renderSeconds).toFixed(2) });
});

await writeFile(join(OUT, 'resultados.json'), JSON.stringify({ data: new Date().toISOString(), results, dependencias: deps }, null, 1));
const pass = results.filter((r) => r.passed).length;
console.log(`\n${pass}/${results.length} testes aprovados.`);
if (deps.length) { console.log('Dependências externas pendentes:'); deps.forEach((d) => console.log(' - ' + d)); }
process.exit(pass === results.length ? 0 : 1);
