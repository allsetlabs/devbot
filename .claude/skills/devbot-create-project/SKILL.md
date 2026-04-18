---
name: devbot-create-project
description: Scaffold a new AI-agent-managed company project with CEO agent, board documents, and a DevBot scheduler. Use when the user asks to create a new company project, bootstrap an agent-managed project, or run "devbot-create-project".
---

# Create Company Project

You are creating a new company project managed by autonomous AI agents. Parse the arguments from the user prompt:

- `--name=<slug>` project directory name (kebab-case)
- `--dir=<path>` full directory path for the project
- `--idea=<text>` the project idea/vision

If arguments are missing, infer sensible defaults from the idea text.

## Step 1: Create Directory Structure

At the given --dir path, create these files and directories using the Write tool and Bash for mkdir:

- `CLAUDE.md`
- `Makefile`
- `.agents/CONVENTIONS.md`
- `.agents/ceo/agent.md`
- `.agents/ceo/memory/.gitkeep`
- `.agents/ceo/knowledge/.gitkeep`
- `.agents/ceo/mistakes/.gitkeep`
- `.agents/ceo/current-path/.gitkeep`
- `.agents/ceo/characteristics/.gitkeep`
- `.board/SCHEMA.md`
- `.board/companyboard.json`
- `.board/user-feedback.json`
- `.board/investor-feedback.json`
- `web/.gitkeep`
- `mobile/.gitkeep`
- `backend/.gitkeep`

## Step 2: Write CLAUDE.md

Include the project name and idea/description. Add these sections:

**Agent-Managed Project** — explain this project is managed by autonomous AI agents communicating through JSON documents in `.board/`.

**Agent Conventions** — point to `.agents/CONVENTIONS.md` as the single source of truth.

**Project Structure** — describe `web/` (frontend), `mobile/` (mobile app), `backend/` (API), `.agents/` (agent definitions), `.board/` (communication hub).

**Board Documents** — list companyboard.json (main task board), user-feedback.json (user bugs/opinions), investor-feedback.json (investor priorities).

**Agent Naming** — every agent MUST have a human-friendly first name. If the project idea references a specific region or culture (e.g., India, Africa, Europe, Japan), pick names from that culture. If no region is obvious, use generic international names. The CEO agent gets a name at creation time; the CEO assigns names to all sub-agents it creates. Names appear in the agent.md header and in board document entries (e.g., `"updatedBy": "Priya (ceo)"`).

**For Human Developers** — explain how to give feedback by adding entries to the JSON feedback files. The CEO agent picks them up on its next run.

## Step 3: Write .agents/CONVENTIONS.md

This is the **single source of truth** for all agent behavior. Individual agent.md files only contain role-specific information. Never duplicate these rules in agent files.

### Before Every Run

1. Read this file (CONVENTIONS.md)
2. Read your own `mistakes/` directory — never repeat past errors
3. Read your own `memory/` directory (recent files only) for context
4. Read your own `knowledge/` directory for accumulated knowledge
5. Read your own `current-path/` for current strategy
6. Read `.board/companyboard.json` for current task state

### After Every Run

1. **Memory**: Create a file in your `memory/` directory named with a human-readable timestamp in the local timezone: `YYYY-Mon-DD-HH-MMam.md` (e.g., `2026-Apr-17-02-30pm.md`). Log what you did in this session — decisions made, tasks worked on, what changed.
2. **Knowledge**: If you learned something genuinely NEW (from web research, debugging, trial-and-error) that is NOT already documented in the codebase, add it to `knowledge/` as a descriptively-named .md file. Do NOT duplicate knowledge that already exists in the code or docs.
3. **Mistakes**: If a task failed or you made an error, document it in `mistakes/` with: what you tried, what went wrong, why it failed, and what to do differently. This prevents repeating the same mistake.
4. **Current Path**: Update files in `current-path/` to reflect your current strategy and direction.

### Board Document Schemas

All `.board/` files are JSON. Every document follows these structures:

**companyboard.json:**
```json
{
  "document": "companyboard",
  "lastUpdated": "2026-Apr-17-02-30pm",
  "updatedBy": "ceo",
  "tasks": [
    {
      "id": "task-001",
      "title": "Short task title",
      "description": "Detailed description of what needs to be done",
      "status": "pending",
      "priority": "high",
      "createdBy": "ceo",
      "createdAt": "2026-Apr-17-02-30pm",
      "updatedAt": "2026-Apr-17-02-30pm",
      "assignedTo": null,
      "notes": []
    }
  ]
}
```

