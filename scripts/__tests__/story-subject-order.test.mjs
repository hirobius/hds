import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveStorySubject } from '../lib/story-link.mjs';

/**
 * resolveStorySubject credits a story file to the FIRST relative import that
 * resolves to a known component. hds#349 added a Badge import above the
 * subject in these two files and both components silently lost their stories
 * (check-story-coverage went red on main). Keep the subject import first.
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
