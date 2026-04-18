---
name: devbot-commit
description: Git workflow with branch protection, naming conventions, and commit standards. Use when performing any git operation (commit, push, branch, merge).
---

# Git Workflow

Read and follow ALL rules below before performing any git operation.

## Branch Protection (CRITICAL)

**NEVER work directly on the `main` branch.** The `main` branch is protected by PreToolUse hooks.

### Blocked Actions on `main`:

- `git push` while on main
- `git commit` while on main
- `git rebase` / `git reset` on main
- `git merge` INTO main directly
- Any destructive operation targeting main

### Allowed on `main`:

- `git pull origin main`
- `git checkout main` (to branch off)
- `git checkout -b <new-branch>`
- `git status`, `git log`, `git diff`

## Branch Naming Convention

| Prefix      | Purpose                              | Example                       |
| ----------- | ------------------------------------ | ----------------------------- |
| `feat/`     | New features                         | `feat/add-dark-mode`          |
| `fix/`      | Bug fixes                            | `fix/login-redirect`          |
| `hotfix/`   | Urgent production fixes              | `hotfix/crash-on-launch`      |
| `refactor/` | Code restructuring (no new behavior) | `refactor/split-user-service` |
| `chore/`    | Maintenance, deps, config            | `chore/update-dependencies`   |
| `docs/`     | Documentation only                   | `docs/update-readme`          |
| `test/`     | Adding or updating tests             | `test/add-auth-tests`         |
| `style/`    | Formatting, UI styling               | `style/fix-nav-alignment`     |
| `perf/`     | Performance improvements             | `perf/optimize-image-loading` |
| `ci/`       | CI/CD pipeline changes               | `ci/add-deploy-step`          |

**Rules:**

- Always lowercase with hyphens: `feat/my-feature` (not `feat/My_Feature`)
- Keep names short but descriptive
- Include module name when needed: `feat/devbot-add-chat`
- Match commit prefix to branch prefix: `feat/` branch -> `feat:` commit

## Commit Message Format

```
<type>(<scope>): <short description>

<optional body>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

**Types** (match branch prefix): `feat`, `fix`, `hotfix`, `refactor`, `chore`, `docs`, `test`, `style`, `perf`, `ci`

**Scope** = module name (`devbot`, `seekr`, `portfolio`, `meme-vault`, `component`). Omit scope for cross-module changes.

## Execution Steps

When `/commit` is invoked, execute these steps in order:

### Step 1: Analyze Changes

Run in parallel:

- `git branch --show-current`
- `git status`
- `git diff --staged` and `git diff` (to see all changes)
- `git log --oneline -5` (for commit message style reference)

If there are no changes to commit, inform the user and stop.

### Step 2: Branch Check

- **If on a feature branch** (not `main`): continue to Step 3.
- **If on `main`**: create a new branch based on the changes:
  - Analyze the diff to determine the appropriate prefix (`feat/`, `fix/`, `chore/`, etc.)
  - Generate a descriptive branch name from the changes
  - Run: `git checkout -b <prefix>/<descriptive-name>`

### Step 3: Commit

1. Stage specific changed files (avoid `git add .` — list files explicitly)
2. Draft a commit message following the format above
3. Commit using HEREDOC format:

```bash
git commit -m "$(cat <<'EOF'
<type>(<scope>): <short description>

<optional body>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

### Step 4: Push & Create PR

1. Push the branch: `git push -u origin <branch-name>`
2. Create a PR to main:

```bash
gh pr create --title "<type>(<scope>): <short description>" --body "$(cat <<'EOF'
## Summary
- <bullet points describing changes>

## Test Plan
- [ ] <testing steps>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

3. Show the PR URL to the user.

### Step 5: Merge Decision

- **If user explicitly said "merge" or "merge to main"** in their original message (`$ARGUMENTS`): auto-merge immediately using squash, then pull main.
- **Otherwise**: Ask the user if they want to auto-merge the PR.

To merge:

```bash
gh pr merge <pr-number> --squash --delete-branch
git checkout main && git pull origin main
```

After merge, confirm to the user that the PR was merged and main is up to date.

### Important Notes

- **NEVER** use `--no-verify` flag
- **NEVER** use `git add .` or `git add -A` — always stage specific files
- PR title follows commit message format
- Keep PR title under 70 chars
- Default merge strategy is `--squash` unless user specifies otherwise
