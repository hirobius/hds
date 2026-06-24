// violating: raw <button> with no focus indicator class — keyboard users get
// no visible focus ring.
export function ViolatingFocus() {
  return (
    <button type="button" onClick={() => {}}>
      Save
    </button>
  );
}
