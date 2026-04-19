---
description: Analyze codebase for code duplication and reuse opportunities
model: opus
---

# Code Duplication Analysis Command

Scans all modules for duplicated code patterns and generates a prioritized report of reuse opportunities with concrete refactoring recommendations.

## What This Command Analyzes

### 1. Backend Route Patterns

For each module with a backend, scan route files for:

| Pattern                          | How to detect                                                                                                                                                                     |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Duplicate data transformers**  | Find all `rowTo*()` / `mapTo*()` functions across route files. Flag when 3+ files have structurally identical transformer patterns (input row → output DTO with field mapping)    |
| **Duplicate CRUD handlers**      | Find GET/POST/PUT/DELETE handlers that follow identical patterns: validate → generate ID → insert → transform → respond. Flag when the same handler skeleton appears in 3+ routes |
| **Duplicate validation chains**  | Find sequences of `requireString()` / `requireNumber()` / validation calls that repeat across route files                                                                         |
| **Duplicate GET-by-ID handlers** | Find `select().from(table).where(eq(table.id, req.params.id)).limit(1)` patterns repeated across routes                                                                           |

### 2. Frontend Page Patterns

For each module with a frontend, scan page/component files for:

| Pattern                           | How to detect                                                                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Duplicate list page structure** | Find pages that share: query hook + loading state + empty state + error banner + mapped list layout. Flag when 3+ pages follow the same skeleton |
| **Duplicate form patterns**       | Find forms with identical submit/validate/reset logic across pages                                                                               |
| **Oversized components**          | Flag any `.tsx` file over 200 lines (per code standards) with suggestions for splitting                                                          |

### 3. Cross-Module Patterns

| Pattern                       | How to detect                                                 |
| ----------------------------- | ------------------------------------------------------------- |
| **Shared utility candidates** | Find identical helper functions duplicated across modules     |
| **API client patterns**       | Find identical fetch/axios setup repeated in multiple modules |

## Execution

### Step 1: Discover Workspaces

Auto-discover every workspace in the project:

1. Read the root `package.json`. If it declares `"workspaces"`, expand those globs.
2. Otherwise list top-level directories containing a `package.json` (e.g., `app/`, `backend/`, `apps/*`, `packages/*`, `plugins/*`).
3. For Python modules, look for `pyproject.toml` or `requirements.txt`.

Classify each workspace as frontend (has `.tsx`/React deps), backend (has `express`/`fastify`/server entry), shared library (used by `workspace:*` deps), or plugin (nested under a plugins directory). Skip `node_modules/`, `dist/`, `build/`, `.git/`, `venv/`, `.next/`, `.turbo/`.

### Step 2: Scan Each Workspace

For each workspace, read all source files (skip `node_modules/`, `dist/`, `build/`, `.git/`).

For backend routes:

- Read every file in `*/routes/` or `*/api/` directories
- Identify all transformer functions, CRUD handlers, validation chains
- Calculate similarity scores between patterns (percentage of shared structure)

For frontend pages:

- Read every file in `*/pages/` or `*/views/` directories
- Identify list page patterns, form patterns, state management patterns
- Flag oversized components

### Step 3: Score and Prioritize

For each duplicated pattern found:

1. **Similarity score** — percentage of structural overlap (0-100%)
2. **Impact** — estimated lines saved by extracting to a shared abstraction
3. **Effort** — estimated complexity of the refactor (low/medium/high)
4. **Priority** — HIGH (>80% similar, >100 lines saved), MEDIUM (>60% similar, >50 lines saved), LOW (other)

### Step 4: Generate Recommendations

For each HIGH and MEDIUM priority pattern, provide:

1. **What to create** — the shared abstraction (factory, component, utility)
2. **Where to put it** — file path for the new shared code
3. **Code example** — concrete implementation of the shared abstraction
4. **Files to refactor** — list of files that would use the new abstraction
5. **Lines saved** — estimated reduction

### Step 5: Report

Output:

```
## Code Duplication Analysis

**Last analyzed:** [current date in YYYY-MM-DD format]

### HIGH PRIORITY (Refactor Now)

#### [Pattern Name] — [similarity]% similar, ~[lines] lines saved
**Files:**
- [file:lines] — [function/pattern name]

**Recommendation:** [What to create and where]

**Example:**
[code block]

**Impact:** [lines saved, maintenance improvement]

---

### MEDIUM PRIORITY (Refactor Soon)

#### [Pattern Name] — [similarity]% similar, ~[lines] lines saved
...

### LOW PRIORITY (Consider Later)
...

### Established Patterns (Already Good)
- [pattern]: [where it lives] — [how many files use it]

### Anti-Patterns Detected
- [anti-pattern]: [files affected] — [severity]

### Architecture Insights
- [observation about codebase structure]
```

## Rules

1. **Scan only source files** — skip `node_modules/`, `dist/`, `build/`, `.git/`, `venv/`

2. **Be concrete** — every recommendation must include a code example, not just a description
3. **Acknowledge good patterns** — report established patterns that are already well-extracted
4. **Prioritize by impact** — HIGH priority items should deliver the most value for the least effort
5. **Include file references** — every finding must reference specific files and line numbers
