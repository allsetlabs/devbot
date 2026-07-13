import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Blocks } from 'lucide-react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { useNav } from '../hooks/useNav';
import { findRoute } from '../routes';
import { findPluginRoute } from '../pluginRoutes';
import { useHeaderSlotRef } from './HeaderSlot';

/**
 * The single, app-wide top bar. It sits in AppLayout above every route and renders one
 * of two shapes, both with the same hamburger on the left and the same right-aligned
 * action slot (`useHeaderSlotRef`) that pages fill via <HeaderSlot>:
 *
 *   - Top-level route (routes.tsx):      [☰] <icon> <name>
 *   - Plugin sub-route (pluginRoutes.tsx): [☰] <Blocks> Plugins › <name>
 *
 * Detail/param routes (chat view, scheduler view, …) own their own header, so this
 * returns null for them.
 */
export function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { openNav, isDocked } = useNav();
  const slotRef = useHeaderSlotRef();

  const route = findRoute(pathname);
  const plugin = findPluginRoute(pathname);

  if (!route && !plugin) return null;

  return (
    <header className="safe-area-top flex shrink-0 items-center gap-2 border-b border-border bg-background px-4 py-3">
      {/* When docked, the sidebar is always visible on md+, so the hamburger only shows on mobile. */}
      <Button
        variant="ghost"
        size="icon"
        onClick={openNav}
        aria-label="Open menu"
        className={isDocked ? 'md:hidden' : undefined}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {route ? (
        <>
          <span className="text-primary">{route.icon}</span>
          <h1 className="text-lg font-bold text-foreground">{route.name}</h1>
        </>
      ) : (
        plugin && (
          <>
            <span className="text-primary">
              <Blocks className="h-5 w-5" />
            </span>
            <nav className="flex items-center gap-1.5 text-base" aria-label="Breadcrumb">
              <button
                type="button"
                onClick={() => navigate('/plugins')}
                className="font-medium text-muted-foreground transition-colors md:hover:text-foreground"
              >
                Plugins
              </button>
              <span className="text-muted-foreground">›</span>
              <span className="font-bold text-foreground">{plugin.name}</span>
            </nav>
          </>
        )
      )}

      <div ref={slotRef} className="ml-auto flex items-center gap-2" />
    </header>
  );
}
