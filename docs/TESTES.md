# Testes do estúdio

Executar: `npm run test:studio` (todos) ou `npm run test:studio -- A J` (só alguns). Saídas em `output/testes/<letra>/` e `output/testes/resultados.json`.

## Resultado da última execução: 10/10 aprovados

| Teste | O que verifica | Resultado medido |
|---|---|---|
| **A** Three.js | Cena com objeto, luz e câmera | 30 quadros, 0 erros, cubo no centro (NDC 0; −0,05), WebGL 2.0 |
| **B** GSAP | Movimento suave | −1,5 → 1,5; meio exato em t = 1 s; passo inicial = 0,04% do passo do meio (aceleração suave); sem recuo; quique a 1,6 m |
| **C** Câmera | Deslocamento, aproximação, rotação | dolly 3,000 m; órbita 90,0°; zoom 40 → 25; crane 5,995 m; acompanhamento com alvo no quadro; camera-controls chegou a [4, 3, 4] |
| **D** Personagem | GLB com esqueleto, movimentos, rosto | pé mais baixo −1,5 cm (tolerância 3 cm); pulo de 45 cm; GLB com 8 animações otimizado de 1.235.944 para 281.624 bytes; recarregado com esqueleto único de 17 ossos; three-vrm ativo |
| **E** Física | Gravidade, colisão, contato | caixas em repouso em y = 0,4 e 0,3; bola empurrou; 6 contatos com tempo e Δv; nada atravessou o chão; BVH: mesma altura (0,251) com raycast ~90× mais rápido |
| **F** Efeitos | Partículas e pós-processamento | pós-processamento muda 24,4% dos pixels; partículas em movimento; nenhum quadro estourado ou preto |
| **G** Áudio | Reprodução, síntese, filtros, mixagem | 10 sons Tone.js; Howler: load → play → end (1,2 s); voz-guia de 4,98 s; mixagem em −14,4 LUFS, pico −1,0 dBTP; sincronia de 0 ms |
| **H** Playwright | Chromium executa cena e ferramentas | Chromium 153 headless; lil-gui e stats.js ativos; render em **1080×1920**; MediaPipe: WASM servido e compilado |
| **I** FFmpeg | MP4 com imagem e áudio | H.264 + AAC, 3,0 s, 540×960 |
| **J** Integração | Cena completa | MP4 6 s, 540×960, 30 fps, vídeo + áudio; impacto calculado pela física (2,858 s); passos −10 ms, impacto 0 ms, whoosh 0 ms; −14,6 LUFS; render em ~62 s; 0 erros nas verificações |

Também aprovados: a base anterior (`npm run test:tools`, 10/10; `npm run check`, 7 OK) e a demonstração de autocorreção (`npm run demo:autocorrecao`, aprovada na 2ª iteração; ver [AUTOCORRECAO.md](AUTOCORRECAO.md)).

## O que falhou no caminho e como foi resolvido
Na primeira execução, 6/10 passaram. As falhas foram:

| Teste | Causa | Tipo | Solução |
|---|---|---|---|
| C | Crane medido em t = 4,0 s, exatamente quando o acompanhamento assume | Erro do teste | Medir em t = 3,97 s |
| D | glTF divide uma malha com vários materiais em 5 primitivas | Erro do teste | Verificar esqueleto único |
| D | Material "unlit" do rosto descartado ao otimizar | Problema real | `@gltf-transform/extensions` registrado |
| G | Som do pássaro com 50 ms de silêncio no início do arquivo | Limitação real | Sincronia por correlação de envelope |
| J | Whoosh sem ataque não era detectado | Limitação real | Correlação de envelope |
| J | Loudness −15,7 (normalização de uma passada) | Problema real | Duas passadas |
| J | Caixa fora do quadro e depois arremessada | Problema real | Ponto de queda, restituição 0, CCD |
| J | Cena não iniciava (comentário quebrou a sintaxe) | Erro meu | Corrigido; o renderizador agora mostra o erro real |

## Dependências externas pendentes (não testadas por falta de arquivo)
- **Modelo VRM:** nenhum `.vrm` em `assets/characters/`. O plugin está ativo, mas o carregamento real não foi testado.
- **MediaPipe FaceLandmarker:** falta o modelo `face_landmarker.task` (download manual do Google para `assets/references/`). Sem ele, o rastreamento facial não roda; o WASM já funciona.
- **Mixamo:** nenhum FBX baixado (exige conta Adobe e download manual). `loadMixamoClip` não foi testado com arquivo real.
