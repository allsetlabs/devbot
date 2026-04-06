import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import {
  Clock,
  MessageCircle,
  Timer,
  Lightbulb,
  X,
  Baby,
  ScrollText,
  Leaf,
  Video,
  FolderOpen,
} from 'lucide-react';

interface SlideNavProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Chat', path: '/chats', icon: <MessageCircle className="h-5 w-5" /> },
  { label: 'Scheduler', path: '/scheduler', icon: <Clock className="h-5 w-5" /> },
  { label: 'Events Timer', path: '/events-timer', icon: <Timer className="h-5 w-5" /> },
  { label: 'Plans', path: '/plans', icon: <Lightbulb className="h-5 w-5" /> },
  { label: 'Baby Logs', path: '/baby-logs', icon: <Baby className="h-5 w-5" /> },
  { label: 'Videos', path: '/videos', icon: <Video className="h-5 w-5" /> },
  { label: 'Lawn Care', path: '/lawn-care', icon: <Leaf className="h-5 w-5" /> },
  { label: 'Directories', path: '/working-directories', icon: <FolderOpen className="h-5 w-5" /> },
  { label: 'Logs', path: '/logs', icon: <ScrollText className="h-5 w-5" /> },
];

export function SlideNav({ isOpen, onClose }: SlideNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Close on click outside
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

  const handleNavClick = (path: string) => {
    navigate(path);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div
        ref={navRef}
        className="absolute bottom-0 left-0 top-0 w-64 bg-background shadow-xl transition-transform duration-200"
      >
        <div className="safe-area-top flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-lg font-semibold text-foreground">DevBot</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-2 py-4">
            {navItems.map((item) => {
              const isActive =
                item.path === '/'
                  ? location.pathname === '/'
                  : item.path === '/chats'
                    ? location.pathname === '/chats' || location.pathname.startsWith('/chat/')
                    : location.pathname === item.path ||
                      location.pathname.startsWith(item.path + '/');
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
