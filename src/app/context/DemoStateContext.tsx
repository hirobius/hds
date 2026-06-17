/**
 * DemoStateContext — React context for freezing HDS component demos into a fixed visual state.
 *
 * Replaces the forceHover/forceFocus/forcePressed prop trio on Button and NavItem.
 * Wrap any demo with <FreezeState state="hover"> and every HDS component inside will
 * render that visual state without wiring individual force props.
 *
 * Components read via useFrozenState():
 *   frozenState ?? demoState prop → effectiveDemoState
 *
 * This means the matrix cells can still pass demoState as a prop and it will work,
 * while FreezeState wrapping provides a cleaner compositional override.
 */
import { createContext, useContext, type ReactNode } from 'react';

const DemoStateContext = createContext<string | null>(null);

/** Freeze all HDS demo components inside to the given visual state. */
export function FreezeState({ state, children }: { state: string; children: ReactNode }) {
  return (
    <DemoStateContext.Provider value={state}>
      {children}
    </DemoStateContext.Provider>
  );
}

/** Read the nearest frozen demo state, or null if not inside a FreezeState. */
export function useFrozenState(): string | null {
  return useContext(DemoStateContext);
}
