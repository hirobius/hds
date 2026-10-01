import { Box, Stack, Text, TileGrid, type BoxProps } from '@hirobius/design-system';

export function SurfacesRail({ tiles }: { tiles: { to: string; label: string }[] }) {
  const sx: BoxProps['sx'] = { p: 'sm' };
  return (
    <nav aria-label="Sibling surfaces">
      <TileGrid minTileWidth="260px" gap="sm">
        {tiles.map((t) => (
          <Box key={t.to} sx={sx}>
            <Stack>
              <Text>{t.label}</Text>
            </Stack>
          </Box>
        ))}
      </TileGrid>
    </nav>
  );
}
