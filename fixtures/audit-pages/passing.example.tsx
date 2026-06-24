// passing: uses CSS variable for color — audit-pages should NOT flag this

export function PassingExample() {
  return <div style={{ color: 'var(--hds-color-text-primary)' }}>Hello</div>;
}
