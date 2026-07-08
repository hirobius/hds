// violating: raw pixel/number layout values in an inline style={{…}} block
export function ViolatingLayout() {
  return (
    <div style={{ marginBottom: '12px', gap: 24, top: 8 }}>
      Hardcoded layout values bypass Box sx and the named layout primitives
    </div>
  );
}
