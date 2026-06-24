// violating: references a retired legacy --hds-text-* alias instead of the
// semantic content token.
export function ViolatingLegacyVar() {
  return <span style={{ color: 'var(--hds-text-primary)' }}>legacy</span>;
}
