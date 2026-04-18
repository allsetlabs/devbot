---
description: Auto-fix CLAUDE.md, Makefile, and coding standard violations across all modules
model: opus
---

# Fix Auto-Fixable Standards Command

Reads the root `CLAUDE.md` to understand current standards, then audits every submodule's `CLAUDE.md` and `Makefile` for compliance. **Auto-fixes every violation it finds**, then reports what was changed.

## Step 1: Read Root Standards

```bash
cat CLAUDE.md
```

Extract and internalize:

- **CLAUDE.md rules** — what module CLAUDE.md files should and should NOT contain
- **Makefile requirements** — required targets (`setup`, `install`, `start`), port hardcoding rules
- **Port registry** — assigned ports per module

## Step 2: Discover All Modules

```bash
ls modules/
cat .gitmodules
```

Build a list of all submodules to audit.

## Step 3: Audit Each Module

For each module in `modules/`:

### 3a. Check CLAUDE.md Exists

If missing, create one following root standards:

- Starts with a description of what the project is about (most important)
- Documents module-specific patterns only
- Does NOT include standard Makefile commands, port tables, lint/test commands, or code standards from root

### 3b. Audit CLAUDE.md Content

Read the module's `CLAUDE.md` and flag violations:

**Must NOT contain (these belong in root only):**

- `make setup` / `make install` / `make start` / `make stop` command blocks (unless module-specific targets like `make run-web`)
- Port tables (`| Service | Port |` etc.)
- `npm run lint` / `npm run type-check` instructions
- Chrome MCP testing instructions
- Code standards (custom colors, TypeScript strict, etc.)
- Forbidden patterns list

**Must contain:**

- Clear explanation of what the project is and what it does
- Module-specific architecture, patterns, or conventions that an agent needs

If violations found, rewrite the CLAUDE.md:

1. Preserve all module-specific content (architecture, database schemas, plugin systems, workflows)
2. Remove all duplicated root-level standards
3. Ensure the opening paragraph explains what the project is about

### 3c. Check Makefile Exists

If missing, create one following the root standard pattern with `setup`, `install`, `start` targets and port variables at the top.

### 3d. Audit Makefile

Read the module's `Makefile` and check:

- Has `setup` target (idempotent, checks for system deps)
- Has `install` target (project-level deps only)
- Has `start` target (single entry point for all services)
- Ports are defined as variables at the top (not in .env or config files)
- Ports match the registry in root CLAUDE.md

If `setup` is missing, add it. If ports don't match registry, flag it.

### 3e. Check Port Registry

Compare module's port variables against the root CLAUDE.md port registry. Flag any mismatches or missing entries.

## Step 4: Update Root Port Registry

If any module has ports not listed in the root CLAUDE.md registry, add them.

## Rules

1. **Read root CLAUDE.md first** — it is the single source of truth for standards
2. **Minimal changes** — only fix what actually violates standards
3. **Preserve module-specific content** — never remove architecture docs, database schemas, plugin systems, etc.
4. **Don't add boilerplate** — if a module doesn't need something, don't add it just for consistency

## Step 5: Commit Changes

Commit all fixes in a single commit. Do NOT push. Example commit message:

```
fix: auto-fix CLAUDE.md and Makefile standard violations across modules
```

## Report

After completion, output:

```
## Standards Sync Complete

**Last synced:** [current date in YYYY-MM-DD format]

### Fixed
- [module]: [what was fixed]

### Already Compliant
- [module]

### Warnings
- [module]: [issue that needs manual review]
```
