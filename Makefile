# DevBot Makefile
# Usage: cd modules/devbot && make <target>

# Colors
GREEN := \033[0;32m
BLUE := \033[0;34m
YELLOW := \033[1;33m
NC := \033[0m

APP_PORT := 4005
BACKEND_PORT := 3100

.PHONY: help setup install start stop setup-brew setup-git setup-nvm setup-node setup-tmux setup-claude setup-mcp setup-skills

help:
	@echo "$(BLUE)DevBot Commands:$(NC)"
	@echo "  make setup      - Install ALL system dependencies (brew, git, nvm, node, tmux, claude, MCP, skills)"
	@echo "  make install    - Sync submodules and install app/backend dependencies"
	@echo "  make start      - Start app and backend in tmux session 'devbot'"
	@echo "  make stop       - Stop all DevBot services"

setup:
	@echo "$(BLUE)Starting DevBot system setup...$(NC)"
	@if [ "$$(uname)" = "Darwin" ]; then $(MAKE) setup-brew; fi
	@$(MAKE) setup-git
	@$(MAKE) setup-nvm
	@$(MAKE) setup-node
	@$(MAKE) setup-tmux
	@$(MAKE) setup-claude
	@$(MAKE) setup-mcp
	@$(MAKE) setup-skills
	@echo ""
	@echo "$(GREEN)✅ DevBot setup complete! Next: make install$(NC)"

setup-brew:
	@echo "$(BLUE)Installing Homebrew...$(NC)"
	@if command -v brew &> /dev/null; then \
		echo "$(GREEN)Homebrew already installed: $$(brew --version | head -1)$(NC)"; \
	else \
		/bin/bash -c "$$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"; \
		echo "$(GREEN)Homebrew installed!$(NC)"; \
	fi
	@if ! grep -q "HOMEBREW_CASK_OPTS" ~/.zshrc 2>/dev/null; then \
		echo "" >> ~/.zshrc; \
		echo "# Homebrew Cask Configuration" >> ~/.zshrc; \
		echo 'export HOMEBREW_CASK_OPTS="--appdir=~/Applications"' >> ~/.zshrc; \
	fi

setup-git:
	@echo "$(BLUE)Installing Git...$(NC)"
	@if command -v git &> /dev/null; then \
		echo "$(GREEN)Git already installed: $$(git --version)$(NC)"; \
	else \
		if [ "$$(uname)" = "Darwin" ]; then brew install git; \
		elif [ "$$(uname)" = "Linux" ]; then sudo apt-get install -y git; \
		elif [ "$$OS" = "Windows_NT" ]; then choco install git -y; \
		fi; \
	fi

setup-nvm:
	@echo "$(BLUE)Installing nvm...$(NC)"
	@if [ -s "$${HOME}/.nvm/nvm.sh" ]; then \
		echo "$(GREEN)nvm already installed$(NC)"; \
	else \
		curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash; \
	fi
	@if ! grep -q "load-nvmrc" ~/.zshrc 2>/dev/null; then \
		echo '' >> ~/.zshrc; \
		echo '# Automatically switch Node versions' >> ~/.zshrc; \
		echo 'autoload -U add-zsh-hook' >> ~/.zshrc; \
		echo 'load-nvmrc() {' >> ~/.zshrc; \
		echo '  local node_version="$$(nvm version)"' >> ~/.zshrc; \
		echo '  local nvmrc_path="$$(nvm_find_nvmrc)"' >> ~/.zshrc; \
		echo '  if [ -n "$$nvmrc_path" ]; then' >> ~/.zshrc; \
		echo '    local nvmrc_node_version=$$(nvm version "$$(cat "$${nvmrc_path}")")' >> ~/.zshrc; \
		echo '    if [ "$$nvmrc_node_version" = "N/A" ]; then nvm install; elif [ "$$nvmrc_node_version" != "$$node_version" ]; then nvm use; fi' >> ~/.zshrc; \
		echo '  elif [ "$$node_version" != "$$(nvm version default)" ]; then echo "Reverting to nvm default version"; nvm use default; fi' >> ~/.zshrc; \
		echo '}' >> ~/.zshrc; \
		echo 'add-zsh-hook chpwd load-nvmrc' >> ~/.zshrc; \
		echo 'load-nvmrc' >> ~/.zshrc; \
	fi

setup-node:
	@echo "$(BLUE)Installing Node.js from .nvmrc (v$$(cat .nvmrc))...$(NC)"
	@bash -c '\
		export NVM_DIR="$$HOME/.nvm"; \
		[ -s "$$NVM_DIR/nvm.sh" ] && . "$$NVM_DIR/nvm.sh"; \
		nvm install $$(cat .nvmrc) && \
		nvm use $$(cat .nvmrc) && \
		nvm alias default $$(cat .nvmrc) && \
		nvm list'

setup-tmux:
	@echo "$(BLUE)Installing tmux...$(NC)"
	@if command -v tmux &> /dev/null; then \
		echo "$(GREEN)tmux already installed$(NC)"; \
	else \
		if [ "$$(uname)" = "Darwin" ]; then brew install tmux; \
		elif [ "$$(uname)" = "Linux" ]; then sudo apt-get install -y tmux; \
		elif [ "$$OS" = "Windows_NT" ]; then echo "$(YELLOW)tmux not available on Windows natively. Consider using WSL.$(NC)"; \
		fi; \
	fi
	@if [ ! -f ~/.tmux.conf ]; then \
		echo 'set -g mouse on' > ~/.tmux.conf; \
		echo 'set -g status-position bottom' >> ~/.tmux.conf; \
		echo 'set -g base-index 1' >> ~/.tmux.conf; \
		echo 'setw -g pane-base-index 1' >> ~/.tmux.conf; \
	fi

setup-claude:
	@echo "$(BLUE)Installing Claude Code...$(NC)"
	@bash -c '\
		export NVM_DIR="$$HOME/.nvm"; \
		[ -s "$$NVM_DIR/nvm.sh" ] && . "$$NVM_DIR/nvm.sh"; \
		if command -v claude &> /dev/null; then \
			echo "$(GREEN)Claude Code already installed: $$(claude --version)$(NC)"; \
		else \
			npm install -g @anthropic-ai/claude-code; \
			echo "$(GREEN)Claude Code installed!$(NC)"; \
		fi; \
		echo "$(BLUE)Checking Claude Code auth...$(NC)"; \
		if claude auth status 2>/dev/null | grep -q "\"loggedIn\": true"; then \
			echo "$(GREEN)Claude Code already logged in$(NC)"; \
		else \
			echo "$(YELLOW)Claude Code not logged in. Logging in...$(NC)"; \
			claude auth login; \
		fi'
	@SHELL_RC="$$HOME/.zshrc"; \
	if [ "$$(uname)" = "Linux" ] && [ -f "$$HOME/.bashrc" ]; then SHELL_RC="$$HOME/.bashrc"; fi; \
	if ! grep -q '\.local/bin.*PATH' "$$SHELL_RC" 2>/dev/null; then \
		echo '' >> "$$SHELL_RC"; \
		echo 'export PATH="$$HOME/.local/bin:$$PATH"' >> "$$SHELL_RC"; \
	fi

setup-mcp:
	@echo "$(BLUE)Adding Claude MCP servers...$(NC)"
	@export NVM_DIR="$$HOME/.nvm"; \
	[ -s "$$NVM_DIR/nvm.sh" ] && . "$$NVM_DIR/nvm.sh"; \
	echo "$(BLUE)Adding context7...$(NC)"; \
	claude mcp add context7 --scope user -- npx -y @upstash/context7-mcp; \
	echo "$(BLUE)Adding shadcn...$(NC)"; \
	claude mcp add shadcn --scope user -- npx -y @anthropic-ai/shadcn-mcp-server; \
	echo "$(BLUE)Adding playwright...$(NC)"; \
	claude mcp add playwright --scope user -- npx -y @anthropic-ai/mcp-server-playwright; \
	echo "$(GREEN)MCP servers added!$(NC)"

setup-skills:
	@echo "$(BLUE)Cleaning up legacy devbot command symlink...$(NC)"
	@rm -f ~/.claude/commands/devbot
	@echo "$(BLUE)Symlinking AI skills from .claude/skills to ~/.claude/skills...$(NC)"
	@mkdir -p ~/.claude/skills
	@for d in $(CURDIR)/.claude/skills/*/; do \
		skill=$$(basename "$$d"); \
		rm -f ~/.claude/skills/$$skill; \
		ln -sf "$$d" ~/.claude/skills/$$skill; \
		echo "  ✓ ~/.claude/skills/$$skill → $$d"; \
	done
	@echo "$(GREEN)✅ Skills symlinked to ~/.claude/skills/$(NC)"
	@echo "$(BLUE)Installing public skills globally via npx...$(NC)"
	@npx -y @anthropic-ai/claude-code-skills add find-skills --global 2>/dev/null || true
	@npx -y @anthropic-ai/claude-code-skills add tanstack-query-best-practices --global 2>/dev/null || true
	@npx -y @anthropic-ai/claude-code-skills add tanstack-router-best-practices --global 2>/dev/null || true
	@npx -y @anthropic-ai/claude-code-skills add tanstack-start-best-practices --global 2>/dev/null || true
	@npx -y @anthropic-ai/claude-code-skills add tanstack-integration-best-practices --global 2>/dev/null || true
	@npx -y @anthropic-ai/claude-code-skills add vercel-react-best-practices --global 2>/dev/null || true
	@npx -y @anthropic-ai/claude-code-skills add vercel-react-native-skills --global 2>/dev/null || true
	@npx -y @anthropic-ai/claude-code-skills add vercel-composition-patterns --global 2>/dev/null || true
	@echo "$(GREEN)✅ Public skills installed globally$(NC)"

install:
	@echo "$(BLUE)🔄 Syncing git submodules (component)...$(NC)"
	@git submodule update --init --recursive
	@echo "$(BLUE)📦 Installing DevBot app...$(NC)"
	cd app && npm install --force
	@echo "$(GREEN)✅ DevBot app ready!$(NC)"
	@echo "$(BLUE)📦 Installing DevBot backend...$(NC)"
	cd backend && npm install --force
	@echo "$(GREEN)✅ DevBot backend ready!$(NC)"

start:
	@echo "$(BLUE)🚀 Starting DevBot services in tmux session 'devbot'...$(NC)"
	@if tmux has-session -t devbot 2>/dev/null; then \
		echo "$(YELLOW)⚠️  Tmux session 'devbot' already exists. Killing it first...$(NC)"; \
		tmux kill-session -t devbot; \
	fi
	@echo "$(YELLOW)Killing processes on DevBot ports...$(NC)"
	@npx kill-port $(BACKEND_PORT) $(APP_PORT) 2>/dev/null || true
	@echo "$(YELLOW)Killing stale xterm-ws processes (ports 7750-7799)...$(NC)"
	@for port in $$(seq 7750 7799); do lsof -ti:$$port 2>/dev/null | xargs kill -9 2>/dev/null || true; done
	@echo "$(GREEN)Creating tmux session 'devbot'...$(NC)"
	@mkdir -p logs
	@# Compute dynamic values (passed as env vars, not written to .env)
	$(eval NEW_API_KEY := $(shell openssl rand -hex 32))
	$(eval SUPERREPO_DIR := $(realpath $(CURDIR)/../../../user-superrepo))
	$(eval DYNAMIC_ENV := API_KEY=$(NEW_API_KEY) VITE_API_KEY=$(NEW_API_KEY) CLAUDE_WORK_DIR=$(SUPERREPO_DIR) BACKEND_PORT=$(BACKEND_PORT) BACKEND_HOST=0.0.0.0 VITE_BACKEND_PORT=$(BACKEND_PORT) VITE_CLAUDE_WORK_DIR=$(SUPERREPO_DIR))
	@echo "$(GREEN)Dynamic env: API_KEY=<generated>, CLAUDE_WORK_DIR=$(SUPERREPO_DIR)$(NC)"
	@tmux new-session -d -s devbot -n backend -c $(CURDIR)
	@tmux send-keys -t devbot:backend 'set -a && source .env && set +a && export $(DYNAMIC_ENV) && cd backend && npm rebuild && npm run dev 2>&1 | tee ../logs/backend.log' C-m
	@sleep 2
	@tmux new-window -t devbot -n app -c $(CURDIR)
	@tmux send-keys -t devbot:app 'export $(DYNAMIC_ENV) && cd app && npm run dev -- --port=$(APP_PORT) 2>&1 | tee ../logs/frontend.log' C-m
	@echo ""
	@echo "$(GREEN)✅ All DevBot services started!$(NC)"
	@echo ""
	@TAILSCALE_IP=$$(tailscale ip -4 2>/dev/null || echo "0.0.0.0"); \
	echo "$(BLUE)Services:$(NC)"; \
	echo "  ✓ Backend:   http://$$TAILSCALE_IP:$(BACKEND_PORT)"; \
	echo "  ✓ App:       http://$$TAILSCALE_IP:$(APP_PORT)"
	@echo ""
	@echo "$(YELLOW)Use 'tmux attach -t devbot' to view logs$(NC)"
	@echo "$(YELLOW)Use 'make stop' to stop all services$(NC)"

stop:
	@echo "$(YELLOW)Stopping all DevBot services...$(NC)"
	@if tmux has-session -t devbot 2>/dev/null; then \
		tmux kill-session -t devbot; \
		echo "$(GREEN)✅ Tmux session 'devbot' stopped$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  Tmux session 'devbot' not running$(NC)"; \
	fi
	@npx kill-port $(BACKEND_PORT) $(APP_PORT) 2>/dev/null || true
	@echo "$(GREEN)✅ All DevBot services stopped$(NC)"
