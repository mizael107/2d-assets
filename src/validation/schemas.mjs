// Validação de dados com zod: especificação de render, cues de áudio e probes.
// Erros de digitação (ex.: fps: "30" ou um som sem tempo) são pegos ANTES de renderizar.
import { z } from 'zod';

export const CueSchema = z.object({
  t: z.number().min(0),
  sound: z.string().min(1),
  gain: z.number().min(0).max(4).optional(),
  kind: z.string().optional(),
  file: z.string().optional(),
});

export const RenderSpecSchema = z.object({
  entry: z.string().regex(/^\/scenes\/.+\.js$/, 'a cena deve ficar em /scenes/ e terminar em .js'),
  seconds: z.number().positive().max(600),
  fps: z.union([z.literal(24), z.literal(25), z.literal(30), z.literal(60)]),
  width: z.number().int().min(64).max(4096).refine((v) => v % 2 === 0, 'largura precisa ser par (H.264)'),
  height: z.number().int().min(64).max(4096).refine((v) => v % 2 === 0, 'altura precisa ser par (H.264)'),
  params: z.record(z.string(), z.any()).default({}),
});

export const ProbeRulesSchema = z.object({
  groundY: z.number().default(0),
  footTolerance: z.number().default(0.03),        // m abaixo do chão aceitos
  floatTolerance: z.number().default(0.05),       // m acima do chão no apoio
  syncTolerance: z.number().default(0.045),       // s entre cue e ataque do som
  frameEdgeMargin: z.number().default(0.98),      // NDC: |x|,|y| > isto = fora do quadro
});

export const parseRenderSpec = (o) => RenderSpecSchema.parse(o);
export const parseCues = (a) => z.array(CueSchema).parse(a);
