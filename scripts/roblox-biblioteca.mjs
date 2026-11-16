// Monta a biblioteca Roblox/blocos: exporta o kit próprio para GLB, importa e converte os
// arquivos Roblox de teste, gera um OBJ, mede tudo e grava o catálogo.
// Uso: npm run roblox:biblioteca
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from '../pipeline/config.mjs';
import { browserTask } from '../src/utils/browser-task.mjs';
import { launchStudioBrowser } from '../src/rendering/render-scene.mjs';
import { importRobloxFile } from '../src/roblox/import-rbx.mjs';
import { readCatalog, writeCatalog, upsert, checkCatalog } from '../src/roblox/catalog.mjs';

const T = '/scenes/roblox/tasks.js';
const browser = await launchStudioBrowser(); const cat = await readCatalog();
const proprio = { tipo: 'proprio' };
try {
  // 1. Kit próprio -> GLB
  const kitMeta = {
    'personagem-blocos': ['Personagem de blocos (rig 6 ossos)', 'characters', ['personagem', 'rig']],
    'casa-blocos': ['Casa de blocos', 'houses', ['casa', 'residencia']], 'predio-blocos': ['Prédio de 5 andares', 'cities', ['cidade', 'predio']],
    'arvore-blocos': ['Árvore de blocos', 'forests', ['arvore']], 'arvore-bola': ['Árvore de copa redonda', 'forests', ['arvore']],
    'carro-blocos': ['Carro de blocos', 'vehicles', ['carro', 'veiculo']], 'rua-blocos': ['Trecho de rua 12 m com calçadas', 'streets', ['rua', 'calcada']],
    'poste-blocos': ['Poste de luz', 'streets', ['iluminacao']], 'banco-blocos': ['Banco de praça', 'props', ['moveis', 'praca']],
    'cerca-blocos': ['Cerca de madeira 4 m', 'props', ['cerca']], 'mesa-blocos': ['Mesa', 'interiors', ['moveis']], 'chao-pinos': ['Chão com pinos 40 m', 'maps', ['chao', 'baseplate']],
  };
  for (const [id, [nome, categoria, tags]] of Object.entries(kitMeta)) {
    const r = await browserTask(T, 'exportKit', [id], { browser });
    const rel = `assets/roblox/${categoria}/${id}.glb`; await mkdir(join(ROOT, 'assets/roblox', categoria), { recursive: true });
    await writeFile(join(ROOT, rel), Buffer.from(r.base64, 'base64'));
    const e = await upsert(cat, { id, nome, categoria, arquivo: rel, origem: { tipo: 'kit-do-estudio', descricao: 'Gerado por src/roblox/blocky-kit.js' }, licenca: proprio, tags: ['blocos', ...tags], animacoes: r.animacoes });
    console.log(`kit  ${id.padEnd(18)} ${e.dimensoes.largura}×${e.dimensoes.altura}×${e.dimensoes.profundidade} m  ${(e.bytes / 1024).toFixed(0)} KB ${e.animacoes.length ? '[' + e.animacoes.join(', ') + ']' : ''}`);
  }
  // 2. Arquivos Roblox (autoria do estúdio) -> JSON -> GLB
  for (const [src, id, nome, categoria] of [['teste-casa.rbxm', 'casa-teste-rbxm', 'Casa (importada de .rbxm binário)', 'houses'], ['teste-praca.rbxlx', 'praca-teste-rbxlx', 'Praça (importada de .rbxlx XML)', 'maps']]) {
    const data = await importRobloxFile(join(ROOT, 'assets/roblox/_fontes', src));
    const jsonRel = `assets/roblox/_fontes/${src}.json`; await writeFile(join(ROOT, jsonRel), JSON.stringify(data));
    const r = await browserTask(T, 'robloxJsonToGLB', ['/' + jsonRel], { browser });
    const rel = `assets/roblox/${categoria}/${id}.glb`; await writeFile(join(ROOT, rel), Buffer.from(r.base64, 'base64'));
    const e = await upsert(cat, { id, nome, categoria, arquivo: rel, origem: { tipo: 'arquivo-roblox', descricao: `Convertido de assets/roblox/_fontes/${src} (arquivo de teste feito pelo estúdio)` }, licenca: proprio,
      dependencias: data.dependencias.map((d) => ({ tipo: d.tipo, id: d.id, resolvido: d.resolvido })), tags: ['roblox', data.formato],
      observacoes: `${data.pecas.length} peças, ${r.stats.malhas} malhas após agrupar por material; ${r.stats.placeholders} MeshPart sem malha local (magenta)` });
    console.log(`rbx  ${id.padEnd(18)} ${data.formato} ${data.binario ? 'binário' : 'XML'}: ${data.totalInstancias} instâncias, ${data.pecas.length} peças -> ${r.stats.malhas} malhas; ${e.dimensoes.largura}×${e.dimensoes.altura}×${e.dimensoes.profundidade} m; dependências: ${data.dependencias.length}`);
  }
  // 3. OBJ (formato de troca universal)
  const obj = await browserTask(T, 'exportKitOBJ', ['banco-blocos'], { browser });
  await writeFile(join(ROOT, 'assets/roblox/props/banco-blocos.obj'), obj);
  const eo = await upsert(cat, { id: 'banco-blocos-obj', nome: 'Banco de praça (OBJ)', categoria: 'props', arquivo: 'assets/roblox/props/banco-blocos.obj', origem: { tipo: 'kit-do-estudio', descricao: 'OBJExporter do banco-blocos' }, licenca: proprio, tags: ['obj'] });
  console.log(`obj  banco-blocos-obj    ${eo.dimensoes.largura}×${eo.dimensoes.altura}×${eo.dimensoes.profundidade} m`);
  await writeCatalog(cat);
  // 4. Prova: recarrega pelos carregadores genéricos (GLB, OBJ, JSON Roblox).
  const r = await browserTask(T, 'reload', [['/assets/roblox/characters/personagem-blocos.glb', '/assets/roblox/houses/casa-teste-rbxm.glb', '/assets/roblox/maps/praca-teste-rbxlx.glb', '/assets/roblox/props/banco-blocos.obj', '/assets/roblox/_fontes/teste-casa.rbxm.json']], { browser });
  console.log('\nrecarregados:'); for (const [f, v] of Object.entries(r)) console.log(' ', f, JSON.stringify(v));
  const probs = await checkCatalog(cat); console.log(`\ncatálogo: ${cat.itens.length} itens; pendências: ${probs.length}`); probs.forEach((p) => console.log('  -', p.id, p.problema));
} finally { await browser.close(); }
