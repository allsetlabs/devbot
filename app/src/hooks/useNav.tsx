import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

const DOCK_STORAGE_KEY = 'devbot-nav-docked';

interface NavContextValue {
  /** Modal drawer open state (used when the nav is not docked, or on mobile). */
  isNavOpen: boolean;
  openNav: () => void;
  closeNav: () => void;
  /** When true, the nav is pinned open as a persistent left sidebar (desktop / md+). */
  isDocked: boolean;
  toggleDock: () => void;
}

const NavContext = createContext<NavContextValue | null>(null);

function readDocked(): boolean {
  try {
    return localStorage.getItem(DOCK_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function NavProvider({ children }: { children: ReactNode }) {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isDocked, setIsDocked] = useState<boolean>(readDocked);

  const openNav = useCallback(() => setIsNavOpen(true), []);
  const closeNav = useCallback(() => setIsNavOpen(false), []);

  const toggleDock = useCallback(() => {
    setIsDocked((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(DOCK_STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore storage failures (private mode, etc.) */
      }
      return next;
    });
    // Pinning replaces the modal drawer with the persistent sidebar; close the modal.
    setIsNavOpen(false);
  }, []);

  return (
    <NavContext.Provider value={{ isNavOpen, openNav, closeNav, isDocked, toggleDock }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used within NavProvider');
  return ctx;
}
