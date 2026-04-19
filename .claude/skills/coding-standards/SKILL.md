# Coding Standards Skill

All coding rules, forbidden patterns, and auto-fix instructions for every module in this repo. This is the single source of truth — CLAUDE.md and commands reference this skill.

---

## Non-Negotiable Rules

- **Custom colors only** - Never use default Tailwind colors (`bg-blue-500`, etc.)
- **TypeScript strict** - No `any` types
- **Components < 200 lines**
- **Exact package versions** - No `^` in package.json- **No barrel exports** - Never re-export from `index.ts`/`index.tsx` files. Import directly from the source file where the component/function is defined. Delete barrel files (`index.ts` that only import and re-export).
- **No default exports** - Always use named exports (`export function`, `export const`). Never use `export default`. This applies even for lazy loading — use `React.lazy(() => import('./Foo').then(m => ({ default: m.Foo })))` if needed.
- **No native HTML for UI** - Never use raw `<button>`, `<input>`, `<dialog>`, etc. Always use components from `reusables`. If a component or variant doesn't exist, create it first in the component library, then use it.
- **Always paginate lists** - Never render an unbounded list. Use infinite scroll (mobile) or page numbers (desktop/web).
- **Filters in URL params** - All filter/sort/search state must live in URL query params (`useSearchParams`/`useRouter`), never in local `useState`. Filter buttons must never be disabled based on result count.
- **TanStack Query for data fetching** - NEVER use `useState` + `useEffect` for fetching server data. Always use `useQuery` for reads and `useMutation` for writes from `@tanstack/react-query`. This provides caching, stale-while-revalidate, and deduplication. Use `refetchInterval` for polling. Local UI state (drawers, forms, search input) stays in `useState`.
- **No default env vars** - NEVER provide fallback/default values for environment variables (e.g., `process.env.FOO || 'default'`, `process.env.FOO ?? 'fallback'`, `os.environ.get('FOO', 'default')`). If a required env var is missing, the process MUST fail immediately with a clear error message. Validate all required env vars at startup and `process.exit(1)` (or equivalent) if any are missing.

---

## Data and Database Storage Rules

Modules MUST only contain code. Databases, uploaded files, logs, and any other generated/runtime data MUST NOT live inside the module directory.
When running locally, pass the **root directory path** (outside the repo) as a config so all data is stored externally. This ensures:

- Data survives if the module directory is deleted, moved, or re-cloned
- Databases and files are never accidentally committed to Git
- No reliance on `.gitignore` to hide data inside the repo — if the repo is wiped, the data is gone

**Do NOT** store data inside the module and `.gitignore` it. Instead, store it at a system-level path (e.g., `~/.allsetlabs/<module-name>/` or a path passed via environment variable) so it persists independently of the repo.

**Example:** Instead of `devbot.db` inside the repo, use `~/.devbot/devbot.db` and pass the path via `--db-path` or `DATA_DIR` environment variable in the Makefile.

---

## Forbidden Patterns

```
bg-blue-500, text-red-600, border-gray-300  # Use custom colors from styles.md
dark:bg-gray-900                             # Theme handled automatically
bg-[#3b82f6]                                 # No arbitrary values
```

---

## How to Detect and Auto-Fix Each Rule

| Rule | How to detect | How to fix |
| --- | --- | --- || **Custom colors only** | Grep for default Tailwind colors: `bg-blue-`, `text-red-`, `border-gray-`, `bg-green-`, `text-yellow-`, etc. in `.tsx` and `.css` files | Replace with the closest custom color from the module's styles |
| **TypeScript strict** | Grep for `: any` and `as any` in `.ts` and `.tsx` files | Replace with the correct specific type |
| **Components < 200 lines** | Count lines in all `.tsx` files under `components/` directories; flag any over 200 | Split into smaller sub-components |
| **Exact package versions** | Check `package.json` files for `^` or `~` in dependency versions | Remove `^` and `~` prefixes to pin exact versions |
| **No barrel exports** | Grep for `export { ... } from` and `export * from` in `index.ts`/`index.tsx` files. Flag any file that only re-exports | Delete the barrel file. Update all imports across the module to point directly to the source file where the component/function is defined |
| **No default exports** | Grep for `export default` in all `.ts` and `.tsx` files | Convert to named export (`export function X` / `export const X`). Update all imports to use named imports (`import { X }`). For lazy loading, use `React.lazy(() => import('./Foo').then(m => ({ default: m.Foo })))` |
| **No native HTML for UI** | Grep for raw `<button`, `<input`, `<dialog`, `<select`, `<textarea` in `.tsx` files (exclude component library itself) | Replace with the equivalent component from `reusables` |
| **Always paginate lists** | Flag any `.map(` rendering without pagination wrapper nearby | Wrap in pagination component |
| **Filters in URL params** | Grep for `useState` paired with filter/sort/search patterns not using `useSearchParams` | Refactor filter state to use `useSearchParams`/`useRouter` |
| **TanStack Query for data** | Grep for `useState.*useEffect` fetch patterns not using `useQuery`/`useMutation` | Refactor to `useQuery` for reads and `useMutation` for writes |
| **No default env vars** | Grep for `process.env.\w+ \|\|`, `process.env.\w+ \?\?`, `os.environ.get\(.*,`, `env.get\(.*,` with fallback values in `.ts`, `.tsx`, `.py` files | Remove the fallback. Add the env var to a startup validation block that exits the process if missing |

---

## Forbidden Pattern Detection

```bash
# Default Tailwind colors
rg "bg-(blue|red|green|yellow|purple|pink|indigo|gray|slate|zinc|neutral|stone|orange|amber|emerald|teal|cyan|sky|violet|fuchsia|rose|lime)-(50|100|200|300|400|500|600|700|800|900|950)" --type tsx --type ts --type css

# Dark mode overrides (theme is handled automatically)
rg "dark:" --type tsx --type ts --type css

# Arbitrary Tailwind values
rg "bg-\[#|text-\[#|border-\[#" --type tsx --type ts
```

**Fix:** Replace each forbidden pattern with the correct alternative from the module's custom styles.

---

## Lint and Type Check

For each module that has a `package.json` with `lint` and `type-check` scripts:

```bash
cd <module> && npm run lint --fix 2>&1
cd <module> && npm run type-check 2>&1
```

Fix lint errors automatically with `--fix`. Report remaining type errors.

---

## Scan Rules

1. **Scan only source files** — skip `node_modules/`, `dist/`, `build/`, `.git/`, `venv/`
2. **Skip component library internals** — the "No native HTML for UI" rule does not apply inside `reusables/src/` (that's where the components are built)
3. **Auto-fix everything** — fix every violation possible. Only report without fixing if the change is ambiguous and could break functionality.
4. **Count matters** — report total violation count per rule so severity is clear
