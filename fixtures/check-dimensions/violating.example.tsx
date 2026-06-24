// violating: a raw fixed-size pixel literal (32) on a width dimension prop.
export function ViolatingDimensions() {
  return <div style={{ width: 32, height: 48 }}>fixed</div>;
}
