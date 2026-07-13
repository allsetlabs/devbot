import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { X, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { routeList } from '../routes';
import { useNav } from '../hooks/useNav';

// Nav menu is driven by the shared routes config (routes.tsx). Entries with
// `nav === false` are reachable but hidden from the menu.
const navItems = routeList.filter((r) => r.nav !== false);

function isActivePath(itemPath: string, currentPath: string): boolean {
  if (itemPath === '/') return currentPath === '/';
  if (itemPath === '/chats') return currentPath === '/chats' || currentPath.startsWith('/chat/');
  if (itemPath === '/ocr') return currentPath === '/ocr' || currentPath.startsWith('/ocr/');
  if (itemPath === '/plugins') return currentPath.startsWith('/plugins');
  return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-4">
      {navItems.map((item) => {
        const isActive = isActivePath(item.path, location.pathname);
        return (
          <Button
            key={item.path}
            variant="ghost"
            onClick={() => handleClick(item.path)}
            className={`mb-1 flex w-full items-center justify-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
              isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
            }`}
          >
            {item.icon}
            <span className="font-medium">{item.name}</span>
          </Button>
        );
      })}
    </nav>
  );
}

/** Bottom-of-nav toggle that pins the sidebar open (persistent) or unpins it (modal). Desktop only. */
function DockToggle() {
  const { isDocked, toggleDock } = useNav();
  return (
    <div className="hidden border-t border-border p-2 md:block">
      <Button
        variant="ghost"
        onClick={toggleDock}
        className="flex w-full items-center justify-start gap-3 rounded-lg px-3 py-2.5 text-left text-muted-foreground transition-colors md:hover:bg-muted md:hover:text-foreground"
        title={isDocked ? 'Unpin sidebar (use pop-out menu)' : 'Pin sidebar open'}
      >
        {isDocked ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
        <span className="font-medium">{isDocked ? 'Unpin sidebar' : 'Pin sidebar'}</span>
      </Button>
    </div>
  );
}

/** Shared panel content used by both the docked column and the modal drawer. */
function NavPanel({ onNavigate, onClose }: { onNavigate?: () => void; onClose?: () => void }) {
  return (
    <div className="safe-area-top flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-lg font-semibold text-foreground">DevBot</h2>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>
      <NavItems onNavigate={onNavigate} />
      <DockToggle />
    </div>
  );
}

interface SlideNavProps {
  /** 'docked' renders a persistent column (no backdrop); 'modal' renders a pop-out drawer. */
  variant?: 'modal' | 'docked';
  isOpen?: boolean;
  onClose?: () => void;
}

export function SlideNav({ variant = 'modal', isOpen = false, onClose }: SlideNavProps) {
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variant !== 'modal') return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [variant, isOpen, onClose]);

  useEffect(() => {
    if (variant !== 'modal') return;
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [variant, isOpen, onClose]);

  // Persistent sidebar — fills its column (AppLayout gates it to md+ and sets the width).
  if (variant === 'docked') {
    return (
      <div className="h-full border-r border-border">
        <NavPanel />
      </div>
    );
  }

  // Pop-out modal drawer.
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div
        ref={navRef}
        className="absolute bottom-0 left-0 top-0 w-64 bg-background shadow-xl transition-transform duration-200"
      >
        <NavPanel onNavigate={onClose} onClose={onClose} />
      </div>
    </div>
  );
}
