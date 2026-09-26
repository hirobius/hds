// violating: raw integers on sx spacing props (hds#206 banned form)
export function ViolatingSpacingVocabulary() {
  return (
    <Box sx={{ p: 2, gap: 4, mt: 9, bgcolor: 'surface.raised' }}>Raw integer spacing values</Box>
  );
}
