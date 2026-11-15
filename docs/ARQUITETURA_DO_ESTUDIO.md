# Arquitetura do estúdio

O estúdio produz vídeos de animação 3D **por código**. Uma cena é um módulo JavaScript que roda dentro do Chromium (WebGL via Three.js). O Node renderiza a cena quadro a quadro, monta o áudio com FFmpeg, gera o MP4 e verifica o resultado.

```
cena (scenes/*.js) ──► runtime no Chromium ──► quadros JPG/PNG + medições (probes) + cues de som
                                                          │
             sons (assets/sounds) + narração ──► mixagem FFmpeg ──► MP4 final
                                                          │
                              verificações automáticas + folha de contato ──► relatório
                                                          │
                                   autocorreção (configuração) / revisão visual (modelo)
```

## Por que esse desenho

- **Determinístico.** Tudo é função do tempo `t`: a timeline GSAP fica pausada e usa `seek(t)`; a física é pré-calculada (bake); as partículas são calculadas analiticamente; o aleatório tem semente. O quadro 120 sai igual em toda renderização. É isso que permite comparar antes e depois e corrigir com segurança.
- **Sem GPU.** O WebGL roda no SwiftShader (CPU). Funciona em qualquer máquina, mas é mais lento: veja [RENDERIZACAO.md](RENDERIZACAO.md).
- **Áudio offline.** O som final não é "gravado tocando". Ele é montado pelo FFmpeg com tempos exatos, a partir dos *cues* que a cena declara (passos pela fase da caminhada, impactos pela física).

## Estrutura

```
assets/                    biblioteca reutilizável (arquivos)
  characters/              boneco-base.glb (humanoide do estúdio, 8 animações) + otimizado
  animations/ environments/ objects/ textures/ materials/ cameras/ lighting/ references/
  sounds/                  footsteps, impacts, weather, ambience, animals, music, voices
                           (proc-*.wav = gerados pelo Tone.js; ver sounds/LICENCAS.md)
src/                       biblioteca de código
  rendering/  page.mjs (página + import map), runtime.js (navegador), render-scene.mjs, render-parallel.mjs,
              produce.mjs (render→áudio→MP4→verificações), probes.js
  animation/  timeline.js (GSAP), motions.js (andar, correr, pular, cair, acenar, pânico, feitiço)
  characters/ humanoid.js (personagem com esqueleto), face.js (piscar, expressões, boca),
              loader.js (GLB/VRM/FBX Mixamo + retarget)
  cameras/    director.js (movimentos cinematográficos), preview.js (camera-controls)
  physics/    world.js (Rapier, bake + impactos), bvh.js (three-mesh-bvh)
  effects/    postfx.js (bloom, DoF, vinheta, grão, tone mapping), particles.js, captions.js (legendas)
  environments/ environment.js (chão, céu, névoa, árvores), lighting.js (presets)
  audio/      synth.js (Tone.js), procedural.mjs, mix.mjs (FFmpeg), analyze.mjs,
              voice.mjs (voz-guia espeak-ng), preview.js (Howler)
  validation/ schemas.mjs (zod), checks.mjs (verificações), autocorrect.mjs
  utils/      random.js (semente), math.js, browser-task.mjs
  roblox/     import-rbx.mjs, to-three.js, materials.js, blocky-kit.js, assets.js, catalog.mjs (ver ROBLOX_INTEGRACAO.md)
scenes/
  tests/      cenas dos testes A–J e tasks.js (checagens no navegador)
  demo/       cena + configuração da demonstração de autocorreção
pipeline/     base anterior (Chromium headless, servidor local, FFmpeg): mantida e reutilizada
scripts/      setup.sh, studio-tests.mjs, autocorrecao-demo.mjs, test-tools.mjs, check-env.mjs
output/       renders e relatórios (fora do git)
```

## Contrato de uma cena

```js
// scenes/minha-cena.js — roda no Chromium
export default async function createScene({ THREE, renderer, width, height, fps, params }) {
  // ...montar cenário, personagens, câmera
  return {
    scene, camera, duration: 8,
    update(t, dt) { /* posicionar tudo para o tempo t */ },
    render(dt) { /* opcional: pós-processamento */ },
    cues: [{ t: 2.43, sound: 'impacto', gain: 1 }],          // sons
    probes(t) { return { feet: {...}, onScreen: {...} }; },  // medições para verificação
  };
}
```

Imports disponíveis na cena: `three`, `three/addons/...`, `gsap`, `postprocessing`, `camera-controls`, `@pixiv/three-vrm`, `three-mesh-bvh`, `@dimforge/rapier3d-compat`, `lil-gui`, `zod`, `@mediapipe/tasks-vision` e `@studio/...` (= `src/`). Globais: `Howl`, `Tone`, `Stats`.

## Produzir um vídeo

```js
import { produce } from './src/rendering/produce.mjs';
await produce({
  spec: { entry: '/scenes/minha-cena.js', seconds: 8, fps: 30, width: 1080, height: 1920 },
  outDir: 'output/minha-cena',
  soundMap: { impacto: 'assets/sounds/impacts/proc-impacto.wav' },
  beds: [{ file: 'assets/sounds/music/proc-trilha.wav', gain: 0.4, loop: true }],
  narration: { file: 'assets/sounds/voices/narracao.wav', at: 0.5, duck: true },
});
// -> output/minha-cena/final.mp4, folha-de-contato.jpg, relatorio.json
```

## Comandos

| Comando | O que faz |
|---|---|
| `npm run setup` | Prepara o ambiente (só instala o que falta) |
| `npm run test:studio` | Testes A–L (12 testes, ~7 min) |
| `npm run test:roblox` | Testes da integração Roblox (R1–R5) |
| `npm run demo:autocorrecao` | Demonstração do ciclo de autocorreção |
| `npm run sounds` | Gera de novo a biblioteca de sons procedurais |
| `npm run test:tools` / `npm run check` | Testes da base anterior (continuam válidos) |
