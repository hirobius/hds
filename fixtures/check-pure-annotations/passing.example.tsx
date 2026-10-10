// passing: the module-scope forwardRef call carries the /* @__PURE__ */
// annotation immediately before the call, so the bundler can drop it when
// unused. This is the shape check-pure-annotations enforces.
import { forwardRef } from 'react';

export const Widget = /* @__PURE__ */ forwardRef<HTMLDivElement, { label: string }>(function Widget(
  { label },
  ref,
) {
  return <div ref={ref}>{label}</div>;
});
