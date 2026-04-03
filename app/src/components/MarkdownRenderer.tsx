// MarkdownRenderer: renders markdown content with syntax highlighting
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';
import { copyToClipboard } from '../lib/clipboard';
import { useTemporaryStatus } from '../hooks/useTemporaryStatus';

interface MarkdownRendererProps {
  content: string;
}

function CopyButton({ text }: { text: string }) {
  const { status: copied, show: showCopied } = useTemporaryStatus(2000);

  const handleCopy = () => {
    copyToClipboard(text);
    showCopied('copied');
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute right-2 top-2 z-10 rounded bg-muted/80 p-1.5 text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const codeString = String(children).replace(/\n$/, '');
          const isBlock = codeString.includes('\n') || match;

          if (isBlock) {
            return (
              <div className="relative my-2 overflow-hidden rounded-lg">
                {match && (
                  <div className="flex items-center justify-between bg-muted/50 px-3 py-1">
                    <span className="text-xs text-muted-foreground">{match[1]}</span>
                  </div>
                )}
                <CopyButton text={codeString} />
                <SyntaxHighlighter
                  style={oneDark}
                  language={match?.[1] || 'text'}
                  PreTag="div"
                  showLineNumbers
                  customStyle={{
                    margin: 0,
                    borderRadius: 0,
                    fontSize: '0.75rem',
                  }}
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            );
          }

          return (
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-primary" {...props}>
              {children}
            </code>
          );
        },
        p({ children }) {
          return <p className="mb-2 last:mb-0">{children}</p>;
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer break-all text-primary underline underline-offset-2"
              onClick={(e) => {
                e.stopPropagation();
                if (href) window.open(href, '_blank', 'noopener,noreferrer');
              }}
            >
              {children}
            </a>
          );
        },
        ul({ children }) {
          return <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>;
        },
        li({ children }) {
          return <li className="text-sm">{children}</li>;
        },
        h1({ children }) {
          return <h1 className="mb-2 text-lg font-bold">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="mb-2 text-base font-bold">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="mb-1 text-sm font-bold">{children}</h3>;
        },
        blockquote({ children }) {
          return (
            <blockquote className="mb-2 border-l-2 border-primary pl-3 italic text-muted-foreground last:mb-0">
              {children}
            </blockquote>
          );
        },
        table({ children }) {
          return (
            <div className="mb-2 overflow-x-auto last:mb-0">
              <table className="w-full text-sm">{children}</table>
            </div>
          );
        },
        th({ children }) {
          return (
            <th className="border border-border px-2 py-1 text-left font-medium">{children}</th>
          );
        },
        td({ children }) {
          return <td className="border border-border px-2 py-1">{children}</td>;
        },
        hr() {
          return <hr className="my-3 border-border" />;
        },
        strong({ children }) {
          return <strong className="font-semibold">{children}</strong>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
