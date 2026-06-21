#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Change to the ROOT directory so backend.app is treated as a top-level package
cd "$SCRIPT_DIR/.."

echo "=== ATS Resume Checker Backend ==="

# Setup or use local venv
PYTHON=""
if [ -f ".venv/bin/python" ]; then
    PYTHON=".venv/bin/python"
else
    PYTHON="python3"
fi

echo "Using Python: $PYTHON"

# Download spaCy model (fast if already present)
$PYTHON -m spacy download en_core_web_sm --quiet 2>/dev/null || true

echo "Starting FastAPI on port ${PORT:-8787}..."
exec $PYTHON -m uvicorn backend.app.main:app --host 0.0.0.0 --port "${PORT:-8787}"
