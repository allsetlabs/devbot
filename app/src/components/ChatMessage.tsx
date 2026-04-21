import { useState } from 'react';
import { ChevronDown, ChevronRight, XCircle, CheckCircle, GitBranch, RotateCcw } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import type { ReactionType } from '../hooks/useMessageReactions';
import { MessageReactions } from './MessageReactions';
import type { TaskMessage, ClaudeContentBlock, ClaudeMessageContent } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import {
  formatMessageTime,
  truncateToLines,
  highlightText,
  renderTextWithLinks,
  extractTextContent,
  extractThinkingContent,
} from '../lib/chat-message-utils';
import { ThinkingBlock } from './ThinkingBlock';
import { CopyMessageButton, PinMessageButton, EditMessageButton } from './MessageActionButtons';
import { ToolUseMessage, ToolsGroup, EditDiffView, MultiEditDiffView } from './ToolUseMessage';
import { SystemMessage } from './SystemMessage';

// Re-export symbols used by other modules
/* eslint-disable react-refresh/only-export-components */
export {
  formatMessageTime,
  extractTextContent,
  extractThinkingContent,
} from '../lib/chat-message-utils';
export { formatDateSeparator, formatRelativeTime } from '../lib/chat-message-utils';
export { formatTokens, formatDuration, formatCost, extractUsageData } from './SystemMessage';
/* eslint-enable react-refresh/only-export-components */

const MAX_VISIBLE_LINES = 10;

interface ChatMessageProps {
  message: TaskMessage;
  isLast?: boolean;
  onRetry?: () => void;
  onRegenerate?: () => void;
  isPinned?: boolean;
  onTogglePin?: (messageId: string) => void;
  onEdit?: (messageId: string, text: string) => void;
  onBranch?: () => void;
  searchQuery?: string;
  currentReaction?: ReactionType | null;
  onToggleReaction?: (type: ReactionType) => void;
  compactMode?: boolean;
}

