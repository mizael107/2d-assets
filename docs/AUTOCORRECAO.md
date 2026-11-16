# Sistema de autocorreção

O ciclo é: **criar → renderizar → verificar → corrigir → renderizar de novo → comparar → repetir**. Ele tem duas camadas, que fazem coisas diferentes.

## Camada 1: verificações automáticas por código
Medem números, sem precisar "ver". Ficam em `src/validation/checks.mjs`:

| Verificação | O que pega |
|---|---|
| `checkVideoFile` | Resolução, FPS, duração e presença de áudio |
| `checkFrames` | Quadro preto, estourado, sem contraste, imagem congelada, **faixa superior preta** (céu faltando) |
| `checkProbes` | Pé atravessando o chão, personagem flutuando, objeto abaixo do chão, personagem ou objeto fora do quadro, câmera no chão |
| `checkAudioSync` | Som atrasado, adiantado ou ausente, medido por correlação de envelope |
| `checkLoudness` | Loudness (LUFS) e pico |
| `contactSheet` | Folha com vários quadros, número e tempo, para revisão visual |
| `diffImages` | % de pixels que mudaram entre antes e depois, mais uma imagem de diferença |

As medições (*probes*) vêm da própria cena: posição dos pés, posição na tela de cabeça e objetos, menor altura de cada objeto e posição da câmera.

**Correção automática** (`src/validation/autocorrect.mjs`): cada problema mensurável traz uma sugestão (`fix`), e a tabela `FIXERS` aplica a correção **no arquivo de configuração da cena**. Depois o ciclo renderiza de novo e compara.

## Camada 2: revisão visual por um modelo com visão
Composição, expressão, legibilidade, contraluz, objeto cobrindo personagem e "parece certo?" **não são medidos por código**. Quem faz essa revisão é o Claude, olhando a folha de contato (`folha-de-contato.jpg`) e corrigindo o código da cena. Isso exige um modelo capaz de analisar imagens; não roda sozinho dentro do script.

## Demonstração real (`npm run demo:autocorrecao`)
Configuração inicial `scenes/demo/autocorrecao.config.json`, com 3 defeitos plantados:

| Iteração | Configuração | Resultado |
|---|---|---|
| 1 | pés −0,12 m, câmera desviada 2,6 m, som +0,25 s | ✗ pé L 12,0 cm abaixo do chão; ✗ pé R 12,0 cm; ✗ cabeça fora do quadro; ✗ impacto 250 ms atrasado |
| — | correções aplicadas no arquivo | `characterYOffset: 0`, `cameraLookOffsetX: 0`, `audioOffset: 0` |
| 2 | corrigida | ✓ nenhum erro; impacto com 0 ms de erro; 23,4% dos pixels mudaram no quadro 45 |

Imagem antes/depois: `output/autocorrecao/antes-depois.jpg`.

## O que a revisão visual pegou nesta instalação
Problemas que **passaram** nas verificações automáticas e só foram vistos nas folhas de contato:
1. **Cena J, contraluz:** rosto escuro em todos os planos. Correção: sol trazido para a frente (`keyPos`).
2. **Cena J, câmera dentro do corpo:** o close mirava o peito (1,25 m) em vez do rosto (1,64 m).
3. **Cena J, caixa em primeiro plano** cobrindo metade do personagem no plano final. Correção: câmera baixa do outro lado.
4. **Teste F, efeitos estourados:** bloom e partículas fortes demais. Correção: intensidades reduzidas.
5. **Demo, céu preto:** a esfera do céu (120 m) estava além do alcance da câmera (100 m). Correção na biblioteca (o céu agora se ajusta à câmera) **e uma regra automática nova** (`faixa-superior-preta`). A regra foi conferida: dispara numa imagem com céu preto e fica em silêncio no render corrigido.

O item 5 mostra como o sistema evolui: um problema visto pela camada 2 vira uma regra da camada 1.

## O que as verificações automáticas pegaram e foram corrigidas
- Bola "abaixo do chão" por medição imprecisa da caixa envolvente de um objeto girado.
- Objeto saindo do quadro no acompanhamento de câmera.
- Caixa caindo fora do quadro e depois quicando para fora: restituição alta a 28 m/s.
- Sons sem ataque claro (whoosh) não detectados pelo método antigo de ataques: troquei por correlação de envelope.
- Loudness fora do alvo: troquei por normalização em duas passadas.

## Limitações
- Os `FIXERS` cobrem só problemas com um parâmetro claro (altura, deslocamento de áudio, enquadramento). Problemas de composição e atuação continuam com a camada 2.
- Não há verificação de **continuidade entre planos** (ex.: objeto que muda de lugar entre cortes) nem de deslizamento do pé durante a caminhada. São as próximas regras a criar.
- A verificação de enquadramento usa pontos (cabeça e centro do objeto), não a silhueta inteira.
