#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# PROJECT FORGE — Arranque Local (Offline)
# ═══════════════════════════════════════════════════════════════════════
# Uso: ./forge-local.sh
#
# O que este script faz:
#   1. Verifica se o llama.cpp está a correr (http://127.0.0.1:8080)
#   2. Arranca o backend Express na porta 3001
#   3. Arranca o frontend Vite na porta 5173
#   4. Abre http://localhost:5173 no browser
# ═══════════════════════════════════════════════════════════════════════

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║      PROJECT FORGE — MODO LOCAL      ║${NC}"
echo -e "${GREEN}║   DeepSeek V4 Pro · Offline · 100%   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""

# ── 1. Verificar llama.cpp ───────────────────────────────────────────
echo -e "${YELLOW}[1/3]${NC} A verificar llama.cpp em http://127.0.0.1:8080..."

if curl -sf http://127.0.0.1:8080/health > /dev/null 2>&1; then
  echo -e "      ${GREEN}✓ llama.cpp está a correr${NC}"
else
  echo ""
  echo -e "      ${RED}✗ llama.cpp NÃO está a correr!${NC}"
  echo ""
  echo "  Arranca o llama-server primeiro com:"
  echo ""
  echo '  llama-server \'
  echo '    --model "/Users/igorserrano/AI-Models/DeepSeek/DeepSeek-V4-Pro-Qwen3.5-9B-UNCENSORED-heretic-MTP-Q4_K_M.gguf" \'
  echo '    --host 127.0.0.1 \'
  echo '    --port 8080 \'
  echo '    --ctx-size 8192 \'
  echo '    --speculative-ngram'
  echo ""
  exit 1
fi

# ── 2. Backend ───────────────────────────────────────────────────────
echo -e "${YELLOW}[2/3]${NC} A arrancar backend (porta 3001)..."

cd "$SCRIPT_DIR/backend"

# Instalar dependências se necessário
if [ ! -d node_modules ]; then
  echo "      npm install..."
  npm install --silent
fi

# Arrancar backend em background, log para ficheiro
npm run dev > /tmp/forge-backend.log 2>&1 &
BACKEND_PID=$!
echo "      PID: $BACKEND_PID"

# Esperar o backend arrancar (máx 15s)
for i in $(seq 1 15); do
  sleep 1
  if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "      ${GREEN}✓ Backend pronto em http://localhost:3001${NC}"
    break
  fi
  if [ $i -eq 15 ]; then
    echo -e "      ${RED}✗ Backend não arrancou. Ver log: /tmp/forge-backend.log${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit 1
  fi
done

# Mostrar provider activo
STATUS=$(curl -sf http://localhost:3001/api/status 2>/dev/null || echo '{}')
PROVIDER=$(echo "$STATUS" | grep -o '"provider":"[^"]*"' | cut -d'"' -f4)
MODEL=$(echo "$STATUS" | grep -o '"model":"[^"]*"' | head -1 | cut -d'"' -f4 | rev | cut -d'/' -f1 | rev)
echo "      Provider: ${GREEN}${PROVIDER:-?}${NC} · Modelo: ${GREEN}${MODEL:-?}${NC}"

# ── 3. Frontend ──────────────────────────────────────────────────────
echo -e "${YELLOW}[3/3]${NC} A arrancar frontend (porta 5173)..."

cd "$SCRIPT_DIR/frontend"

if [ ! -d node_modules ]; then
  echo "      npm install..."
  npm install --silent
fi

npm run dev > /tmp/forge-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "      PID: $FRONTEND_PID"

# Esperar frontend
for i in $(seq 1 15); do
  sleep 1
  if curl -sf http://localhost:5173 > /dev/null 2>&1; then
    echo -e "      ${GREEN}✓ Frontend pronto em http://localhost:5173${NC}"
    break
  fi
  if [ $i -eq 15 ]; then
    echo -e "      ${RED}✗ Frontend não arrancou. Ver log: /tmp/forge-frontend.log${NC}"
    break
  fi
done

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  PROJECT FORGE está online e offline!  ${NC}"
echo -e "${GREEN}  http://localhost:5173                 ${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "  Logs:"
echo "    Backend:  tail -f /tmp/forge-backend.log"
echo "    Frontend: tail -f /tmp/forge-frontend.log"
echo ""
echo "  Para parar tudo:"
echo "    kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Abrir browser (macOS)
if command -v open &> /dev/null; then
  sleep 1
  open http://localhost:5173
fi

# Manter script vivo para Ctrl+C parar tudo
trap "echo ''; echo 'A parar PROJECT FORGE...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

wait $BACKEND_PID $FRONTEND_PID
