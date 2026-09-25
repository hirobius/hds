import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

// Static export: the search index is baked at build time into a static
// JSON response for this route, and the client (RootProvider's
// search={{ options: { type: 'static' } }}) fetches it instead of hitting a
// live API route — Fumadocs' built-in "static search mode".
export const revalidate = false;

export const { staticGET: GET } = createFromSource(source);
