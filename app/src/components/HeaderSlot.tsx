import { createContext, useContext, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Portal plumbing for the shared app header's right-aligned action area.
 *
 * Why a portal (not a HeaderContext that pages push content into): each page owns many
 * custom action buttons whose handlers depend on that page's local state (refetch,
 * filters, mutations, selection). Portaling keeps those buttons in the page's own React
 * subtree — state stays colocated, no wiring, no mount/unmount flicker.
 *
 * The only thing shared through context here is the *target DOM node* itself, registered
 * by Header via a ref callback (`useHeaderSlotRef`). No header content or data flows
 * through it. Using a ref callback (rather than getElementById in an effect) keeps this
 * reactive and lint-clean: when the header mounts/unmounts the node, consumers re-render.
 */
const HeaderSlotContext = createContext<HTMLElement | null>(null);
const HeaderSlotSetContext = createContext<(el: HTMLElement | null) => void>(() => {});

export function HeaderSlotProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  return (
    <HeaderSlotSetContext.Provider value={setSlot}>
      <HeaderSlotContext.Provider value={slot}>{children}</HeaderSlotContext.Provider>
    </HeaderSlotSetContext.Provider>
  );
}

/** Header uses this as the `ref` on the slot element so pages can portal into it. */
export function useHeaderSlotRef() {
  return useContext(HeaderSlotSetContext);
}

/** Pages wrap their action buttons in this to render them into the shared bar's slot. */
export function HeaderSlot({ children }: { children: ReactNode }) {
  const slot = useContext(HeaderSlotContext);
  return slot ? createPortal(children, slot) : null;
}
