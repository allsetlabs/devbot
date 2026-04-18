#!/bin/bash

# DevBot Auto-Update Script
# Called by the DevBot built-in scheduler daily.
# Safe to run manually: ./update.sh

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/logs/update.log"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

mkdir -p "$SCRIPT_DIR/logs"

log()     { echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }
info()    { log "${BLUE}$*${NC}"; }
success() { log "${GREEN}$*${NC}"; }
warn()    { log "${YELLOW}$*${NC}"; }

# ── Load nvm so node/npm are available ───────────────────────────────────────
export NVM_DIR="$HOME/.nvm"
# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

# ── Step 1: Check for new commits ────────────────────────────────────────────
info "Checking for upstream changes in devbot..."
cd "$SCRIPT_DIR"

git fetch origin main --quiet

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
  success "Already up to date (${LOCAL:0:7}). Nothing to do."
  exit 0
fi

COMMITS_BEHIND=$(git rev-list HEAD..origin/main --count)
info "Found $COMMITS_BEHIND new commit(s). Preparing to update..."

# ── Step 2: Pull latest commits ───────────────────────────────────────────────
info "Pulling latest changes..."
git pull origin main --quiet
success "Repo updated to $(git rev-parse --short HEAD)"

# ── Step 3: Update submodules ─────────────────────────────────────────────────
info "Updating submodules..."
git submodule update --init --recursive --quiet
success "Submodules updated"

# ── Step 4: System setup + install ───────────────────────────────────────────
info "Running make setup..."
make setup >> "$LOG_FILE" 2>&1

info "Running make install..."
make install >> "$LOG_FILE" 2>&1
success "Dependencies installed"

# ── Step 5: Restart DevBot ────────────────────────────────────────────────────
info "Restarting DevBot..."
make start >> "$LOG_FILE" 2>&1
success "DevBot restarted successfully"

success "=== Update complete ==="
