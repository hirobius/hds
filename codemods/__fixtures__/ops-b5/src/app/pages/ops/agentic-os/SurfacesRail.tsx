import { Box, Stack, Text, TileGrid, type BoxProps } from '@hirobius/design-system';

const TILE_SX: BoxProps['sx'] = { p: 'sm' };

export function SurfacesRail({ tiles }: { tiles: { to: string; label: string }[] }) {
  return (
    <nav aria-label="Sibling surfaces">
      <TileGrid minTileWidth="260px" gap="sm">
        {tiles.map((t) => (
          <Box key={t.to} sx={TILE_SX}>
            <Stack direction="column" gap="px2" className="min-w-0">
              <Text as="span" variant="body">
                {t.label}
              </Text>
            </Stack>
          </Box>
        ))}
      </TileGrid>
    </nav>
  );
}
