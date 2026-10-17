#!/usr/bin/env bash
# ==============================================================================
# Lanzador Integrado: Estudio de Videos + Servidor de Voz Local (RTX 3080)
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================================="
echo "🎬 INICIANDO ESTUDIO DOCUMENTAL & AUTOMATIZACIÓN DE VIDEOS"
echo "=========================================================="

START_AUDIO=false
for arg in "$@"; do
  case "$arg" in
    --with-audio|--audio|-a)
      START_AUDIO=true
      ;;
  esac
done

# 1. Si se pidió audio explícito, pre-arrancar VoiceStudio ahora
if [ "$START_AUDIO" = true ]; then
  echo "🎙️ Flag --with-audio detectado. Pre-arrancando VoiceStudio en GPU RTX 3080..."
  npx tsx server/scripts/start-audio.ts || true
else
  echo "💡 Modo estándar: El proyecto de Video se lanzará ahora."
  echo "   (El servidor de Audio VoiceStudio se iniciará automáticamente bajo demanda"
  echo "   cuando generes voz, o puedes arrancarlo con 1 clic en la interfaz)."
fi

# 2. Iniciar Backend Express (puerto 3001) y Frontend Vite (puerto 5173)
echo ""
echo "🚀 Lanzando Backend (puerto 3001) y Frontend (puerto 5173)..."

cleanup() {
  echo ""
  echo "🛑 Deteniendo servicios del estudio..."
  kill $(jobs -p) 2>/dev/null || true
}
trap cleanup EXIT INT TERM

npx tsx watch server/index.ts &
SERVER_PID=$!

npx vite &
VITE_PID=$!

wait $VITE_PID $SERVER_PID
