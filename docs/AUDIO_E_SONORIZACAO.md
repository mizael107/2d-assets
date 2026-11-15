# Áudio e sonorização

## Fluxo
1. A cena declara **cues**: `{ t, sound, gain }`. Os passos vêm da fase da caminhada (`footstepTimes`) e os impactos vêm da física, com força.
2. `mixScene()` (`src/audio/mix.mjs`) monta tudo no FFmpeg:
   - trilhas de fundo em loop com fade;
   - narração com **ducking** (a música abaixa sob a voz);
   - cues no tempo exato;
   - filtros (passa-baixa, passa-alta), reverb (`aecho`), pan e volume;
   - limitador e **normalização em duas passadas** para −14 LUFS (padrão de redes sociais).
3. `muxVideoAudio()` junta o áudio ao vídeo.
4. `checkAudioSync()` mede onde cada som realmente caiu, por correlação de envelope, e aponta atrasos.

## Biblioteca de sons (`assets/sounds/`)
Gerados com Tone.js (`npm run sounds`), todos próprios e livres de licença de terceiros:

| Categoria | Arquivo | Uso |
|---|---|---|
| footsteps | proc-passo.wav (0,35 s) | Passos |
| impacts | proc-impacto.wav (1,2 s), proc-whoosh.wav, proc-porta.wav | Quedas, golpes, transições, porta |
| weather | proc-vento.wav (6 s, loop), proc-chuva.wav (6 s, loop) | Clima |
| ambience | proc-fogo.wav (6 s, loop), proc-agua.wav | Fogo, água, bolhas |
| animals | proc-passaro.wav | Pássaro (simples) |
| music | proc-trilha.wav (8 s, loop) | Trilha provisória (pad + sino) |

São sons **estilizados**. Servem para animatic e para estilos cartunescos, mas não substituem gravações reais em cenas realistas, especialmente animais e vozes.

## Voz e narração
- **Voz-guia:** `guideVoice(texto, saída)` usa espeak-ng em pt-BR, offline. É robótica: serve para cronometrar falas e testar a sincronização labial, **não para o vídeo final**.
- **Voz final:** gravação própria ou um serviço de voz (o conector ElevenLabs precisa ser reconectado com mais permissões; o Audo tem usos gratuitos diários). O arquivo vai para `assets/sounds/voices/`.

## Pré-visualização no navegador
`src/audio/preview.js` (Howler) toca a trilha e os cues junto com a cena em tempo real. O teste G confirmou carregar, tocar e terminar no Chromium (contexto de áudio "running").

## Bibliotecas externas: licenças
Não consegui abrir os sites para confirmar os termos atuais, porque a rede do ambiente os bloqueia. As regras abaixo são as conhecidas; confira na página de cada som antes de publicar.

| Fonte | Licença | Pode usar comercialmente? | Atribuição | Restrições |
|---|---|---|---|---|
| **Freesound** (freesound.org) | **Cada som tem a sua**: CC0, CC BY 4.0 ou CC BY-NC 4.0 (e versões 3.0 antigas) | CC0 e CC BY sim; **CC BY-NC não** | CC BY exige crédito ao autor | API exige chave; baixar o arquivo original pela API exige login OAuth2 |
| **Pixabay** (pixabay.com/sound-effects) | Pixabay Content License | Sim | Não exigida | Não revender ou redistribuir o som sozinho; algumas músicas podem gerar reivindicação de Content ID no YouTube |
| Conectores: Soundza (Sons) | Própria | Sim | Não exigida | Não redistribuir o som sozinho nem usar para treinar IA |
| Conectores: SFXMint (Sonoro) | CC0 (biblioteca) | Sim | Não | São sons gerados por IA (declarar em lojas como a Steam) |
| Conectores: SFX Engine | Termos do serviço | Ver termos | — | Gasta créditos (havia 9) |

Registre cada arquivo externo em `assets/sounds/LICENCAS.md`: origem, autor, licença e link da página.

## Resultados do teste G
- Howler: carregou, tocou e terminou, com duração de 1,2 s.
- Voz-guia de 4,98 s, com 73 quadros de boca aberta.
- Filtro, reverb e volume aplicados.
- Mixagem final em −14,4 LUFS e pico de −1,0 dBTP.
- Passos, impacto e pássaro com erro de sincronia de **0 ms**.

## Limitações
- O reverb é um eco multitap (`aecho`), não uma convolução de sala real. Para salas realistas, use o filtro `afir` do FFmpeg com uma resposta de impulso (arquivo .wav externo).
- O ducking é por compressor (sidechain), não por automação desenhada à mão.
