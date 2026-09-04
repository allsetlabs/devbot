/**
 * Cross-Session Memory REST API
 *
 * Endpoints for managing session memories and task dependency graphs.
 * Mounted at /api/session-memory.
 */

import { Router } from 'express';
import {
  listMemories,
  getMemory,
  getTaskMemories,
  getLatestTaskMemory,
  saveSessionMemory,
  updateMemory,
  deleteMemory,
  getTaskDependencies,
  setTaskDependencies,
  removeTaskDependencies,
  listAllDependencies,
  getDependencyGraph,
  buildCrossSessionContext,
  getMemoryStats,
} from '../lib/session-memory.js';

const router = Router();

// ---------------------------------------------------------------------------
// Memory endpoints
// ---------------------------------------------------------------------------

/** GET / — List all memories with optional filters */
router.get('/', async (req, res) => {
  try {
    const { task_id, tags, status, limit, offset, search } = req.query;

    const result = await listMemories({
      task_id: task_id as string | undefined,
      tags: tags ? (tags as string).split(',') : undefined,
      status: status as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
      search: search as string | undefined,
    });

    res.json(result);
  } catch (err) {
    console.error('[SessionMemory] Error listing memories:', err);
    res.status(500).json({ message: 'Failed to list memories' });
  }
});

/** GET /stats — Get memory statistics */
router.get('/stats', async (_req, res) => {
  try {
    const stats = await getMemoryStats();
    res.json(stats);
  } catch (err) {
    console.error('[SessionMemory] Error getting stats:', err);
    res.status(500).json({ message: 'Failed to get stats' });
  }
});

/** GET /graph — Get dependency graph */
router.get('/graph', async (_req, res) => {
  try {
    const graph = await getDependencyGraph();
    res.json({ nodes: graph });
  } catch (err) {
    console.error('[SessionMemory] Error getting graph:', err);
    res.status(500).json({ message: 'Failed to get dependency graph' });
  }
});

/** GET /dependencies — List all task dependencies */
router.get('/dependencies', async (_req, res) => {
  try {
    const deps = await listAllDependencies();
    res.json({ items: deps, total: deps.length });
  } catch (err) {
    console.error('[SessionMemory] Error listing dependencies:', err);
    res.status(500).json({ message: 'Failed to list dependencies' });
  }
});

/** GET /dependencies/:taskId — Get dependencies for a specific task */
router.get('/dependencies/:taskId', async (req, res) => {
  try {
    const dep = await getTaskDependencies(req.params.taskId);
    if (!dep) {
      return res.json({
        task_id: req.params.taskId,
        depends_on: [],
        tag_filters: {},
        memory_depth: {},
      });
    }
    res.json(dep);
  } catch (err) {
    console.error('[SessionMemory] Error getting dependencies:', err);
    res.status(500).json({ message: 'Failed to get dependencies' });
  }
});

/** PUT /dependencies/:taskId — Set dependencies for a task */
router.put('/dependencies/:taskId', async (req, res) => {
  try {
    const { depends_on, tag_filters, memory_depth } = req.body;
    if (!Array.isArray(depends_on)) {
      return res.status(400).json({ message: 'depends_on must be an array' });
    }
    const dep = await setTaskDependencies(req.params.taskId, depends_on, {
      tag_filters,
      memory_depth,
    });
    res.json(dep);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to set dependencies';
    console.error('[SessionMemory] Error setting dependencies:', err);
    if (message.includes('Circular')) {
      return res.status(400).json({ message });
    }
    res.status(500).json({ message });
  }
});

/** DELETE /dependencies/:taskId — Remove all dependencies for a task */
router.delete('/dependencies/:taskId', async (req, res) => {
  try {
    const removed = await removeTaskDependencies(req.params.taskId);
    res.json({ removed });
  } catch (err) {
    console.error('[SessionMemory] Error removing dependencies:', err);
    res.status(500).json({ message: 'Failed to remove dependencies' });
  }
});

/** GET /task/:taskId — Get all memories for a task */
router.get('/task/:taskId', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const memories = await getTaskMemories(req.params.taskId, limit);
    res.json({ items: memories, total: memories.length });
  } catch (err) {
    console.error('[SessionMemory] Error getting task memories:', err);
    res.status(500).json({ message: 'Failed to get task memories' });
  }
});

/** GET /task/:taskId/latest — Get the latest memory for a task */
router.get('/task/:taskId/latest', async (req, res) => {
  try {
    const memory = await getLatestTaskMemory(req.params.taskId);
    if (!memory) {
      return res.status(404).json({ message: 'No memories found for this task' });
    }
    res.json(memory);
  } catch (err) {
    console.error('[SessionMemory] Error getting latest memory:', err);
    res.status(500).json({ message: 'Failed to get latest memory' });
  }
});

/** GET /task/:taskId/context — Preview the cross-session context that would be built */
router.get('/task/:taskId/context', async (req, res) => {
  try {
    const context = await buildCrossSessionContext(req.params.taskId);
    res.json({
      task_id: req.params.taskId,
      context: context ?? '',
      has_context: !!context,
    });
  } catch (err) {
    console.error('[SessionMemory] Error building context:', err);
    res.status(500).json({ message: 'Failed to build context' });
  }
});

/** GET /:id — Get a single memory by ID */
router.get('/:id', async (req, res) => {
  try {
    const memory = await getMemory(req.params.id);
    if (!memory) {
      return res.status(404).json({ message: 'Memory not found' });
    }
    res.json(memory);
  } catch (err) {
    console.error('[SessionMemory] Error getting memory:', err);
    res.status(500).json({ message: 'Failed to get memory' });
  }
});

/** POST / — Manually create a memory entry */
router.post('/', async (req, res) => {
  try {
    const {
      task_id,
      task_name,
      run_id,
      run_index,
      summary,
      key_findings,
      output_data,
      tags,
      run_status,
      duration_seconds,
      model,
    } = req.body;

    if (!task_id || !summary) {
      return res.status(400).json({ message: 'task_id and summary are required' });
    }

    const memory = await saveSessionMemory({
      task_id,
      task_name: task_name ?? null,
      run_id: run_id ?? 'manual',
      run_index: run_index ?? 0,
      summary,
      key_findings: key_findings ?? [],
      output_data: output_data ?? {},
      tags: tags ?? [],
      run_status: run_status ?? 'completed',
      duration_seconds: duration_seconds ?? 0,
      model: model ?? 'unknown',
    });

    res.status(201).json(memory);
  } catch (err) {
    console.error('[SessionMemory] Error creating memory:', err);
    res.status(500).json({ message: 'Failed to create memory' });
  }
});

/** PUT /:id — Update a memory */
router.put('/:id', async (req, res) => {
  try {
    const memory = await updateMemory(req.params.id, req.body);
    if (!memory) {
      return res.status(404).json({ message: 'Memory not found' });
    }
    res.json(memory);
  } catch (err) {
    console.error('[SessionMemory] Error updating memory:', err);
    res.status(500).json({ message: 'Failed to update memory' });
  }
});

/** DELETE /:id — Delete a memory */
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteMemory(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Memory not found' });
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error('[SessionMemory] Error deleting memory:', err);
    res.status(500).json({ message: 'Failed to delete memory' });
  }
});

export { router as sessionMemoryRouter };
