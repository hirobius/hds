// passing: the surface root takes the surface radius (rounded-lg, the same as
// Card); the nested item is one step down, annotated as concentric.
const panel = 'rounded-lg border border-border bg-popover p-1';
// radius-ok: nested item, 12px outer minus 4px padding = rounded-md (concentric)
const item = 'rounded-md px-2 py-1.5';
export const Passing = () => (
  <div className={panel}>
    <div className={item}>Item</div>
  </div>
);
