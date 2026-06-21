#!/bin/bash
# ATS Resume Checker - Unified Run Script for Replit

echo "=== ATS Resume Checker ==="

# Download spaCy model if needed
python3 -m spacy download en_core_web_sm --quiet 2>/dev/null || true

# Start backend in background
echo "Starting backend on port 8787..."
python3 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8787 &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend on port 5000..."
cd frontend && npm run dev
