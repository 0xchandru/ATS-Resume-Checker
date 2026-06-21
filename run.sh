#!/bin/bash
# ATS Resume Checker - Unified Run Script for Replit

echo "=== ATS Resume Checker ==="

PYTHON=".venv/bin/python3"

# Kill any stale processes on our ports
pkill -f "uvicorn backend.app.main" 2>/dev/null || true
pkill -f "vite --config vite.config.ts" 2>/dev/null || true
sleep 1

# Start backend in background
echo "Starting backend on port 8787..."
$PYTHON -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8787 &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend on port 5000..."
cd frontend && npm run dev
