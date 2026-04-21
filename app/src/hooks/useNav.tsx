import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface NavContextValue {
  isNavOpen: boolean;
  openNav: () => void;
  closeNav: () => void;
}

const NavContext = createContext<NavContextValue | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const openNav = useCallback(() => setIsNavOpen(true), []);
  const closeNav = useCallback(() => setIsNavOpen(false), []);

  return (
    <NavContext.Provider value={{ isNavOpen, openNav, closeNav }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used within NavProvider');
  return ctx;
}
