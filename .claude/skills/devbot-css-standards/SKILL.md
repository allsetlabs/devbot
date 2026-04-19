---
name: devbot-css-standards
description: Enforces CSS and component library standards for DevBot mobile. Prevents raw HTML elements, default Tailwind colors, arbitrary color values, and dark: prefixes. Auto-triggers when editing .tsx files in app/.
---

# DevBot CSS & Component Standards

## When This Skill Activates

Auto-trigger when editing any `.tsx` file in `app/src/`.

## Rules (Non-Negotiable)

### 1. No Raw HTML Elements

**NEVER** use raw HTML elements for UI. Always use the shared component library `@allsetlabs/reusable`.

| Forbidden    | Required Replacement                                                |
| ------------ | ------------------------------------------------------------------- |
| `<button>`   | `<Button>` from `@allsetlabs/reusable/components/ui/button`         |
| `<input>`    | `<Input>` from `@allsetlabs/reusable/components/ui/input`           |
| `<textarea>` | `<Textarea>` from `@allsetlabs/reusable/components/ui/textarea`     |
| `<select>`   | `<Select>` from `@allsetlabs/reusable/components/ui/select`         |
| `<dialog>`   | `<Dialog>` or `<Drawer>` from `@allsetlabs/reusable/components/ui/` |

**Current violations (22 total):**

- `RunSelector.tsx` - 2 `<button>` elements
- `SchedulerForm.tsx` - 3 `<button>` + 1 `<textarea>`
- `SchedulerSettingsDrawer.tsx` - 3 `<button>` + 1 `<textarea>`
- `ChatMessage.tsx` - 4 `<button>` elements
- `MarkdownRenderer.tsx` - 1 `<button>`
- `SlideNav.tsx` - 1 `<button>`
- `BabyLogs.tsx` - 2 `<button>` elements
- `LawnPhotoJournal.tsx` - 1 `<input>`
- `InteractiveChatView.tsx` - 1 `<input>`

### 2. No Default Tailwind Colors

**NEVER** use default Tailwind color utilities. Only use custom theme colors from `reusables/src/styles/styles.md`.

```
FORBIDDEN: bg-blue-500, text-red-600, border-gray-300, bg-slate-100, etc.
FORBIDDEN: bg-[#3b82f6], text-[#ef4444] (arbitrary color values)

CORRECT: bg-background, bg-primary, bg-card, bg-muted, bg-success
CORRECT: text-foreground, text-primary-foreground, text-muted-foreground
CORRECT: border-border, border-input
```

### 3. No dark: Prefixes

Theme switching is handled automatically by `InitializeReusableChunks` in `App.tsx`. Never use `dark:` Tailwind prefixes.

```
FORBIDDEN: dark:bg-gray-900, dark:text-white
CORRECT: bg-background, text-foreground (auto-switches with theme)
```

### 4. Minimize Inline Styles

Use Tailwind classes instead of `style={{}}`. Exceptions:

- Dynamic values for virtual scrolling (TanStack Virtual `transform` props)
- SVG/chart rendering with computed dimensions
- All other cases must use Tailwind classes

### 5. Component Library First

Before creating any new UI element, check if it exists in `@allsetlabs/reusable`:

- `Button`, `Input`, `Textarea`, `Select` - Form controls
- `Dialog`, `Drawer`, `Sheet` - Overlays
- `Card`, `Badge`, `Avatar` - Display
- `DataFetchWrapper` - Loading/error states
- `Tabs`, `Accordion` - Layout

If a needed component or variant doesn't exist, create it first in `reusables/`, then use it.

## Verification Checklist

Before completing any edit to a `.tsx` file:

- [ ] No `<button>`, `<input>`, `<textarea>`, `<select>`, `<dialog>` tags
- [ ] No `bg-blue`, `text-red`, `border-gray` or similar default colors
- [ ] No `[#hex]` arbitrary color values
- [ ] No `dark:` prefixes
- [ ] All new UI elements use `@allsetlabs/reusable` components
