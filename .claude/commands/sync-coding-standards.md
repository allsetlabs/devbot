---
description: Audit and auto-fix coding standard violations
model: opus
---

# Sync Coding Standards Command

Scans all module code for violations of the coding standards defined in the root `CLAUDE.md`, **auto-fixes every violation it finds**, then reports what was changed.

## What This Command Checks and Fixes

### 1. Non-Negotiable Rules

| Rule                        | How to detect                                                                                                                                                              | How to fix                                                                                                                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Custom colors only**      | Grep for default Tailwind colors: `bg-blueRemove @sync-coding-standards.md   -`, `text-red-`, `border-gray-`, `bg-green-`, `text-yellow-`, etc. in `.tsx` and `.css` files | Replace with the closest custom color from the module's styles                                                                                                                                                        |
| **TypeScript strict**       | Grep for `: any` and `as any` in `.ts` and `.tsx` files                                                                                                                    | Replace with the correct specific type                                                                                                                                                                                |
| **Components < 200 lines**  | Count lines in all `.tsx` files under `components/` directories; flag any over 200                                                                                         | Split into smaller sub-components                                                                                                                                                                                     |
| **Exact package versions**  | Check `package.json` files for `^` or `~` in dependency versions                                                                                                           | Remove `^` and `~` prefixes to pin exact versions                                                                                                                                                                     |
| **No barrel exports**       | Grep for `export { ... } from` and `export * from` in `index.ts`/`index.tsx` files. Flag any file that only re-exports                                                     | Delete the barrel file. Update all imports across the module to point directly to the source file where the component/function is defined                                                                             |
| **No default exports**      | Grep for `export default` in all `.ts` and `.tsx` files                                                                                                                    | Convert to named export (`export function X` / `export const X`). Update all imports to use named imports (`import { X }`). For lazy loading, use `React.lazy(() => import('./Foo').then(m => ({ default: m.Foo })))` |
| **No native HTML for UI**   | Grep for raw `<button`, `<input`, `<dialog`, `<select`, `<textarea` in `.tsx` files (exclude component library itself)                                                     | Replace with the equivalent component from `modules/component`                                                                                                                                                        |
| **Always paginate lists**   | Flag any `.map(` rendering without pagination wrapper nearby                                                                                                               | Wrap in pagination component                                                                                                                                                                                          |
| **Filters in URL params**   | Grep for `useState` paired with filter/sort/search patterns not using `useSearchParams`                                                                                    | Refactor filter state to use `useSearchParams`/`useRouter`                                                                                                                                                            |
| **TanStack Query for data** | Grep for `useState.*useEffect` fetch patterns not using `useQuery`/`useMutation`                                                                                           | Refactor to `useQuery` for reads and `useMutation` for writes                                                                                                                                                         |

### 2. Forbidden Patterns

Grep across all `.tsx`, `.ts`, and `.css` files for:

```bash
# Default Tailwind colors
rg "bg-(blue|red|green|yellow|purple|pink|indigo|gray|slate|zinc|neutral|stone|orange|amber|emerald|teal|cyan|sky|violet|fuchsia|rose|lime)-(50|100|200|300|400|500|600|700|800|900|950)" --type tsx --type ts --type css

# Dark mode overrides (theme is handled automatically)
rg "dark:" --type tsx --type ts --type css

# Arbitrary Tailwind values
rg "bg-\[#|text-\[#|border-\[#" --type tsx --type ts
```

**Fix:** Replace each forbidden pattern with the correct alternative from the module's custom styles.

### 3. Lint and Type Check

For each module that has a `package.json` with `lint` and `type-check` scripts:

```bash
cd modules/<module> && npm run lint --fix 2>&1
cd modules/<module> && npm run type-check 2>&1
```

Fix lint errors automatically with `--fix`. Report remaining type errors.

## Execution

### Step 1: Read Root Standards

```bash
cat CLAUDE.md
```

Extract the current Non-Negotiable Rules, Forbidden Patterns, and After Every Change sections to use as the audit checklist.

### Step 2: Scan and Fix Each Module

For each module in `modules/`:

```bash
ls modules/
```

Run all checks from sections 1, 2, and 3 above. **For every violation found, fix it immediately** — edit the file, update imports, delete barrel files, etc. Collect a log of what was fixed per module.

### Step 3: Report

Output:

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

## Rules

1. **Scan only source files** — skip `node_modules/`, `dist/`, `build/`, `.git/`, `venv/`
2. **Skip component library internals** — the "No native HTML for UI" rule does not apply inside `modules/component/src/` (that's where the components are built)
3. **Auto-fix everything** — this command fixes every violation it can. Only report without fixing if the change is ambiguous and could break functionality. Explain why in "Remaining Issues".
4. **Count matters** — report total violation count per rule so severity is clear
