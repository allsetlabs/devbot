import { Router } from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { asyncHandler, sendBadRequest } from '../lib/route-helpers.js';

const execFileAsync = promisify(execFile);
const router = Router();

interface WorktreeInfo {
  path: string;
  branch: string;
  head: string;
  isBare: boolean;
  isMain: boolean;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const dir = req.query.dir as string | undefined;
    if (!dir || typeof dir !== 'string') {
      sendBadRequest(res, 'dir query parameter is required');
      return;
    }

    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      sendBadRequest(res, 'Directory does not exist');
      return;
    }

    const opts = { cwd: dir, timeout: 5000 };

    try {
      await execFileAsync('git', ['rev-parse', '--git-dir'], opts);
    } catch {
      res.json({ isGitRepo: false, worktrees: [] });
      return;
    }

    const { stdout } = await execFileAsync(
      'git',
      ['worktree', 'list', '--porcelain'],
      opts
    );

    const worktrees: WorktreeInfo[] = [];
    const blocks = stdout.split('\n\n').filter((b) => b.trim());

    for (const block of blocks) {
      const lines = block.split('\n');
      let wtPath = '';
      let branch = '';
      let head = '';
      let isBare = false;

      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          wtPath = line.slice('worktree '.length);
        } else if (line.startsWith('HEAD ')) {
          head = line.slice('HEAD '.length).substring(0, 8);
        } else if (line.startsWith('branch ')) {
          branch = line.slice('branch '.length).replace('refs/heads/', '');
        } else if (line === 'bare') {
          isBare = true;
        } else if (line === 'detached') {
          branch = '(detached)';
        }
      }

      if (wtPath) {
        worktrees.push({
          path: wtPath,
          branch,
          head,
          isBare,
          isMain: worktrees.length === 0,
        });
      }
    }

    res.json({ isGitRepo: true, worktrees });
  }, 'list worktrees')
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { dir, path: wtPath, branch, newBranch } = req.body as {
      dir?: string;
      path?: string;
      branch?: string;
      newBranch?: boolean;
    };

    if (!dir || typeof dir !== 'string') {
      sendBadRequest(res, 'dir is required');
      return;
    }
    if (!wtPath || typeof wtPath !== 'string') {
      sendBadRequest(res, 'path is required');
      return;
    }
    if (!branch || typeof branch !== 'string') {
      sendBadRequest(res, 'branch is required');
      return;
    }

    const opts = { cwd: dir, timeout: 10000 };
    const args = ['worktree', 'add'];
    if (newBranch) {
      args.push('-b', branch, wtPath);
    } else {
      args.push(wtPath, branch);
    }

    await execFileAsync('git', args, opts);
    res.json({ success: true });
  }, 'create worktree')
);

router.delete(
  '/',
  asyncHandler(async (req, res) => {
    const { dir, path: wtPath } = req.body as {
      dir?: string;
      path?: string;
    };

    if (!dir || typeof dir !== 'string') {
      sendBadRequest(res, 'dir is required');
      return;
    }
    if (!wtPath || typeof wtPath !== 'string') {
      sendBadRequest(res, 'path is required');
      return;
    }

    const opts = { cwd: dir, timeout: 10000 };
    await execFileAsync('git', ['worktree', 'remove', wtPath], opts);
    res.json({ success: true });
  }, 'remove worktree')
);

export { router as worktreesRouter };
