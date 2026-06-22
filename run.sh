#!/bin/bash
# ATS Resume Checker - Unified Run Script for Replit

echo "=== ATS Resume Checker ==="

# Kill any stale processes on our ports
pkill -f "uvicorn" 2>/dev/null || true
pkill -f "next" 2>/dev/null || true
sleep 2

# Map NVIDIA_API_KEY to LLM config (openai_compatible = NVIDIA NIM)
export LLM_API_KEY="${NVIDIA_API_KEY:-}"
export LLM_PROVIDER="${LLM_PROVIDER:-openai_compatible}"
export LLM_MODEL="${LLM_MODEL:-meta/llama-3.1-8b-instruct}"
export LLM_API_BASE="${LLM_API_BASE:-https://integrate.api.nvidia.com/v1}"
export BACKEND_ORIGIN="http://127.0.0.1:8000"

# Ensure data directory exists
mkdir -p Resume-Matcher/apps/backend/data

# Start Resume-Matcher backend on port 8000 (background)
echo "Starting backend on port 8000..."
cd Resume-Matcher/apps/backend && python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!
cd /home/runner/workspace

# Wait for backend to be ready (litellm import takes ~15-20s on cold start)
echo "Waiting for backend to be ready..."
for i in $(seq 1 60); do
  if curl -s http://127.0.0.1:8000/api/v1/status > /dev/null 2>&1; then
    echo "Backend ready after ${i}s"
    break
  fi
  sleep 1
done

# Start Resume-Matcher frontend (Next.js) on port 5000 (foreground)
echo "Starting frontend on port 5000..."
cd Resume-Matcher/apps/frontend && PORT=5000 HOSTNAME=0.0.0.0 npm run dev
