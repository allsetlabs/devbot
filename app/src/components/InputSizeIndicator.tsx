import { formatInputSize, estimateTokens } from '../lib/format';

interface InputSizeIndicatorProps {
  text: string;
}

export function InputSizeIndicator({ text }: InputSizeIndicatorProps) {
  if (!text || text.length === 0) {
    return null;
  }

  const tokenCount = estimateTokens(text);
  const formattedSize = formatInputSize(text);

  // Show warning if input is very large (over 5k tokens estimated)
  const isLarge = tokenCount > 5000;

  return (
    <div
      className={`px-4 py-2 text-xs transition-colors ${
        isLarge ? 'text-warning' : 'text-muted-foreground/70'
      }`}
    >
      {formattedSize}
      {isLarge && ' ⚠️'}
    </div>
  );
}
