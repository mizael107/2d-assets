#!/usr/bin/env bash
# Prepara o ambiente de produção 3D (idempotente). Uso: bash scripts/setup.sh
set -euo pipefail
cd "$(dirname "$0")/.."

need() { command -v "$1" >/dev/null 2>&1; }

if ! need node || ! need npm; then
  echo "[setup] Node.js/npm ausentes: instalando via apt"
  apt-get update -qq && apt-get install -y -qq nodejs npm
fi
echo "[setup] node $(node -v), npm $(npm -v)"

if ! need ffmpeg; then
  echo "[setup] ffmpeg ausente: instalando via apt"
  apt-get update -qq && apt-get install -y -qq ffmpeg
fi
echo "[setup] $(ffmpeg -version | head -1)"
for enc in libx264 aac; do
  ffmpeg -hide_banner -encoders 2>/dev/null | grep -q " $enc " || echo "[setup] AVISO: FFmpeg sem o codificador $enc"
done
ffmpeg -hide_banner -filters 2>/dev/null | grep -q " loudnorm " || echo "[setup] AVISO: FFmpeg sem o filtro loudnorm"

# Dependências do projeto (three, playwright). O Playwright usa o Chromium
# pré-instalado em /opt/pw-browsers/chromium, então não baixa navegador.
if [ -d node_modules/three ] && [ -d node_modules/playwright ]; then
  echo "[setup] node_modules já presente"
else
  npm ci --no-audit --no-fund
fi

CHROMIUM="${CHROMIUM_PATH:-/opt/pw-browsers/chromium}"
if [ -x "$CHROMIUM" ]; then
  echo "[setup] Chromium: $("$CHROMIUM" --version)"
else
  echo "[setup] AVISO: Chromium não encontrado em $CHROMIUM (rode: npx playwright install --with-deps chromium)"
fi
echo "[setup] pronto. Verifique com: npm run test:tools"
