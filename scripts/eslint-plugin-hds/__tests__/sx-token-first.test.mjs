import rule from '../rules/sx-token-first.mjs';
import { makeRuleTester } from './test-helpers.mjs';

const ruleTester = makeRuleTester();

ruleTester.run('sx-token-first', rule, {
  valid: [
    'const x = <Box sx={{ color: "content.primary" }} />;',
    // Bare numbers ARE the token-first mechanism for sx spacing — never flagged.
    'const x = <Box sx={{ m: 2, p: 4, gap: 8 }} />;',
    'const x = <Box sx={{ m: "normal", top: "var(--primitive-space-2)" }} />;',
    // Responsive object and &-selector nesting are walked but stay clean.
    'const x = <Box sx={{ m: { xs: 2, md: 4 }, "&:hover": { color: "accent.hover" } }} />;',
    // Not the sx prop — out of scope.
    'const x = <div style={{ color: "#fff" }} />;',
  ],
  invalid: [
    {
      code: 'const x = <Box sx={{ color: "#fff" }} />;',
      errors: [{ messageId: 'rawHexInSx' }],
    },
    {
      code: 'const x = <Box sx={{ m: "16px" }} />;',
      errors: [{ messageId: 'rawPxInSx' }],
    },
    {
      code: 'const x = <Box sx={{ m: { xs: "8px", md: 4 } }} />;',
      errors: [{ messageId: 'rawPxInSx' }],
    },
    {
      code: 'const x = <Box sx={{ "&:hover": { color: "#000000" } }} />;',
      errors: [{ messageId: 'rawHexInSx' }],
    },
  ],
});
