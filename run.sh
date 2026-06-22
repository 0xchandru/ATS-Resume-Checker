#!/bin/bash
# ATS Resume Checker — Replit run script

echo "=== ATS Resume Checker ==="

# Kill any stale processes
pkill -f "uvicorn" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# Expose OpenAI-compatible AI integration key if available
export OPENAI_API_KEY="${OPENAI_API_KEY:-}"

# Ensure data dirs exist
mkdir -p backend/data backend/uploads

# Start FastAPI backend on port 8787 (background)
echo "Starting backend on port 8787..."
python3 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8787 --reload &
BACKEND_PID=$!

# Start Vite frontend on port 5000 (foreground — keeps workflow alive)
echo "Starting frontend on port 5000..."
cd frontend && npm run dev
