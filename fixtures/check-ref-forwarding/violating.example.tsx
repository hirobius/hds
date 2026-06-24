// violating: renders a raw <input> form control but does not forward its ref,
// so form libraries and focus management can't reach the DOM node.
export function ViolatingRefForwarding(props: { value: string }) {
  return <input type="text" value={props.value} />;
}
