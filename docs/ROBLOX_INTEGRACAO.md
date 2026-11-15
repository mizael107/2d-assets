# Integração com recursos Roblox e estilo "blocos"

## Resumo
- **Lê** arquivos do Roblox (`.rbxm`, `.rbxl`, `.rbxmx`, `.rbxlx`), **converte** para GLB e **monta** cenários no Three.js a partir de um catálogo com licença e dimensões de cada item.
- **Kit próprio "blocos"** com 12 recursos: personagem com esqueleto e 4 animações, casa, prédio, árvores, carro, rua, poste, banco, cerca, mesa e chão com pinos. Criado pelo estúdio, livre para uso.
- **Testes:** 5/5 aprovados (`npm run test:roblox`).

> Não consegui abrir os sites do Roblox (create.roblox.com, apis.roblox.com, assetdelivery.roblox.com): a rede do ambiente os bloqueia. As regras de obtenção e licença abaixo vêm do que eu conheço e **não foram verificadas ao vivo**. Confira nos termos atuais antes de publicar.

## Ferramentas

| Ferramenta | Situação | Por quê |
|---|---|---|
| **rbxm-parser** 1.1.4 (npm, MIT) | **Instalado** | Lê e grava o formato binário (`.rbxm`; o `.rbxl` usa o mesmo formato) em JavaScript, sem Rust |
| **fast-xml-parser** 5.12.1 (npm, MIT) | **Instalado** | Lê os formatos XML (`.rbxmx`/`.rbxlx`) |
| rbx-reader (npm) | Não instalado | Licença AGPL (obrigaria o estúdio a ser código aberto sob a mesma licença) e depende do jsdom, que é pesado; o rbxm-parser cobre a mesma função |
| Rojo | Não instalado | Sincroniza código e arquivos com o Roblox Studio para **criar jogos**. Não converte para formatos 3D nem ajuda a renderizar. Se um dia for publicar no Roblox: `cargo install rojo` (o Rust já está no ambiente) |
| roblox-ts | Não instalado | Compila TypeScript para Luau (scripts de jogos Roblox). Sem uso em render de vídeo |
| rbx-dom (Rust) | Não instalado | São as bibliotecas Rust por trás do Rojo e do Lune; em JavaScript, o rbxm-parser faz o equivalente. O **Lune** (`cargo install lune`) é a alternativa caso o rbxm-parser falhe com algum arquivo real |
| Plugin oficial Roblox para Blender | Não instalado | Ele **envia** malhas do Blender para o Roblox (o sentido oposto). Além disso, o Blender não está instalado e a conversão FBX → GLB já é feita pelo Three.js |

## Formatos

| Formato | Ler | Converter p/ GLB | Observação |
|---|---|---|---|
| `.rbxm` (modelo binário) | ✓ testado | ✓ testado | rbxm-parser |
| `.rbxl` (mapa binário) | ✓ (mesmo formato) | ✓ | **Não testado com arquivo real** |
| `.rbxmx` (modelo XML) | ✓ (mesmo leitor do `.rbxlx`) | ✓ | |
| `.rbxlx` (mapa XML) | ✓ testado | ✓ testado | |
| `.glb` / `.gltf` | ✓ testado | — | Formato principal do estúdio |
| `.obj` (+ `.mtl`) | ✓ testado | ✓ testado | Sem animação |
| `.fbx` | ✓ (FBXLoader) | ✓ | **Não testado**: não há FBX no projeto |

Converter qualquer um deles: `node scripts/converter-para-glb.mjs <arquivo> <saida.glb>`.

## O que a conversão de arquivos Roblox faz (e não faz)
**Converte:**
- peças geométricas: Part (bloco, esfera, cilindro), WedgePart, CornerWedgePart, TrussPart, SpawnLocation e Seat;
- posição e rotação (CFrame), tamanho, cor, material, transparência e reflexo;
- hierarquia (Model/Folder);
- 1 stud = 0,28 m.

