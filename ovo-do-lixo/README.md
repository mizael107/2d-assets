# O Ovo do Lixo — projeto 3D (Three.js)

Short vertical (TikTok) sobre um menino que acha um ovo cinza e rachado no lixo.
Os modelos 3D são gerados no Tripo Studio; aqui ficam as versões otimizadas, os rigs
(esqueletos) feitos por código, as animações e os scripts que renderizam os vídeos.

## Estrutura

| Pasta / arquivo | O que é |
|---|---|
| `chickenRig.js` | Rig das galinhas: esqueleto, cores por elemento (crista, cauda, olhos), efeitos (raio, fogo, gelo, sombra, arco-íris) e ações: `idle`, `walk`, `run`, `scratch` (ciscar), `peck`, `flap`, `sit`, `preen`, `fight`, `sleep`. Inclui `CHICK_PROFILE` para o pintinho. |
| `ref/menino_animado.glb` | Menino com esqueleto profissional do Tripo (78 ossos) e 5 animações: `idle`, `walk`, `run`, `jump`, `hurt`. Carregado por `placeAnimHuman` em `rig.html`. |
| `humanRig.js` | Rig do menino protagonista: `idle`, `walk`, `run`, `point`, `scared`, `celebrate`. |
| `rig.html` | Página Three.js que carrega modelos, arena e expõe funções para os scripts de render. |
| `life.cjs` | Cena da arena com 9 galinhas, cada uma com rotina própria (sem sincronia), briga e susto. |
| `boy_test.cjs`, `duo_test.cjs` | Testes do menino sozinho e do menino com o pintinho. |
| `presets*.cjs`, `chickposes.cjs`, `humanposes.cjs`, `glbshots.cjs` | Folhas de referência (variações, poses, vistas). |
| `ref/` | Modelos otimizados: galinha comum (`chicken_lite.glb`), menino recortado (`menino_main.glb`), folha original do menino otimizada. |
| `entrega/` | Pintinho do protagonista em 40k / 20k / 10k (usa-se o 20k). |
| `ferramentas/` | Scripts de análise/recorte de GLB (componentes, cortes, histogramas). |
| `renders/`, `videos/` | Imagens e vídeos de teste aprovados. |
| `legado/` | Primeira versão procedural (personagens de blocos feitos à mão) — não usada mais. |

Os GLB originais do Tripo (~60 MB cada) ficam no Google Drive e não estão aqui.

## Como rodar

```bash
npm install
node life.cjs 0 336          # renderiza quadros em tripo/life/
ffmpeg -framerate 24 -i tripo/life/f%04d.png -c:v libx264 -pix_fmt yuv420p video.mp4
```

Os scripts usam Playwright + Chromium (WebGL por SwiftShader) e aceitam
`início fim id` para renderizar em blocos paralelos.

## Otimizar um modelo novo do Tripo

```bash
npx gltf-transform weld entrada.glb w.glb
npx gltf-transform simplify w.glb s.glb --ratio 0.04 --error 0.002
npx gltf-transform resize s.glb saida.glb --width 2048 --height 2048
```

## Pendências
- Galinha do mais rico da cidade (modelo a enviar).
- Cor da Penosa (pintinho amarelo atual × cinza do roteiro).
