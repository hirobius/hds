// passing: uses the semantic content token, not a legacy --hds-text-* alias.
export function PassingLegacyVar() {
  return <span style={{ color: 'var(--semantic-color-content-primary)' }}>current</span>;
}
