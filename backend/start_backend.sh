#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Change to the ROOT directory so backend.app is treated as a top-level package
cd "$SCRIPT_DIR/.."

echo "=== ATS Resume Checker Backend ==="

PYTHON="python3"

echo "Using Python: $PYTHON"

echo "Starting FastAPI on port ${PORT:-8787}..."
exec $PYTHON -m uvicorn backend.app.main:app --host 0.0.0.0 --port "${PORT:-8787}"
