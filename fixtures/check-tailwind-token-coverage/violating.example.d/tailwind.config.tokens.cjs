// Synthetic fixture — proof-of-firing (docs/guardrails/FIXTURE_DIR_HARNESS.md).
// Every key below violates a rule in check-tailwind-token-coverage.mjs.

const config = {
  theme: {
    extend: {
      // resolved literal instead of a var(--…) ref — breaks the token cascade.
      spacing: {
        4: '1rem',
      },
      // resolved literal instead of a var(--…) ref (ADR-024 requires var()
      // for screens too, despite @media's own var() limitation).
      screens: {
        sm640: '640px',
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
