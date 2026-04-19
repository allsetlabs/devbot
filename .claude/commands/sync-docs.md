---
description: Sync all documentation with current codebase
model: opus
---

> This command was inherited from a broader monorepo. The module list below is stale and needs to be rewritten for the devbot repo structure. See /Users/subbiahchandramouli/Documents/devbot/CLAUDE.md for the current layout.

# Sync Documentation Command

Sync all documentation files with actual codebase structure.

## What This Command Does

1. **Update `.claude/README.md`** - Sync agents and commands list
2. **Update `docs/`** - Sync all module documentation
3. **Update `CLAUDE.md`** - Sync module structure and commands
4. **Update `Makefile`** - Sync module commands with actual modules
5. **Run `/update-component-docs resync`** - Sync component library docs

## Execution

### Step 1: Sync .claude/README.md

```bash
ls .claude/agents/
ls .claude/agents/development/
ls .claude/commands/
```

- Read `.claude/README.md`
- Compare agent list against actual files in `.claude/agents/`
- Compare command list against actual files in `.claude/commands/`
- If different, update the file

### Step 2: Sync docs/

For each module doc file:

| Doc File                      | Compare Against                                                    |
| ----------------------------- | ------------------------------------------------------------------ |
| `docs/doc-component.md`       | `ls modules/component/src/` + `cat modules/component/package.json` |
| `docs/doc-portfolio.md`       | `ls modules/portfolio/src/`                                        |
| `docs/doc-seekr-web.md`       | `ls modules/seekr/web/src/`                                        |
| `docs/doc-seekr-extension.md` | `ls modules/seekr/extension/src/`                                  |
| `docs/doc-seekr-desktop.md`   | `ls modules/seekr/desktop/src/`                                    |
| `docs/doc-seekr-mobile.md`    | `ls modules/seekr/mobile/src/`                                     |
| `docs/doc-seekr-backend.md`   | `ls modules/seekr/backend/`                                        |

- Read the doc file
- Run the comparison commands
- If "Project Structure" section doesn't match actual directories, update it
- If package versions differ, update "Tech Stack" section

### Step 3: Sync CLAUDE.md

```bash
ls modules/
grep -E "^(install-|run-)[a-z]+:" Makefile
```

- Read `CLAUDE.md`
- Compare module list against actual `modules/` directory
- Compare Makefile commands against documented commands
- If different, update the file

### Step 4: Sync Makefile

```bash
ls modules/
ls modules/seekr/
grep -E "^(install-|run-)[a-z]+:" Makefile
```

**Validation Rules:**

1. **Remove commands for non-existent modules:**
   - Extract all `install-*` and `run-*` targets from Makefile
   - Check if corresponding module directory exists in `modules/` or `modules/seekr/`
   - If module doesn't exist, remove the install and run targets

2. **Add missing run commands:**
   - For each module that exists, verify it has a corresponding `run-*` command
   - Module to command mapping:
     | Module Path | Install Command | Run Command |
     | ----------- | --------------- | ----------- |
     | `modules/component` | `install-c` | (none - library only) |
     | `modules/portfolio` | `install-p` | `run-p` |
     | `modules/meme-vault` | `install-mv` | `run-mv` |
     | `modules/seekr/web` | `install-sw` | `run-sw` |
     | `modules/seekr/extension` | `install-se` | `run-se` |
     | `modules/seekr/desktop` | `install-sd` | `run-sd` |
     | `modules/seekr/mobile` | `install-sm` | `run-sm` |
     | `modules/seekr/backend` | `install-sb` | `run-sb` |
   - If a module exists but its run command is missing, add the target

3. **Update `start` target:**
   - Ensure the `start` tmux command includes all modules with run commands
   - Each module should have its own tmux window

4. **Update CLAUDE.md:**
   - Ensure Install/Run command tables match the Makefile targets

### Step 5: Sync Component Library Docs

Run: `/update-component-docs resync`

### Step 6: Sync Storybook Stories

Ensure every component has a corresponding `.stories.tsx` file.

```bash
# Find UI components without stories
ls modules/component/src/components/ui/*.tsx | xargs -n1 basename -s .tsx | grep -v stories | sort > /tmp/all.txt
ls modules/component/src/components/ui/*.stories.tsx | xargs -n1 basename -s .stories.tsx | sort > /tmp/has.txt
comm -23 /tmp/all.txt /tmp/has.txt

# Find AI elements without stories
ls modules/component/src/components/ai-elements/*.tsx | xargs -n1 basename -s .tsx | grep -v stories | sort > /tmp/ai_all.txt
ls modules/component/src/components/ai-elements/*.stories.tsx 2>/dev/null | xargs -n1 basename -s .stories.tsx | sort > /tmp/ai_has.txt
comm -23 /tmp/ai_all.txt /tmp/ai_has.txt
```

**For each component missing a story:**

1. Read the component file to understand its props and variants
2. Create a `.stories.tsx` file next to it following existing story patterns
3. Include: Default story, key variant stories, and interactive examples
4. Follow the existing Storybook conventions in the project

**For existing stories that are outdated:**

1. Compare story props against current component props
2. Add stories for any new variants or props not covered
3. Remove stories for deprecated/removed props

## Rules

1. **Read first** - Always read the doc before checking codebase
2. **Minimal changes** - Only update what actually differs
3. **Structure only** - Update directory structures, versions, lists
4. **Makefile consistency** - Remove orphaned commands, add missing run commands

## Report

After completion, output:

```
## Sync Complete

**Last synced:** [current date in YYYY-MM-DD format]

### Updated
- [file]: [what changed]

### Already in sync
- [file]
```
