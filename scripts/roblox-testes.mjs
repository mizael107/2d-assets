// Testes da integração Roblox/blocos. Uso: npm run test:roblox
// Pré-requisito: npm run roblox:biblioteca (gera GLBs e catálogo).
import { writeFile, copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from '../pipeline/config.mjs';
import { importRobloxFile } from '../src/roblox/import-rbx.mjs';
import { readCatalog, checkCatalog, measureGLB } from '../src/roblox/catalog.mjs';
import { browserTask } from '../src/utils/browser-task.mjs';
import { renderScene } from '../src/rendering/render-scene.mjs';
import { produce } from '../src/rendering/produce.mjs';

const OUT = join(ROOT, 'output/roblox'); await mkdir(OUT, { recursive: true });
const results = []; const near = (a, b, t) => Math.abs(a - b) <= t;
async function test(id, name, fn) {
  const checks = []; const ok = (c, l, v) => checks.push({ ok: !!c, l, v });
  try { await fn(ok); } catch (e) { checks.push({ ok: false, l: 'exceção', v: String(e.message).slice(0, 300) }); }
  const passed = checks.every((c) => c.ok); results.push({ id, name, passed, checks });
  console.log(`${passed ? 'APROVADO ' : 'REPROVADO'}  ${id} ${name}`); checks.forEach((c) => console.log(`   ${c.ok ? '✓' : '✗'} ${c.l}${c.v !== undefined ? ': ' + (typeof c.v === 'string' ? c.v : JSON.stringify(c.v)) : ''}`));
}

await test('R1', 'Importar .rbxm binário', async (ok) => {
  const r = await importRobloxFile(join(ROOT, 'assets/roblox/_fontes/teste-casa.rbxm'));
  ok(r.binario && r.formato === 'rbxm', 'formato binário reconhecido', r.formato);
  ok(r.pecas.length === 13 && r.classes.WedgePart === 2, 'peças e cunhas lidas', r.classes);
  const tel = r.pecas.find((p) => p.name === 'TelhadoFrente'); ok(near(tel.cframe.rot[0], -1, 1e-6) && tel.material === 'WoodPlanks', 'CFrame girado 180° e material preservados', { rot: tel.cframe.rot.slice(0, 3), material: tel.material });
  ok(r.dependencias.length === 1 && !r.dependencias[0].resolvido, 'MeshPart sem malha local marcada como dependência', r.dependencias[0]);
});
await test('R2', 'Importar .rbxlx XML', async (ok) => {
  const r = await importRobloxFile(join(ROOT, 'assets/roblox/_fontes/teste-praca.rbxlx'));
  ok(!r.binario && r.totalInstancias === 46 && r.pecas.length === 36, 'instâncias e peças', { instancias: r.totalInstancias, pecas: r.pecas.length });
  const a = r.pecas.find((p) => p.name === 'Agua'); ok(a.shape === 'Cylinder' && a.transparency === 0.3 && a.material === 'Glass', 'cilindro, transparência e vidro', { shape: a.shape, t: a.transparency });
  ok(r.pecas.find((p) => p.name === 'Lampada').material === 'Neon', 'material Neon (vira emissivo)');
});
await test('R3', 'Conversão para GLB e recarga (GLB, OBJ, JSON)', async (ok) => {
  const cat = await readCatalog();
  const files = ['characters/personagem-blocos.glb', 'houses/casa-teste-rbxm.glb', 'maps/praca-teste-rbxlx.glb', 'props/banco-blocos.obj'].map((f) => '/assets/roblox/' + f);
  const r = await browserTask('/scenes/roblox/tasks.js', 'reload', [files]);
  for (const f of files) {
    const e = cat.itens.find((x) => '/' + x.arquivo === f); const s = r[f].tamanho; const d = e.dimensoes;
    ok(near(s[0], d.largura, 0.02) && near(s[1], d.altura, 0.02) && near(s[2], d.profundidade, 0.02), `${f.split('/').pop()}: dimensões no Three.js = catálogo`, s);
  }
  ok(r[files[0]].animacoes.length === 4, 'personagem com 4 animações no GLB', r[files[0]].animacoes);
  const pr = await measureGLB(join(ROOT, 'assets/roblox/maps/praca-teste-rbxlx.glb')); ok(near(pr.dimensoes.largura, 33.6, 0.01), 'praça: 120 studs = 33,6 m', pr.dimensoes.largura);
});
await test('R4', 'Catálogo', async (ok) => {
  const cat = await readCatalog(); const probs = await checkCatalog(cat);
  ok(cat.itens.length >= 15, 'itens catalogados', cat.itens.length);
  ok(cat.itens.every((e) => e.licenca && e.origem && e.dimensoes), 'todo item tem licença, origem e dimensões');
  ok(probs.every((p) => p.problema.startsWith('dependência')), 'só pendência esperada (MeshPart de teste)', probs.map((p) => p.problema));
});
await test('R5', 'Cenário montado do catálogo: imagem 1080×1920 e vídeo com som', async (ok) => {
  const img = await renderScene({ entry: '/scenes/roblox/demo-cidade.js', outDir: join(OUT, 'imagem'), fps: 30, width: 1080, height: 1920, startFrame: 105, endFrame: 106, format: 'png' });
  ok(img.errors.length === 0 && img.frames === 1, 'imagem 1080×1920 renderizada', img.info.otimizacao);
  await copyFile(join(img.framesDir, 'f00105.png'), join(OUT, 'demo-cidade-1080x1920.png'));
  ok(img.info.otimizacao.malhasDepois < img.info.otimizacao.malhasAntes / 5, 'otimização juntou malhas estáticas', img.info.otimizacao);
  const rep = await produce({
    spec: { entry: '/scenes/roblox/demo-cidade.js', seconds: 5, fps: 30, width: 540, height: 960 }, outDir: join(OUT, 'video'),
    soundMap: { passo: 'assets/sounds/footsteps/proc-passo.wav' },
    beds: [{ file: 'assets/sounds/music/proc-trilha.wav', gain: 0.4, loop: true, fadeIn: 0.5, fadeOut: 1 }, { file: 'assets/sounds/weather/proc-vento.wav', gain: 0.25, loop: true }],
  });
  ok(rep.summary.ok, 'verificações automáticas do vídeo', rep.summary.errors.map((e) => e.message));
  ok(rep.sections.sync.issues.length === 0, 'passos sincronizados', rep.sections.sync.report.slice(0, 3).map((x) => x.errMs));
  ok(true, 'tempo de render (s)', rep.renderSeconds);
});
await writeFile(join(OUT, 'resultados.json'), JSON.stringify(results, null, 1));
const p = results.filter((r) => r.passed).length; console.log(`\n${p}/${results.length} testes aprovados.`); process.exit(p === results.length ? 0 : 1);
