---
name: coding-standards
description: Generic coding standards for monorepos and multi-workspace projects. Load before writing or reviewing code in any project. Rules are opt-in where they depend on project conventions (component library, custom colors). When a project has a stricter or project-specific override, the project's own CLAUDE.md or a project-local skill wins.
---

# Coding Standards

The single source of truth for general-purpose coding rules, forbidden patterns, and auto-fix guidance. Project-specific overrides live in each project's own `CLAUDE.md` or a project-local skill.

---

## Non-Negotiable Rules

- **TypeScript strict** — No `any` types. If a value's type is genuinely unknown, use `unknown` and narrow.
- **Components < 200 lines** — If a `.tsx` file exceeds 200 lines, split it into smaller focused components.
- **Exact package versions** — No `^` or `~` prefixes in `package.json` dependency versions.
- **No barrel exports** — Never re-export from `index.ts`/`index.tsx` files. Import directly from the source file where the component/function is defined. Delete barrel files (`index.ts` that only import and re-export).
- **No default exports** — Always use named exports (`export function`, `export const`). Never use `export default`. This applies even for lazy loading — use `React.lazy(() => import('./Foo').then(m => ({ default: m.Foo })))` if needed.
- **No native HTML for UI** — Never use raw `<button>`, `<input>`, `<dialog>`, `<select>`, `<textarea>`, etc. for user-facing UI. Always use the project's shared component library (if one exists). If a component or variant doesn't exist, create it first in the component library, then use it. If the project has no component library, define one before sprinkling raw HTML across the codebase.
- **Always paginate lists** — Never render an unbounded list. Use infinite scroll (mobile) or page numbers (desktop/web).
- **Filters in URL params** — All filter/sort/search state must live in URL query params (`useSearchParams`/`useRouter`), never in local `useState`. Filter buttons must never be disabled based on result count.
- **TanStack Query for server data** — NEVER use `useState` + `useEffect` for fetching server data. Always use `useQuery` for reads and `useMutation` for writes from `@tanstack/react-query`. Local UI state (drawers, forms, search input) stays in `useState`.
- **No default env vars** — NEVER provide fallback/default values for environment variables (`process.env.FOO || 'default'`, `process.env.FOO ?? 'fallback'`, `os.environ.get('FOO', 'default')`). If a required env var is missing, the process MUST fail immediately with a clear error message. Validate required env vars at startup and exit if any are missing.
- **Custom colors only** (when project defines a palette) — If the project defines a custom color palette, never use default Tailwind color classes (`bg-blue-500`, `text-red-600`, etc.) or arbitrary values (`bg-[#3b82f6]`). Use the project's named tokens. If the project does NOT define a palette, this rule is inactive.

---

## Data and Database Storage Rules

Project source trees MUST only contain code. Databases, uploaded files, logs, and any other generated/runtime data MUST NOT live inside the project directory.

Store runtime data at a system-level path (e.g., `~/.<project-name>/` or a path passed via environment variable) so it persists independently of the repo. Pass the data directory as a config value (CLI flag or env var) — do not hardcode.

**Rationale:**

- Data survives if the project directory is deleted, moved, or re-cloned
- Databases and files are never accidentally committed to Git
- No reliance on `.gitignore` to hide data inside the repo — if the repo is wiped, the data is gone

Do NOT store data inside the project and `.gitignore` it.

---

## Forbidden Patterns (when a custom palette is in use)

```
bg-blue-500, text-red-600, border-gray-300  # Use the project's named color tokens
dark:bg-gray-900                             # Skip if theme is handled automatically
bg-[#3b82f6]                                 # No arbitrary hex values
```

---

## How to Detect and Auto-Fix Each Rule

| Rule | How to detect | How to fix |
| --- | --- | --- |
| **TypeScript strict** | Grep for `: any` and `as any` in `.ts` and `.tsx` files | Replace with the correct specific type (or `unknown` + narrowing) |
| **Components < 200 lines** | Count lines in all `.tsx` files under `components/` directories; flag any over 200 | Split into smaller sub-components |
| **Exact package versions** | Check `package.json` files for `^` or `~` in dependency versions | Remove `^` and `~` prefixes to pin exact versions |
| **No barrel exports** | Grep for `export { ... } from` and `export * from` in `index.ts`/`index.tsx` files | Delete the barrel file. Update all imports to point directly to the source file |
| **No default exports** | Grep for `export default` in all `.ts` and `.tsx` files | Convert to named export. Update all imports to use named imports. For lazy loading, use `React.lazy(() => import('./Foo').then(m => ({ default: m.Foo })))` |
| **No native HTML for UI** | Grep for raw `<button`, `<input`, `<dialog`, `<select`, `<textarea` in `.tsx` files (exclude the component library itself) | Replace with the equivalent component from the project's shared component library |
| **Always paginate lists** | Flag any `.map(` rendering without a pagination wrapper nearby | Wrap in a pagination component |
| **Filters in URL params** | Grep for `useState` paired with filter/sort/search patterns not using `useSearchParams` | Refactor filter state to use `useSearchParams`/`useRouter` |
| **TanStack Query for data** | Grep for `useState.*useEffect` fetch patterns not using `useQuery`/`useMutation` | Refactor to `useQuery` for reads and `useMutation` for writes |
| **No default env vars** | Grep for `process.env.\w+ \|\|`, `process.env.\w+ \?\?`, `os.environ.get\(.*,`, `env.get\(.*,` with fallback values in `.ts`, `.tsx`, `.py` files | Remove the fallback. Add the env var to a startup validation block that exits the process if missing |
| **Custom colors only** (if palette exists) | Grep for default Tailwind colors: `bg-blue-`, `text-red-`, `border-gray-`, etc. in `.tsx`/`.css` files | Replace with the closest named token from the project's palette |

---

## Forbidden Pattern Detection (when a custom palette is in use)

```bash
# Default Tailwind colors
rg "bg-(blue|red|green|yellow|purple|pink|indigo|gray|slate|zinc|neutral|stone|orange|amber|emerald|teal|cyan|sky|violet|fuchsia|rose|lime)-(50|100|200|300|400|500|600|700|800|900|950)" --type tsx --type ts --type css

# Dark mode overrides (skip if theme is handled automatically in the project)
rg "dark:" --type tsx --type ts --type css

# Arbitrary Tailwind values
rg "bg-\[#|text-\[#|border-\[#" --type tsx --type ts
```

---

## Lint and Type Check

For every workspace in the project that has a `package.json` with `lint` and `type-check` scripts, run them from the workspace root:

```bash
npm run lint -- --fix 2>&1
npm run type-check 2>&1
```

**Discovering workspaces:**

1. Read the root `package.json` — if it declares `"workspaces"`, use those globs to find every workspace directory.
2. Otherwise, list top-level directories that contain a `package.json` (common patterns: `app/`, `backend/`, `packages/*`, `apps/*`, `plugins/*`).
3. For Python workspaces, look for `pyproject.toml` or `requirements.txt`.

Fix lint errors automatically with `--fix`. Report remaining type errors.

---

## Scan Rules

1. **Scan only source files** — skip `node_modules/`, `dist/`, `build/`, `.git/`, `venv/`, `.next/`, `.turbo/`
2. **Skip component library internals** — the "No native HTML for UI" rule does not apply inside the component library's own source (that's where the primitives are defined)
3. **Auto-fix everything possible** — fix every violation that can be fixed without ambiguity. Only report without fixing if the change could break functionality.
4. **Count matters** — report total violation count per rule so severity is clear
5. **Project-specific overrides win** — if the project's root `CLAUDE.md` or a project-local skill contradicts a rule here, follow the project.
