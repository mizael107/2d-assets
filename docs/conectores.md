# Mapa de conectores: produção de animação 3D

Para cada etapa há um conector **principal**, que entra primeiro, e **alternativas**, usadas quando o principal não tem o recurso, falha ou fica sem créditos.
A montagem final roda sempre no próprio ambiente (Three.js + Chromium/Playwright + FFmpeg).

## 1. Pesquisa e planejamento
| Conector | Papel |
|---|---|
| **Nixly** (principal) | Estilos de vídeo com quadros de referência, kits de roteiro (Roblox, POV) |
| MotionSmith | Guias de engine, receitas de efeitos e pacotes de recursos (fontes, texturas, overlays) |
| Miro | Storyboard e quadro de planejamento das cenas |
| Stewdio | Layout das cenas e composições em arquivo XML editável |
| Context7 | Documentação atual do Three.js e de outras bibliotecas |
| Microsoft Learn / Claude Academy | Consulta técnica pontual |

## 2. Modelos 3D (objetos e cenários)
| Conector | Papel |
|---|---|
| **3D Valley** (principal) | Biblioteca gratuita de modelos (GLB), texturas PBR e HDRIs. Gera modelos sob demanda quando não há pronto |
| 3DAssets.dev (catálogo) / three.ws `search_catalog` | Outros catálogos gratuitos de modelos, personagens e movimentos |
| CGAxis | Busca materiais e modelos de alta qualidade (só busca, não baixa) |
| TO3D | Imagem para 3D |
| Hyper3D Rodin | Texto/imagem para 3D de alta qualidade, PolyGen low-poly |
| 3D AI Studio | Texto/imagem para 3D (plano gratuito: Prism em modo preview) |
| fal.ai | Acesso a vários modelos de geração (imagem, vídeo, 3D) |

## 3. Personagens, esqueleto e animação
| Conector | Papel |
|---|---|
| **Ludo AI** (principal; requer chave de API) | Personagem a partir de imagem, esqueleto, animações prontas ou por texto, sprites direcionais |
| Hyper3D Rodin | Esqueleto e animação de modelos Rodin |
| three.ws 3D Studio | Avatar com esqueleto a partir de texto ou imagem, refinamento por instrução |
| 3D Valley | Animar personagem que já tem esqueleto |
| PINOC/Viggle | Biblioteca de movimentos (formato Mixamo para Three.js), movimento extraído de vídeo |
| GripForge | Kits de jogo, poses e armas (uso pontual) |
| Physics MCP | Cálculos físicos para validar quedas, saltos, colisões e trajetórias |

## 4. Imagens, texturas e conceitos
| Conector | Papel |
|---|---|
| **3D Valley** (principal) | Texturas PBR |
| fal.ai / 3D AI Studio | Imagens de conceito para depois virar 3D |
| Canva / Adobe | Thumbnails, capas, títulos e elementos gráficos |
| Adobe | Remover fundo, vetorizar, ajustar imagens |

## 5. Áudio
| Conector | Papel |
|---|---|
| **ElevenLabs** (principal, voz) | Narração e diálogos, criação de vozes |
| Audo (Tts) | Limpar áudio, ajustar volume (LUFS), mixagem, legendas, voz alternativa |
| **SFX Engine** (principal, efeitos) | Efeitos sonoros e trilhas, links permanentes |
| Sons (Soundza) | Biblioteca gratuita de efeitos sonoros e música em loop |
| Sonoro (SFXMint) | Efeitos de domínio público (CC0) por evento (passos, impactos, interface) |
| Blipsmith | Variações de efeitos (links valem 24 h: baixar na hora) |
| 3D Valley | Efeitos, música e voz alternativos |
| Transcrição (TranscriptLab) | Transcrever áudio e vídeo de referência |

## 6. Vídeo e pós-produção
| Conector | Papel |
|---|---|
| **Ambiente local** (principal) | Render Three.js no Chromium e montagem com FFmpeg |
| Nodaro | Legendas, ajuste de tempo, mixagem, recortes, upscale |
| Audo | Legendas animadas, reenquadramento 9:16, compressão |
| Canva / Adobe | Edição final e versões para redes sociais |
| fal.ai | Clipes gerados por IA para inserts |

## 7. Armazenamento e entrega
| Conector | Papel |
|---|---|
| **Google Drive** (principal) | Guardar vídeos finais e assets |
| Lovable / Macaly Cloud | Página ou portfólio para publicar os vídeos (opcional) |

## Não usar na produção
- **3DAssets.dev (three.ws)**: ferramentas de pagamento, carteira cripto, Robinhood, tokens e domínios. Bloquear.
- **Hive**: gestão de projetos e finanças, sem relação com animação.

## Regras de uso
- Antes de gastar créditos, consultar o saldo e informar o custo.
- Preferir bibliotecas gratuitas antes de gerar algo novo.
- Baixar os arquivos gerados assim que ficarem prontos: links de Ludo (7 dias) e Blipsmith (24 h) expiram.
- O ambiente bloqueia downloads por padrão. Liberar o domínio de cada serviço quando ele for usado pela primeira vez.
- Registrar créditos e licenças dos assets usados (ex.: 3D Valley, Sonoro) no projeto.

## Status do teste (2026-11-15)
- **Funcionando com saldo:** TO3D (US$ 0,40), 3D AI Studio (4 créditos), PINOC (60 créditos gratuitos), SFX Engine (9 créditos), Blipsmith (10 créditos), Audo (0 créditos, mas com usos gratuitos diários).
- **Funcionando sem saldo** (só bibliotecas e consultas gratuitas): 3D Valley, Nodaro, Nixly, fal.ai (conta bloqueada por falta de créditos).
- **Funcionando (gratuitos ou só leitura):** Hyper3D Rodin, CGAxis, 3DAssets.dev, three.ws, GripForge, Physics MCP, Sons, Sonoro, Google Drive, Canva, Adobe, Miro, Stewdio, Lovable, Macaly, Hive, Microsoft Learn, Claude Academy.
- **Com erro:** Ludo AI (falta chave de API), ElevenLabs (reconectar com mais permissões), Transcrição (conta não conectada), Context7 (cota mensal esgotada; criar chave gratuita), MotionSmith (sem assinatura).
