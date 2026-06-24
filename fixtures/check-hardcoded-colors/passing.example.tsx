// passing: SVG fill uses currentColor / a token var, not a raw color literal.
export function PassingColorIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect width="16" height="16" fill="currentColor" />
    </svg>
  );
}
