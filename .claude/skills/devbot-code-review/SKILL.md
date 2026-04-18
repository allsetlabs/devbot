---
name: devbot-code-review
description: Comprehensive code review checklist for DevBot module. 120+ checks across security, bugs, performance, TypeScript safety, React hooks, Node.js async, and Supabase queries. Auto-triggers when reviewing PRs or completing feature work.
---

# DevBot Code Review

## When This Skill Activates

Auto-trigger when:

- User asks to review code, a PR, or a diff
- Completing a feature implementation (final check before commit)
- Running `/dedup` or `/discover-skills` audit phases

## Context

DevBot stack: Express 4.21 + TypeScript + Supabase + React 19 + TanStack Query + Capacitor 6. All checks are tailored to this stack.

## Review Checklist

### 1. Security (Critical)

#### API & Input Validation

- [ ] All route params validated before use (`req.params.id` checked for format)
- [ ] Request body validated (required fields, types, length limits)
- [ ] No SQL injection via raw string concatenation in Supabase queries
- [ ] File uploads validated (type, size, extension whitelist)
- [ ] No path traversal in file operations (`../` in filenames)

#### Authentication & Authorization

- [ ] All routes protected by API key middleware
- [ ] Sensitive operations require additional verification
- [ ] No secrets in client-side code or git history
- [ ] Environment variables used for all credentials

#### Process Spawning

- [ ] `spawn()` arguments are arrays, never interpolated strings
- [ ] No user input directly passed to shell commands
- [ ] Child process environment is explicitly set (no `shell: true`)
- [ ] Process cleanup on termination (kill child processes)

### 2. Bugs & Logic (High)

#### Null Safety

- [ ] No non-null assertions (`!`) without upstream guards
- [ ] Optional chaining used for nullable paths
- [ ] TanStack Query `enabled` option used when dependencies are nullable
- [ ] Supabase `.single()` results checked for null

#### Async Operations

- [ ] All `await` calls wrapped in try/catch (or handled by caller)
- [ ] No floating promises (unhandled async calls)
- [ ] Promise.all used for independent concurrent operations
- [ ] Race conditions prevented in state updates

#### State Management

- [ ] No stale closures in useEffect/useCallback
- [ ] Dependency arrays complete and correct
- [ ] No derived state stored in useState (compute inline)
- [ ] Optimistic updates rolled back on error

### 3. Performance (Medium)

#### React Rendering

- [ ] Lists use stable `key` props (not array index for mutable lists)
- [ ] Expensive computations wrapped in `useMemo`
- [ ] Callbacks passed to children wrapped in `useCallback`
- [ ] Large lists use TanStack Virtual (already established pattern)
- [ ] No unnecessary re-renders from object/array literals in JSX

#### Data Fetching

- [ ] TanStack Query used for ALL server state (never useState+useEffect)
- [ ] `staleTime` set appropriately (not refetching on every focus)
- [ ] Mutations invalidate correct query keys
- [ ] Polling intervals appropriate for use case (1.5s active, 5s idle)
- [ ] No duplicate API calls (check TanStack Query deduplication)

#### Bundle Size

- [ ] No full library imports (`import _ from 'lodash'` → `import get from 'lodash/get'`)
- [ ] Dynamic imports for route-level code splitting
- [ ] Heavy dependencies lazy loaded

### 4. TypeScript Safety (High)

- [ ] No `any` types (use `unknown` + type narrowing instead)
- [ ] No `as` type assertions without justification
- [ ] Function return types explicit on exported functions
- [ ] Discriminated unions used for variant types
- [ ] Generic types used where pattern repeats with different types
- [ ] Supabase row types defined in `lib/supabase.ts`

### 5. Error Handling (High)

#### Backend Routes

- [ ] All Supabase queries destructure `{ data, error }` and check error
- [ ] Error responses use `sendInternalError()` / `sendNotFound()` helpers
- [ ] POST returns 201, DELETE returns 204
- [ ] Try/catch wraps all async route handlers
- [ ] Errors logged with context before responding

#### Backend Workers

- [ ] Process `error` event handled
- [ ] Process `close` event updates DB status
- [ ] Timeout mechanism prevents runaway processes
- [ ] Active process map cleaned up on completion/failure
- [ ] stderr logged but doesn't crash worker

#### Mobile

- [ ] useQuery errors displayed via ErrorBanner
- [ ] useMutation errors shown to user (toast/banner)
- [ ] Empty states shown for empty lists
- [ ] Loading states shown during data fetch
- [ ] Network errors handled gracefully

### 6. Code Standards (Medium)

#### Project Rules (Non-Negotiable)

- [ ] No default Tailwind colors (`bg-blue-500`, etc.)
- [ ] No arbitrary color values (`bg-[#hex]`)
- [ ] No raw HTML elements (`<button>`, `<input>`, etc.) — use component library
- [ ] No `dark:` prefixes — theme handled by component library
- [ ] Components under 200 lines
- [ ] No `^` in package.json versions (exact versions only)
- [ ] No double exports (import from source files)

#### Naming

- [ ] Variables/functions: camelCase
- [ ] Components: PascalCase
- [ ] Constants: UPPER_SNAKE_CASE
- [ ] Files: kebab-case (components: PascalCase)
- [ ] DB columns: snake_case
- [ ] API responses: camelCase

#### Code Quality

- [ ] No console.log in production code (use structured logging)
- [ ] No commented-out code
- [ ] No TODO/FIXME without linked issue
- [ ] Magic numbers extracted to named constants
- [ ] Functions under 30 lines (extract helpers for longer ones)

### 7. Supabase Specific (High)

- [ ] Every `.from()` query destructures and checks `{ error }`
- [ ] `.single()` used for GET-by-id (not `.select()` + `[0]`)
- [ ] `.select()` specifies columns when not all are needed
- [ ] Pagination uses `.range(from, to)` for large tables
- [ ] RLS policies considered for multi-tenant data
- [ ] Migrations tested locally before deploying

### 8. Testing (Medium)

- [ ] New features have at least one happy-path test
- [ ] Error paths tested (API failures, invalid input)
- [ ] UI components rendered without errors
- [ ] Mutations tested for optimistic update + rollback

## Severity Scoring

When reporting issues, use confidence thresholds to minimize false positives:

| Confidence | Action                                |
| ---------- | ------------------------------------- |
| 90%+       | Flag as definite issue                |
| 70-89%     | Flag as likely issue with explanation |
| 50-69%     | Note as potential concern             |
| <50%       | Skip — too speculative                |

## Review Output Format

```markdown
## Code Review: [file/PR name]

### Critical Issues (must fix)

- [ ] [file:line] Description — Impact: [what breaks]

### Warnings (should fix)

- [ ] [file:line] Description — Risk: [what could go wrong]

### Suggestions (nice to have)

- [ ] [file:line] Description — Benefit: [improvement]

### Passed Checks

- [x] No security vulnerabilities found
- [x] TypeScript types are strict
- [x] ...
```
