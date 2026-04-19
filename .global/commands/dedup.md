---
description: Analyze code for duplicacy, create reusable utils, and refactor files to reduce duplication
model: opus
---

# Dedup - Code Deduplication Command

Analyze source files for duplicate code patterns, extract reusable utilities, and refactor files to use them.

## CRITICAL RULES

1. **Read before modifying** - Always read files fully before changing them
2. **Minimal blast radius** - Only refactor clear, proven duplicates (3+ occurrences)
3. **No behavior changes** - Extracted utils must preserve exact behavior
4. **Run validation after** - `npm run lint && npm run type-check` must pass
5. **Follow project standards** - Read the project's root `CLAUDE.md` and any project-local skills (e.g. `coding-standards`) before refactoring; apply whatever rules that project enforces (naming, colors, component library usage, etc.)

---

## Phase 0: Workspace Selection

**Determine which workspace to analyze.**

### If a workspace path is specified in arguments:

The user may pass any workspace path relative to the repo root, e.g.:

```
/dedup app
/dedup backend
/dedup packages/ui
/dedup plugins/<name>
```

Set `$MODULE` to that path and skip to Phase 1.

### If no workspace is specified:

Auto-discover workspaces by reading the root `package.json` `"workspaces"` field, or by listing top-level directories that contain a `package.json` / `pyproject.toml`:

```bash
# Show available workspaces
find . -maxdepth 3 -type f \( -name "package.json" -o -name "pyproject.toml" \) -not -path "*/node_modules/*" | xargs -I {} dirname {} | sort -u
```

Then use AskUserQuestion: "Which workspace should I analyze for duplicate code?"

---

## Phase 1: Discovery - Find All Source Files

Scan the module's source directory for analyzable files.

```bash
# Find all TypeScript/JavaScript source files (exclude node_modules, dist, tests, stories)
Glob: "$MODULE/src/**/*.{ts,tsx,js,jsx}" (exclude node_modules, dist, .test., .spec., .stories.)
```

Group files by type:

- **Components** (`*.tsx` in components/)
- **Pages/Views** (`*.tsx` in pages/ or views/)
- **Hooks** (`use*.ts`)
- **Utils/Helpers** (`*.ts` in utils/ or helpers/ or lib/)
- **Services/API** (`*.ts` in services/ or api/)
- **Types** (`*.ts` in types/)
- **Other** (everything else)

---

## Phase 2: Deep Analysis - Identify Duplicates

### 2.1 Function-Level Duplicates

Search for functions/logic that appear in multiple files:

```bash
# Find repeated function signatures
Grep: "export (const|function)" in $MODULE/src/ --include="*.ts" --include="*.tsx"

# Find repeated utility patterns
Grep: "\.map\(|\.filter\(|\.reduce\(|\.sort\(" in $MODULE/src/

# Find repeated formatting functions (dates, strings, numbers, currency)
Grep: "toLocaleString|toLocaleDateString|format|padStart|toLowerCase|toUpperCase|trim|replace\(" in $MODULE/src/

# Find repeated array/object manipulation
Grep: "Object\.keys|Object\.values|Object\.entries|Array\.from|\.flat\(|\.flatMap\(" in $MODULE/src/

# Find repeated conditional logic
Grep: "\.includes\(|\.startsWith\(|\.endsWith\(" in $MODULE/src/
```

### 2.2 Hook-Level Duplicates

```bash
# Find repeated state patterns (useState + useEffect combos)
Grep: "useState|useEffect|useMemo|useCallback" in $MODULE/src/

# Find repeated query patterns
Grep: "useQuery|useMutation" in $MODULE/src/

# Find repeated event handlers
Grep: "handle[A-Z]|on[A-Z].*=" in $MODULE/src/
```

### 2.3 Style/Class Duplicates

```bash
# Find repeated className strings
Grep: "className=\"|className={" in $MODULE/src/

# Find repeated Tailwind patterns
Grep: "flex |grid |rounded|shadow|border|gap-|p-|m-|text-|bg-|w-|h-" in $MODULE/src/
```

### 2.4 Type Definition Duplicates

```bash
# Find repeated interface/type definitions
Grep: "interface |type .*=" in $MODULE/src/

# Find repeated generic patterns
Grep: "Record<|Partial<|Pick<|Omit<" in $MODULE/src/
```

### 2.5 Cross-File Comparison

For each pattern found in 2.1-2.4:

1. **Read** every file containing the pattern
2. **Compare** the actual implementation (not just the grep match)
3. **Score** similarity:
   - **Exact duplicate**: Identical logic, different variable names -> MUST extract
   - **Near duplicate**: Same structure, minor differences -> Extract with parameters
   - **Pattern duplicate**: Same approach, different data -> Extract with generics/callbacks
   - **Coincidental**: Same keywords, different purpose -> Skip

**Only flag duplicates with 3+ occurrences** (or 2 occurrences if the logic is complex, 10+ lines).

---

## Phase 3: Plan - Design Utility Extractions

For each confirmed duplicate group, plan the extraction:

### 3.1 Determine Destination

