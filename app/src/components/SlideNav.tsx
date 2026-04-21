import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import {
  Clock,
  MessageCircle,
  Pin,
  Timer,
  Lightbulb,
  X,
  Baby,
  ScrollText,
  Leaf,
  Video,
  FolderOpen,
  Building2,
  Settings,
  LayoutDashboard,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Chat', path: '/chats', icon: <MessageCircle className="h-5 w-5" /> },
  { label: 'Pinned', path: '/pinned', icon: <Pin className="h-5 w-5" /> },
  { label: 'Scheduler', path: '/scheduler', icon: <Clock className="h-5 w-5" /> },
  { label: 'Events Timer', path: '/events-timer', icon: <Timer className="h-5 w-5" /> },
  { label: 'Plans', path: '/plans', icon: <Lightbulb className="h-5 w-5" /> },
  { label: 'Baby Logs', path: '/baby-logs', icon: <Baby className="h-5 w-5" /> },
  { label: 'Videos', path: '/videos', icon: <Video className="h-5 w-5" /> },
  { label: 'Lawn Care', path: '/lawn-care', icon: <Leaf className="h-5 w-5" /> },
  { label: 'Directories', path: '/working-directories', icon: <FolderOpen className="h-5 w-5" /> },
  { label: 'Companies', path: '/companies', icon: <Building2 className="h-5 w-5" /> },
  { label: 'Logs', path: '/logs', icon: <ScrollText className="h-5 w-5" /> },
  { label: 'Settings', path: '/settings', icon: <Settings className="h-5 w-5" /> },
];

function isActivePath(itemPath: string, currentPath: string): boolean {
  if (itemPath === '/') return currentPath === '/';
  if (itemPath === '/chats') return currentPath === '/chats' || currentPath.startsWith('/chat/');
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
            <span className="font-medium">{item.label}</span>
          </Button>
        );
      })}
    </nav>
  );
}

export function PersistentSidebar() {
  return (
    <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 z-40 w-64 flex-col border-r border-border bg-background">
      <div className="flex items-center px-4 py-3 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">DevBot</h2>
      </div>
      <NavItems />
    </aside>
  );
}

interface SlideNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SlideNav({ isOpen, onClose }: SlideNavProps) {
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 lg:hidden">
      <div
        ref={navRef}
        className="absolute bottom-0 left-0 top-0 w-64 bg-background shadow-xl transition-transform duration-200"
      >
        <div className="safe-area-top flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-lg font-semibold text-foreground">DevBot</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <NavItems onNavigate={onClose} />
        </div>
      </div>
    </div>
  );
}
