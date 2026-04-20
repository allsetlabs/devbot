---
name: devbot-backend
description: DevBot backend API reference. Use when you need to interact with DevBot services - sessions, schedulers, interactive chats, commands, baby logs/profiles, lawn care, lawn photos, weather, remotion videos, file uploads, plans, logs, birth times, grocery lists, or store profiles.
lastSynced: 2026-03-24
---

# DevBot Backend API

The DevBot backend is a Node.js Express server that manages terminal sessions, scheduled tasks, interactive chats, baby logs/profiles, lawn profiles/plans/photos, weather data, remotion videos, file uploads, plans, logs, birth times, grocery lists, and store profiles. It uses Supabase for persistence and spawns Claude Code CLI processes for AI tasks.

## Connection Details

| Setting            | Value                                                  |
| ------------------ | ------------------------------------------------------ |
| **Base URL**       | `http://0.0.0.0:3100`                                  |
| **Auth Header**    | `X-API-Key`                                            |
| **API Key**        | Found in `.env` under `API_KEY`         |
| **Supabase URL**   | Found in `.env` under `SUPABASE_URL`    |
| **Work Directory** | Found in `.env` under `DEVBOT_PROJECTS_DIR` |

Always read `.env` for current values. Never hardcode secrets.

## Apps Overview

### 1. Sessions (`/api/sessions`)

Terminal sessions with Claude Code via tmux + WebSocket. Each session spawns a tmux session and exposes it via a WebSocket server for the mobile xterm.js client.

| Method   | Endpoint                   | Description                                |
| -------- | -------------------------- | ------------------------------------------ |
| `GET`    | `/api/sessions`            | List all sessions (syncs status with tmux) |
| `GET`    | `/api/sessions/:id`        | Get single session                         |
| `POST`   | `/api/sessions`            | Create new terminal session                |
| `DELETE` | `/api/sessions/:id`        | Stop and delete session                    |
| `POST`   | `/api/sessions/:id/rename` | Rename session (`{ name }`)                |

**Create body:** `{}` (no parameters required)

**Response shape:** `{ id, port, wsUrl, name, createdAt, status }`

### 2. Schedulers (`/api/schedulers`)

Recurring tasks that run Claude Code prompts at intervals. The scheduler worker checks every 30 seconds for tasks ready to run. Tasks run immediately on creation, then repeat at the configured interval.

#### Task Management

| Method   | Endpoint                        | Description                                                             |
| -------- | ------------------------------- | ----------------------------------------------------------------------- |
| `GET`    | `/api/schedulers`               | List all tasks (excludes deleted)                                       |
| `GET`    | `/api/schedulers/:id`           | Get single task                                                         |
| `POST`   | `/api/schedulers`               | Create task (`{ prompt, intervalMinutes, maxRuns?, name? }`)            |
| `PUT`    | `/api/schedulers/:id`           | Update task (`{ prompt?, intervalMinutes?, status?, maxRuns?, name? }`) |
| `DELETE` | `/api/schedulers/:id`           | Soft-delete task                                                        |
| `POST`   | `/api/schedulers/:id/rerun`     | Trigger immediate rerun (409 if already running)                        |
| `POST`   | `/api/schedulers/migrate-names` | Generate AI names for unnamed schedulers (fire-and-forget)              |

**Response shape:** `{ id, prompt, name, intervalMinutes, status, createdAt, lastRunAt, nextRunAt, runCount, maxRuns, isRunning, isQueued }`

**Rerun response:** `{ success: true, message: 'Task rerun queued' }`

**Migrate-names response:** `{ message, count }` (generates names asynchronously)

**Create example:**

```bash
curl -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"/sync-docs","intervalMinutes":1440}' \
  http://0.0.0.0:3100/api/schedulers
```

#### Run History

| Method | Endpoint                                   | Description                       |
| ------ | ------------------------------------------ | --------------------------------- |
| `GET`  | `/api/schedulers/:id/runs`                 | All runs (newest first)           |
| `GET`  | `/api/schedulers/:id/latest-run`           | Most recent run                   |
| `GET`  | `/api/schedulers/:id/runs/:runId`          | Single run                        |
| `GET`  | `/api/schedulers/:id/runs/:runId/messages` | Run messages (`?afterSequence=N`) |

