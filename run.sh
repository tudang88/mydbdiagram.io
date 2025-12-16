#!/bin/bash

# Script to run MyDBDiagram.io with automatic port cleanup
# Usage: ./run.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting MyDBDiagram.io...${NC}"
echo ""

# Function to kill process on a port
kill_port() {
  local port=$1
  local processes=$(lsof -ti:$port 2>/dev/null)
  
  if [ -n "$processes" ]; then
    echo -e "${YELLOW}⚠️  Port ${port} is in use${NC}"
    # Kill all processes using this port
    for pid in $processes; do
      echo -e "${YELLOW}   Killing process: ${pid}${NC}"
      kill -9 $pid 2>/dev/null || true
    done
    sleep 1
    # Verify port is free
    local remaining=$(lsof -ti:$port 2>/dev/null)
    if [ -z "$remaining" ]; then
      echo -e "${GREEN}✅ Port ${port} is now free${NC}"
    else
      echo -e "${RED}❌ Failed to free port ${port}${NC}"
      return 1
    fi
  else
    echo -e "${GREEN}✅ Port ${port} is available${NC}"
  fi
}

# Clean up ports
echo -e "${BLUE}🔍 Checking and cleaning ports...${NC}"
kill_port 3000  # Backend port
kill_port 5173  # Frontend port (Vite default)
kill_port 5174  # Vite fallback port
kill_port 5175  # Vite fallback port

echo ""
echo -e "${GREEN}✅ All ports are ready${NC}"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}📦 Installing dependencies...${NC}"
  npm install
  echo ""
fi

# Run the application
echo -e "${GREEN}🎉 Starting application...${NC}"
echo -e "${BLUE}   Frontend will be available at: http://localhost:5173${NC}"
echo -e "${BLUE}   Backend API will be available at: http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}💡 Press Ctrl+C to stop the application${NC}"
echo ""

# Run with error handling
npm run dev || {
  echo ""
  echo -e "${RED}❌ Application failed to start${NC}"
  echo -e "${YELLOW}💡 If you see port errors, try running ./run.sh again${NC}"
  exit 1
}

