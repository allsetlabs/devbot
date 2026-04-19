---
description: Audit and auto-fix coding standard violations across every workspace
model: opus
---

# Sync Coding Standards Command

Scans every workspace for violations of the coding standards defined in the `coding-standards` skill (plus any project-specific overrides in the root `CLAUDE.md`), **auto-fixes every violation it finds**, then reports what was changed.

This command is very similar to `/fix-coding-standards`; use this variant when you want an audit-and-report flavor (explicit summary tables per workspace) rather than a silent auto-fix.

---

## Execution

### Step 1: Load Standards

1. Load the `coding-standards` skill — it contains the Non-Negotiable Rules, Forbidden Patterns, and the detection/auto-fix instructions for each rule.
2. Read the project's root `CLAUDE.md` (if present) for any project-specific overrides (stricter rules, custom color palettes, component library name, etc.).

### Step 2: Discover Workspaces

Auto-discover every workspace in the project:

1. Read the root `package.json`. If it declares `"workspaces"`, expand those globs.
2. Otherwise list top-level directories that contain a `package.json` / `pyproject.toml`.
3. Skip `node_modules/`, `dist/`, `build/`, `.git/`, `venv/`, `.next/`, `.turbo/`.

### Step 3: Scan and Fix Each Workspace

For each workspace:

1. Run all detection checks from the `coding-standards` skill.
2. **For every violation found, fix it immediately** — edit the file, update imports, delete barrel files, pin versions, etc.
3. Run `npm run lint -- --fix` and `npm run type-check` for workspaces that have them.
4. Collect a log of what was fixed per workspace.

### Step 4: Report

Output:

```
## Coding Standards Audit

**Last audited:** [current date in YYYY-MM-DD format]

### Fixes Applied

#### [workspace-name]
- [rule]: [file:line] — [what was changed]

### Clean Workspaces (no violations found)
- [workspace-name]

### Remaining Issues (could not auto-fix)
- [workspace-name]: [rule] — [why it needs manual intervention]

### Lint/Type Check Results
- [workspace-name]: PASS / FAIL ([error count] errors)
```

---

## Rules

1. **Scan only source files** — skip `node_modules/`, `dist/`, `build/`, `.git/`, `venv/`, `.next/`, `.turbo/`
2. **Skip component library internals** — the "No native HTML for UI" rule does not apply inside the project's component library source (that's where the primitives are defined)
3. **Auto-fix everything possible** — this command fixes every violation it can. Only report without fixing if the change is ambiguous and could break functionality. Explain why in "Remaining Issues".
4. **Count matters** — report total violation count per rule so severity is clear
5. **Project-specific overrides win** — if the project's root `CLAUDE.md` contradicts a rule in the skill, follow the project.
