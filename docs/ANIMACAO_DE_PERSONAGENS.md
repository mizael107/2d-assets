# Animação de personagens

## Personagem do estúdio (pronto para uso)
`src/characters/humanoid.js` cria um humanoide com **esqueleto real** (SkinnedMesh, 17 ossos) no estilo da referência: cabeça esférica, membros em cápsula, olhos de ponto, sobrancelhas grossas e boca. Cores, cabelo e escala são parâmetros:

```js
const ch = createHumanoid({ name: 'Caio', skin: '#f1a056', shirt: '#d8c7a6', pants: '#4a3424' });
scene.add(ch.root);
```

Ele também foi exportado como **`assets/characters/boneco-base.glb`** (1,2 MB, 8 animações) e **`boneco-base.otimizado.glb`** (275 KB, otimizado pelo glTF-Transform). Os dois abrem no Blender, no Unity ou em qualquer visualizador glTF.

## Movimentos (`src/animation/motions.js`)
| Movimento | Função | Detalhe |
|---|---|---|
| Andar | `motions.walk()` | Ciclo de 1,1 s; o quadril baixa para o pé de apoio tocar o chão |
| Correr | `motions.run()` | Ciclo de 0,62 s, inclinação do tronco, braços amplos |
| Pular | `motions.jump()` | Agacha, impulsiona, voa 45 cm, aterrissa e amortece |
| Cair | `motions.fall()` | Tropeço para a frente, termina deitado |
| Acenar | `motions.wave()` | Braço direito |
| Pânico | `motions.panic()` | Mãos na cabeça com tremor |
| Feitiço | `motions.cast()` | Braço esticado |
| Parado | `motions.idle()` | Respiração e micro movimento de cabeça |

- **Transições:** `createMotionPlayer(ch, [{clip, start, end, fade}])` faz crossfade entre clipes, posicionado exatamente no tempo `t`.
- **Pés sem deslizar:** `speedFor('walk')` devolve a velocidade que casa com a passada (1,02 m/s andando, 3,0 m/s correndo).
- **Som de passos:** `footstepTimes('walk', início, fim)` dá o instante de cada pisada, já usado como cue.

## Rosto (`src/characters/face.js`)
- **Piscadas:** intervalos naturais aleatórios com semente (2 a 5 s, às vezes dupla).
- **Expressões:** `neutro`, `feliz`, `bravo`, `surpreso`, `triste`, `concentrado`, agendadas com `setExpression(nome, t)`.
- **Sincronização labial:** `envelope(narração.wav, fps)` (`src/audio/analyze.mjs`) vira a abertura da boca quadro a quadro. É sincronização por **volume**, não por fonema: a boca abre e fecha com a fala, mas não forma "o", "m" e "f" distintos. Para fonemas é preciso um alinhador de fonemas (ex.: Rhubarb Lip Sync, não instalado) ou visemas vindos do serviço de voz.
- Em personagens **VRM**, o mesmo controlador usa `expressionManager` (`blink`, `happy`, `angry`, `aa`…).

## Personagens e animações externos
`src/characters/loader.js`:
- `loadCharacter(url)`: GLB/GLTF/**VRM** (plugin three-vrm registrado).
- `loadMixamoClip(url)`: animação FBX do Mixamo com os ossos renomeados para o humanoide do estúdio (`MIXAMO_TO_STUDIO`).
- `retargetMixamoToVRM(url, vrm)`: retarget Mixamo para VRM considerando a pose de repouso.

### Mixamo: o que exige ação manual
- Não há API pública. É preciso entrar em mixamo.com com uma **conta Adobe**, escolher a animação e baixar em **FBX**: "Without Skin" para só a animação, "With Skin" para o personagem.
- Coloque o arquivo em `assets/animations/` e carregue com `loadMixamoClip`.
- Pelos termos da Adobe, as animações podem ser usadas em projetos (inclusive comerciais), mas não redistribuídas como arquivos soltos. Confira os termos atuais no site.
- **Não testado com arquivo real:** não há FBX do Mixamo no projeto, e o site está bloqueado na rede do ambiente.

### Outras fontes de movimento
- **PINOC/Viggle (conector):** biblioteca de movimentos grátis com rig **Mixamo** (GLB/FBX), compatível com `loadMixamoClip`.
- **three.ws / 3D Valley (conectores):** personagens rigados e clipes CC0.
- **Ludo AI / Hyper3D Rodin (conectores):** geram rig e animação (pagos; Ludo precisa de chave de API).

Os arquivos desses serviços precisam ser baixados para `assets/`. Pela rede do ambiente isso exige liberar o domínio de download, ou passar pelo Google Drive, que funciona.

## Resultados do teste D
- Pés nunca atravessam o chão (pior caso: −1,5 cm, dentro da tolerância de 3 cm).
- No pulo, os dois pés sobem 45 cm.
- O GLB exportado com 8 animações foi otimizado de 1.235.944 para 281.624 bytes, recarregado com esqueleto único de 17 ossos, e o clipe "andar" move a coxa.
- O plugin three-vrm foi carregado (18 expressões e 55 ossos humanoides suportados).

## Limitações
- O humanoide procedural usa **skinning rígido** (cada peça presa a um osso). As juntas não deformam suavemente; para isso é preciso um modelo com pesos suaves (Blender ou modelo externo).
- Mãos sem dedos.
- VRM sem teste real: falta um arquivo `.vrm` em `assets/characters/`.
- A física ainda não interage com o personagem: não há colisor no corpo nem ragdoll. A queda é animada, não simulada.
