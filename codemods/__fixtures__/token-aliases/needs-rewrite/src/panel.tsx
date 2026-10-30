import { Box, hds } from '@hirobius/design-system';

export function Panel() {
  return (
    <div className="p-layout-normal md:gap-component-gap -mt-layout-inset space-y-layout-spacious">
      <Box sx={{ borderColor: 'border.subdued' }} style={{ gap: hds.semantic.space.component.gap }} />
    </div>
  );
}
