#!/bin/bash

# Script to run MyDBDiagram.io and open in Chrome
# Usage: ./run-chrome.sh

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

# Function to open Chrome
open_chrome() {
  local url=$1
  local max_wait=30
  local waited=0
  
  echo -e "${BLUE}🌐 Waiting for server to start...${NC}"
  
  # Wait for server to be ready
  while [ $waited -lt $max_wait ]; do
    if curl -s http://localhost:5173 > /dev/null 2>&1 || curl -s http://localhost:5174 > /dev/null 2>&1 || curl -s http://localhost:5175 > /dev/null 2>&1; then
      break
    fi
    sleep 1
    waited=$((waited + 1))
    echo -n "."
  done
  echo ""
  
  # Determine which port is actually being used
  local frontend_port=5173
  if curl -s http://localhost:5175 > /dev/null 2>&1; then
    frontend_port=5175
  elif curl -s http://localhost:5174 > /dev/null 2>&1; then
    frontend_port=5174
  fi
  
  echo -e "${GREEN}✅ Server is ready on port ${frontend_port}${NC}"
  echo -e "${BLUE}🌐 Opening Chrome...${NC}"
  
  # Open Chrome (macOS)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    open -a "Google Chrome" "http://localhost:${frontend_port}" 2>/dev/null || \
    open -a "Chromium" "http://localhost:${frontend_port}" 2>/dev/null || \
    open "http://localhost:${frontend_port}"
  # Linux
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    google-chrome "http://localhost:${frontend_port}" 2>/dev/null || \
    chromium-browser "http://localhost:${frontend_port}" 2>/dev/null || \
    xdg-open "http://localhost:${frontend_port}"
  # Windows (Git Bash)
  elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    start chrome "http://localhost:${frontend_port}" 2>/dev/null || \
    start "http://localhost:${frontend_port}"
  else
    echo -e "${YELLOW}⚠️  Please open http://localhost:${frontend_port} in your browser${NC}"
  fi
}

# Start the application in background and open Chrome
echo -e "${GREEN}🎉 Starting application...${NC}"
echo -e "${BLUE}   Frontend will be available at: http://localhost:5173${NC}"
echo -e "${BLUE}   Backend API will be available at: http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}💡 Press Ctrl+C to stop the application${NC}"
echo ""

# Start npm run dev in background
npm run dev &
NPM_PID=$!

# Wait a bit then open Chrome
sleep 3
open_chrome

# Wait for npm process
wait $NPM_PID

