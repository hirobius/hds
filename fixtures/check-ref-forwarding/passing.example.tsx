// passing: the form control's ref is forwarded to the underlying <input>.
import { forwardRef } from 'react';

export const PassingRefForwarding = forwardRef<HTMLInputElement, { value: string }>(
  function PassingRefForwarding(props, ref) {
    return <input ref={ref} type="text" value={props.value} />;
  },
);
