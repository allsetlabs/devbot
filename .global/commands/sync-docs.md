---
description: Sync all documentation with current codebase
model: opus
---

# Sync Documentation Command

Keeps project documentation aligned with the actual codebase: prunes docs for workspaces that no longer exist, flags workspaces that are undocumented, and refreshes structural sections (directory listings, tech-stack versions, command tables) inside existing docs.

## What This Command Does

1. **Discover workspaces** — from the root `package.json` `"workspaces"` field or top-level directories containing a `package.json` / `pyproject.toml`.
2. **Locate the docs folder** — typically `docs/` at the repo root. If no `docs/` exists, fall back to the root `README.md` as the single doc to check.
3. **Match docs to workspaces** — look for per-workspace docs using common patterns (`docs/<workspace>.md`, `docs/doc-<workspace>.md`, `docs/<workspace>/README.md`). Build a mapping of workspace → doc (or "missing").
4. **Report stale docs** — any doc that references a workspace that no longer exists.
5. **Report missing docs** — any workspace that has no matching doc.
6. **Refresh doc structural sections** — for each doc that does have a matching workspace, compare its "Project Structure", "Tech Stack", and command sections against the actual workspace and update them in place. Leave prose alone.
7. **Sync `.claude/` and `.global/` inventory docs** if they exist — compare the documented agents/commands list against the actual files in `.claude/agents/`, `.claude/commands/`, `.global/agents/`, `.global/commands/`, and update.
8. **Sync the root `CLAUDE.md` workspace list and the root `Makefile` targets** — remove entries for workspaces that no longer exist; flag workspaces that exist but have no Makefile target.

## Execution

### Step 1: Discover Workspaces

```bash
# From package.json "workspaces"
cat package.json | jq -r '.workspaces[]?' 2>/dev/null || true

# Or fall back to top-level dirs with a manifest
find . -maxdepth 3 -type f \( -name "package.json" -o -name "pyproject.toml" \) -not -path "*/node_modules/*" | xargs -I {} dirname {} | sort -u
```

Record the full set as `$WORKSPACES`.

### Step 2: Discover Docs

```bash
ls docs/ 2>/dev/null
find docs -maxdepth 2 -name "*.md" 2>/dev/null
```

Build `$DOCS` — every markdown file under `docs/`.

### Step 3: Match Docs ↔ Workspaces

For each file in `$DOCS`, try to extract the workspace name it covers:

- `docs/<name>.md` → workspace = `<name>`
- `docs/doc-<name>.md` → workspace = `<name>`
- `docs/<name>/README.md` → workspace = `<name>`
- Otherwise, read the first heading/section and try to match against `$WORKSPACES`

Produce three lists:

- **Matched** — doc + workspace pair, both exist
- **Stale docs** — doc exists, workspace does not
- **Missing docs** — workspace exists, no doc

### Step 4: Handle Stale and Missing

- **Stale docs**: list them and ask whether to delete. Do not auto-delete.
- **Missing docs**: list them. Offer to scaffold a stub doc per workspace if the user wants.

### Step 5: Refresh Matched Docs

For each matched doc:

1. Read the doc.
2. Re-scan the workspace directory: `ls <workspace>/src/` (or equivalent for the language).
3. Read the workspace's `package.json` dependencies.
4. If the doc has a "Project Structure" / "Directory Structure" section, update it to match the current tree.
5. If the doc has a "Tech Stack" / "Dependencies" section, update versions to match `package.json`.
6. If the doc documents Makefile targets for the workspace, compare against the actual `Makefile` and update.
7. Leave prose, examples, and editorial content untouched.

### Step 6: Sync Root `CLAUDE.md` and `Makefile`

- Compare the root `CLAUDE.md` workspace list against `$WORKSPACES`. Update if different.
- Compare the root `Makefile` targets against `$WORKSPACES`. Remove targets for deleted workspaces and flag workspaces that exist but have no Makefile target.

### Step 7: Sync `.claude/` / `.global/` Inventory

If the repo documents its agents/commands somewhere (e.g., `.claude/README.md`), compare:

```bash
ls .claude/agents/ .claude/commands/ .global/agents/ .global/commands/ 2>/dev/null
```

against the documented list and update.

## Rules

1. **Read first** - Always read the doc before checking the codebase.
2. **Minimal changes** - Only update what actually differs.
3. **Structure only** - Update directory structures, versions, lists, command tables. Leave prose alone.
4. **Auto-discover, don't hardcode** - Never assume a specific workspace name or doc filename; discover them at runtime.
5. **Ask before deleting** - Stale docs and Makefile targets must be confirmed before removal.

## Report

After completion, output:

```
## Sync Complete

**Last synced:** [current date in YYYY-MM-DD format]

### Workspaces
- Total discovered: {N}
- Documented: {N}
- Undocumented: {N}  [list]

### Docs
- Matched and refreshed: {N}  [list with "updated" / "no change"]
- Stale (no matching workspace): {N}  [list — awaiting user confirmation to delete]
- Missing (workspace has no doc): {N}  [list]

### Root CLAUDE.md
- [what changed]

### Root Makefile
- [what changed]
```
