#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "=== ATS Resume Checker Backend ==="
echo "[1/3] Installing Python dependencies..."
python3 -m pip install -r requirements.txt -q --no-warn-script-location 2>&1 | tail -3

echo "[2/3] Downloading spaCy model..."
python3 -m spacy download en_core_web_sm --quiet 2>/dev/null || echo "spaCy model already installed"

echo "[3/3] Starting FastAPI server on port ${PORT:-8080}..."
python3 -m uvicorn main:app --host 0.0.0.0 --port "${PORT:-8080}"
