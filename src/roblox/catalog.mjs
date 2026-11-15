// (Node) Catálogo interno de recursos: assets/roblox/catalogo.json
// Cada item: id, nome, categoria, arquivo, formato, origem, licença, dimensões (m),
// dependências e observações. Dimensões são medidas no próprio arquivo.
import { readFile, writeFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { z } from 'zod';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/core';
import { ROOT } from '../../pipeline/config.mjs';

export const CATEGORIAS = ['maps', 'houses', 'cities', 'forests', 'interiors', 'streets', 'characters', 'vehicles', 'props', 'animations', 'textures', 'sounds', 'materials'];
export const LICENCAS = {
  'proprio': 'Criado por este estúdio. Uso livre em qualquer projeto.',
  'CC0': 'Domínio público. Uso livre, sem atribuição.',
  'CC-BY-4.0': 'Uso livre com crédito ao autor.',
  'roblox-creator-store': 'Termos de uso do Roblox. Uso garantido DENTRO de experiências Roblox; fora do Roblox, só com autorização do criador.',
  'autorizado-pelo-autor': 'Permissão por escrito do autor (guarde o comprovante em assets/roblox/_fontes/).',
  'desconhecida': 'NÃO usar em vídeo publicado até confirmar a licença.',
};
export const CatalogEntry = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  nome: z.string(),
  categoria: z.enum(CATEGORIAS),
  arquivo: z.string(),
  formato: z.enum(['glb', 'gltf', 'obj', 'fbx', 'json', 'rbxm', 'rbxl', 'rbxmx', 'rbxlx', 'wav', 'mp3', 'png', 'jpg']),
  origem: z.object({ tipo: z.enum(['kit-do-estudio', 'arquivo-roblox', 'creator-store', 'externo']), descricao: z.string(), url: z.string().optional(), autor: z.string().optional() }),
  licenca: z.object({ tipo: z.enum(Object.keys(LICENCAS)), observacao: z.string().optional() }),
  dimensoes: z.object({ largura: z.number(), altura: z.number(), profundidade: z.number() }).optional(),
  escala: z.number().default(1),
  animacoes: z.array(z.string()).default([]),
  dependencias: z.array(z.object({ tipo: z.string(), id: z.string(), resolvido: z.boolean() })).default([]),
  tags: z.array(z.string()).default([]),
  bytes: z.number().optional(),
  observacoes: z.string().optional(),
});
export const CatalogSchema = z.object({ versao: z.literal(1), unidade: z.literal('metro'), itens: z.array(CatalogEntry) });

export const CATALOG_PATH = join(ROOT, 'assets/roblox/catalogo.json');
export async function readCatalog() {
  try { return CatalogSchema.parse(JSON.parse(await readFile(CATALOG_PATH, 'utf8'))); } catch (e) { if (e.code === 'ENOENT') return { versao: 1, unidade: 'metro', itens: [] }; throw e; }
}
export async function writeCatalog(cat) { const c = CatalogSchema.parse(cat); await writeFile(CATALOG_PATH, JSON.stringify(c, null, 1) + '\n'); return c; }

// Mede um GLB/GLTF: caixa envolvente da cena e nomes das animações.
export async function measureGLB(file) {
  const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(file);
  const b = getBounds(doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0]);
  const d = b.max.map((v, i) => +(v - b.min[i]).toFixed(3));
  return { dimensoes: { largura: d[0], altura: d[1], profundidade: d[2] }, animacoes: doc.getRoot().listAnimations().map((a) => a.getName()) };
}
export async function measureOBJ(file) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const line of (await readFile(file, 'utf8')).split('\n')) if (line.startsWith('v ')) { const v = line.split(/\s+/).slice(1, 4).map(Number); v.forEach((x, i) => { min[i] = Math.min(min[i], x); max[i] = Math.max(max[i], x); }); }
  const d = max.map((v, i) => +(v - min[i]).toFixed(3));
  return { dimensoes: { largura: d[0], altura: d[1], profundidade: d[2] }, animacoes: [] };
}

// Adiciona/atualiza um item medindo o arquivo.
export async function upsert(cat, entry) {
  const abs = join(ROOT, entry.arquivo); const ext = extname(abs).slice(1).toLowerCase();
  const m = ext === 'glb' || ext === 'gltf' ? await measureGLB(abs) : ext === 'obj' ? await measureOBJ(abs) : {};
  const full = CatalogEntry.parse({ ...entry, formato: ext, ...m, ...(entry.animacoes ? { animacoes: entry.animacoes } : {}), dimensoes: entry.dimensoes ?? m.dimensoes, bytes: (await stat(abs)).size });
  const i = cat.itens.findIndex((e) => e.id === full.id); if (i >= 0) cat.itens[i] = full; else cat.itens.push(full);
  return full;
}

// Verifica o catálogo: arquivos existem, licenças usáveis, dependências pendentes.
export async function checkCatalog(cat) {
  const problems = [];
  for (const e of cat.itens) {
    try { await stat(join(ROOT, e.arquivo)); } catch { problems.push({ id: e.id, problema: `arquivo não encontrado: ${e.arquivo}` }); }
    if (['desconhecida', 'roblox-creator-store'].includes(e.licenca.tipo)) problems.push({ id: e.id, problema: `licença "${e.licenca.tipo}": ${LICENCAS[e.licenca.tipo]}` });
    for (const d of e.dependencias.filter((x) => !x.resolvido)) problems.push({ id: e.id, problema: `dependência sem arquivo local: ${d.tipo} ${d.id}` });
  }
  return problems;
}
