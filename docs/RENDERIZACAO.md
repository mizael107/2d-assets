# Renderização

## Pipeline
1. `renderScene()` (`src/rendering/render-scene.mjs`) abre a página da cena no Chromium headless (Playwright, WebGL por SwiftShader), chama `update(t)` e `render()` para cada quadro e salva JPG (padrão) ou PNG, junto com as medições.
2. `framesToMp4()` (FFmpeg): H.264, yuv420p, `+faststart`.
3. `mixScene()` e `muxVideoAudio()`: áudio AAC 48 kHz.
4. `produce()` faz as três etapas e ainda as verificações automáticas e a folha de contato.

## Formatos (`PRESETS` em render-scene.mjs)
| Preset | Resolução | Uso |
|---|---|---|
| `vertical` | 1080×1920 (9:16) | Final para TikTok, Reels e Shorts |
| `verticalDraft` | 540×960 | Rascunho e revisão |
| `horizontal` / `horizontalDraft` | 1920×1080 / 960×540 | Horizontal |

FPS aceitos (validados pelo zod): 24, 25, 30 e 60. Largura e altura precisam ser pares (exigência do H.264).

## Desempenho medido (sem GPU)
| Cena | Resolução | Tempo |
|---|---|---|
| Teste J (personagem, física, partículas, bloom e DoF) | 540×960 | 180 quadros em ~60 s ≈ **0,33 s por quadro** |
| Teste F (só efeitos) | 540×960 | ~0,3 s por quadro |
| Cena simples (teste A) | 1080×1920 | renderiza normalmente (testado) |

Estimativa para 1080×1920 com a cena J: cerca de 4 vezes mais pixels, o que dá **~1,3 s por quadro**, ou seja, cerca de 4 min de render por 10 s de vídeo. Estratégia: revisar em 540×960 e renderizar o final em 1080×1920 só depois de aprovado.

## Render em blocos paralelos (`src/rendering/render-parallel.mjs`)
```js
await renderSceneParallel({ entry, outDir, seconds: 6, fps: 30, width: 1080, height: 1920, workers: 4, preroll: 2 });
// ou: produce({ ..., workers: 4 })
```
- Divide os quadros em blocos, cada um num Chromium separado, e junta tudo na mesma pasta.
- **Pré-rolagem:** cada bloco simula 2 s antes do seu primeiro quadro, sem desenhar, para a câmera de acompanhamento (que depende dos quadros anteriores) chegar no mesmo estado.
- **Medido (teste L, cena J, 540×960, 180 quadros):** quadros **idênticos** ao render contínuo, com 0% de pixels diferentes, inclusive nas emendas (quadros 44/45, 89/90, 134/135).
- **Tempo:** 72,3 s contínuo contra 64,5 s em 4 blocos, só **1,12× mais rápido** nesta máquina de 4 núcleos. O SwiftShader (WebGL por software) já usa vários núcleos sozinho, então os blocos disputam a mesma CPU. O ganho real aparece em máquinas com muitos núcleos ou dividindo o render entre máquinas. Outras utilidades: refazer só um trecho e não perder tudo se um bloco falhar.

## Sincronia imagem-som
Tudo depende de `t`. O som não toca durante o render: ele é posicionado pelo FFmpeg nos tempos dos cues. A verificação mede o erro real; no teste J ficou entre −10 e 0 ms (menos de 1 quadro a 30 fps).

## Canvas 2D e legendas
O runtime compõe cada quadro num canvas 2D quando a cena (ou `params.captions`) tem legendas: o 3D é desenhado primeiro, a camada 2D por cima. Isso funciona com ou sem pós-processamento.

**Legendas** (`src/effects/captions.js`), no estilo da referência de vídeos curtos:
- MAIÚSCULAS, Inter Display ExtraBold levemente condensada, branco com contorno preto e sombra;
- **palavra-chave em amarelo `#F2B839`** (marque com `*palavra*`);
- terço inferior (72% da altura), de 1 a 3 palavras por vez, com um "pop" de entrada.
```js
import { chunkCaptions } from './src/effects/captions.js';
const caps = chunkCaptions('Ele tirou o *sal* da sopa', 0.6, 2.4, { maxWords: 3 }); // tempo da fala
produce({ spec: { ..., params: { captions: caps } } });  // também grava legendas.srt
```
- `chunkCaptions` distribui os blocos pelo tamanho das palavras e não termina um bloco em palavra de ligação ("do", "de", "o"...).
- O tempo vem da duração da narração, não de reconhecimento de fala: o início e o fim de cada frase batem, mas palavras isoladas podem adiantar ou atrasar um pouco.
- **Teste K:** primeira legenda em 0,6 s, junto com a voz; nenhuma antes; amarelo detectado no terço inferior; `.srt` gerado.
