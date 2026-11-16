// Legendas no estilo de vídeos curtos (referência em docs/conectores.md / análise de estilo):
// MAIÚSCULAS, branco com contorno preto, 1 a 4 palavras por vez, palavra-chave em amarelo
// (#F2B839), no terço inferior (~72% da altura), entrando com um "pop" rápido.
// Desenhadas num canvas 2D por cima do quadro 3D (src/rendering/runtime.js).
//
// Texto: marque a palavra-chave com asteriscos: "ele tirou o *sal* da sopa".

export const CAPTION_STYLE = {
  font: '"Inter Display", "DejaVu Sans", sans-serif', weight: 800, sizeRatio: 0.052, condense: 0.9,
  color: '#ffffff', keyColor: '#F2B839', stroke: '#000000', strokeRatio: 0.16, shadow: 'rgba(0,0,0,0.45)',
  yRatio: 0.72, maxWidthRatio: 0.86, lineGap: 1.08, pop: 0.12, uppercase: true,
};

// Divide um texto em blocos de até maxWords, distribuídos no intervalo [start, end]
// proporcionalmente ao tamanho das palavras (fala mais longa = mais tempo na tela).
export function chunkCaptions(text, start, end, { maxWords = 3, breakOn = /[.,!?;:]$/ } = {}) {
  const words = text.split(/\s+/).filter(Boolean).map((w) => ({ w: w.replace(/\*/g, ''), key: /^\*.*\*[.,!?;:]?$/.test(w) }));
  // Não termina um bloco em palavra de ligação ("algo caiu DO" / "céu"): ela passa para o próximo.
  const LIGA = /^(o|a|os|as|um|uma|de|do|da|dos|das|em|no|na|nos|nas|e|ou|que|pra|para|com|por|se|ao|à|mas)$/i;
  const chunks = []; let cur = [];
  for (const w of words) {
    cur.push(w);
    if (breakOn.test(w.w)) { chunks.push(cur); cur = []; continue; }
    if (cur.length >= maxWords) {
      const carry = []; while (cur.length > 1 && LIGA.test(cur[cur.length - 1].w)) carry.unshift(cur.pop());
      chunks.push(cur); cur = carry;
    }
  }
  if (cur.length) chunks.push(cur);
  const weight = (c) => c.reduce((a, w) => a + w.w.length + 2, 0); const total = chunks.reduce((a, c) => a + weight(c), 0);
  let t = start; return chunks.map((c) => { const d = ((end - start) * weight(c)) / total; const out = { t0: +t.toFixed(3), t1: +(t + d).toFixed(3), words: c }; t += d; return out; });
}

// Exporta em SRT (para subir como legenda separada na plataforma).
export function toSRT(caps) {
  const ts = (s) => { const ms = Math.round(s * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, ss = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
  return caps.map((c, i) => `${i + 1}\n${ts(c.t0)} --> ${ts(c.t1)}\n${c.words.map((w) => w.w).join(' ').toUpperCase()}\n`).join('\n');
}

// Desenha a legenda ativa no tempo t.
export function drawCaptions(ctx, caps, t, { width, height, style = {} }) {
  const S = { ...CAPTION_STYLE, ...style };
  const cap = caps.find((c) => t >= c.t0 && t < c.t1); if (!cap) return null;
  const size = Math.round(height * S.sizeRatio);
  const k = Math.min(1, (t - cap.t0) / S.pop); const scale = 0.82 + 0.18 * (1 - Math.pow(1 - k, 3)) + (k < 1 ? 0.06 * Math.sin(k * Math.PI) : 0);
  ctx.save();
  ctx.font = `${S.weight} ${size}px ${S.font}`; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  // Quebra em linhas que caibam na largura máxima.
  const up = (w) => (S.uppercase ? w.toUpperCase() : w); const space = ctx.measureText(' ').width * S.condense;
  const lines = []; let line = []; let lw = 0; const maxW = width * S.maxWidthRatio;
  for (const w of cap.words) { const ww = ctx.measureText(up(w.w)).width * S.condense; if (line.length && lw + space + ww > maxW) { lines.push({ line, lw }); line = []; lw = 0; } lw += (line.length ? space : 0) + ww; line.push({ ...w, ww }); }
  if (line.length) lines.push({ line, lw });
  const lh = size * S.lineGap; const y0 = height * S.yRatio - ((lines.length - 1) * lh) / 2;
  ctx.translate(width / 2, y0); ctx.scale(scale * S.condense, scale); ctx.translate(-width / 2 / S.condense, 0);
  lines.forEach(({ line: L, lw: W }, i) => {
    let x = (width / 2 - W / 2) / S.condense; const y = i * lh / scale;
    for (const w of L) {
      const txt = up(w.w);
      ctx.lineWidth = size * S.strokeRatio; ctx.strokeStyle = S.stroke; ctx.shadowColor = S.shadow; ctx.shadowBlur = size * 0.15; ctx.shadowOffsetY = size * 0.05;
      ctx.strokeText(txt, x, y); ctx.shadowColor = 'transparent';
      ctx.fillStyle = w.key ? S.keyColor : S.color; ctx.fillText(txt, x, y);
      x += (w.ww + space) / S.condense;
    }
  });
  ctx.restore();
  return cap.words.map((w) => w.w).join(' ');
}
