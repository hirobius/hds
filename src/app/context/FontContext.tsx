import type { ReactNode } from 'react';

// 12t-typography-truth-up: removed runtime CSS-var override.
// The provider used to inject an Atkinson Hyperlegible stack into
// --primitive-typography-family-primary on mount, masking the Clash Grotesk
// default that tokens.generated.css already supplies. Atkinson has no
// @font-face declaration, so the override silently degraded the body font
// to system-ui everywhere FontProvider mounted (App + HDSLayout).
// Provider kept as a passthrough to avoid rewiring every mount site.
export function FontProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
