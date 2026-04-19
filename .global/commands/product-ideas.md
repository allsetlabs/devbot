---
description: Analyze a module, search the web for improvement ideas and new features, then save plans to the Plans route
allowed-tools: Read, Bash, Grep, Glob, WebSearch, WebFetch, Agent, TodoWrite
model: opus
---

# Product Ideas Generator

You are a product strategist and developer. Your job is to deeply understand a module in this monorepo, research the web for improvement ideas, competitive analysis, and trending features, then generate actionable plans and save them to the DevBot Plans API.

## Phase 1: Identify Target Module

**Check `$ARGUMENTS` first.** If the user specified a module (e.g., `devbot`, `seekr`, `portfolio`, `meme-vault`), use that.

If not specified, ask which module to analyze.

**Set `$MODULE` to the chosen workspace path (e.g. `app`, `backend`, `plugins/baby-logs`).**

---

## Phase 2: Understand the Product

### Step 1: Read Module Documentation

```bash
# Read the module's doc file
cat ./docs/doc-$MODULE.md 2>/dev/null || echo "No doc found"
```

### Step 2: Analyze the Codebase

Use Glob and Read to understand:

- **What the product does** - Read main pages, routes, components
- **Current features** - List every feature/page/capability
- **Tech stack** - What frameworks, tools, patterns are used
- **User experience** - How users interact with the product
- **Data model** - What data is stored and how

### Step 3: Build Product Summary

Write a concise internal summary:

```markdown
## Product Summary: {module name}

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

1. **Competitor analysis** - Search for products similar to this module
2. **Feature trends** - What features are trending in this product category
3. **User expectations** - What users expect from this type of product in 2025-2026
4. **Best practices** - UX/UI best practices for this product type

**Example search queries (adapt based on module):**

For DevBot (personal assistant/terminal proxy):

- "best personal assistant apps 2025 features"
- "mobile terminal apps features"
- "AI assistant app must-have features"
- "home automation personal dashboard features"

For Seekr (product suite):

- "best productivity tools 2025"
- "chrome extension must-have features"

For Portfolio:

- "best developer portfolio features 2025"
- "portfolio website trends"

For Meme Vault:

- "meme creation tools features"
- "viral content creation app features"

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
- **Relevance** - How it applies to this module

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
3. **Route** - Which part of the codebase it affects (e.g., `devbot/app`, `devbot/backend`, `seekr/web`)
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

- Features that already exist in the module
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

## Phase 5: Save Plans to API

### Read API Configuration

```bash
# Get API key and port from .env
source .env 2>/dev/null
echo "API_KEY=$API_KEY"
echo "BACKEND_PORT=${BACKEND_PORT:-3100}"
```

### Check for Duplicate Plans

Before saving, fetch existing plans to avoid duplicates:

```bash
curl -s -H "X-API-Key: $API_KEY" "http://localhost:${BACKEND_PORT:-3100}/api/plans" | jq '.[].title'
```

Skip any plan whose title closely matches an existing one.

### Save Each Plan

For each plan, POST to the API:

```bash
curl -s -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Plan title here",
    "description": "Detailed markdown description...",
    "route": "module/subpath",
    "source": "Source Name",
    "sourceUrl": "https://...",
    "priority": "medium",
    "steps": [
      {"title": "Step 1", "description": "Do this first", "completed": false},
      {"title": "Step 2", "description": "Then do this", "completed": false}
    ]
  }' \
  "http://localhost:${BACKEND_PORT:-3100}/api/plans"
```

---

## Phase 6: Report

After saving all plans, present a summary:

```markdown
## Product Ideas Report

**Module:** {module name}
**Plans Generated:** {count}
**Plans Saved:** {count saved} (skipped {count skipped} duplicates)

### Plans Created

| #   | Title | Priority | Route | Source |
| --- | ----- | -------- | ----- | ------ |
| 1   | ...   | high     | ...   | ...    |
| 2   | ...   | medium   | ...   | ...    |

### Research Sources

- [Source 1](url) - {what was found}
- [Source 2](url) - {what was found}

View your plans in the DevBot app: **Plans** tab
```

---

## Rules

1. **Generate 5-10 quality plans per run** - Not too few, not too many. Focus on quality over quantity.
2. **Be specific** - Vague plans like "improve performance" are useless. Include concrete details.
3. **Include implementation steps** - Each plan should have 3-8 clear steps.
4. **Cite sources** - Every plan should trace back to a web source or competitive analysis.
5. **Respect existing architecture** - Plans should work within the module's current tech stack.
6. **Prioritize honestly** - Not everything is high priority. Be realistic.
7. **Check for duplicates** - Never create duplicate plans.
8. **Rich descriptions** - Use markdown formatting (headers, lists, bold) in descriptions for readability in the mobile app.