Os materiais do Roblox viram materiais próprios, com texturas desenhadas por código: pinos, madeira, tijolo, grama, concreto, chapa, tecido e piso. **Não são as texturas oficiais.** O Neon vira emissivo e o Glass vira transparente.

**Não converte (limitações reais dos mapas Roblox):**
1. **MeshPart e Union (CSG):** a malha não está dentro do arquivo, só um ID na nuvem (`rbxassetid://...`). Eles viram um **bloco magenta** e são listados como dependência. Para resolver, coloque o arquivo da malha no projeto e informe em `meshMap`.
2. **Terreno (Terrain):** os voxels de terreno não são convertidos.
3. **Texturas, decals, sons e animações:** vêm só como IDs (listados em `dependencias`). O arquivo precisa ser obtido à parte.
4. **Scripts e comportamento:** nada de Luau é executado. Portas, NPCs e veículos ficam parados; o movimento é feito nas cenas do estúdio.
5. **Iluminação, céu e atmosfera** do mapa original não são importados. Use `applyLighting` e `createSky`.
6. **SurfaceAppearance (PBR)** e materiais personalizados (MaterialVariant) não são lidos.
7. **Mapas grandes:** milhares de peças pesam no render sem GPU. `buildRobloxModel` junta peças por material (36 → 15 malhas na praça de teste) e `optimizeStatic` faz o mesmo no cenário inteiro (581 → 51 na cidade).
8. O cálculo de dimensões direto do `.rbxm` é aproximado (ignora rotação). O catálogo usa a medida real do GLB.

## Como obter recursos legalmente
1. **Roblox Creator Store** (create.roblox.com/store), com Models, Meshes, Images/Decals, Audio, Plugins e Fonts:
   - não há download direto pelo site; o caminho oficial exige **conta Roblox** e o **Roblox Studio** (Windows/macOS, não roda neste ambiente Linux);
   - no Studio, insira o item pela Toolbox e salve com *Save to File* (`.rbxm`/`.rbxmx`) ou exporte a geometria (*Export Selection* em `.obj`);
   - mapas inteiros só vêm de experiências **com cópia liberada** pelo autor ("uncopylocked").
2. **Licença.** Pelos termos do Roblox, o que vem da Creator Store pode ser usado **dentro de experiências Roblox**. Usar fora do Roblox (renderizar no Three.js e publicar o vídeo) **não está garantido**: peça autorização por escrito ao criador e guarde em `assets/roblox/_fontes/`. Use a licença `autorizado-pelo-autor` no catálogo.
3. **Áudios** da biblioteca do Roblox (incluindo os de parceiros licenciados) são liberados para uso no Roblox; não use em vídeos externos.
4. **Marca Roblox:** não use logotipo, nome do Roblox no título do vídeo como se fosse oficial, nem os avatares e personagens oficiais. O kit do estúdio segue uma estética genérica de blocos, sem copiar modelos oficiais.
5. **Vídeos gravados dentro do Roblox** (captura de tela do jogo) seguem outra regra: o Roblox tem diretrizes próprias para criadores de vídeo. Esse caminho é diferente de extrair os modelos.
6. **Alternativas sem risco e no mesmo estilo:**
   - o kit do estúdio;
   - bibliotecas CC0 de estilo blocado/low-poly (ex.: kits da Kenney, kenney.nl, todos CC0, que a rede bloqueia; traga pelo Google Drive);
   - os conectores 3D Valley, three.ws e 3DAssets.dev (CC0), que entram no catálogo com `origem.tipo = "externo"`.

## Estrutura e catálogo
```
assets/roblox/
  maps/ houses/ cities/ forests/ interiors/ streets/ characters/ vehicles/ props/
  animations/ textures/ sounds/ materials/
  _fontes/          arquivos originais (.rbxm/.rbxlx), JSONs intermediários, comprovantes de licença
  catalogo.json     id, nome, categoria, arquivo, formato, origem, licença, dimensões (m),
                    animações, dependências, tags, tamanho do arquivo
```
O schema (zod) e as funções ficam em `src/roblox/catalog.mjs`:
- `upsert` mede e adiciona um item;
- `checkCatalog` aponta arquivo faltando, licença insegura e dependência pendente.

