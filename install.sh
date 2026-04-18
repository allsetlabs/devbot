#!/bin/bash

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

REPO_URL="https://github.com/allsetlabs/devbot.git"
PROJECT_DIR="devbot"

echo -e "${GREEN}=== devbot ===${NC}"

# Step 1: Clone with submodules
echo -e "${YELLOW}Cloning into ${PROJECT_DIR}...${NC}"
git clone --recurse-submodules "$REPO_URL" "$PROJECT_DIR"
cd "$PROJECT_DIR"

# Step 2: System setup + install dependencies
echo -e "${YELLOW}Running make setup && make install...${NC}"
if ! (make setup && make install); then
  echo -e "${RED}Setup failed! Launching Claude to debug...${NC}"
  claude --dangerously-skip-permissions --chrome -p "Running 'make setup && make install' failed in this repo. Diagnose the error, fix it, and get both commands to pass successfully. Report what you fixed."
fi

# Step 3: Start DevBot
echo -e "${GREEN}Setup complete! Starting DevBot...${NC}"
make start

# Step 4: Open DevBot in browser
open http://localhost:4005
