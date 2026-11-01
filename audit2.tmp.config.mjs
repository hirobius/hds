import tsParser from '@typescript-eslint/parser';
import hds from './scripts/eslint-plugin-hds/index.mjs';
export default [
  {
    files: ['**/*.{tsx,jsx}'],
    languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { hds },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    rules: {
      'hds/no-nested-cards': [
        'error',
        { cards: ['ListCard', 'CardList', 'MetricTile'], surfaces: ['PipelinePanel', 'Panel'] },
      ],
    },
  },
];
