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

Estimativa para 1080×1920 com a cena J: cerca de 4 vezes mais pixels, o que dá **~1,3 s por quadro**, ou seja, cerca de 4 min de render por 10 s de vídeo. Estratégia recomendada:
- revisar em 540×960;
- renderizar o final em 1080×1920 só depois de aprovado;
- dividir em blocos paralelos com `startFrame`/`endFrame` (4 núcleos), como na habilidade `render-three-cpu-em-blocos`.

## Sincronia imagem-som
Tudo depende de `t`. O som não toca durante o render: ele é posicionado pelo FFmpeg nos tempos dos cues. A verificação mede o erro real; no teste J ficou entre −10 e 0 ms (menos de 1 quadro a 30 fps).

## Canvas 2D
Legendas, títulos e infográficos 2D podem ser desenhados num `<canvas>` 2D e usados como textura (`THREE.CanvasTexture`) num plano na frente da câmera. O render é o mesmo. Ainda não há um módulo de legendas pronto (ver próximas etapas).
