import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
});

let idCounter = 0;
// Cache rendered SVGs by chart string — prevents re-rendering on virtual-scroll
// remounts and polling-driven re-renders.
const svgCache = new Map<string, string>();

interface MermaidChartProps {
  chart: string;
}

export function MermaidChart({ chart }: MermaidChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const cached = svgCache.get(chart);
    if (cached) {
      containerRef.current.innerHTML = cached;
      return;
    }

    const id = `mermaid-${++idCounter}`;
    setError(null);

    mermaid
      .render(id, chart)
      .then(({ svg }) => {
        svgCache.set(chart, svg);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to render diagram';
        setError(message);
      });
  }, [chart]);

  if (error) {
    return (
      <div className="my-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
        <p className="font-medium">Mermaid render error</p>
        <p className="mt-1 font-mono">{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-2 flex justify-center overflow-x-auto rounded-lg bg-muted/30 p-4 h-[60vh]"
    />
  );
}

