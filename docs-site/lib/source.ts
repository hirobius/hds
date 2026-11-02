import { loader } from 'fumadocs-core/source';
import { docs } from '../.source/server';
import { homeNavLabelPlugin } from './site-name';

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  plugins: [homeNavLabelPlugin()],
});