**Run shape:** `{ id, taskId, runIndex, chatId, startedAt, completedAt, status, outputFile, errorMessage }`

**Note:** Newer runs have `chatId` (links to interactive chat session); older runs read messages from `task_messages` table instead of `chat_messages`.

### 3. Commands (`/api/commands`)

List available slash commands and DevBot features.

| Method | Endpoint        | Description                                                     |
| ------ | --------------- | --------------------------------------------------------------- |
| `GET`  | `/api/commands` | List all commands (sorted by type, then name, no auth required) |

**Response shape:** Array of `{ id, name, description, type }`

**Example curl:**

```bash
curl -s http://0.0.0.0:3100/api/commands | jq
```

### 4. Interactive Chats (`/api/interactive-chats`)

Multi-turn conversations with Claude Code. Supports sending messages, stopping execution, and incremental message polling. Sessions resume via `--resume` flag.

#### Chat Management

| Method   | Endpoint                               | Description                                                                             |
| -------- | -------------------------------------- | --------------------------------------------------------------------------------------- |
| `GET`    | `/api/interactive-chats`               | List non-archived chats (sorted by createdAt desc, `?type=`)                            |
| `GET`    | `/api/interactive-chats/archived`      | List archived chats (sorted by archivedAt desc, `?type=`)                               |
| `GET`    | `/api/interactive-chats/types`         | Get distinct chat types                                                                 |
| `GET`    | `/api/interactive-chats/:id`           | Get single chat                                                                         |
| `POST`   | `/api/interactive-chats`               | Create new chat (`{ name?, type?, permissionMode?, model?, systemPrompt?, maxTurns? }`) |
| `POST`   | `/api/interactive-chats/:id/duplicate` | Duplicate chat with same settings, empty messages                                       |
| `DELETE` | `/api/interactive-chats/:id`           | Delete chat and stop execution                                                          |
| `POST`   | `/api/interactive-chats/:id/rename`    | Rename chat (`{ name }`)                                                                |
| `POST`   | `/api/interactive-chats/:id/archive`   | Archive chat (soft delete)                                                              |
| `POST`   | `/api/interactive-chats/:id/unarchive` | Restore archived chat                                                                   |
| `GET`    | `/api/interactive-chats/:id/export`    | Export chat as markdown file (`?format=markdown\|json\|plaintext`)                      |

#### Messaging

| Method | Endpoint                              | Description                                                      |
| ------ | ------------------------------------- | ---------------------------------------------------------------- |
| `POST` | `/api/interactive-chats/:id/send`     | Send message (`{ prompt }`) — stops current execution if running |
| `POST` | `/api/interactive-chats/:id/stop`     | Stop execution                                                   |
| `GET`  | `/api/interactive-chats/:id/status`   | Check if running                                                 |
| `GET`  | `/api/interactive-chats/:id/messages` | Get messages (`?afterSequence=N`)                                |

#### Settings

| Method | Endpoint                                   | Description                                   |
| ------ | ------------------------------------------ | --------------------------------------------- |
| `POST` | `/api/interactive-chats/:id/mode`          | Change permission mode (`{ permissionMode }`) |
| `POST` | `/api/interactive-chats/:id/model`         | Change Claude model (`{ model }`)             |
| `POST` | `/api/interactive-chats/:id/system-prompt` | Update system prompt (`{ systemPrompt }`)     |
| `POST` | `/api/interactive-chats/:id/max-turns`     | Change max turns (`{ maxTurns }`)             |

**Mode change:** `permissionMode` must be `"plan"`, `"auto-accept"`, or `"dangerous"`. Cannot escalate from `plan`/`auto-accept` to `dangerous`.

**Model change:** `model` must be `"opus"`, `"sonnet"`, or `"haiku"`.

**Max turns:** Pass positive integer to limit turns, or `null` to remove limit (unlimited).

**System prompt update:** Pass `{ systemPrompt: "text" }` to set, or `{ systemPrompt: null }` / `{ systemPrompt: "" }` to clear.

