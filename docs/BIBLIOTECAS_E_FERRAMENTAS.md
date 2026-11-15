# Bibliotecas e ferramentas

Ambiente: Ubuntu 24.04 (x86_64), 4 núcleos, 15 GB RAM, **sem GPU**. Node v22.23.4, npm 10.9.9.

## Instaladas nesta etapa

| Pacote | Versão | Finalidade no estúdio | Onde é usado |
|---|---|---|---|
| gsap | 3.15.1 | Animação e easing determinísticos (timeline pausada + `seek`) | `src/animation/timeline.js`, `src/cameras/director.js` |
| camera-controls | 3.1.2 | Câmera interativa para enquadrar/pré-visualizar | `src/cameras/preview.js` |
| @pixiv/three-vrm | 3.5.5 | Personagens VRM, expressões, olhar | `src/characters/loader.js`, `face.js` |
| @gltf-transform/core | 4.5.1 | Ler/escrever GLB no Node | testes D |
| @gltf-transform/functions | 4.5.1 | Otimizar modelos (dedup, weld, resample, prune) | testes D |
| @gltf-transform/extensions | 4.5.1 | Preserva extensões (ex.: material unlit) ao otimizar | testes D |
| howler | 2.2.4 | Reprodução de áudio no navegador (pré-visualização) | `src/audio/preview.js` |
| tone | 15.1.22 | Síntese de sons procedurais (render offline) | `src/audio/synth.js` |
| @dimforge/rapier3d-compat | 0.21.0 | **Motor de física principal** | `src/physics/world.js` |
| three-mesh-bvh | 0.9.18 | Raycast acelerado (altura do terreno, contato) | `src/physics/bvh.js` |
| postprocessing | 6.39.6 | Bloom, DoF, vinheta, grão, tone mapping | `src/effects/postfx.js` |
| sharp | 0.35.5 | Análise e composição de imagens (folhas de contato, diferenças) | `src/validation/checks.mjs` |
| zod | 4.6.7 | Validação de especificações e cues | `src/validation/schemas.mjs` |
| stats.js | 0.17.0 | Monitor de desempenho no modo debug | `src/rendering/runtime.js` |
| lil-gui | 0.21.0 | Painel de parâmetros para testes | `scenes/tests/tasks.js` |
| @mediapipe/tasks-vision | 1.2.3 | Rastreamento facial (referência de expressões) | `scenes/tests/tasks.js` |
| espeak-ng (apt) | 1.51 | Voz-guia offline pt-BR para animatics e testes de lip sync | `src/audio/voice.mjs` |

## Já existiam (não reinstaladas)

| Ferramenta | Versão |
|---|---|
| three | 0.187.0 (fixada em `^0.187.0`, que no npm significa ≥0.187 e <0.188: compatível com postprocessing, que exige <0.188) |
| playwright | 1.65.1 |
| Chromium | 153.0.8010.12 em `/opt/pw-browsers/chromium` (headless + SwiftShader) |
| FFmpeg | 6.1.1 (libx264, aac, libmp3lame, libopus, loudnorm, amix, sidechaincompress) |

## Não instaladas, e por quê

| Pacote pedido | Decisão |
|---|---|
| `@tsparticles/three` | **Não existe** no npm (404). As partículas foram feitas em `src/effects/particles.js` (THREE.Points com shader, determinístico): poeira, fumaça, chuva, neve, faíscas, brasas, magia. |
| `three-stdlib` | Duplica o que o `three/addons` já traz na mesma versão do Three (GLTFLoader, FBXLoader, OrbitControls, SkeletonUtils…). Instalar criaria duas cópias dos mesmos loaders com versões diferentes. |
| `@dimforge/rapier3d` | Mesmo motor do `-compat`, mas exige um empacotador (bundler) para carregar o WASM. O `-compat` traz o WASM embutido e roda direto no Chromium. |
| `cannon-es` | Seria um segundo motor de física para a mesma função. **Rapier foi escolhido como principal**: é mais rápido, mais estável com pilhas de objetos, tem CCD (colisão contínua para objetos rápidos) e eventos de contato com força. |
| `npx playwright install chromium` | Desnecessário e bloqueado pela rede (`cdn.playwright.dev`). O Chromium pré-instalado funciona. |

## Avisos conhecidos

- `npm ls` mostra `@emnapi/runtime` e `@img/sharp-wasm32` como *extraneous*: são opcionais do sharp e não afetam nada.
- O Chromium imprime erros de D-Bus no terminal (o contêiner não tem barramento de sistema). São inofensivos.
