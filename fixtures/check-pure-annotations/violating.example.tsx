// violating: a module-scope forwardRef call with NO /* @__PURE__ */ annotation.
// Every bundler keeps an un-annotated top-level call, so one in a module that
// reaches the Button chunk re-breaks the Button-only budget (hds#363).
import { forwardRef } from 'react';

export const Widget = forwardRef<HTMLDivElement, { label: string }>(function Widget(
  { label },
  ref,
) {
  return <div ref={ref}>{label}</div>;
});
