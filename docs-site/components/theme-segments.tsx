import { SegmentedControl } from '@hirobius/design-system';

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

/** Light / dark / system as an HDS SegmentedControl. `theme` is empty until the stored one is known. */
export function ThemeSegments({
  theme,
  onChange,
}: {
  theme: string;
  onChange: (theme: string) => void;
}) {
  return (
    <SegmentedControl
      aria-label="Theme"
      size="sm"
      options={THEMES}
      value={theme}
      onChange={onChange}
    />
  );
}
