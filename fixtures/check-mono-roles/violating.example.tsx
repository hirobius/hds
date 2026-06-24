// violating: raw font-mono class on a prose surface that should use InlineCode
export function ViolatingExample() {
  return <span className="font-mono text-sm">token-name</span>;
}