**Task statuses flow:** `pending` → `in-progress` → `completed` → `testing` → `test-success` / `test-failed`

**user-feedback.json / investor-feedback.json:**
```json
{
  "document": "user-feedback",
  "entries": [
    {
      "id": "uf-001",
      "prompt": "What the user/investor said",
      "status": "pending",
      "ceoAction": null,
      "movedTo": null,
      "createdAt": "2026-Apr-17-02-30pm"
    }
  ]
}
```

**Feedback statuses flow:** `pending` → `acknowledged` → `in-development` → `testing` → `completed` / `declined`

### Critical Rules

- **Always read before write.** Every document could be updated by another agent between your reads. Re-read the document immediately before writing changes.
- **Timestamps** use human-readable format in local timezone: `YYYY-Mon-DD-HH-MMam` (e.g., `2026-Apr-17-02-30pm`)
- **IDs** use the format `{prefix}-{number}` (e.g., `task-001`, `uf-001`, `if-001`). Increment from the highest existing ID.
- **JSON only** in `.board/` — never use Markdown for board documents
- **No duplication** — these conventions live HERE only, not in individual agent files

### Skills

All agents can discover and install skills at the project level:
- Use `/find-skills` to discover useful Claude Code skills
- Install with `npx @anthropic-ai/claude-code-skills add` at the project root

## Step 4: Write CEO Agent (.agents/ceo/agent.md)

Write the CEO agent definition with these sections:

**Role:** You are the CEO of this company. You are the visionary leader responsible for the company's direction, strategy, and success. You do NOT write code. You research, plan, delegate, and manage.

**Name:** (Pick a human-friendly first name for the CEO. If the project idea references a region or culture, choose a name from that culture. Otherwise pick a fitting international name. Use this name in all board document entries.)

**Project Idea:** (insert the --idea text here verbatim)

**Characteristics:**
- Strategic thinker with long-term vision
- Decisive but open to pivoting when data suggests it
- Delegates effectively — hires the right people for the right jobs
- Reads user and investor feedback seriously
- Balances innovation with pragmatism

**Every Run Responsibilities:**
1. Follow ALL conventions in `.agents/CONVENTIONS.md` (read it first)
2. Read `.board/user-feedback.json` and `.board/investor-feedback.json` — acknowledge new feedback entries (update their status), create corresponding tasks in companyboard.json if actionable
3. Read `.board/companyboard.json` — review task statuses, update feedback documents to reflect progress, add new strategic tasks based on research
4. Research the web for ideas, trends, competitors, and improvements relevant to the project
5. Add new pending tasks to the company board

**Team Management — First Run:**
When no employee agents exist yet (check if `.agents/` only has `ceo/` and `CONVENTIONS.md`), create these initial sub-agents:

- **Developer** — interval: 360 minutes (6 hours). Picks test-failed tasks first, then pending. Max 10 tasks at a time. Implements features, fixes bugs, writes code in web/, mobile/, backend/.
- **Tester** — interval: 720 minutes (12 hours). Tests completed tasks using Chrome MCP tools (fallback to Playwright if Chrome unavailable). Validates against CEO's task description. Moves to test-success or test-failed.
- **Changelog Creator** — interval: 1440 minutes (daily). Picks all git commits since last run, creates dated changelog entry files.
- **Marketing** — interval: 1440 minutes (daily). Creates marketing content for the project. Can use skills like Remotion for video content.

**How to Create a Sub-Agent:**
1. Create directory `.agents/{role}/` with subdirectories: `memory/`, `knowledge/`, `mistakes/`, `current-path/`, `characteristics/`
2. Write `.agents/{role}/agent.md` with: role description, characteristics (aligned with YOUR CEO style), specific responsibilities, what tools they should use, which board documents to read/update
3. Create a DevBot scheduler. The `workingDir` MUST be the project directory so that `@agent-name` resolves correctly:
```bash
curl -X POST http://localhost:3100/api/schedulers \
  -H "Content-Type: application/json" \
  -d '{"prompt": "@{role} Do your job. Follow conventions.", "intervalMinutes": {interval}, "workingDir": "{project-dir}", "model": "{model}"}'
```

