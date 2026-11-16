// (Node) Ciclo de autocorreção: produzir -> verificar -> corrigir o arquivo de configuração
// -> produzir de novo -> comparar -> repetir até não haver erros (ou acabar as tentativas).
//
// O que este módulo corrige SOZINHO: defeitos MENSURÁVEIS que têm um parâmetro claro
// (tabela FIXERS). O resto (composição, expressão, legibilidade, ritmo) é avaliado por
// um modelo com visão olhando a folha de contato e corrigido editando o código da cena.
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { produce } from '../rendering/produce.mjs';
import { contactSheet, diffImages } from './checks.mjs';

// código do problema -> como mudar a configuração
export const FIXERS = {
  'pe-atravessa-chao': (cfg, i) => ({ ...cfg, params: { ...cfg.params, characterYOffset: +((cfg.params.characterYOffset ?? 0) + i.fix.delta).toFixed(4) } }),
  'personagem-flutuando': (cfg, i) => ({ ...cfg, params: { ...cfg.params, characterYOffset: +((cfg.params.characterYOffset ?? 0) + i.fix.delta).toFixed(4) } }),
  'audio-fora-de-sincronia': (cfg, i) => ({ ...cfg, audioOffset: +((cfg.audioOffset ?? 0) + i.fix.delta).toFixed(3) }),
  'fora-do-quadro': (cfg) => ({ ...cfg, params: { ...cfg.params, cameraLookOffsetX: 0 } }), // reenquadra no personagem
};
const fixerFor = (code) => FIXERS[code] ?? FIXERS[code.split(':')[0]];

export async function autoCorrect({ configPath, outRoot, soundMap, beds = [], maxIterations = 3, base }) {
  await mkdir(outRoot, { recursive: true });
  const history = [];
  for (let it = 1; it <= maxIterations; it++) {
    const cfg = JSON.parse(await readFile(configPath, 'utf8'));
    const dir = join(outRoot, `iteracao-${it}`);
    await copyFile(configPath, join(outRoot, `config-iteracao-${it}.json`));
    const rep = await produce({ ...base, spec: { ...base.spec, params: cfg.params }, audioOffset: cfg.audioOffset ?? 0, outDir: dir, soundMap, beds });
    const errors = rep.summary.errors;
    history.push({ iteracao: it, config: cfg, erros: errors.map((e) => `${e.code}: ${e.message}`), sync: rep.sections.sync.report, final: rep.final, folha: rep.contactSheet });
    if (!errors.length) break;
    // Aplica uma correção por código de problema (a primeira ocorrência de cada).
    let next = cfg; const applied = new Set();
    for (const e of errors) {
      const key = e.code.split(':')[0]; if (applied.has(key)) continue;
      const fx = fixerFor(e.code); if (!fx) continue;
      next = fx(next, e); applied.add(key);
    }
    if (!applied.size) break; // nada que dê para corrigir automaticamente
    history.at(-1).correcoes = [...applied];
    await writeFile(configPath, JSON.stringify(next, null, 2) + '\n');
  }
  // Comparação antes/depois (mesmo quadro) e folhas de contato.
  const first = history[0], last = history.at(-1);
  const frame = 'f00045.jpg';
  const cmp = history.length > 1 ? await diffImages(join(outRoot, 'iteracao-1/frames', frame), join(outRoot, `iteracao-${history.length}/frames`, frame), join(outRoot, 'diferenca-antes-depois.png')) : null;
  return { iteracoes: history.length, aprovado: last.erros.length === 0, history, comparacao: cmp, antes: first.folha, depois: last.folha };
}
