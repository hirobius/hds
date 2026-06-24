// violating: bare comparison against a known breakpoint px value (768 = md).
export function ViolatingBreakpoint() {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  return <div>{isMobile ? 'mobile' : 'desktop'}</div>;
}
