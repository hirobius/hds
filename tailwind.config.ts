import tokens from './tailwind.config.tokens.cjs';

// Semantic feedback colors as named Tailwind utilities, so components use
// `text-feedback-danger` / `bg-feedback-bg-danger` instead of arbitrary
// `bg-[color:var(--semantic-color-feedback-bg-error)]` values (cleaner CVA
// variants + no tailwindcss/no-arbitrary-value lint debt). The destructive red
// is `danger` (mapped to the --feedback-error token), matching the prop vocab.
const feedbackColors = {
  feedback: {
    info: 'var(--semantic-color-feedback-info)',
    success: 'var(--semantic-color-feedback-success)',
    danger: 'var(--semantic-color-feedback-error)',
    warning: 'var(--semantic-color-feedback-warning)',
  },
  'feedback-bg': {
    info: 'var(--semantic-color-feedback-bg-info)',
    success: 'var(--semantic-color-feedback-bg-success)',
    danger: 'var(--semantic-color-feedback-bg-error)',
    warning: 'var(--semantic-color-feedback-bg-warning)',
  },
};

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      ...tokens.theme.extend,
      colors: {
        ...tokens.theme.extend.colors,
        ...feedbackColors,
      },
    },
  },
};
