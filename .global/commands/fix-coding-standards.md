---
description: Auto-fix coding standard violations across all modules
model: opus
---

# Fix Coding Standards Command

**First, load the `coding-standards` skill** — it contains all rules, forbidden patterns, detection methods, and auto-fix instructions. Also read the project's root `CLAUDE.md` for any project-specific overrides (stricter rules, custom color palettes, etc.).

Then scan every workspace and **auto-fix every violation found**.

## Execution

### Step 1: Load Standards

1. Load the `coding-standards` skill to get the rule set, detection patterns, and fix instructions.
2. Read the project's root `CLAUDE.md` (if present) for project-specific overrides.

### Step 2: Scan and Fix Each Workspace

Auto-discover workspaces:

1. Read the root `package.json` `"workspaces"` field, or list top-level directories containing a `package.json` / `pyproject.toml`.
2. Skip `node_modules/`, `dist/`, `build/`, `.git/`, `venv/`, `.next/`, `.turbo/`.

For each workspace:

1. Run all detection checks from the skill
2. **For every violation found, fix it immediately** — edit the file, update imports, delete barrel files, pin versions, etc.
3. Run `npm run lint --fix` and `npm run type-check` for workspaces that have them
4. Collect a log of what was fixed per workspace

### Step 3: Commit Changes

Commit all fixes in a single commit. Do NOT push. Example commit message:

```
fix: auto-fix coding standard violations across modules
```

### Step 4: Report

```
## Coding Standards Audit

**Last audited:** [current date in YYYY-MM-DD format]

### Fixes Applied

#### [module-name]
- [rule]: [file:line] — [what was changed]

### Clean Modules (no violations found)
- [module-name]

### Remaining Issues (could not auto-fix)
- [module-name]: [rule] — [why it needs manual intervention]

### Lint/Type Check Results
- [module-name]: PASS / FAIL ([error count] errors)
```
