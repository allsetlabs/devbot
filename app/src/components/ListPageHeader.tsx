import { Button } from '@allsetlabs/reusable/components/ui/button';
import { RefreshCw, Menu } from 'lucide-react';
import type { ReactNode } from 'react';

interface ListPageHeaderProps {
  icon: ReactNode;
  title: string;
  onMenuClick: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  /** Extra buttons rendered after refresh, before children */
  children?: ReactNode;
}

export function ListPageHeader({
  icon,
  title,
  onMenuClick,
  onRefresh,
  isRefreshing,
  children,
}: ListPageHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
        {icon}
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
        {children}
      </div>
    </header>
  );
}