**Chat shape:** `{ id, name, type, claudeSessionId, status, permissionMode, model, systemPrompt, maxTurns, isRunning, createdAt, archivedAt }`

**Create body:** `{ name?, type?, permissionMode?, model?, systemPrompt?, maxTurns? }`. Defaults: `name="New Chat"`, `type="Manual"`, `permissionMode="dangerous"`, `model="sonnet"`.

**DB-only columns (not in API response):** `updated_at` (timestamptz, NOT NULL, default NOW()), `is_executing` (boolean, NOT NULL, default FALSE).

### 5. Baby Logs (`/api/baby-logs`)

Tracks baby feeding, diaper, weight, height, and head circumference. Five log types: `feeding` (bottle or breast, with duration/ml), `diaper` (wet % and/or poop), `weight` (kg), `height` (cm), and `head_circumference` (cm).

| Method   | Endpoint             | Description                                                                                  |
| -------- | -------------------- | -------------------------------------------------------------------------------------------- |
| `GET`    | `/api/baby-logs`     | List logs (`?type=feeding\|wet\|poop\|weight\|height\|head_circumference&limit=50&offset=0`) |
| `GET`    | `/api/baby-logs/:id` | Get single log                                                                               |
| `POST`   | `/api/baby-logs`     | Create log                                                                                   |
| `PATCH`  | `/api/baby-logs/:id` | Update log                                                                                   |
| `DELETE` | `/api/baby-logs/:id` | Delete log                                                                                   |

**Response shape:**

```typescript
{
  id: string;
  logType: 'feeding' | 'diaper' | 'weight' | 'height' | 'head_circumference';
  feedingType: 'bottle' | 'breast' | null;
  feedingDurationMin: number | null;
  feedingMl: number | null;
  breastSide: 'left' | 'right' | 'both' | null;
  diaperWetPct: 25 | 50 | 75 | 100 | null;
  diaperPoop: 'small' | 'large' | null;
  fedBy: string | null; // comma-separated names
  note: string | null;
  weightKg: number | null; // up to 4 decimal places
  heightCm: number | null; // up to 1 decimal place
  headCircumferenceCm: number | null; // up to 2 decimal places
  loggedAt: string; // ISO 8601
  createdAt: string; // ISO 8601
}
```

**Filter types:** `type=feeding` (all feeding), `type=wet` (diaper with wetPct), `type=poop` (diaper with poop), `type=weight`, `type=height`, `type=head_circumference`

#### Feeding log

```bash
# Bottle feeding
curl -X POST -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"logType":"feeding","feedingType":"bottle","feedingDurationMin":15,"feedingMl":60,"fedBy":"Daddy"}' \
  http://0.0.0.0:3100/api/baby-logs

# Breastfeeding
curl -X POST -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"logType":"feeding","feedingType":"breast","feedingDurationMin":20,"breastSide":"left","fedBy":"Mommy"}' \
  http://0.0.0.0:3100/api/baby-logs
```

#### Diaper log

`diaperWetPct`: `25 | 50 | 75 | 100`. `diaperPoop`: `"small" | "large"`. At least one must be set:

```bash
curl -X POST -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"logType":"diaper","diaperWetPct":75,"diaperPoop":"small"}' \
  http://0.0.0.0:3100/api/baby-logs
```

#### Weight log

```bash
curl -X POST -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"logType":"weight","weightKg":3.5000}' \
  http://0.0.0.0:3100/api/baby-logs
```

#### Height log

```bash
curl -X POST -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"logType":"height","heightCm":50.5}' \
  http://0.0.0.0:3100/api/baby-logs
```

#### Head circumference log

```bash
curl -X POST -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"logType":"head_circumference","headCircumferenceCm":35.50}' \
  http://0.0.0.0:3100/api/baby-logs
```

#### Database schema (`baby_logs` table)

