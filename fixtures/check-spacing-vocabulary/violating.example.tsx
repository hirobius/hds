// violating: raw integers on sx spacing props (hds#206 banned form)
export function ViolatingSpacingVocabulary() {
  return (
    <Box sx={{ p: 2, gap: 4, mt: 9, bgcolor: 'surface.raised' }}>Raw integer spacing values</Box>
  );
}

// violating: a responsive map and a whitespace variant of the attribute
// (prettier-ignore keeps the spaces inside `sx={ { ... } }`, the case under test)
export function ViolatingResponsiveSpacing() {
  return (
    // prettier-ignore
    <Box sx={ { p: { xs: 2, md: 4 } } }>Integers inside a responsive map</Box>
  );
}

// violating: a hoisted object passed by name
const hoisted = { gap: 3, bgcolor: 'surface.raised' };
export function ViolatingHoistedSpacing() {
  return <Box sx={hoisted}>Integer on a hoisted sx object</Box>;
}

// violating: a conditional sx expression, and an object spread behind &&
export function ViolatingConditionalSpacing({ dense }: { dense: boolean }) {
  return (
    <Box sx={{ ...(dense && { m: 5 }), bgcolor: 'surface.raised' }}>
      <Box sx={dense ? { p: 3 } : { p: 'md' }}>Integers behind a condition</Box>
    </Box>
  );
}
