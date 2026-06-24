// violating: SVG fill attribute carries a hardcoded hex color (gate check C1).
export function ViolatingColorIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <rect width="16" height="16" fill="#ff0044" />
    </svg>
  );
}
