// passing: layout values routed through token vars, Box sx, or named primitives
import { Box } from '../../src/app/components/box';
import { hds } from '../../src/app/design-system/tokens';

export function PassingLayout() {
  return (
    <div style={{ marginBottom: hds.space.px16, gap: 'var(--semantic-space-subgrid-gap)' }}>
      <div style={{ margin: 0, padding: 0 }}>Reset values need no token</div>
      <Box sx={{ mt: 'normal', top: hds.space.px8 }}>Token-first escape hatch</Box>
    </div>
  );
}
