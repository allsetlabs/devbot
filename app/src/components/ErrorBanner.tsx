interface ErrorBannerProps {
  error: string | null;
  position?: 'top' | 'bottom';
}

export function ErrorBanner({ error, position = 'top' }: ErrorBannerProps) {
  if (!error) return null;

  const borderClass = position === 'bottom' ? 'border-t' : 'border-b';

  return (
    <div
      className={`${borderClass} border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive`}
    >
      {error}
    </div>
  );
}
