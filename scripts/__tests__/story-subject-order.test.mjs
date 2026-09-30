import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveStorySubject } from '../lib/story-link.mjs';

/**
 * hds#349 added a Badge import above the subject in these two files and both
 * components silently lost their stories (check-story-coverage went red on
 * main), because resolveStorySubject credited a story file to the FIRST
 * relative import that resolved to a known component. Since hds#369 the meta's
 * `component:` field decides and import order is only the fallback; this pin
 * keeps the two real files resolving to their own component either way.
 */
const known = new Set([
  'src/app/components/badge.tsx',
  'src/app/components/status-tile.tsx',
  'src/app/components/status-list-item.tsx',
]);

describe('story subject import order', () => {
  it.each([
    ['src/stories/status-tile.stories.tsx', 'src/app/components/status-tile.tsx'],
    ['src/stories/status-list-item.stories.tsx', 'src/app/components/status-list-item.tsx'],
  ])('%s resolves to its own component, not the Badge it imports', (storyFile, subject) => {
    const source = readFileSync(storyFile, 'utf8');
    expect(resolveStorySubject(storyFile, source, known)).toBe(subject);
  });
});
