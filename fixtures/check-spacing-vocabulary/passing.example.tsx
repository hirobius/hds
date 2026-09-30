// passing: sx spacing props use named steps, not raw integers
export function PassingSpacingVocabulary() {
  return (
    <Box sx={{ p: 'md', gap: 'var(--semantic-space-scale-sm)', bgcolor: 'surface.raised' }}>
      Named spacing steps
    </Box>
  );
}

// passing: named steps behind a condition or a logical operator
export function PassingConditionalSpacing({ dense }: { dense: boolean }) {
  return (
    <Box sx={{ ...(dense && { m: 'xs' }), p: dense ? 'sm' : 'md' }}>
      <Box sx={dense ? { gap: 'sm' } : { gap: 'md' }}>Named steps in every branch</Box>
    </Box>
  );
}
