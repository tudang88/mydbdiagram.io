#!/bin/bash

# Script to check build, lint, and format before pushing to GitHub
# Usage: ./push_git.sh [commit message] [branch name (optional, defaults to main)]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get commit message and branch from arguments
COMMIT_MSG="${1:-Update}"
BRANCH="${2:-main}"

echo -e "${GREEN}🚀 Pre-push checks for MyDBDiagram.io${NC}"
echo "=========================================="
echo ""

# Step 1: Type checking
echo -e "${YELLOW}📝 Step 1: Type checking...${NC}"
if npm run type-check; then
  echo -e "${GREEN}✅ Type checking passed${NC}"
else
  echo -e "${RED}❌ Type checking failed${NC}"
  exit 1
fi
echo ""

# Step 2: Linting
echo -e "${YELLOW}🔍 Step 2: Linting...${NC}"
if npm run lint; then
  echo -e "${GREEN}✅ Linting passed${NC}"
else
  echo -e "${RED}❌ Linting failed${NC}"
  echo -e "${YELLOW}💡 Try running: npm run lint:fix${NC}"
  exit 1
fi
echo ""

# Step 3: Format checking
echo -e "${YELLOW}💅 Step 3: Format checking...${NC}"
if npm run format:check; then
  echo -e "${GREEN}✅ Format checking passed${NC}"
else
  echo -e "${RED}❌ Format checking failed${NC}"
  echo -e "${YELLOW}💡 Try running: npm run format${NC}"
  exit 1
fi
echo ""

# Step 4: Building
echo -e "${YELLOW}🏗️  Step 4: Building...${NC}"
if npm run build; then
  echo -e "${GREEN}✅ Build passed${NC}"
else
  echo -e "${RED}❌ Build failed${NC}"
  exit 1
fi
echo ""

# Step 5: Running tests (optional, can be skipped if tests are slow)
echo -e "${YELLOW}🧪 Step 5: Running tests...${NC}"
echo -e "${YELLOW}   (Skipping tests - uncomment below to enable)${NC}"
# Uncomment the following lines to run tests before push
# if npm test; then
#   echo -e "${GREEN}✅ Tests passed${NC}"
# else
#   echo -e "${RED}❌ Tests failed${NC}"
#   exit 1
# fi
echo ""

# All checks passed, proceed with git operations
echo -e "${GREEN}✅ All pre-push checks passed!${NC}"
echo ""

# Step 6: Git add
echo -e "${YELLOW}📦 Step 6: Staging changes...${NC}"
git add -A
echo -e "${GREEN}✅ Changes staged${NC}"
echo ""

# Step 7: Git commit
echo -e "${YELLOW}💾 Step 7: Committing changes...${NC}"
if git commit -m "$COMMIT_MSG"; then
  echo -e "${GREEN}✅ Changes committed${NC}"
else
  echo -e "${YELLOW}⚠️  No changes to commit or commit failed${NC}"
fi
echo ""

# Step 8: Git push
echo -e "${YELLOW}🚀 Step 8: Pushing to GitHub...${NC}"
echo -e "${YELLOW}   Branch: ${BRANCH}${NC}"
if git push origin "$BRANCH"; then
  echo -e "${GREEN}✅ Successfully pushed to GitHub!${NC}"
else
  echo -e "${RED}❌ Push failed${NC}"
  exit 1
fi
echo ""

echo -e "${GREEN}🎉 All done!${NC}"

