// Synthetic fixture — proof-of-firing (docs/guardrails/FIXTURE_DIR_HARNESS.md).
// Every key below violates a rule in check-tailwind-token-coverage.mjs.

const config = {
  theme: {
    extend: {
      // resolved literal instead of a var(--…) ref — breaks the token cascade.
      spacing: {
        4: '1rem',
      },
      // var(--…) ref instead of a resolved px literal — ADR-024's amendment
      // requires screens to be concrete px (var() is inert inside @media).
      screens: {
        sm640: 'var(--primitive-breakpoint-sm)',
      },
      // missing entirely.
      borderWidth: {},
      // resolved literal instead of a var(--…) ref.
      fontSize: {
        xs: '13px',
      },
    },
  },
};

module.exports = config;