Licenças aceitas: `proprio`, `CC0`, `CC-BY-4.0`, `autorizado-pelo-autor`, `roblox-creator-store` (sinalizada) e `desconhecida` (sinalizada).

## Usar nas animações
```js
import { loadCatalog, buildLayout, instantiate, optimizeStatic } from '@studio/roblox/assets.js';
const cat = await loadCatalog();
await buildLayout(scene, cat, [
  { id: 'chao-pinos', grid: { from: [-60, -0.2, -60], to: [60, -0.2, 60], step: 40 } }, // topo em y=0
  { id: 'rua-blocos', grid: { from: [0, 0, -42], to: [0, 0, 42], step: 12 } },
  { id: 'casa-blocos', pos: [-10, 0, 0], rotY: Math.PI / 2 },
  { id: 'arvore-blocos', grid: { from: [-17, 0, -30], to: [-17, 0, 18], step: 6, jitter: 1.2 } },
  { id: 'praca-teste-rbxlx', pos: [24, 0, -4] },              // mapa importado do Roblox
]);
optimizeStatic(scene);                                         // antes de pôr personagens
const heroi = await instantiate(cat.itens.find((e) => e.id === 'personagem-blocos'), { position: [-4, 0.18, -10] });
const mixer = new THREE.AnimationMixer(heroi); mixer.clipAction(heroi.userData.asset.animations[0]).play();
```
Exemplo completo: `scenes/roblox/demo-cidade.js` (cidade + personagem + carro + câmera aérea descendo até acompanhar). Para revisar um item: cena `scenes/roblox/vitrine.js` com `params: { id }`.

Itens que ficam no chão (pisos e bases) precisam de `y = -espessura`. A primeira versão da demo escondeu a rua sob o chão quadriculado; a vista de cima de diagnóstico (`params.vistaDeCima`) foi o que revelou o problema.

## Comandos
| Comando | O que faz |
|---|---|
| `npm run roblox:arquivos-teste` | Recria os arquivos `.rbxm`/`.rbxlx` de teste (autoria do estúdio) |
| `npm run roblox:biblioteca` | Exporta o kit, converte os arquivos Roblox, gera o OBJ e grava o catálogo |
| `npm run test:roblox` | Testes R1–R5 |
| `node scripts/converter-para-glb.mjs a b.glb` | Converte um arquivo para GLB |

## Resultados dos testes (R1–R5: 5/5)
| Teste | Medido |
|---|---|
| R1 `.rbxm` binário | 14 instâncias, 13 peças, 2 cunhas; telhado girado 180° com material WoodPlanks; MeshPart marcado como dependência |
| R2 `.rbxlx` XML | 46 instâncias, 36 peças; cilindro de vidro com 30% de transparência; Neon |
| R3 Conversão e recarga | GLB, OBJ e JSON recarregados no Three.js com **as mesmas dimensões do catálogo** (ex.: praça com 33,6 m = 120 studs); personagem com 4 animações |
| R4 Catálogo | 15 itens, todos com licença, origem e dimensões; única pendência: a malha de teste propositalmente ausente |
| R5 Cenário | Imagem 1080×1920; 581 malhas → 51 após otimizar; vídeo de 5 s com passos sincronizados (0 ms); render em 38 s |

**Arquivo autorizado da Creator Store:** nenhum disponível, então nenhum foi testado. Os testes usaram arquivos Roblox criados pelo próprio estúdio (`assets/roblox/_fontes/`), gravados com o mesmo formato que o Roblox Studio usa. Um arquivo real, sobretudo um `.rbxl` grande com MeshParts e terreno, pode trazer casos que os de teste não cobrem.