| Column                | Type         | Notes                                                            |
| --------------------- | ------------ | ---------------------------------------------------------------- |
| id                    | TEXT PK      | 12-char UUID slice                                               |
| log_type              | TEXT         | `feeding`, `diaper`, `weight`, `height`, or `head_circumference` |
| feeding_type          | TEXT         | `bottle` or `breast` (null if not feeding)                       |
| feeding_duration_min  | INTEGER      | Duration in minutes                                              |
| feeding_ml            | INTEGER      | ml consumed (bottle only)                                        |
| breast_side           | TEXT         | `left`, `right`, or `both` (breast only)                         |
| diaper_wet_pct        | INTEGER      | 25 / 50 / 75 / 100 (null = no wet)                               |
| diaper_poop           | TEXT         | `small` / `large` (null = no poop)                               |
| fed_by                | TEXT         | Comma-separated names                                            |
| note                  | TEXT         | Optional free-text note                                          |
| weight_kg             | NUMERIC(8,4) | Weight in kg (up to 4 decimal places)                            |
| height_cm             | NUMERIC(5,1) | Height in cm (up to 1 decimal place)                             |
| head_circumference_cm | NUMERIC(5,2) | Head circumference in cm (up to 2 decimal places)                |
| logged_at             | TIMESTAMPTZ  | When the event occurred                                          |
| created_at            | TIMESTAMPTZ  | Row creation time                                                |

### 6. Baby Profiles (`/api/baby-profiles`)

Stores immutable baby profile details: identity, birth info, and parentage.

| Method   | Endpoint                 | Description    |
| -------- | ------------------------ | -------------- |
| `GET`    | `/api/baby-profiles`     | List all       |
| `GET`    | `/api/baby-profiles/:id` | Get single     |
| `POST`   | `/api/baby-profiles`     | Create profile |
| `PATCH`  | `/api/baby-profiles/:id` | Update profile |
| `DELETE` | `/api/baby-profiles/:id` | Delete profile |

**Response shape:**

```typescript
{
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  timeOfBirth: string | null; // HH:MM:SS
  gender: 'male' | 'female';
  bloodType: string | null; // A+, A-, B+, B-, AB+, AB-, O+, O-
  placeOfBirth: string | null;
  cityOfBirth: string | null;
  stateOfBirth: string | null;
  countryOfBirth: string | null;
  citizenship: string | null;
  fatherName: string | null;
  motherName: string | null;
  birthWeightKg: number | null; // NUMERIC(5,3)
  birthHeightCm: number | null; // NUMERIC(5,2)
  gestationalWeek: number | null; // 20.0–42.0
  note: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**Create requires:** `firstName`, `lastName`, `dateOfBirth`, `gender`.

```bash
curl -X POST -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"firstName":"Baby","lastName":"Smith","dateOfBirth":"2026-02-01","gender":"male","birthWeightKg":3.200,"gestationalWeek":38.5}' \
  http://0.0.0.0:3100/api/baby-profiles
