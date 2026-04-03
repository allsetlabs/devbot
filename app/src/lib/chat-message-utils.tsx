import type { ClaudeContentBlock, ClaudeMessageContent } from '../types';

/** Format a timestamp into just the time portion (e.g., "10:34 AM") */
export function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** Format a timestamp into a relative or short absolute time string */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (isYesterday) return `Yesterday ${timeStr}`;

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` ${timeStr}`;
}

/** Format a date string into a day label for separators */
export function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

/** Split text into lines and return truncated text + whether it was truncated */
export function truncateToLines(
  text: string,
  maxLines: number
): { truncated: string; isTruncated: boolean } {
  const lines = text.split('\n');
  if (lines.length <= maxLines) return { truncated: text, isTruncated: false };
  return { truncated: lines.slice(0, maxLines).join('\n'), isTruncated: true };
}

/** After expanding a collapsible, scroll so the clicked header sits at the top of the visible area.
 *  Small delay lets the virtualizer finish re-measuring before we scroll. */
export function scrollHeaderToTop(target: HTMLElement) {
  setTimeout(() => {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
}

/** Strip absolute paths before .tmp/devbot-uploads/, keeping only .tmp/devbot-uploads/...filename */
export function sanitizeUploadPaths(text: string): string {
  return text.replace(/[^\s"'[\]]*\/\.tmp\/devbot-uploads\//g, '.tmp/devbot-uploads/');
}

export const URL_REGEX = /(https?:\/\/[^\s)<>]+(?:\([^\s)<>]*\))?[^\s)<>.,;:!?"']*)/g;

export function renderTextWithLinks(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  URL_REGEX.lastIndex = 0;
  while ((match = URL_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <a
        key={match.index}
        href={match[0]}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-accent underline underline-offset-2"
      >
        {match[0]}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/** Highlight all occurrences of a search query in text */
export function highlightText(text: string, query: string): React.ReactNode[] {
  if (!query) return [text];
  const parts: React.ReactNode[] = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let lastIndex = 0;
  let idx = lowerText.indexOf(lowerQuery, lastIndex);
  while (idx !== -1) {
    if (idx > lastIndex) parts.push(text.slice(lastIndex, idx));
    parts.push(
      <mark key={idx} className="rounded-sm bg-warning/40 px-0.5 text-inherit">
        {text.slice(idx, idx + query.length)}
      </mark>
    );
    lastIndex = idx + query.length;
    idx = lowerText.indexOf(lowerQuery, lastIndex);
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export function extractTextContent(content: ClaudeMessageContent): string {
  if (content.message?.content) {
    return content.message.content
      .filter(
        (block): block is ClaudeContentBlock & { type: 'text'; text: string } =>
          block.type === 'text' && typeof block.text === 'string'
      )
      .map((block) => sanitizeUploadPaths(block.text.trim()))
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

/** Extract thinking/reasoning content from assistant message content blocks */
export function extractThinkingContent(content: ClaudeMessageContent): string {
  if (content.message?.content) {
    return content.message.content
      .filter(
        (block): block is ClaudeContentBlock & { type: 'thinking'; thinking: string } =>
          block.type === 'thinking' && typeof block.thinking === 'string'
      )
      .map((block) => block.thinking.trim())
      .filter(Boolean)
      .join('\n\n');
  }
  return '';
}
