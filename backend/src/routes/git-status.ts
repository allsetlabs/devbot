import { Router } from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { asyncHandler, sendBadRequest } from '../lib/route-helpers.js';

const execFileAsync = promisify(execFile);
const router = Router();

interface GitStatusResponse {
  isGitRepo: boolean;
  branch: string | null;
  dirtyCount: number;
  ahead: number;
  behind: number;
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
      res.json({ isGitRepo: false, branch: null, dirtyCount: 0, ahead: 0, behind: 0 } satisfies GitStatusResponse);
      return;
    }

    const [branchResult, statusResult, aheadBehindResult] = await Promise.all([
      execFileAsync('git', ['branch', '--show-current'], opts).catch(() => ({ stdout: '' })),
      execFileAsync('git', ['status', '--porcelain'], opts).catch(() => ({ stdout: '' })),
      execFileAsync('git', ['rev-list', '--left-right', '--count', '@{upstream}...HEAD'], opts).catch(() => ({ stdout: '' })),
    ]);

    const branch = branchResult.stdout.trim() || 'HEAD';
    const dirtyCount = statusResult.stdout.split('\n').filter((l) => l.trim()).length;

    let ahead = 0;
    let behind = 0;
    const abParts = aheadBehindResult.stdout.trim().split(/\s+/);
    if (abParts.length === 2) {
      behind = parseInt(abParts[0], 10) || 0;
      ahead = parseInt(abParts[1], 10) || 0;
    }

    const result: GitStatusResponse = { isGitRepo: true, branch, dirtyCount, ahead, behind };
    res.json(result);
  }, 'get git status')
);

export { router as gitStatusRouter };
