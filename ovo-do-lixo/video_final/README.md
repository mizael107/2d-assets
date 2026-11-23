# O Ovo do Lixo: projeto do vídeo final

Short vertical (720x1280, 24 fps, 2:53) feito em three.js e renderizado com Playwright.
O **guia completo** de como o vídeo foi feito (roteiro, ganchos, estilo, som, legendas e correções) está em
[`GUIA_OVO_DO_LIXO.md`](GUIA_OVO_DO_LIXO.md).

## O que tem aqui

| Arquivo / pasta | O que é |
|---|---|
| `roteiro/` | Roteiro aprovado, com cenas e efeitos de cada frase |
| `timeline.cjs` | Linha do tempo cortada pela narração (cada parte da narração abre uma seção) |
| `anim_video.cjs` | Todos os planos da história (cada plano numa página nova, do zero) |
| `fight_video.cjs` | A luta final (câmera lenta real) e o grito do Kaio (segmento `K`) |
| `storyboard.cjs` | Ajudantes de cena usados pelos planos |
| `rig.html`, `*.js` | Página three.js: personagens, galinhas, cenários, efeitos |
| `assemble.cjs` | Junta os quadros na ordem da linha do tempo e gera o vídeo mudo |
| `draft_render.sh` | Prévia: 360x640, 1 a cada 2 quadros |
| `final_render.sh` | Final: 720x1280, todos os quadros, 4 processos |
| `audio/mix_full.py` | Trilha: narração + fala do Kaio + música + ambiente + efeitos, com ducking |
| `audio/legendas.py` | Legendas amarelas palavra por palavra (fala do Kaio em vermelho) |
| `audio/narr/` | Narração original (ElevenLabs, voz Brian) e a fala do Kaio (voz Dagozin!) |
| `audio/narr_proc/`, `audio/sfx/` | Narração tratada e efeitos em `.ogg` (os `.wav` originais estão no Google Drive) |
| `ref/`, `assets/` | Modelos 3D e cenários usados |

## O que não está aqui

- `ref/achados/`: figurantes da plateia, vindos do projeto Achados, que é **privado**. Eles estão no backup do Google Drive
  (pasta "O Ovo do Lixo"). Copie a pasta para `ref/achados/` antes de renderizar.
- O vídeo final está em `O_Ovo_do_Lixo_final.mp4` (720x1280; versão leve no Google Drive).

## Como renderizar

```bash
npm install
node -e "const {build}=require('./timeline.cjs');require('fs').writeFileSync('tripo/timeline.json',JSON.stringify(build()))"
./draft_render.sh            # prévia
./final_render.sh            # final (quadros em tripo/animf e tripo/tlf)
node assemble.cjs tripo/animf tripo/tlf tripo/ovo_final.mp4 720 1280
cd audio && python3 mix_full.py && python3 legendas.py && cd ..
ffmpeg -i tripo/seq_ovo_final/video.mp4 -i audio/trilha_completa.wav -vf "ass=audio/legendas.ass" \
  -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest O_Ovo_do_Lixo_final.mp4
```

## Créditos

- Galinha: Chickensoft (CC BY 4.0)
- Efeitos sonoros: soundza.com (alguns gerados com IA). Ver `audio/sfx/SOUNDZA-LICENSE.txt`
- Vozes: ElevenLabs
- Cenários: ver `assets/LICENCAS.md`
