// passing: dimension routed through a semantic size token, not a raw literal.
export function PassingDimensions() {
  return <div style={{ width: 'var(--semantic-size-icon-md)' }}>sized</div>;
}
