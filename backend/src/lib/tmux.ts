import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Create a new tmux session running Claude Code
 */
export async function createTmuxSession(sessionName: string, workDir: string): Promise<void> {
  try {
    // Create a new tmux session running Claude Code
    await execAsync(
      `tmux new-session -d -s "${sessionName}" -c "${workDir}" "claude --dangerously-skip-permissions --chrome"`
    );
    // Source user's tmux config if it exists
    await execAsync(`tmux source-file ~/.tmux.conf 2>/dev/null || true`);
  } catch (error) {
    // Session might already exist
    const err = error as { stderr?: string };
    if (err.stderr?.includes('duplicate session')) {
      console.log(`Session ${sessionName} already exists`);
      return;
    }
    throw error;
  }
}

/**
 * Kill a tmux session
 */
export async function killTmuxSession(sessionName: string): Promise<void> {
  try {
    await execAsync(`tmux kill-session -t "${sessionName}"`);
  } catch (error) {
    // Session might not exist
    const err = error as { stderr?: string };
    if (err.stderr?.includes('no server running') || err.stderr?.includes("can't find session")) {
      console.log(`Session ${sessionName} not found`);
      return;
    }
    throw error;
  }
}

/**
 * List all devbot tmux sessions
 */
export async function listTmuxSessions(): Promise<string[]> {
  try {
    const { stdout } = await execAsync('tmux list-sessions -F "#{session_name}"');
    return stdout
      .trim()
      .split('\n')
      .filter((name) => name.startsWith('devbot_'));
  } catch (error) {
    // No sessions running
    const err = error as { stderr?: string };
    if (err.stderr?.includes('no server running')) {
      return [];
    }
    throw error;
  }
}

/**
 * Check if a tmux session exists
 */
export async function sessionExists(sessionName: string): Promise<boolean> {
  try {
    await execAsync(`tmux has-session -t "${sessionName}"`);
    return true;
  } catch {
    return false;
  }
}
