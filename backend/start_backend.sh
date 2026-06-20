#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== ATS Resume Checker Backend ==="

# Try .pythonlibs (uv-managed venv) first, then fallback to system Python
PYTHON=""
if [ -f "/home/runner/workspace/.pythonlibs/bin/python" ]; then
    PYTHON="/home/runner/workspace/.pythonlibs/bin/python"
elif [ -f "/home/runner/workspace/.venv/bin/python" ]; then
    PYTHON="/home/runner/workspace/.venv/bin/python"
else
    PYTHON="python3"
fi

echo "Using Python: $PYTHON"

# Download spaCy model (fast if already present)
$PYTHON -m spacy download en_core_web_sm --quiet 2>/dev/null || true

echo "Starting FastAPI on port ${PORT:-8080}..."
exec $PYTHON -m uvicorn main:app --host 0.0.0.0 --port "${PORT:-8080}"
