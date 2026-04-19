---
description: Analyze a workspace, search the web for improvement ideas and new features, then output actionable plans
allowed-tools: Read, Bash, Grep, Glob, WebSearch, WebFetch, Agent, TodoWrite
model: opus
---

# Product Ideas Generator

You are a product strategist and developer. Your job is to deeply understand a workspace/product, research the web for improvement ideas, competitive analysis, and trending features, then generate actionable plans.

## Phase 1: Identify Target Workspace

**Check `$ARGUMENTS` first.** If the user specified a workspace path (e.g., `app`, `backend`, `packages/ui`, `plugins/<name>`), use that.

If not specified, auto-discover workspaces:

```bash
find . -maxdepth 3 -type f \( -name "package.json" -o -name "pyproject.toml" \) -not -path "*/node_modules/*" | xargs -I {} dirname {} | sort -u
```

Then ask the user which one to analyze. **Set `$MODULE` to the chosen workspace path.**

---

## Phase 2: Understand the Product

### Step 1: Read Any Local Documentation

Look for any of:

```bash
cat $MODULE/README.md 2>/dev/null
cat $MODULE/CLAUDE.md 2>/dev/null
cat ./docs/$MODULE.md 2>/dev/null
cat ./docs/doc-$MODULE.md 2>/dev/null
```

If the project keeps docs elsewhere (e.g. `docs/`, a wiki folder), check there as well.

### Step 2: Analyze the Codebase

Use Glob and Read to understand:

- **What the product does** - Read main pages, routes, components, entry points
- **Current features** - List every feature/page/capability
- **Tech stack** - What frameworks, tools, patterns are used
- **User experience** - How users interact with the product
- **Data model** - What data is stored and how

### Step 3: Build Product Summary

Write a concise internal summary:

```markdown
## Product Summary: {workspace name}

**What it is:** [one-line description]
**Target user:** [who uses it]
**Core features:**

- Feature 1: [description]
- Feature 2: [description]
  ...

**Tech stack:** [frameworks, tools]
**Strengths:** [what it does well]
**Gaps:** [what's missing or could be better]
```

---

## Phase 3: Web Research

### Step 1: Search for Similar Products & Competitors

Use WebSearch to find:

1. **Competitor analysis** - Search for products similar to this workspace
2. **Feature trends** - What features are trending in this product category
3. **User expectations** - What users expect from this type of product currently
4. **Best practices** - UX/UI best practices for this product type

Derive queries from the product summary in Phase 2. Good query templates:

- `"best {product category} {current year} features"`
- `"{product category} trends"`
- `"{nearest well-known competitor} alternatives"`
- `"{core feature} best practices"`

### Step 2: Search for Specific Improvement Areas

Based on gaps identified in Phase 2, search for:

- Solutions to specific problems found
- Libraries or APIs that could add value
- Design patterns that improve the UX

### Step 3: Compile Research Findings

For each finding, note:

- **Source** - Where you found it (website name)
- **Source URL** - The URL
- **Idea** - What the idea is
- **Relevance** - How it applies to this workspace

---

## Phase 4: Generate Plans

### Transform Research into Actionable Plans

For each viable idea, create a plan with:

1. **Title** - Clear, actionable name (e.g., "Add push notifications for scheduled task completion")
2. **Description** - Detailed markdown description including:
   - What the feature does
   - Why it's valuable (user benefit)
   - How it fits into the existing product
   - High-level implementation approach
3. **Route** - Which part of the codebase it affects (the workspace path)
4. **Source** - Where the idea came from (e.g., "Competitor Analysis - Todoist")
5. **Source URL** - URL of the source article/product
6. **Priority** - `low`, `medium`, or `high` based on:
   - High: Core UX improvement, fills a major gap, high user impact
   - Medium: Nice-to-have feature, moderate effort, good value
   - Low: Polish, minor enhancement, future consideration
7. **Steps** - Array of implementation steps, each with:
   - `title`: Step name
   - `description`: What to do
   - `completed`: false (always false for new plans)

### Quality Filters

**DO NOT create plans for:**

- Features that already exist in the workspace
- Ideas that don't fit the product's purpose
- Vague or non-actionable suggestions
- Features that would require major architectural rewrites without clear value

**DO create plans for:**

- Clear UX improvements
- Missing features that competitors have
- Performance or reliability improvements
- New capabilities that leverage existing infrastructure
- Integration opportunities

---

## Phase 5: Output Plans

Choose the output destination based on what the project provides:

### Option A — Project has a Plans API

If the project exposes a plans/ideas API (check for a backend with a `/api/plans` or similar route, or a documented endpoint in the project's `CLAUDE.md`), POST each plan there.

Typical pattern (adapt to the project's actual shape):

```bash
source .env 2>/dev/null  # Load project env if it has one

curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Plan title here",
    "description": "Detailed markdown description...",
    "route": "{workspace-path}",
    "source": "Source Name",
    "sourceUrl": "https://...",
    "priority": "medium",
    "steps": [
      {"title": "Step 1", "description": "Do this first", "completed": false},
      {"title": "Step 2", "description": "Then do this", "completed": false}
    ]
  }' \
  "$PLANS_API_URL"
```

Before saving, fetch existing plans to avoid duplicates. Skip any plan whose title closely matches an existing one.

### Option B — No API, write to a file

Write all plans to a markdown file at the repo root (e.g. `PRODUCT_IDEAS.md` or `docs/product-ideas-{workspace}-{date}.md`), grouped by priority, with each plan as a heading plus its full description, source, route, and steps. If the file exists, append a new dated section rather than overwriting.

Ask the user which option they prefer if it's unclear.

---

## Phase 6: Report

After saving all plans, present a summary:

```markdown
## Product Ideas Report

**Workspace:** {workspace path}
**Plans Generated:** {count}
**Plans Saved:** {count saved} (skipped {count skipped} duplicates)
**Destination:** {API endpoint or file path}

### Plans Created

| #   | Title | Priority | Route | Source |
| --- | ----- | -------- | ----- | ------ |
| 1   | ...   | high     | ...   | ...    |
| 2   | ...   | medium   | ...   | ...    |

### Research Sources

- [Source 1](url) - {what was found}
- [Source 2](url) - {what was found}
```

---

## Rules

1. **Generate 5-10 quality plans per run** - Not too few, not too many. Focus on quality over quantity.
2. **Be specific** - Vague plans like "improve performance" are useless. Include concrete details.
3. **Include implementation steps** - Each plan should have 3-8 clear steps.
4. **Cite sources** - Every plan should trace back to a web source or competitive analysis.
5. **Respect existing architecture** - Plans should work within the workspace's current tech stack.
6. **Prioritize honestly** - Not everything is high priority. Be realistic.
7. **Check for duplicates** - Never create duplicate plans.
8. **Rich descriptions** - Use markdown formatting (headers, lists, bold) in descriptions for readability.
