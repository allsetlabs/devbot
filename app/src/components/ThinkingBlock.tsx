import { useState } from 'react';
import { Brain, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { scrollHeaderToTop } from '../lib/chat-message-utils';

/** Collapsible thinking/reasoning block for assistant messages */
export function ThinkingBlock({ thinking }: { thinking: string }) {
  const [expanded, setExpanded] = useState(false);
  const wordCount = thinking.split(/\s+/).length;

  return (
    <div className="mb-2 rounded-lg border border-border/50 bg-muted/20">
      <Button
        variant="ghost"
        onClick={(e) => {
          const target = e.currentTarget;
          setExpanded((v) => {
            if (!v) scrollHeaderToTop(target);
            return !v;
          });
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        )}
        <Brain className="h-3.5 w-3.5 flex-shrink-0 text-accent-foreground" />
        <span className="text-xs font-medium text-accent-foreground">Thinking</span>
        {!expanded && (
          <span className="text-[10px] text-muted-foreground">({wordCount} words)</span>
        )}
      </Button>
      {expanded && (
        <div className="border-t border-border/50 px-3 py-2">
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
            {thinking}
          </p>
        </div>
      )}
    </div>
  );
}
