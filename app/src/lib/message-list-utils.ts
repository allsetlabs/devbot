import {
  FileText,
  Terminal,
  Search,
  FolderSearch,
  PenLine,
  FilePlus,
  Globe,
  Bot,
  ListTodo,
  Loader2,
} from 'lucide-react';
import { extractTextContent, extractThinkingContent } from '../components/ChatMessage';
import type { TaskMessage, ClaudeContentBlock } from '../types';

/** Extract short filename from an absolute path */
export function getFileName(path: string | undefined): string {
  if (!path) return 'file';
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

/** Truncate text to a max length with ellipsis */
export function truncateText(text: string | undefined, max: number): string {
  if (!text) return '';
  const firstLine = text.split('\n')[0];
  return firstLine.length > max ? firstLine.slice(0, max - 3) + '...' : firstLine;
}

/** Tool name to icon mapping */
export const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Read: FileText,
  Write: FilePlus,
  Edit: PenLine,
  MultiEdit: PenLine,
  Bash: Terminal,
  Grep: Search,
  Glob: FolderSearch,
  Agent: Bot,
  WebFetch: Globe,
  WebSearch: Globe,
  TodoWrite: ListTodo,
};

/** Format the latest tool_use message into a human-readable activity string */
export function getToolActivity(messages: TaskMessage[]): {
  text: string;
  icon: React.ComponentType<{ className?: string }>;
} | null {
  if (messages.length === 0) return null;

  const lastMsg = messages[messages.length - 1];

  // Only show tool activity when the last message is a tool_use (tool is actively executing)
  if (lastMsg.type !== 'tool_use') return null;

  const toolName = (lastMsg.content.tool_name as string) || '';
  const toolInput = (lastMsg.content.tool_input as Record<string, unknown>) || {};
  const icon = TOOL_ICONS[toolName] || Loader2;

  switch (toolName) {
    case 'Read':
      return { text: `Reading ${getFileName(toolInput.file_path as string)}`, icon };
    case 'Write':
      return { text: `Writing ${getFileName(toolInput.file_path as string)}`, icon };
    case 'Edit':
    case 'MultiEdit':
      return { text: `Editing ${getFileName(toolInput.file_path as string)}`, icon };
    case 'Bash':
      return { text: `Running ${truncateText(toolInput.command as string, 40)}`, icon };
    case 'Grep':
      return {
        text: `Searching "${truncateText(toolInput.pattern as string, 30)}"`,
        icon,
      };
    case 'Glob':
      return { text: `Finding ${truncateText(toolInput.pattern as string, 30)}`, icon };
    case 'Agent':
      return {
        text: `Agent: ${truncateText(toolInput.description as string, 40)}`,
        icon,
      };
    case 'WebFetch':
      return { text: 'Fetching URL', icon };
    case 'WebSearch':
      return { text: 'Searching the web', icon };
    case 'TodoWrite':
      return { text: 'Updating tasks', icon };
    default:
      return toolName ? { text: `Using ${toolName}`, icon } : null;
  }
}

/**
 * Merge consecutive assistant messages so thinking + text blocks render together.
 * Claude stream-json may emit thinking and text as separate assistant messages.
 */
export function mergeConsecutiveAssistant(messages: TaskMessage[]): TaskMessage[] {
  const result: TaskMessage[] = [];
  for (const msg of messages) {
    const prev = result[result.length - 1];
    if (
      msg.type === 'assistant' &&
      prev?.type === 'assistant' &&
      prev.content?.message?.content &&
      msg.content?.message?.content
    ) {
      const merged: TaskMessage = {
        ...prev,
        content: {
          ...prev.content,
          message: {
            ...prev.content.message,
            content: [
              ...(prev.content.message.content as ClaudeContentBlock[]),
              ...(msg.content.message.content as ClaudeContentBlock[]),
            ],
          },
        },
      };
      result[result.length - 1] = merged;
    } else {
      result.push(msg);
    }
  }
  return result;
}

/** Filter out messages that won't render (empty text, unknown types, non-result system) */
export function filterRenderable(messages: TaskMessage[]): TaskMessage[] {
  const knownTypes = new Set(['user', 'assistant', 'tool_use', 'tool_result', 'system']);

  return messages.filter((message) => {
    if (!knownTypes.has(message.type)) return false;

    if (message.type === 'user' || message.type === 'assistant') {
      const text = extractTextContent(message.content);
      const thinking = extractThinkingContent(message.content);
      const blocks = message.content?.message?.content || [];
      const hasToolUse = (blocks as { type?: string }[]).some((b) => b.type === 'tool_use');
      const hasToolResult = (blocks as { type?: string }[]).some((b) => b.type === 'tool_result');
      if (!text && !thinking && !hasToolUse && !hasToolResult) return false;
    }

    if (message.type === 'system') {
      const { content } = message;
      const isResult =
        content?.type === 'result' &&
        (content?.subtype === 'success' || content?.subtype === 'error');
      const isInterruption = content?.type === 'system' && typeof content?.message === 'string';
      if (!isResult && !isInterruption) return false;
    }

    return true;
  });
}
