#!/bin/bash
# ATS Resume Checker - Unified Run Script for Replit

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== ATS Resume Checker ===${NC}"

# Start backend in background
echo -e "${BLUE}Starting backend on port 8787...${NC}"
python3 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8787 &
BACKEND_PID=$!

# Start frontend
echo -e "${BLUE}Starting frontend on port 5000...${NC}"
cd frontend && npm run dev
