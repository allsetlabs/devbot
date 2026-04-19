---
name: devbot-backend-crud-patterns
description: Enforces consistent CRUD route patterns in DevBot backend. Prevents duplicated boilerplate across route files. Auto-triggers when creating or editing route files in backend/src/routes/.
---

# DevBot Backend CRUD Patterns

## When This Skill Activates

Auto-trigger when creating or editing any `.ts` file in `backend/src/routes/`.

## Context

The DevBot backend has 12 route files. 6 of them follow an identical CRUD pattern (GET all, GET by id, POST, PATCH, DELETE) with Supabase. When creating new routes, follow the established patterns exactly to maintain consistency.

## Rules

### 1. Consistent CRUD Route Structure

Every CRUD route file MUST follow this structure:

```typescript
import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// GET all
router.get('/', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch records:', error.message);
    return res.status(500).json({ error: 'Failed to fetch records' });
  }
  res.json(data);
});

// GET by id
router.get('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error) {
    console.error('Failed to fetch record:', error.message);
    return res.status(404).json({ error: 'Record not found' });
  }
  res.json(data);
});

// POST create
router.post('/', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('table_name').insert(req.body).select().single();

  if (error) {
    console.error('Failed to create record:', error.message);
    return res.status(500).json({ error: 'Failed to create record' });
  }
  res.status(201).json(data);
});

// PATCH update
router.patch('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('table_name')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update record:', error.message);
    return res.status(500).json({ error: 'Failed to update record' });
  }
  res.json(data);
});

// DELETE
router.delete('/:id', async (req: Request, res: Response) => {
  const { error } = await supabase.from('table_name').delete().eq('id', req.params.id);

  if (error) {
    console.error('Failed to delete record:', error.message);
    return res.status(500).json({ error: 'Failed to delete record' });
  }
  res.status(204).send();
});

export default router;
```

### 2. Consistent HTTP Status Codes

| Operation    | Success Code   | Error Code |
| ------------ | -------------- | ---------- |
| GET all      | 200 (implicit) | 500        |
| GET by id    | 200 (implicit) | 404        |
| POST create  | **201**        | 500        |
| PATCH update | 200 (implicit) | 500        |
| DELETE       | **204**        | 500        |

### 3. Consistent Error Response Format

All error responses MUST use this format:

```typescript
res.status(code).json({ error: 'Human-readable message' });
```

For Supabase errors, always log the full error before responding:

```typescript
console.error('Context message:', error.message);
```

### 4. Named Constants for Magic Numbers

**NEVER** use raw numbers in route files. Extract to named constants at the top of the file:

```typescript
// FORBIDDEN
const limit = parseInt(req.query.limit as string) || 50;
setTimeout(callback, 5000);

// CORRECT
const DEFAULT_PAGE_SIZE = 50;
const POLL_INTERVAL_MS = 5000;

const limit = parseInt(req.query.limit as string) || DEFAULT_PAGE_SIZE;
setTimeout(callback, POLL_INTERVAL_MS);
```

### 5. Route Registration in index.ts

When adding a new route file, register it in `backend/src/index.ts`:

```typescript
import newRoutes from './routes/new-resource';
app.use('/api/new-resource', newRoutes);
```

### 6. Existing Route Files (Reference)

These files follow the CRUD pattern and should remain consistent:

| File                 | Table             | Endpoints                                             |
| -------------------- | ----------------- | ----------------------------------------------------- |
| `baby-profiles.ts`   | `baby_profiles`   | GET, GET :id, POST, PATCH :id, DELETE :id             |
| `baby-logs.ts`       | `baby_logs`       | GET (paginated), GET :id, POST, PATCH :id, DELETE :id |
| `birth-times.ts`     | `birth_times`     | GET, POST, PATCH :id, DELETE :id                      |
| `lawn-profiles.ts`   | `lawn_profiles`   | GET, GET :id, POST, PATCH :id, DELETE :id             |
| `remotion-videos.ts` | `remotion_videos` | GET, GET :id, POST, PATCH :id, DELETE :id             |
| `plans.ts`           | `plans`           | GET, GET /count, GET :id, POST, PUT :id, DELETE :id   |

## Verification Checklist

Before completing any route file edit:

- [ ] HTTP status codes match the table above
- [ ] Error responses use `{ error: string }` format
- [ ] All Supabase errors are logged with `console.error`
- [ ] No magic numbers (all extracted to named constants)
- [ ] POST returns 201, DELETE returns 204
- [ ] Route is registered in `index.ts` (if new)
