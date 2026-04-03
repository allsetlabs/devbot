import { spawnClaudeStructured } from './claude-spawn.js';

/**
 * Generate a short AI name for a given prompt/context.
 * Uses structured output to get a clean name string.
 */
export async function generateName(userPrompt: string): Promise<string> {
  try {
    const { name } = await spawnClaudeStructured<{ name: string }>({
      prompt: `Generate a short descriptive name (2-5 words) for a task where the prompt is:\n\n"${userPrompt.replace(/"/g, '\\"')}"\n\nExamples of good names: Debug React Component, API Authentication Setup, Fix CSS Layout Bug`,
      outputSchema: {
        name: 'TaskName',
        schema: {
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
        },
      },
      timeoutMs: 30_000,
    });

    if (!name) return '';
    let cleaned = name.replace(/^["']|["']$/g, '');
    if (cleaned.length > 60) cleaned = cleaned.slice(0, 57) + '...';
    return cleaned;
  } catch {
    return '';
  }
}