```

#### Database schema (`baby_profiles` table)

| Column           | Type          | Notes                                   |
| ---------------- | ------------- | --------------------------------------- |
| id               | TEXT PK       | 12-char UUID slice                      |
| first_name       | TEXT NOT NULL | Baby's first name                       |
| middle_name      | TEXT          | Optional middle name                    |
| last_name        | TEXT NOT NULL | Baby's last name                        |
| date_of_birth    | DATE NOT NULL | Birth date                              |
| time_of_birth    | TIME          | Birth time                              |
| gender           | TEXT NOT NULL | `male` or `female`                      |
| blood_type       | TEXT          | CHECK: A+, A-, B+, B-, AB+, AB-, O+, O- |
| place_of_birth   | TEXT          | Hospital or specific place              |
| city_of_birth    | TEXT          | City                                    |
| state_of_birth   | TEXT          | State                                   |
| country_of_birth | TEXT          | Country                                 |
| citizenship      | TEXT          | Citizenship                             |
| father_name      | TEXT          | Father's full name                      |
| mother_name      | TEXT          | Mother's full name                      |
| birth_weight_kg  | NUMERIC(5,3)  | Weight at birth in kg                   |
| birth_height_cm  | NUMERIC(5,2)  | Height at birth in cm                   |
| gestational_week | NUMERIC(3,1)  | Gestational age (20.0–42.0)             |
| note             | TEXT          | Optional free-text note                 |
| created_at       | TIMESTAMPTZ   | Row creation time                       |
| updated_at       | TIMESTAMPTZ   | Auto-updated via trigger                |

### 7. Birth Times (`/api/birth-times`)

Records birth time entries with location and timezone data.

| Method   | Endpoint               | Description             |
| -------- | ---------------------- | ----------------------- |
| `GET`    | `/api/birth-times`     | List all entries        |
| `POST`   | `/api/birth-times`     | Create entry            |
| `PATCH`  | `/api/birth-times/:id` | Update name/description |
| `DELETE` | `/api/birth-times/:id` | Delete entry            |

**Response shape:**

```typescript
{
  id: string;
  recordedAt: string; // ISO 8601
  timezone: string; // e.g. "America/New_York"
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  fullAddress: string | null;
  name: string | null;
  description: string | null;
  note: string | null;
  createdAt: string;
}
```

**Create requires:** `recordedAt` (ISO 8601) and `timezone`. Location fields are optional.
**PATCH only allows:** `name` and `description`.

### 8. Plans (`/api/plans`)

Module development plans with status tracking.

| Method   | Endpoint           | Description                                                       |
| -------- | ------------------ | ----------------------------------------------------------------- |
| `GET`    | `/api/plans`       | List plans (`?status=pending\|in_progress\|completed\|dismissed`) |
| `GET`    | `/api/plans/count` | Count active plans (pending + in_progress)                        |
| `GET`    | `/api/plans/:id`   | Get single plan                                                   |
| `POST`   | `/api/plans`       | Create plan                                                       |
| `PUT`    | `/api/plans/:id`   | Update plan                                                       |
| `DELETE` | `/api/plans/:id`   | Delete plan                                                       |

**Response shape:**

```typescript
{
  id: string;
  title: string;
  description: string;
  route: string;
  source: string | null;
  sourceUrl: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  steps: (Record < string, unknown > []);
  createdAt: string;
  updatedAt: string;
}
```

**Create requires:** `title`, `description`, `route`. Defaults: priority=`medium`, steps=`[]`.

#### Database schema (`module_plans` table)

| Column      | Type        | Notes                                                                         |
| ----------- | ----------- | ----------------------------------------------------------------------------- |
| id          | TEXT PK     | 12-char UUID slice                                                            |
| title       | TEXT NN     | Plan title                                                                    |
| description | TEXT NN     | Plan description                                                              |
| route       | TEXT NN     | Module route/path for categorization                                          |
| source      | TEXT        | Where the plan idea came from                                                 |
| source_url  | TEXT        | URL reference for the source                                                  |
| priority    | TEXT NN     | CHECK: `low`, `medium`, `high` (default `medium`)                             |
| status      | TEXT NN     | CHECK: `pending`, `in_progress`, `completed`, `dismissed` (default `pending`) |
| steps       | JSONB       | Array of step objects (default `[]`)                                          |
| created_at  | TIMESTAMPTZ | Row creation time                                                             |
| updated_at  | TIMESTAMPTZ | Auto-updated on modification                                                  |

### 9. Lawn Profiles (`/api/lawn-profiles`)

Stores lawn property details for lawn care planning.

| Method   | Endpoint                 | Description    |
| -------- | ------------------------ | -------------- |
| `GET`    | `/api/lawn-profiles`     | List all       |
| `GET`    | `/api/lawn-profiles/:id` | Get single     |
| `POST`   | `/api/lawn-profiles`     | Create profile |
| `PATCH`  | `/api/lawn-profiles/:id` | Update profile |
| `DELETE` | `/api/lawn-profiles/:id` | Delete profile |

**Response shape:**

```typescript
{
  id: string;
  address: string;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  grassType: string;
  sqft: number | null;
  climateZone: string | null;
  sunExposure: 'full_sun' | 'partial_shade' | 'full_shade' | null;
  applicationMethod: 'spreader' | 'sprayer' | null;
  equipmentModel: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**Create requires:** `address`, `grassType`.

```bash
curl -X POST -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"address":"123 Main St","city":"Austin","state":"TX","zipCode":"78701","grassType":"bermuda","sqft":5000,"sunExposure":"full_sun","applicationMethod":"spreader","equipmentModel":"Scotts Turf Builder EdgeGuard"}' \
  http://0.0.0.0:3100/api/lawn-profiles
```

#### Database schema (`lawn_profiles` table)

| Column             | Type        | Notes                                        |
| ------------------ | ----------- | -------------------------------------------- |
| id                 | TEXT PK     | 12-char UUID slice                           |
| address            | TEXT NN     | Street address                               |
| city               | TEXT        | City                                         |
| state              | TEXT        | State                                        |
| zip_code           | TEXT        | ZIP code                                     |
| grass_type         | TEXT NN     | Type of grass                                |
| sqft               | INTEGER     | Lawn area in sq ft                           |
| climate_zone       | TEXT        | USDA climate zone                            |
| sun_exposure       | TEXT        | `full_sun`, `partial_shade`, or `full_shade` |
| application_method | TEXT        | `spreader` or `sprayer`                      |
| equipment_model    | TEXT        | Equipment model name                         |
| notes              | TEXT        | Optional free-text note                      |
| created_at         | TIMESTAMPTZ | Row creation time                            |
| updated_at         | TIMESTAMPTZ | Auto-updated via trigger                     |

### 10. Lawn Plans (`/api/lawn-plans`)

AI-generated lawn care plans tied to a lawn profile. Plans are generated asynchronously via an interactive chat with Claude Code.

| Method   | Endpoint                     | Description                         |
| -------- | ---------------------------- | ----------------------------------- |
| `GET`    | `/api/lawn-plans`            | List plans (`?profile_id=<id>`)     |
| `GET`    | `/api/lawn-plans/:id`        | Get single plan                     |
| `GET`    | `/api/lawn-plans/:id/status` | Check generation status             |
| `POST`   | `/api/lawn-plans/generate`   | Generate new plan (`{ profileId }`) |
| `DELETE` | `/api/lawn-plans/:id`        | Delete plan                         |

**Response shape:**

```typescript
{
  id: string;
  profileId: string;
  chatId: string | null;
  status: 'generating' | 'completed' | 'failed';
  planData: {
    summary: string;
    totalCost: number;
    store: string;
    applications: Array<{
      order: number;
      date: string;
      name: string;
      description: string;
      product: string;
      productUrl: string;
      store: string;
      productCovers: number;
      productPrice: number;
      applicationCost: number;
      howToApply: string;
      walkingPace: string;
      overlap: string;
      amount: string;
      tips: string;
      watering: string;
      warnings: string;
    }>;
  } | null;
  errorMessage: string | null;
  generatedAt: string | null;
  createdAt: string;
}
```

**Status check response:** `{ id, status, isGenerating, chatId, errorMessage }`

**Generate requires:** `profileId` (must reference an existing lawn profile).

```bash
# Generate a new plan
curl -X POST -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"profileId":"abc123def456"}' \
  http://0.0.0.0:3100/api/lawn-plans/generate

# Poll generation status
curl -H "X-API-Key: $API_KEY" http://0.0.0.0:3100/api/lawn-plans/<id>/status
```

#### Database schema (`lawn_plans` table)

| Column        | Type        | Notes                                            |
| ------------- | ----------- | ------------------------------------------------ |
| id            | TEXT PK     | 12-char UUID slice                               |
| profile_id    | TEXT NN FK  | References `lawn_profiles(id)` ON DELETE CASCADE |
| chat_id       | TEXT        | Interactive chat session ID                      |
| status        | TEXT NN     | `generating`, `completed`, or `failed`           |
| plan_data     | JSONB       | JSON plan with applications array                |
| error_message | TEXT        | Error details if generation failed               |
| generated_at  | TIMESTAMPTZ | When generation completed                        |
| created_at    | TIMESTAMPTZ | Row creation time                                |

### 11. Logs (`/api/logs`)

Read and clear DevBot application log files.

| Method   | Endpoint    | Description                                                       |
| -------- | ----------- | ----------------------------------------------------------------- |
| `GET`    | `/api/logs` | Get log content (`?source=backend\|frontend&lines=200`, max 5000) |
| `DELETE` | `/api/logs` | Clear log file (`?source=backend\|frontend`)                      |

**Response shape:** `{ source, lines, totalLines, content, lastModified }`

### 12. File Upload (`/api/upload`)

Upload files for use in chats. Stored in `.tmp/devbot-uploads/{chatId}/` directory.

| Method | Endpoint      | Description                                         |
| ------ | ------------- | --------------------------------------------------- |
| `POST` | `/api/upload` | Upload files (`multipart/form-data`, max 20MB each) |

**Form fields:** `files[]` (multiple), `chatId` (optional)
**Allowed types:** Images, PDFs, Office docs, text/code files, archives (.zip)
**Response:** `{ success, path, filename, originalName, files[] }`

### 13. File Browse (`/api/files`)

Browse project files for discovery and intellisense features.

| Method | Endpoint            | Description                                                                   |
| ------ | ------------------- | ----------------------------------------------------------------------------- |
| `GET`  | `/api/files/browse` | Search/list files (`?q=query`) — returns up to 50 results, name-weighted sort |

**Query params:**

- `q` (optional): Search query to filter by filename or path

**Response shape:** Array of `{ id, name, path, type, size? }`

- `type`: `"file"` or `"directory"`
- `size`: File size in bytes (files only)
- Results sorted by name match relevance, then file-before-directory, then alphabetical

**Example curl:**

```bash
curl -H "X-API-Key: $API_KEY" \
  'http://0.0.0.0:3100/api/files/browse?q=package'
```

### 14. Remotion Videos (`/api/remotion-videos`)

Manages Remotion video records tied to interactive chats. Supports CRUD operations and video file streaming with range requests.

| Method   | Endpoint                          | Description                            |
| -------- | --------------------------------- | -------------------------------------- |
| `GET`    | `/api/remotion-videos`            | List all videos (newest first)         |
| `GET`    | `/api/remotion-videos/:id`        | Get single video                       |
| `POST`   | `/api/remotion-videos`            | Create video record                    |
| `PATCH`  | `/api/remotion-videos/:id`        | Update video (name, videoPath, status) |
| `DELETE` | `/api/remotion-videos/:id`        | Delete video record                    |
| `GET`    | `/api/remotion-videos/:id/stream` | Stream video file (supports Range)     |

**Response shape:**

```typescript
{
  id: string;
  name: string;
  videoPath: string;
  chatId: string;
  status: 'generating' | 'completed' | 'failed';
  createdAt: string;
}
```

**Create requires:** `name`, `chatId`. `videoPath` defaults to empty string if omitted.

```bash
# Create a video record
curl -X POST -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"name":"My Video","chatId":"abc12345","videoPath":"intro-video/out/my-video.mp4"}' \
  http://0.0.0.0:3100/api/remotion-videos

# Update status
curl -X PATCH -H "X-API-Key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"status":"completed","videoPath":"intro-video/out/my-video.mp4"}' \
  http://0.0.0.0:3100/api/remotion-videos/<id>
```

#### Database schema (`remotion_videos` table)

| Column     | Type        | Notes                                                |
| ---------- | ----------- | ---------------------------------------------------- |
| id         | TEXT PK     | 8-char UUID slice                                    |
| name       | TEXT NN     | Video name                                           |
| video_path | TEXT NN     | Relative path to video file from project root        |
| chat_id    | TEXT NN FK  | References `interactive_chats(id)` ON DELETE CASCADE |
| status     | TEXT NN     | `generating`, `completed`, or `failed`               |
| created_at | TIMESTAMPTZ | Row creation time                                    |

### 15. Lawn Photos (`/api/lawn-photos`)

Photo journal for tracking lawn progress over time. Photos are uploaded via multipart form and tied to a lawn profile.

| Method   | Endpoint               | Description                                |
| -------- | ---------------------- | ------------------------------------------ |
| `GET`    | `/api/lawn-photos`     | List photos (`?profile_id=<id>`, required) |
| `POST`   | `/api/lawn-photos`     | Upload photo (`multipart/form-data`)       |
| `PATCH`  | `/api/lawn-photos/:id` | Update photo (caption, applicationOrder)   |
| `DELETE` | `/api/lawn-photos/:id` | Delete photo (removes file from disk)      |

**Response shape:**

```typescript
{
  id: string;
  profileId: string;
  applicationOrder: number | null;
  fileUrl: string; // "/uploads/<filename>" URL
  caption: string | null;
  takenAt: string; // ISO 8601
  createdAt: string;
}
```

**Upload form fields:** `photo` (single image file), `profileId` (required), `applicationOrder` (optional int), `caption` (optional), `takenAt` (optional ISO 8601, defaults to now)

**Allowed image types:** PNG, JPEG, GIF, WebP (max 20MB)

**Static file serving:** Uploaded photos are served at `/uploads/<filename>` (no auth required).

```bash
# Upload a lawn photo
curl -X POST -H "X-API-Key: $API_KEY" \
  -F "photo=@lawn.jpg" \
  -F "profileId=abc123def456" \
  -F "caption=After first mow" \
  http://0.0.0.0:3100/api/lawn-photos
```

#### Database schema (`lawn_photos` table)

| Column            | Type        | Notes                                             |
| ----------------- | ----------- | ------------------------------------------------- |
| id                | TEXT PK     | 12-char UUID slice                                |
| profile_id        | TEXT NN FK  | References `lawn_profiles(id)` ON DELETE CASCADE  |
| application_order | INTEGER     | Link to which plan application this photo relates |
| file_path         | TEXT NN     | Server-side path to the uploaded image            |
| caption           | TEXT        | Optional caption                                  |
| taken_at          | TIMESTAMPTZ | When the photo was taken (default NOW)            |
| created_at        | TIMESTAMPTZ | Row creation time                                 |

### 16. Weather (`/api/weather`)

Lawn care weather data with soil temperature and treatment readiness. Uses Open-Meteo API for weather and Nominatim for geocoding. Responses are cached for 15 minutes.

| Method | Endpoint       | Description                                               |
| ------ | -------------- | --------------------------------------------------------- |
| `GET`  | `/api/weather` | Get weather + treatments (`?zip=<zip>&grass_type=<type>`) |

**Query params:** `zip` (required US zip code), `grass_type` (optional, e.g. `Bermuda`, `Zoysia`)

**Response shape:**

```typescript
{
  current: {
    temperature: number; // °F
    feelsLike: number;
    humidity: number;
    windSpeed: number; // mph
    precipitation: number; // inches
    weatherCode: number;
  }
  daily: Array<{
    date: string;
    tempMax: number;
    tempMin: number;
    precipitation: number;
    weatherCode: number;
  }>; // 7-day forecast
  soilTemperature: number; // °F at 6cm depth
  treatments: Array<{
    name: string; // 'Pre-Emergent' | 'Fertilizer' | 'Seeding'
    status: 'ready' | 'wait' | 'not_recommended';
    threshold: string;
    message: string;
  }>;
  location: {
    lat: number;
    lon: number;
    name: string;
  }
  updatedAt: string;
}
```

```bash
curl -H "X-API-Key: $API_KEY" \
  "http://0.0.0.0:3100/api/weather?zip=78701&grass_type=Bermuda"
```

### 17. Health Check

| Method | Endpoint  | Description                      |
| ------ | --------- | -------------------------------- |
| `GET`  | `/health` | Server status (no auth required) |

**Response:** `{ status, uptime, timestamp, runningScheduledTasks }`

## Common Patterns

**Authentication:** All `/api/*` endpoints require `X-API-Key` header or `key` query parameter.

**Polling messages:** Both schedulers and interactive chats support incremental fetching with `?afterSequence=N` to get only new messages.

**Error format:** `{ error: string, message: string }`

## Running the Backend

```bash
# Via Makefile
make run-dbb

# Or manually
cd backend && npx vite-node --watch src/index.ts

# Kill and restart if port is stuck
lsof -ti:3100 | xargs kill -9
```

Backend runs in tmux session `devbot:backend`.
