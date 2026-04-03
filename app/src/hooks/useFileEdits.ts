import { useMemo } from 'react';
import type { ChatMessage as ChatMessageType } from '../types';

export interface FileEdit {
  filePath: string;
  toolName: 'Edit' | 'MultiEdit' | 'Write' | 'Delete';
  lineCount: number;
  messageId: string;
  messageIndex: number;
  timestamp: string;
}

/**
 * Extract all file edits (Edit, MultiEdit, Write, Delete) from chat messages.
 * Deduplicates files so only the most recent edit is shown per file.
 */
export function useFileEdits(messages: ChatMessageType[]): FileEdit[] {
  return useMemo(() => {
    const editMap = new Map<string, FileEdit>();

    messages.forEach((msg, msgIndex) => {
      if (msg.type !== 'assistant') return;

      const content = Array.isArray(msg.content) ? msg.content : [msg.content];

      content.forEach((block) => {
        if (block.type !== 'tool_use' || !block.input) return;

        const toolName = block.name?.toLowerCase() || '';
        const input = block.input as Record<string, unknown>;

        // Handle Edit tool
        if (toolName === 'edit' && input.file_path) {
          const filePath = input.file_path as string;
          const newString = (input.new_string as string) || '';
          const lineCount = newString.split('\n').length;

          editMap.set(filePath, {
            filePath,
            toolName: 'Edit',
            lineCount,
            messageId: msg.id || `msg-${msgIndex}`,
            messageIndex: msgIndex,
            timestamp: msg.createdAt,
          });
        }

        // Handle MultiEdit tool
        if (toolName === 'multiedit' && input.file_path) {
          const filePath = input.file_path as string;
          const edits = (input.edits as Array<{ new_string?: string }>) || [];
          const totalLines = edits.reduce((sum, edit) => {
            const newStr = (edit.new_string as string) || '';
            return sum + newStr.split('\n').length;
          }, 0);

          editMap.set(filePath, {
            filePath,
            toolName: 'MultiEdit',
            lineCount: totalLines,
            messageId: msg.id || `msg-${msgIndex}`,
            messageIndex: msgIndex,
            timestamp: msg.createdAt,
          });
        }

        // Handle Write tool
        if (toolName === 'write' && input.file_path) {
          const filePath = input.file_path as string;
          const content = (input.content as string) || '';
          const lineCount = content.split('\n').length;

          editMap.set(filePath, {
            filePath,
            toolName: 'Write',
            lineCount,
            messageId: msg.id || `msg-${msgIndex}`,
            messageIndex: msgIndex,
            timestamp: msg.createdAt,
          });
        }

        // Handle Delete (Bash with rm command approximation)
        if (toolName === 'bash' && input.command) {
          const cmd = input.command as string;
          if (cmd.includes('rm ') || cmd.includes('delete')) {
            // Try to extract filename from rm command
            const match = cmd.match(/rm\s+(?:-[a-z]*\s+)*["']?([^\s"']+)["']?/);
            if (match && match[1]) {
              const filePath = match[1];
              editMap.set(`[DELETED] ${filePath}`, {
                filePath: `[DELETED] ${filePath}`,
                toolName: 'Delete',
                lineCount: 0,
                messageId: msg.id || `msg-${msgIndex}`,
                messageIndex: msgIndex,
                timestamp: msg.createdAt,
              });
            }
          }
        }
      });
    });

    // Sort by message index (most recent first)
    return Array.from(editMap.values()).sort((a, b) => b.messageIndex - a.messageIndex);
  }, [messages]);
}
