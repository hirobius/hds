/** @internal — utility-tier component; not part of @hirobius/design-system public API. */
// @doc-exempt: internal display toggle, not a consumer-facing HDS component
import { useTokenDisplay } from '../context/TokenDisplayContext';
import { SegmentedControl } from './segmented-control';

export function TokenDisplayToggle() {
  const { showCss, setShowCss } = useTokenDisplay();

  return (
    // motion-ok: motion feedback is delegated to shared SegmentedControl
    <SegmentedControl
      label="Display mode"
      value={showCss ? 'css' : 'token'}
      onChange={(value) => setShowCss(value === 'css')}
      size="sm"
      options={[
        { value: 'token', label: 'Token name' },
        { value: 'css', label: 'CSS var' },
      ]}
    />
  );
}
