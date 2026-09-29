/**
 * Storybook manager (the chrome around the stories): brand only.
 *
 * Storybook 8.6 cannot change the browser tab title, so the brand shows in the
 * sidebar header. `brandImage` is served from `.storybook/static/` through
 * `staticDirs` in main.ts. Link previews are set in manager-head.html.
 */
import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming/create';

const theme = create({
  base: 'light',
  brandTitle: 'Hirobius Design System',
  brandUrl: 'https://github.com/hirobius/hds',
  brandImage: './hds-logo.svg',
  brandTarget: '_blank',
});

addons.setConfig({ theme });
