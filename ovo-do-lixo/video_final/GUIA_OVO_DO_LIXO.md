# Guia: como foi feito "O Ovo do Lixo"

Receita completa do vídeo (roteiro, ganchos, estilo, som, legendas, render e as correções que deixaram ele bom).
Serve de modelo para os próximos vídeos.

**Ficha técnica:** vertical 720x1280 · 24 fps · 2:53 · estilo Roblox em 3D (three.js) · narração em português ·
legenda amarela palavra por palavra · ~4.160 quadros.

---

## 1. Roteiro: a estrutura que prende

Nove atos, cada um com uma função. A narração é em primeira pessoa (o menino conta a própria história).

| Ato | Tempo | Função | Frase-chave |
|---|---|---|---|
| 1. Gancho | 0–23s | Mundo + herói azarão + número absurdo | "347 lutas... 347 derrotas." |
| 2. Regras | 23–41s | Explica o mundo em 3 frases | "Quanto mais brilha o ovo, mais forte é o poder" |
| 3. A mais fraca | 41–60s | Humilhação engraçada, em escada | "Poder: dormir." / "perdeu pra uma minhoca" |
| 4. Rival | 60–73s | Vilão com apelido cruel | "o menino do lixo" |
| 5. Treino | 73–91s | Persistência + piada que se repete | "...dormindo." (3 vezes) |
| 6. Evento | 91–101s | Prêmio e confronto marcado | "eu contra o Kaio" |
| 7. Clímax | 101–132s | Fundo do poço → virada mágica | "ela abriu os olhos" |
| 8. Vitória | 132–161s | Payoff + reação do rival + frase de dono | "O Ovo do Trovão era meu." |
| 9. Final | 161–173s | Final em loop que chama o próximo vídeo | "Pequeno. Rachado. E cinza. Dessa vez... ninguém riu." |

### Os ganchos que funcionaram
1. **Primeira frase estabelece um mundo diferente**: "Nessa cidade, galinha não é bicho de estimação. É lutadora."
2. **Contraste rico x pobre**: todo mundo tem ovo dourado/roxo, "o meu eu achei no lixo".
3. **"Ninguém quis. Eu quis."**: frase curta que cria empatia na hora.
4. **Número exagerado e repetido**: 347 derrotas aparece no gancho, no treino e no placar da vitória (348 lutas, 1ª vitória).
5. **Piada em escada (regra de 3)**: dormiu → dormiu também → perdeu pra uma minhoca.
6. **Rival com apelido humilhante**: dá vontade de ver ele perder.
7. **Detalhe plantado cedo e pago no clímax**: a casca cinza grudada na barriga da Penosa é o que brilha e revela a galinha dourada.
8. **Pausas com reticências**: "E por baixo... ela era dourada". O narrador respira e a imagem revela.
9. **Reação do rival na derrota**: Kaio furioso gritando "Eu não acredito que eu perdi pra esse moleque pobre!".
10. **Final que repete o começo**: o novo ovo é igual ao do lixo, mas agora "ninguém riu". Fecha o arco e abre parte 2.

---

## 2. Estilo visual

- **Visual Roblox em 3D**: personagens de bloco (menino de cabelo cacheado e moletom preto, Kaio loiro de moletom vermelho),
  galinhas fofas (modelo Chickensoft) com pintura própria: Penosa amarela com casca cinza, Sombra preta com escamas douradas.
- **Film look**: tom ACES, sombras suaves, luz de chave quente, leve vinheta.
- **Cenário nunca vazio**: arena com arquibancada lotada, bandeirinhas, troféus, grade; casa com quintal, flores, aparelhos de treino;
  rua com lojas e lixeiras. Primeiro plano, meio e fundo sempre cheios.
- **Câmera viva**: todo plano se move (aproxima, gira ou sobe). Cortes a cada 1,5 a 4 segundos.
- **Expressões contam a história**: dormindo (olhos fechados + Zzz), triste, surpresa, poder (olhos de fogo),
  Kaio com sorriso de deboche e depois furioso (sobrancelha em V, dentes cerrados, bochecha vermelha, fumaça na cabeça).
- **Efeitos em todo momento importante**: faíscas, raios, bola de energia roxa, trovão, poeira, aura dourada, confete,
  estrelinhas de tontura, chuva, flash de tela, tremor de câmera, câmera lenta no impacto.
- **Textos na tela** (além da legenda): "347 LUTAS / 347 DERROTAS", "LUTA 1, 2, 3", "PODER: DORMIR", "SOMBRA NUNCA PERDEU",
  "NA CHUVA / NO SOL / DE MADRUGADA", contador de derrotas, placar "1 – 347", balão "MENINO DO LIXO!".
- **A imagem explica a fala**: tudo que o narrador fala aparece no mesmo instante (falou "esteira", mostra a esteira).

---

## 3. Som

| Camada | O que foi usado |
|---|---|
| Narração | ElevenLabs, voz **Brian** (`nPczCjzI2devNBz1zQrb`), modelo `eleven_v4`, 1 take por parte, 9 partes (n1..n9) |
| Fala do Kaio | ElevenLabs, voz **Dagozin!** (`3gem3OI2VZ4v8d4ra5sM`), `eleven_v4`, com `[shouting, furious]` no texto |
| Efeitos | Soundza (biblioteca grátis + gerados com IA): soco, raio, fogo, trovão, ronco, passos, ovo rachando, moedas, confete etc. |
| Música | 3 fases: tema leve (história) → música de batalha (n7–n8) → piano (final) |
| Ambiente | Por lugar: rua, passarinhos, chuva, noite, plateia |

