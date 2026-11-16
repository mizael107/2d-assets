# Câmera cinematográfica

Arquivo: `src/cameras/director.js`. Cada movimento é uma tween GSAP numa timeline pausada. O resultado é determinístico, e cada movimento começa de onde o anterior terminou.

```js
import { createCameraDirector } from '@studio/cameras/director.js';
const dir = createCameraDirector(camera);
dir.shot(0, { pos: [0, 1.6, 8], look: [0, 1, 0], fov: 40 })   // corte seco
   .dollyIn(0, 1.5, { distance: 2 })                            // aproxima 2 m
   .orbit(1.5, 2, { center: [0, 1, 0], degrees: 60 })
   .follow(4, 3, personagem.root, { offset: [1.5, 1.5, 3.4], lookOffset: [0, 1, 0], smooth: 4 })
   .shake(5.2, 0.4, { amp: 0.05 });
// na cena: update(t, dt) { dir.update(t, dt); }
```

| Movimento | Função | Observação |
|---|---|---|
| Corte | `shot(at, {pos, look, fov, roll})` | Troca instantânea de enquadramento |
| Transição | `moveTo(at, dur, {pos, look, fov, roll, ease})` | Blend de posição, alvo e lente |
| Dolly in/out | `dollyIn / dollyOut(at, dur, {distance})` | A câmera anda; a lente não muda |
| Zoom | `zoom(at, dur, {fov})` | Só a lente (FOV); a câmera fica parada |
| Travelling | `travel(at, dur, {by:[x,y,z]})` | Câmera e alvo andam juntos |
| Pan | `pan(at, dur, {degrees})` | Giro horizontal no lugar |
| Tilt | `tilt(at, dur, {degrees})` | Giro vertical no lugar |
| Órbita | `orbit(at, dur, {center, degrees})` | Gira em volta de um ponto |
| Crane / aérea | `crane(at, dur, {height})` e `framing.aerial(alvo)` | Sobe ou desce |
| Acompanhamento | `follow(at, dur, objeto, {offset, lookOffset, smooth})` | Persegue com atraso suave (amortecimento independente de FPS) |
| Tremor | `shake(at, dur, {amp, freq})` | Impactos; determinístico |

Enquadramentos prontos (`dir.framing`): `wide`, `medium`, `closeUp` (rosto), `lowAngle` (câmera baixa heroica), `aerial`. Cada um devolve `{pos, look, fov}` para `shot` ou `moveTo`.

**Profundidade de campo:** `createPostFX(..., { dof: { focus, range, bokeh } })` e, a cada quadro, `fx.setFocus(distância até o rosto)`, como na cena J.

**Câmera interativa** (`src/cameras/preview.js`, camera-controls): serve para descobrir um enquadramento à mão. `snapshot()` devolve `{pos, look, fov}` pronto para colar no diretor.

## Resultados do teste C
O dolly aproximou exatamente 3,000 m, a órbita girou 90,0°, o zoom foi de 40 para 25, o crane subiu a 5,995 m, o acompanhamento manteve o alvo dentro do quadro e o camera-controls chegou ao enquadramento pedido ([4, 3, 4]).

## Limitações
- O `follow` depende dos quadros anteriores (amortecimento). Renderizar só a partir do meio de um trecho de acompanhamento dá um resultado levemente diferente do render completo.
- Não há detecção automática de colisão da câmera com cenário. A verificação `camera-no-chao` pega só a câmera abaixo do chão. A câmera entrar em paredes ou personagens é pego na revisão visual (aconteceu no teste J).
