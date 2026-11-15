// Demonstração da autocorreção: começa de uma configuração com 3 defeitos plantados,
// e o ciclo detecta, corrige o arquivo do projeto, renderiza de novo e compara.
// Uso: npm run demo:autocorrecao
import { writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from '../pipeline/config.mjs';
import { autoCorrect } from '../src/validation/autocorrect.mjs';

const configPath = join(ROOT, 'scenes/demo/autocorrecao.config.json');
const comDefeitos = {
  _nota: 'Arquivo corrigido automaticamente por scripts/autocorrecao-demo.mjs. Versão inicial com 3 defeitos de propósito.',
  params: { characterYOffset: -0.12, cameraLookOffsetX: 2.6 }, // pés 12 cm dentro do chão; câmera olhando para o lado
  audioOffset: 0.25,                                           // som do impacto 250 ms atrasado
};
await writeFile(configPath, JSON.stringify(comDefeitos, null, 2) + '\n');

const r = await autoCorrect({
  configPath, outRoot: join(ROOT, 'output/autocorrecao'),
  base: { spec: { entry: '/scenes/demo/autocorrecao.js', seconds: 3, fps: 30, width: 540, height: 960 } },
  soundMap: { impacto: 'assets/sounds/impacts/proc-impacto.wav' },
  beds: [{ file: 'assets/sounds/weather/proc-vento.wav', gain: 0.3, loop: true }],
});
for (const h of r.history) {
  console.log(`\nIteração ${h.iteracao}: config ${JSON.stringify({ ...h.config, _nota: undefined })}`);
  console.log(h.erros.length ? h.erros.map((e) => '  ✗ ' + e).join('\n') : '  ✓ nenhum erro');
  console.log('  sincronia:', h.sync.map((s) => `${s.sound} ${s.errMs} ms`).join(', '));
  if (h.correcoes) console.log('  correções aplicadas:', h.correcoes.join(', '));
}
console.log(`\nResultado: ${r.aprovado ? 'APROVADO' : 'REPROVADO'} em ${r.iteracoes} iteração(ões). Pixels alterados no quadro 45: ${r.comparacao?.changedPercent}%`);
console.log('Folhas de contato:', r.antes, '->', r.depois);
await writeFile(join(ROOT, 'output/autocorrecao/resumo.json'), JSON.stringify(r, null, 1));
console.log('Config final:', await readFile(configPath, 'utf8'));
