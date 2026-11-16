# Física e efeitos visuais

## Física (Rapier, motor principal)
`src/physics/world.js`:
```js
const phys = await createPhysicsWorld({ gravity: -9.81 });
phys.addGround();
phys.addBody(caixa, { shape: { type: 'box', size: [0.7, 0.7, 0.7] }, restitution: 0, friction: 1 });
phys.bake(duração);                 // simula tudo antes (passos fixos de 1/120 s)
const impactos = phys.impacts(2);   // [{ t, a, b, speed(Δv) }] -> cues de som
// no update(t): phys.apply(t)
```
- Formas disponíveis: caixa, esfera e cápsula. Corpos podem ser dinâmicos, fixos ou cinemáticos, com velocidade inicial (empurrões).
- **CCD ligado por padrão** nos corpos dinâmicos, para objetos rápidos não atravessarem o chão.
- A força do impacto é a mudança brusca de velocidade (Δv). Ela define o volume do som e filtra toques mínimos.
- **Por que Rapier e não cannon-es:** veja [BIBLIOTECAS_E_FERRAMENTAS.md](BIBLIOTECAS_E_FERRAMENTAS.md).

Lições do teste J:
- A 28 m/s, até 12% de restituição faz uma caixa quicar 60 cm. Objetos pesados devem usar `restitution: 0`.
- A inclinação inicial transforma o quique em deslocamento lateral.

**three-mesh-bvh** (`src/physics/bvh.js`): `surfaceHeight(terreno, x, z)` dá a altura do chão em terreno irregular. No teste E, com 180 mil triângulos, o raycast caiu de 7,8 ms para 0,085 ms (cerca de 90 vezes mais rápido), com a mesma resposta.

## Efeitos visuais
### Pós-processamento (`src/effects/postfx.js`)
```js
const fx = createPostFX(renderer, scene, camera, {
  bloom: { intensity: 0.8, threshold: 0.75 }, dof: { focus: 4, range: 2.5, bokeh: 2 },
  vignette: { offset: 0.3, darkness: 0.55 }, grain: 0.05, chromatic: 0.0015,
});
// render(dt) { fx.render(dt); }  // e fx.setFocus(distância) a cada quadro
```
Inclui bloom, profundidade de campo, vinheta, grão, aberração cromática, **tone mapping ACES** (aplicado no fim da cadeia) e antialiasing SMAA.

### Partículas (`src/effects/particles.js`)
Presets disponíveis: `poeira`, `fumaca`, `chuva`, `neve`, `faiscas`, `brasas` e `magia`. São determinísticas, com posição calculada a partir de `t`, e qualquer parâmetro do preset pode ser trocado:
```js
const p = createParticles('faiscas', { origin: [x, 0.1, z], start: tImpacto, viewportHeight: height });
scene.add(p.points); // update(t): p.update(t)
```
O `start` faz explosões (`burst`) começarem num instante exato, como as faíscas no impacto da física.

### Iluminação e ambiente
- `applyLighting(scene, preset, { keyPos })` (`src/environments/lighting.js`): presets `porDoSol`, `dia`, `noite`, `interiorQuente` e `laboratorio`, cada um com luz principal com sombra, preenchimento e contorno. `keyPos` muda a direção do sol: no teste J, trazer o sol para a frente iluminou o rosto que estava em contraluz.
- `flicker(luz, t)` faz uma luz tremular como fogo ou vela.
- `createSky` (céu em degradê que se ajusta ao alcance da câmera), `addFog` (névoa), `createGround` e `scatterTrees` (árvores low-poly com semente).

## Resultados
- **Teste E:**
  - caixas assentam em y = 0,4 e 0,3 (meio do tamanho);
  - a bola empurrou a caixa;
  - 6 contatos detectados, com tempo e força;
  - nada atravessou o chão.
- **Teste F:**
  - o pós-processamento muda 24,6% dos pixels;
  - as partículas se movem entre t = 0 e t = 1 s;
  - nenhum quadro estourado.

## Limitações
- Sem reflexos em tempo real (SSR) nem iluminação global. Superfícies metálicas usam o ambiente do céu.
- Com WebGL por software, sombras de alta resolução e DoF pesam no tempo de render.
- Névoa volumétrica (raios de luz como na igreja da referência) não foi implementada: hoje há névoa comum e partículas de poeira.
