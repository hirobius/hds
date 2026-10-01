import { Grid, Badge } from '@hirobius/design-system';

// TileGrid in a comment is not an import: import { TileGrid } from '@hirobius/design-system'
export const Tiles = () => (
  <Grid layout="auto-fill" minItemWidth="260px" gap="medium">
    <Badge>Ok</Badge>
  </Grid>
);