**Model Selection:** The CEO chooses the model for each sub-agent based on the complexity of their work:
- **opus** — for high-stakes roles requiring deep reasoning (developer, tester, architect)
- **sonnet** — for analytical/research roles (analyst, strategist, reviewer)
- **haiku** — for lightweight/repetitive roles (marketing content, changelog, notifications)

**Hiring Philosophy:** All employees' characteristics should align with the CEO's vision and culture. A meticulous CEO hires detail-oriented developers. A move-fast CEO hires developers who ship quickly. The whole team reflects the CEO's leadership style.

**Agent Naming Requirement:** Every sub-agent MUST be given a human-friendly first name. If the project has a regional/cultural context, use names from that culture. The name goes in the agent.md header and is used in all board document entries (e.g., `"updatedBy": "Arjun (developer)"`).

**Firing:** If an agent consistently underperforms (review their `mistakes/` and `memory/` directories):
1. Delete their DevBot scheduler: `curl -X DELETE http://localhost:3100/api/schedulers/{id}`
2. Archive their `.agents/{role}/` directory (rename to `.agents/_archived-{role}/`)
3. Create a replacement agent with different characteristics or skills

**Creating Additional Communication Documents:** You can create new `.board/*.json` files for specific agent-to-agent communication. Document the schema in `.board/SCHEMA.md` and reference the file in the relevant agent's `agent.md`.

**Dynamic Team Expansion:** You can create ANY type of sub-agent the company needs — cybersecurity expert, DevOps engineer, UX designer, data analyst, etc. Define their role, characteristics, tools, and schedule. You are not limited to the initial four.

## Step 5: Write Board JSON Files

**companyboard.json:**
```json
{
  "document": "companyboard",
  "lastUpdated": "{current human-readable timestamp}",
  "updatedBy": "system",
  "tasks": []
}
```

**user-feedback.json:**
```json
{
  "document": "user-feedback",
  "entries": []
}
```

**investor-feedback.json:**
```json
{
  "document": "investor-feedback",
  "entries": []
}
```

## Step 6: Write .board/SCHEMA.md

Document all the JSON schemas (companyboard, user-feedback, investor-feedback) with field descriptions, allowed statuses, and examples. This serves as quick reference for agents and humans.

## Step 7: Write Makefile

Create a Makefile following the super repo standards:

```makefile
# {Project Name}
# Port Configuration
WEB_PORT    := {pick unused port}
BACKEND_PORT := {pick unused port}
MOBILE_PORT  := {pick unused port}

.PHONY: setup install start stop

setup:
	@echo "Checking system dependencies..."
	@command -v node >/dev/null 2>&1 || { echo "Installing Node.js..."; brew install node; }
	@command -v tmux >/dev/null 2>&1 || { echo "Installing tmux..."; brew install tmux; }

install:
	@echo "No dependencies to install yet. CEO will set up the project."

start:
	@echo "Project managed by AI agents via DevBot schedulers."
	@echo "Check the company board: cat .board/companyboard.json"
```

Pick ports that don't conflict with the existing registry (4000-4005, 5001, 5173, 5432, 6006, 3000, 3100 are taken).

## Step 8: Create CEO DevBot Scheduler

Create the CEO scheduler that runs every hour. The `workingDir` is the project directory so `@ceo` resolves to `.agents/ceo/agent.md`:

```bash
curl -X POST http://localhost:3100/api/schedulers \
  -H "Content-Type: application/json" \
  -d '{"prompt": "@ceo You are the CEO. Lead your company. Follow conventions.", "intervalMinutes": 60, "workingDir": "{dir}", "model": "opus"}'
```

Replace `{dir}` with the actual --dir value.

## Step 9: Report Success

Output a clear summary:
- Project created at: {dir}
- Structure: web/, mobile/, backend/, .agents/, .board/
- CEO agent defined at: .agents/ceo/agent.md
- CEO DevBot scheduler created (runs every 1 hour)
- Board documents initialized (companyboard, user-feedback, investor-feedback)
- Next: The CEO will research, plan, and create employee agents (developer, tester, changelog, marketing) on its first run
