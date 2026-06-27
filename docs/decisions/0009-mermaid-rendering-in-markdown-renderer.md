# 0009 — Mermaid Chart Rendering via MermaidChart Component in MarkdownRenderer

**Date**: 2026-06-20
**Status**: Accepted

## Context

DevBot chat messages support full markdown via `react-markdown` + `remark-gfm`. Users and AI assistants naturally write diagrams as ` ```mermaid ``` ` fenced code blocks. Without special handling, these render as raw code text — unhelpful when the intent is a visual flowchart, sequence diagram, or other structured diagram.

## Decision

Added first-class mermaid diagram rendering to the DevBot chat:

1. **Library**: `mermaid` v11.15.0 (official JS library, exact pin) installed as a direct dependency of `app/`.
2. **Component**: New `MermaidChart.tsx` — a focused React component that calls `mermaid.render()` asynchronously, injects the returned SVG into a container `div`, and shows a styled error block on syntax failure. Mermaid is initialized once at module load with `theme: 'dark'` and `securityLevel: 'loose'`.
3. **Integration point**: Inside `MarkdownRenderer.tsx`'s `code` component override, a single check for `className === 'language-mermaid'` routes those blocks to `<MermaidChart>` instead of `<SyntaxHighlighter>`. All other code blocks are unaffected.

## Rationale

- **Intercept inside `code` override, not pre-processing**: `react-markdown` already parses fenced blocks and exposes the language via `className`. Detecting `language-mermaid` there is minimal, localized, and requires no separate markdown parsing pass.
- **`mermaid` over alternatives**: The official `mermaid` package is the de-facto standard, covers all diagram types (flowchart, sequence, class, ER, Gantt, etc.), and runs fully client-side — no server or CDN dependency at runtime.
- **`securityLevel: 'loose'`**: Required for Font Awesome icon shorthand (`fa:fa-car`) and any HTML inside node labels. The chat content originates from Claude or the authenticated user, so relaxed security is acceptable.
- **Monotonically-increasing ID counter**: `mermaid.render()` requires a unique DOM ID per invocation. A module-level counter (`let idCounter = 0`) is the simplest solution that avoids collisions when multiple charts appear in one chat view.

## Consequences

- Mermaid adds ~1–2 MB to the client bundle (it is a large library). This is acceptable for a desktop/mobile-first tool but should be monitored if bundle size becomes a concern.
- The `securityLevel: 'loose'` setting means mermaid-rendered SVGs can include arbitrary HTML; this is only safe because chat input is from trusted sources.
- Font Awesome icon shorthands (`fa:fa-*`) render as plain text because FA fonts are not bundled — this is a known mermaid limitation when FA is not separately included.
- Any mermaid version upgrade may change diagram output SVG structure; visual regression checks are advisable on upgrades.