function ToolResultMessage({ content }: { content: ClaudeMessageContent }) {
  const [expanded, setExpanded] = useState(false);
  const isError = content.subtype === 'error' || content.error;
  const result = content.result || content.error || 'No result';

  return (
    <div
      className={`rounded-lg border ${isError ? 'border-destructive/50 bg-destructive/10' : 'border-success/50 bg-success/10'}`}
    >
      <Button
        variant="ghost"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-start gap-2 px-3 py-2 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        {isError ? (
          <XCircle className="h-4 w-4 text-destructive" />
        ) : (
          <CheckCircle className="h-4 w-4 text-success" />
        )}
        <span className="text-sm font-medium text-foreground">{isError ? 'Error' : 'Result'}</span>
      </Button>
      {expanded && (
        <div className="border-t border-border px-3 py-2">
          <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">
            {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export function ChatMessage({
  message,
  isLast = false,
  onRetry,
  onRegenerate,
  isPinned = false,
  onTogglePin,
  onEdit,
  onBranch,
  searchQuery = '',
  currentReaction = null,
  onToggleReaction,
  compactMode = false,
}: ChatMessageProps) {
  const { type, content } = message;
  const [expanded, setExpanded] = useState(false);

  if (type === 'user') {
    const text = extractTextContent(content);
    const { truncated, isTruncated } = truncateToLines(text, MAX_VISIBLE_LINES);
    const displayText = expanded || isLast ? text : truncated;
    const isSearchMatch = searchQuery && text.toLowerCase().includes(searchQuery.toLowerCase());
    return (
      <div className={`group flex flex-col items-end ${compactMode ? 'gap-0' : 'gap-0.5'}`}>
        <div
          className={`max-w-[85%] overflow-hidden rounded-2xl rounded-br-md bg-primary ${compactMode ? 'px-3 py-1' : 'px-4 py-2'} ${isSearchMatch ? 'ring-2 ring-warning/50' : ''}`}
        >
          <p className="whitespace-pre-wrap break-words text-sm text-primary-foreground">
            {searchQuery
              ? highlightText(displayText, searchQuery)
              : renderTextWithLinks(displayText)}
          </p>
          {isTruncated && !isLast && (
            <Button
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-xs font-medium text-primary-foreground/70 hover:text-primary-foreground"
            >
              {expanded ? 'Show less' : 'Show more'}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1 px-1">
          {message.createdAt && (
            <span className="text-[10px] text-muted-foreground/60">
              {formatMessageTime(message.createdAt)}
            </span>
          )}
          {text && (
            <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              {onEdit && <EditMessageButton onEdit={() => onEdit(message.id, text)} />}
              {onTogglePin && (
                <PinMessageButton
                  isPinned={isPinned}
                  onToggle={() => onTogglePin(message.id)}
                  variant="assistant"
                />
              )}
              <CopyMessageButton text={text} variant="assistant" />
              {onBranch && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onBranch}
                  className="h-6 w-6"
                  title="Branch from here"
                >
                  <GitBranch className="h-3 w-3" />
                </Button>
              )}
              {onToggleReaction && (
                <MessageReactions
                  messageId={message.id}
                  currentReaction={currentReaction}
                  onToggleReaction={onToggleReaction}
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (type === 'assistant') {
    const text = extractTextContent(content);
    const thinking = extractThinkingContent(content);
    const { truncated, isTruncated } = truncateToLines(text, MAX_VISIBLE_LINES);
    const displayText = expanded || isLast ? text : truncated;

    const toolUseBlocks = (content.message?.content || []).filter(
      (
        block
      ): block is ClaudeContentBlock & {
        type: 'tool_use';
        name: string;
        input: Record<string, unknown>;
      } => block.type === 'tool_use' && typeof block.name === 'string'
    );

    const isSearchMatch = searchQuery && text.toLowerCase().includes(searchQuery.toLowerCase());

    return (
      <div className={`group flex flex-col items-start ${compactMode ? 'gap-0' : 'gap-0.5'}`}>
        <div
          className={`max-w-[85%] overflow-hidden rounded-2xl rounded-bl-md bg-muted ${compactMode ? 'px-3 py-1' : 'px-4 py-2'} text-sm text-foreground ${isSearchMatch ? 'ring-2 ring-warning/50' : ''}`}
        >
          {thinking && <ThinkingBlock thinking={thinking} />}
          {text && <MarkdownRenderer content={displayText} />}
          {isTruncated && !isLast && (
            <Button
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-xs font-medium text-primary hover:text-primary/80"
            >
              {expanded ? 'Show less' : 'Show more'}
            </Button>
          )}
          {toolUseBlocks.length > 0 && (
            <div className={`flex flex-col gap-2 ${text ? 'mt-2' : ''}`}>
              {toolUseBlocks.length === 1 ? (
                (() => {
                  const block = toolUseBlocks[0];
                  const toolInput = block.input || {};
                  if (block.name === 'Edit')
                    return <EditDiffView key={block.id || block.name} toolInput={toolInput} />;
                  if (block.name === 'MultiEdit')
                    return <MultiEditDiffView key={block.id || block.name} toolInput={toolInput} />;
                  return (
                    <ToolUseMessage
                      key={block.id || block.name}
                      content={
                        { tool_name: block.name, tool_input: toolInput } as ClaudeMessageContent
                      }
                    />
                  );
                })()
              ) : (
                <ToolsGroup count={toolUseBlocks.length}>
                  {toolUseBlocks.map((block) => {
                    const toolInput = block.input || {};
                    if (block.name === 'Edit') {
                      return <EditDiffView key={block.id || block.name} toolInput={toolInput} />;
                    }
                    if (block.name === 'MultiEdit') {
                      return (
                        <MultiEditDiffView key={block.id || block.name} toolInput={toolInput} />
                      );
                    }
                    return (
                      <ToolUseMessage
                        key={block.id || block.name}
                        content={
                          { tool_name: block.name, tool_input: toolInput } as ClaudeMessageContent
                        }
                      />
                    );
                  })}
                </ToolsGroup>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 px-1">
          {message.createdAt && (
            <span className="text-[10px] text-muted-foreground/60">
              {formatMessageTime(message.createdAt)}
            </span>
          )}
          {text && (
            <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              {onTogglePin && (
                <PinMessageButton
                  isPinned={isPinned}
                  onToggle={() => onTogglePin(message.id)}
                  variant="assistant"
                />
              )}
              <CopyMessageButton text={text} variant="assistant" />
              {isLast && onRetry && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onRetry}
                  className="h-6 w-6 text-muted-foreground/50 hover:text-muted-foreground"
                  title="Retry"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              )}
              {onToggleReaction && (
                <MessageReactions
                  messageId={message.id}
                  currentReaction={currentReaction}
                  onToggleReaction={onToggleReaction}
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (type === 'tool_use') {
    return <ToolUseMessage content={content} />;
  }

  if (type === 'tool_result') {
    return <ToolResultMessage content={content} />;
  }

  if (type === 'system') {
    return (
      <SystemMessage
        content={content}
        onRetry={onRetry}
        onRegenerate={onRegenerate}
        showRetry={isLast}
      />
    );
  }

  return null;
}
