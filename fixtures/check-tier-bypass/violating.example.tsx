// violating: direct primitive var reference bypasses the semantic tier
export function ViolatingExample() {
  return <div style={{ color: 'var(--primitive-color-blue-500)' }}>Hello</div>;
}