**Mixagem** (`audio/mix_full.py`):
- Narração tratada antes: compressor + loudnorm em `-15 LUFS` (as partes baixas sobem, os picos não estouram).
- **Ducking**: música, ambiente e efeitos abaixam 50% sempre que alguém está falando.
- Cada ação tem som amarrado ao quadro exato (na luta, os tempos seguem a câmera lenta).
- Resultado: **-14,7 LUFS**, sem estourar (bom para TikTok).

---

## 4. Legendas

- **Uma palavra por vez**, em CAIXA ALTA, amarelo forte, contorno preto grosso, efeito de "pop" (aumenta e volta).
- Posição: um pouco abaixo do meio da tela.
- **Fala de personagem em vermelho** (Kaio), para separar da narração.
- Tempo de cada palavra: calculado pelas pausas da própria narração (silêncios) + peso de cada palavra (sílabas).
- Arquivo: `audio/legendas.py` → `audio/legendas.ass` (queimada no vídeo com ffmpeg/libass).

---

## 5. Como foi produzido (passo a passo)

1. **Roteiro** aprovado (`roteiro/ovo_do_lixo.md`) com cenas e efeitos de cada frase.
2. **Personagens e poses** (`r6Kit.js`, `penosa.js`, `chickenRig.js`) e **cenários** (`scenes.js`).
3. **Storyboard**: uma imagem por cena (`storyboard.cjs`) para aprovar enquadramento.
4. **Narração** gerada e cortada por parte (`audio/narr/`).
5. **Linha do tempo** (`timeline.cjs`): cada parte da narração abre uma seção; cada plano tem duração em segundos.
6. **Animação**: `anim_video.cjs` (planos da história) e `fight_video.cjs` (a luta, com câmera lenta real:
   os quadros são renderizados nos tempos exatos, não esticados).
7. **Som** (`audio/mix_full.py`) e **legendas** (`audio/legendas.py`).
8. **Prévia** em 360x640, 1 a cada 2 quadros (`draft_render.sh`) → revisão → correções.
9. **Final** em 720x1280, todos os quadros, 4 processos em paralelo (`final_render.sh`) → `assemble.cjs` junta
   → ffmpeg coloca áudio e legenda.

Tempo de render (CPU, 4 núcleos): prévia ~1h30, final ~4h30.

---

## 6. As correções que fizeram a diferença

| Problema que apareceu | Causa | Regra que ficou |
|---|---|---|
| 2 protagonistas, 2 Penosas, tela preta, câmera dentro da parede, arena com parede de casa | Objetos de uma cena ficavam na cena seguinte | **Cada plano começa numa página nova, do zero** |
| Câmera muito perto em vários planos | Enquadramentos fechados demais | **Personagem principal de corpo inteiro**; close só em reação curta |
| Sombra quase não aparecia ("preta e dourada") | Câmera colada nela | Quando a fala descreve o personagem, mostrar ele inteiro |
| Galinha preta andando de costas | Andava para trás em relação ao corpo | Conferir direção do andar x direção do corpo |
| "Abriu os olhos" e aparecia "outra galinha" | Cara de fogo entrava antes da hora | Transformação só aparece quando a narração fala dela |
| Poeira do trovão escondia a revelação | Nuvem durava demais | Efeito não pode tapar o momento principal |
| "Levantou peso" sem peso | Haltere na altura da câmera parecia fundo | Objeto da ação precisa estar visível e na mão/cabeça |
| Penosa flutuando no final | Posta no ar sem apoio | Todo personagem apoiado (chão, colo, mão) |
| Brilho estourado no troféu | Luz forte colada no modelo | Brilho pequeno; luz fraca perto do personagem |
| Som de guitarra no "347 derrotas" | Som errado para o clima | Som de fracasso = "aaah" triste da plateia |
| Kaio aparecia bravo antes do narrador falar dele | Ordem dos planos errada | Conferir fala x imagem no tempo exato |
| Narração baixa | Voz com picos e música por cima | Compressor + loudnorm na voz + ducking |
| Render parava sozinho | A máquina desliga quando a conversa fica parada | Acompanhar o render até o fim |

---

## 7. Checklist para o próximo vídeo

- [ ] Primeira frase cria um mundo diferente; nos primeiros 15s já tem azarão + número absurdo.
- [ ] Regras do mundo em no máximo 3 frases.
- [ ] Piada que se repete 3 vezes.
- [ ] Rival com apelido e reação forte na derrota (com fala própria).
- [ ] Detalhe plantado no começo e pago no clímax.
- [ ] Final que lembra o começo e deixa gancho para parte 2.
- [ ] Toda fala aparece na imagem no mesmo instante.
- [ ] Câmera em movimento, cortes de 1,5 a 4s, personagens de corpo inteiro.
- [ ] Cada plano renderizado do zero (sem sobras da cena anterior).
- [ ] Narração em -15 LUFS, fundo abaixa quando alguém fala, final em ~-14 LUFS.
- [ ] Legenda amarela palavra por palavra; fala de personagem em outra cor.
- [ ] Prévia em baixa → revisão quadro a quadro → só então a final.

---

## 8. Créditos

- Galinha: **Chickensoft (CC BY 4.0)**. Obrigatório na legenda do post.
- Efeitos sonoros: **soundza.com** (alguns gerados com IA). No TikTok, marcar @soundza_audio.
- Vozes: ElevenLabs (Brian e Dagozin!).
