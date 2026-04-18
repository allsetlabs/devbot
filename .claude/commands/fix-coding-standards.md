---
description: Auto-fix coding standard violations across all modules
model: opus
---

# Fix Coding Standards Command

**First, read the `coding-standards` skill** (`.claude/skills/coding-standards/SKILL.md`) — it contains all rules, forbidden patterns, detection methods, and auto-fix instructions.

Then scan all modules and **auto-fix every violation found**.

## Execution

### Step 1: Read the Skill

Read `.claude/skills/coding-standards/SKILL.md` to load all rules, detection patterns, and fix instructions.

### Step 2: Scan and Fix Each Module

For each module in `modules/`:

1. Run all detection checks from the skill
2. **For every violation found, fix it immediately** — edit the file, update imports, delete barrel files, pin versions, etc.
3. Run `npm run lint --fix` and `npm run type-check` for modules that have them
4. Collect a log of what was fixed per module

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
