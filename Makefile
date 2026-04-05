# DevBot Makefile
# Usage: cd modules/devbot && make <target>

# Colors
GREEN := \033[0;32m
BLUE := \033[0;34m
YELLOW := \033[1;33m
NC := \033[0m

APP_PORT := 4005
BACKEND_PORT := 3100

.PHONY: help setup install start stop

help:
	@echo "$(BLUE)DevBot Commands:$(NC)"
	@echo "  make install    - Install app and backend dependencies"
	@echo "  make start      - Start app and backend in tmux session 'devbot'"
	@echo "  make stop       - Stop all DevBot services"

setup:
	@echo "$(BLUE)Checking system dependencies...$(NC)"
	@command -v node >/dev/null 2>&1 || { echo "Installing Node.js..."; brew install node; }
	@command -v tmux >/dev/null 2>&1 || { echo "Installing tmux..."; brew install tmux; }
	@echo "$(GREEN)All system dependencies ready!$(NC)"

install:
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
	@tmux new-session -d -s devbot -n backend -c $(CURDIR)
	@tmux send-keys -t devbot:backend 'set -a && source .env && set +a && cd backend && npm rebuild && npm run dev 2>&1 | tee ../logs/backend.log' C-m
	@sleep 2
	@tmux new-window -t devbot -n app -c $(CURDIR)
	@tmux send-keys -t devbot:app 'cd app && npm run dev -- --port=$(APP_PORT) 2>&1 | tee ../logs/frontend.log' C-m
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
