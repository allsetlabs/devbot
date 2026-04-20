---
name: devbot-plugin-install
description: Install a DevBot plugin from a GitHub URL or local path. Handles forking, git submodule setup, registration in the plugins registry, and migration execution.
---

# DevBot Plugin Install

Installs a plugin into the DevBot system. Plugins are self-contained apps (baby log, lawn care, video, etc.) that register into the core app.

**Principle: The code is always the user's.** Like shadcn/ui - we copy/fork the code, the user owns it fully.

## Plugin Contract

Every plugin MUST export a default object from its root `index.ts` matching this shape:

```ts
import type { DevBotPlugin } from '@devbot/core';

export default {
  name: 'plugin-name', // unique slug, used in routes and DB
  displayName: 'Plugin Name', // shown in UI
  icon: 'lucide-icon-name', // lucide-react icon
  description: 'What this plugin does',
  color: '#HEX', // brand color for the card

  // Frontend
  app: PluginRootComponent, // React component rendered on /plugins/:name
  widgets: [DashboardWidget], // optional dashboard widgets

  // Backend
  router: expressRouter, // Express Router → mounted at /api/plugins/:name
  migrations: './migrations', // path to SQLite/libSQL migration files

  // Dependencies on core modules (optional)
  dependencies: ['chat'], // core modules this plugin embeds
} satisfies DevBotPlugin;
```

## Install Modes

### Mode 1: From GitHub URL

**Input:** GitHub URL + optional path within repo (e.g., `github.com/user/repo` or `github.com/user/monorepo/plugins/mealplanner`)

**Steps:**

1. **Fork the repo** to the user's GitHub account:

   ```bash
   gh repo fork <owner>/<repo> --clone=false
   ```

   If already forked, skip this step.

2. **Add as git submodule** pointing to the user's fork:

   ```bash
   cd $DEVBOT_PROJECTS_DIR
   git submodule add https://github.com/<user-github>/<forked-repo>.git plugins/<plugin-name>
   ```

   If the plugin is in a subdirectory of the repo, submodule the entire repo and note the path.

3. **Add upstream remote** to track the original author:

   ```bash
   cd plugins/<plugin-name>
   git remote add upstream https://github.com/<original-owner>/<repo>.git
   ```

4. **Validate** the plugin exports a valid `DevBotPlugin` object:
   - Read the root `index.ts` (or the file at the specified path)
   - Confirm it exports: `name`, `displayName`, `icon`, `app`, `router`
   - If invalid, warn the user and stop

5. **Register** in `backend/src/index.ts`:
   - Add an import like `import { getMyPluginRouter } from '@devbot/plugin-<name>';`
   - Add a route registration like `app.use('/api/plugins/<name>', getMyPluginRouter());`

6. **Run migrations** if the plugin has a `migrations/` directory:

   ```bash
   # Apply all .sql files in order to ~/.devbot/devbot.db
   ```

7. **Install dependencies** if the plugin has a `package.json`:
   ```bash
   cd plugins/<plugin-name>
   npm install
   ```

### Mode 2: From Local Path

**Input:** Path to a local directory containing a plugin

**Steps:**

1. **Validate** the directory contains a valid plugin (same as step 4 above)

2. **Copy or symlink** into `plugins/<plugin-name>/`
   - If already in the plugins directory, skip this step

3. **Register** in `backend/src/index.ts` (same as step 5 above)

4. **Run migrations** (same as step 6 above)

5. **Install dependencies** (same as step 7 above)

### Mode 3: Create New Plugin (Scaffold)

**Input:** Plugin name and description

**Steps:**

1. **Scaffold** the plugin directory:

   ```
   plugins/<plugin-name>/
   ├── index.ts              ← DevBotPlugin export
   ├── App.tsx               ← root React component
   ├── routes.ts             ← Express router
   ├── migrations/           ← empty, ready for schemas
   │   └── 001_init.sql
   └── package.json
   ```

2. **Generate** the `index.ts` with the DevBotPlugin export using the provided name/description

3. **Register** in `backend/src/index.ts`

4. **Inform** the user the plugin is ready to develop

## Plugin Registration

Plugins are registered by direct import in `backend/src/index.ts`. A plugin exists in the system if and only if its router is imported and mounted here:

```ts
// backend/src/index.ts
import { getBabyLogsRouter } from '@devbot/plugin-baby-logs';
import { getLawnCareRouter } from '@devbot/plugin-lawn-care';

app.use('/api/plugins/baby-logs', getBabyLogsRouter());
app.use('/api/plugins/lawn-care', getLawnCareRouter());
```

Adding = add the import + the `app.use(...)` line.
Removing = delete the import + the `app.use(...)` line.

## Plugin Management Operations

### Update (pull from upstream)

```bash
cd plugins/<plugin-name>
git fetch upstream
git merge upstream/main
```

### Eject (convert submodule to owned code)

1. Copy the submodule contents to a temp location
2. Remove the submodule: `git submodule deinit plugins/<plugin-name>`
3. Remove from `.gitmodules`
4. Copy contents back to `plugins/<plugin-name>/`
5. `git add` the directory as regular files
6. Backend registration stays the same - imports don't change

### Remove

1. Remove the import and `app.use(...)` line from `backend/src/index.ts`
2. Remove directory (or submodule)
3. Optionally drop plugin tables from DB

## Error Boundaries

Every plugin is wrapped in an ErrorBoundary in `PluginView.tsx`. If a plugin crashes:

- The error is caught and logged
- A fallback UI is shown with the plugin name and a "Back to Plugins" button
- The core app continues running unaffected

## Rules

1. **Never modify core** - plugins only touch their own directory and the registration line in `backend/src/index.ts`
2. **Validate before registering** - always check the export shape before adding to the backend
3. **Fork, don't clone** - for GitHub plugins, always fork first so the user owns the code
4. **Namespace DB tables** - plugin tables should be prefixed: `baby_logs_*`, `lawn_care_*`
5. **Run migrations safely** - check if tables already exist before creating
6. **One plugin = one directory** - everything the plugin needs is in its folder
