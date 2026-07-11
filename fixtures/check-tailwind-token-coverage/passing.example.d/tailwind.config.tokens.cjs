// Synthetic fixture — proof-of-firing (docs/guardrails/FIXTURE_DIR_HARNESS.md).
// Mirrors the shape of the real generated tailwind.config.tokens.cjs.

const config = {
  theme: {
    extend: {
      spacing: {
        4: 'var(--primitive-space-4)',
        'layout-normal': 'var(--semantic-space-layout-normal)',
      },
      screens: {
        xs375: 'var(--primitive-breakpoint-xs)',
        sm640: 'var(--primitive-breakpoint-sm)',
      },
      borderWidth: {
        DEFAULT: 'var(--semantic-borderWidth-default)',
        2: 'var(--semantic-borderWidth-emphasis)',
      },
      fontSize: {
        xs: 'var(--primitive-typography-size-xs)',
        sm: 'var(--primitive-typography-size-sm)',
      },
    },
  },
};

module.exports = config;
