import { Box, Stack, hds } from '@hirobius/design-system';

// Stack's own gap names and Box sx's spacing names are props, not the removed tokens.
export const Ok = () => (
  <Stack gap="tight" className="p-scale-sm gap-surface-padding">
    <Box sx={{ m: 'tight', borderColor: 'border.default' }} style={{ gap: hds.semantic.space.layout.gap }} />
  </Stack>
);
