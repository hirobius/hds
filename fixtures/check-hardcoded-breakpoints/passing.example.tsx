// passing: comparison routed through the hds.breakpoints token, no raw px value.
import { hds } from '../../src/app/design-system/tokens';

export function PassingBreakpoint() {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < hds.breakpoints.md;
  return <div>{isMobile ? 'mobile' : 'desktop'}</div>;
}
