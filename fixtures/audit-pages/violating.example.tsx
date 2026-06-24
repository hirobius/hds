// violating: contains a hardcoded hex color that audit-pages SHOULD flag

export function ViolatingExample() {
  return <div style={{ color: '#ff0000' }}>Hello</div>;
}
