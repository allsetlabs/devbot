import type { ReactNode } from 'react';
import { NavProvider, useNav } from '../hooks/useNav';
import { SlideNav } from './SlideNav';
import { Header } from './Header';
import { HeaderSlotProvider } from './HeaderSlot';

function LayoutInner({ children }: { children: ReactNode }) {
  const { isNavOpen, closeNav, isDocked } = useNav();

  return (
    <div className="flex h-dvh">
      {/* Persistent sidebar when pinned — desktop (md+) only; mobile always uses the drawer. */}
      {isDocked && (
        <aside className="hidden w-64 shrink-0 md:block">
          <SlideNav variant="docked" />
        </aside>
      )}

      {/* Pop-out drawer: the nav on mobile, and on desktop when not pinned. */}
      <SlideNav variant="modal" isOpen={isNavOpen} onClose={closeNav} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <NavProvider>
      <HeaderSlotProvider>
        <LayoutInner>{children}</LayoutInner>
      </HeaderSlotProvider>
    </NavProvider>
  );
}
