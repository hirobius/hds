// passing: <button> carries the hds-focus class, so it has a visible focus ring.
export function PassingFocus() {
  return (
    <button type="button" className="hds-focus" onClick={() => {}}>
      Save
    </button>
  );
}
