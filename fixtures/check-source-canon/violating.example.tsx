// violating: font-bold className breaks canon (palette/typography rule —
// emphasis must use font-medium, never bold).
export function ViolatingSourceCanon() {
  return <div className="font-bold text-sm">Heading</div>;
}
