/**
 * The Sync plugin fetches its bundle from the public docs site (docsUrl) and
 * refuses to build when figma/links.json names none.
 */
import { describe, it, expect } from 'vitest';
import { syncConfigFromLinks } from '../lib/figma-scripts.mjs';

const base = {
  libraryFileKey: 'LIB',
  libraryFileName: 'HDS Tokens & Components',
  retiredFiles: [],
};

describe('syncConfigFromLinks bundle host', () => {
  it('uses docsUrl when links.json has one', () => {
    const c = syncConfigFromLinks({ ...base, docsUrl: 'https://docs.example.app/' });
    expect(c.origin).toBe('https://docs.example.app');
    expect(c.bundleUrl).toBe('https://docs.example.app/figma/sync-bundle.json');
  });

  it('refuses a links.json with no docsUrl', () => {
    expect(() => syncConfigFromLinks(base)).toThrow(/https docsUrl/);
  });

  it('refuses a docsUrl that is not https', () => {
    expect(() => syncConfigFromLinks({ ...base, docsUrl: 'http://docs.example.app' })).toThrow(
      /https/,
    );
  });
});
