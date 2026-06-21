#!/bin/bash
# ATS Resume Checker - Unified Setup & Run Script
# This script installs all dependencies and starts the frontend and backend.

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== ATS Resume Checker Setup & Launcher ===${NC}"

# 1. Setup Backend
echo -e "\n${BLUE}[1/3] Setting up Python backend...${NC}"

if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

echo "Activating virtual environment and installing requirements..."
source .venv/bin/activate
cd backend
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet

echo "Downloading spaCy model (if needed)..."
python -m spacy download en_core_web_sm --quiet 2>/dev/null || true
cd ..
# 2. Setup Root and Frontend Node Modules
echo -e "\n${BLUE}[2/3] Setting up Node.js dependencies...${NC}"

# Install root dependencies (concurrently)
echo "Installing root dependencies..."
npm install --quiet

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install --quiet
cd ..

# 3. Start the Application
echo -e "\n${GREEN}[3/3] Setup complete! Starting the application...${NC}"
echo -e "Press Ctrl+C to stop both servers at any time.\n"

# Run the concurrently script defined in package.json
npm run dev
