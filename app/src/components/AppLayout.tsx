import type { ReactNode } from 'react';
import { NavProvider, useNav } from '../hooks/useNav';
import { SlideNav } from './SlideNav';

function LayoutInner({ children }: { children: ReactNode }) {
  const { isNavOpen, closeNav } = useNav();

  return (
    <>
      <SlideNav isOpen={isNavOpen} onClose={closeNav} />
      <div className="flex h-dvh flex-col">
        {children}
      </div>
    </>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <NavProvider>
      <LayoutInner>{children}</LayoutInner>
    </NavProvider>
  );
}
