import { createContext, useContext, type ReactNode } from 'react';

const EmbeddedDocLayoutBottomSlotContext = /* @__PURE__ */ createContext<ReactNode | null>(null);

export function EmbeddedDocLayoutProvider({
  bottomSlot,
  children,
}: {
  bottomSlot: ReactNode | null;
  children: ReactNode;
}) {
  return (
    <EmbeddedDocLayoutBottomSlotContext.Provider value={bottomSlot}>
      {children}
    </EmbeddedDocLayoutBottomSlotContext.Provider>
  );
}

export function useEmbeddedDocLayoutBottomSlot() {
  return useContext(EmbeddedDocLayoutBottomSlotContext);
}
