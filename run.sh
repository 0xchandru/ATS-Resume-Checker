#!/bin/bash
# ATS Resume Checker - Unified Run Script for Replit

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== ATS Resume Checker ===${NC}"

# Download spaCy model if needed
echo "Checking spaCy model..."
python3 -m spacy download en_core_web_sm --quiet 2>/dev/null || true

# Start backend in background
echo -e "${BLUE}Starting backend on port 8787...${NC}"
python3 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8787 &
BACKEND_PID=$!

# Start frontend
echo -e "${BLUE}Starting frontend on port 5000...${NC}"
cd frontend && npm run dev
