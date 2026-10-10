/**
 * The Sync plugin fetches its bundle from the public docs site (docsUrl) once
 * figma/links.json names one; storybookUrl is the fallback while it doesn't.
 */
import { describe, it, expect } from 'vitest';
import { syncConfigFromLinks } from '../lib/figma-scripts.mjs';

const base = {
  libraryFileKey: 'LIB',
  libraryFileName: 'HDS Tokens & Components',
  retiredFiles: [],
  storybookUrl: 'https://storybook.example.app',
};

describe('syncConfigFromLinks bundle host', () => {
  it('uses docsUrl when links.json has one', () => {
    const c = syncConfigFromLinks({ ...base, docsUrl: 'https://docs.example.app/' });
    expect(c.origin).toBe('https://docs.example.app');
    expect(c.bundleUrl).toBe('https://docs.example.app/figma/sync-bundle.json');
  });

  it('falls back to storybookUrl', () => {
    expect(syncConfigFromLinks(base).bundleUrl).toBe(
      'https://storybook.example.app/figma/sync-bundle.json',
    );
  });

  it('refuses a docsUrl that is not https', () => {
    expect(() => syncConfigFromLinks({ ...base, docsUrl: 'http://docs.example.app' })).toThrow(
      /https/,
    );
  });
});
