// eslint-disable-next-line react-refresh/only-export-components
export function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = regex.exec(text);

  while (match !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(
        <strong key={match.index} className="font-semibold">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      parts.push(
        <code
          key={match.index}
          className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
        >
          {match[3]}
        </code>
      );
    }
    lastIndex = match.index + match[0].length;
    match = regex.exec(text);
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="mb-3 list-disc space-y-1 pl-5">
          {listItems.map((item, i) => (
            <li key={i} className="text-sm text-foreground/90">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={i} className="mb-2 mt-4 text-base font-bold text-foreground first:mt-0">
          {renderInlineMarkdown(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={i} className="mb-1.5 mt-3 text-sm font-semibold text-foreground">
          {renderInlineMarkdown(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      listItems.push(line.slice(2));
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      elements.push(
        <p key={i} className="mb-2 text-sm leading-relaxed text-foreground/90">
          {renderInlineMarkdown(line)}
        </p>
      );
    }
  }

  flushList();

  return <div>{elements}</div>;
}
