// passing: sx spacing props use named steps, not raw integers
export function PassingSpacingVocabulary() {
  return (
    <Box sx={{ p: 'md', gap: 'var(--semantic-space-scale-sm)', bgcolor: 'surface.raised' }}>
      Named spacing steps
    </Box>
  );
}