| Duplicate Type                               | Destination File                               |
| -------------------------------------------- | ---------------------------------------------- |
| Pure functions (format, transform, validate) | `src/utils/{domain}.ts`                        |
| React hooks (state + effects)                | `src/hooks/use{Name}.ts`                       |
| Type definitions                             | `src/types/{domain}.ts`                        |
| Style constants/helpers                      | `src/utils/styles.ts`                          |
| API/fetch helpers                            | `src/utils/api.ts` or `src/services/{name}.ts` |
| Constants/config                             | `src/constants/{domain}.ts`                    |

### 3.2 Design the Utility

For each extraction:

```markdown
### Utility: {functionName}

- **Source files**: [list of files where this is duplicated]
- **Destination**: src/utils/{file}.ts
- **Signature**: {function signature with types}
- **Parameters**: {what varies between occurrences}
- **Occurrences**: {count}
- **Lines saved**: ~{estimate}
```

### 3.3 Present Plan to User

Present the full deduplication plan:

```markdown
## Deduplication Plan for {$MODULE}

### Files Analyzed: {count}

### Duplicate Groups Found: {count}

### Estimated Lines Saved: {count}

### Extractions Planned:

1. **{utilName}** -> `src/utils/{file}.ts`
   - Found in: {file1}, {file2}, {file3}
   - Lines saved: ~{N}

2. **{hookName}** -> `src/hooks/{file}.ts`
   - Found in: {file1}, {file2}
   - Lines saved: ~{N}

Proceed with extraction? (yes/no)
```

**WAIT for user approval before proceeding to Phase 4.**

---

## Phase 4: Extract - Create Reusable Utilities

For each approved extraction:

### 4.1 Create Utility File

1. Check if destination file already exists
   - If yes: **Read it first**, then add the new function
   - If no: Create with proper imports and exports
2. Write the utility function with:
   - Clear TypeScript types (no `any`)
   - JSDoc comment explaining purpose
   - Parameters for all variations found across occurrences

### 4.2 Naming Conventions

| Type                 | Convention                       | Example                              |
| -------------------- | -------------------------------- | ------------------------------------ |
| Format functions     | `format{Thing}`                  | `formatDate`, `formatCurrency`       |
| Transform functions  | `{verb}{Thing}`                  | `parseResponse`, `normalizeData`     |
| Validation functions | `is{Thing}` / `has{Thing}`       | `isValidEmail`, `hasPermission`      |
| Builder functions    | `create{Thing}` / `build{Thing}` | `createQueryKey`, `buildUrl`         |
| Hooks                | `use{Thing}`                     | `useDebounce`, `usePagination`       |
| Constants            | `UPPER_SNAKE_CASE`               | `DEFAULT_PAGE_SIZE`, `API_ENDPOINTS` |

---

## Phase 5: Refactor - Update Source Files

For each file that contained duplicates:

1. **Read** the file
2. **Add import** for the new utility at the top
3. **Replace** the inline duplicate with a call to the utility
4. **Remove** any now-unused imports
5. **Verify** the replacement preserves exact behavior

### Rules:

- Replace one duplicate at a time
- Keep the same variable names where possible
- Don't change surrounding code
- Don't refactor anything that wasn't identified as a duplicate

---

## Phase 6: Validate

### 6.1 Run Checks

```bash
# Lint check
cd $MODULE && npm run lint 2>&1 | tail -20

# Type check
cd $MODULE && npm run type-check 2>&1 | tail -20
```

### 6.2 Fix Issues

If lint or type-check fails:

1. Read the error output
2. Fix the specific issue (usually missing imports, type mismatches)
3. Re-run validation
4. Repeat until clean

---

## Phase 7: Report

Output final report:

```markdown
## Deduplication Complete - {$MODULE}

### Summary

- **Files analyzed**: {count}
- **Duplicate groups found**: {count}
- **Utilities created**: {count}
- **Files refactored**: {count}
- **Lines saved**: ~{count}

### Utilities Created

| Utility  | File                  | Used By       | Lines Saved |
| -------- | --------------------- | ------------- | ----------- |
| `{name}` | `src/utils/{file}.ts` | {count} files | ~{N}        |
| `{name}` | `src/hooks/{file}.ts` | {count} files | ~{N}        |

### Files Modified

| File     | Changes                                          |
| -------- | ------------------------------------------------ |
| `{path}` | Replaced {N} inline duplicates with `{utilName}` |

### Validation

- Lint: PASS
- Type Check: PASS

### New Imports Added

{list of new import statements added to each file}
```

---

## Options

```bash
/dedup app                    # Analyze full module
/dedup app --dry-run          # Show plan without making changes
/dedup app --path=src/pages   # Analyze specific subdirectory only
/dedup app --min=2            # Flag duplicates with 2+ occurrences (default: 3)
/dedup app --types-only       # Only find duplicate type definitions
/dedup app --hooks-only       # Only find duplicate hook patterns
/dedup app --utils-only       # Only find duplicate utility functions
```

---

## What This Command Does

- Reads all source files in a module
- Identifies code that appears in 3+ files (or 2 if complex)
- Creates well-typed utility functions, hooks, types, or constants
- Replaces all duplicates with imports to the new utilities
- Validates everything passes lint and type-check

## What This Command Does NOT Do

- Change behavior or logic
- Refactor code that isn't duplicated
- Add features or fix bugs
- Modify tests or stories
- Touch files outside the target module
