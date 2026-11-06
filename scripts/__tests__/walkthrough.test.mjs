/**
 * Tests for the scripted walkthrough's pure parts (hds#1148): the captions
 * track, terminal-panel HTML and the redaction of local paths.
 */

import { describe, it, expect } from 'vitest';
import {
  CHAPTERS,
  buildVtt,
  formatVttTime,
  escapeHtml,
  redactPaths,
  terminalPanelHtml,
} from '../walkthrough/chapters.mjs';
import { resolveFile } from '../walkthrough/serve.mjs';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

describe('CHAPTERS', () => {
  it('has 5–6 chapters, each with an id and a caption', () => {
    expect(CHAPTERS.length).toBeGreaterThanOrEqual(5);
    expect(CHAPTERS.length).toBeLessThanOrEqual(6);
    for (const c of CHAPTERS) {
      expect(c.id).toMatch(/^[a-z-]+$/);
      expect(c.caption.length).toBeGreaterThan(10);
    }
  });

  it('names the published package correctly', () => {
    const all = CHAPTERS.map((c) => c.caption).join(' ');
    expect(all).not.toMatch(/@hirobius\/hds\b/);
  });
});

describe('formatVttTime', () => {
  it('formats milliseconds as HH:MM:SS.mmm', () => {
    expect(formatVttTime(0)).toBe('00:00:00.000');
    expect(formatVttTime(83_456)).toBe('00:01:23.456');
  });

  it('clamps negative times to zero', () => {
    expect(formatVttTime(-50)).toBe('00:00:00.000');
  });
});

describe('buildVtt', () => {
  it('writes a WEBVTT header and one cue per caption, in order', () => {
    const vtt = buildVtt([
      { start: 0, end: 2000, text: 'One' },
      { start: 2000, end: 4500, text: 'Two & <three>' },
    ]);
    expect(vtt.startsWith('WEBVTT\n\n')).toBe(true);
    expect(vtt).toContain('1\n00:00:00.000 --> 00:00:02.000\nOne\n');
    expect(vtt).toContain('2\n00:00:02.000 --> 00:00:04.500\nTwo &amp; &lt;three&gt;\n');
  });

  it('drops cues with no duration', () => {
    expect(buildVtt([{ start: 1000, end: 1000, text: 'x' }])).toBe('WEBVTT\n\n');
  });
});

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    );
  });
});

describe('redactPaths', () => {
  it('replaces absolute and relative paths to a temp file with its basename', () => {
    const out = redactPaths(
      '../../../tmp/x/scratchpad/plan-row.tsx:4  [p: 4]\n/tmp/x/scratchpad/plan-row.tsx',
      ['/tmp/x/scratchpad/plan-row.tsx', '../../../tmp/x/scratchpad/plan-row.tsx'],
    );
    expect(out).toBe('plan-row.tsx:4  [p: 4]\nplan-row.tsx');
  });

  it('removes the home directory and repo root', () => {
    expect(redactPaths('/home/someone/hds/src/a.ts', [], { root: '/home/someone/hds' })).toBe(
      'src/a.ts',
    );
  });
});

describe('terminalPanelHtml', () => {
  it('escapes command output and marks each line for the reveal', () => {
    const html = terminalPanelHtml({
      title: 'Gate',
      blocks: [
        { label: 'pre-commit', command: 'git commit', lines: ['<b>fail</b>'], tone: 'fail' },
      ],
    });
    expect(html).toContain('&lt;b&gt;fail&lt;/b&gt;');
    expect(html).not.toContain('<b>fail</b>');
    expect(html).toContain('data-line');
    expect(html).toContain('data-tone="fail"');
  });

  it('links the site stylesheets so the panel uses HDS tokens', () => {
    const html = terminalPanelHtml({ title: 'T', blocks: [], stylesheets: ['/_next/a.css'] });
    expect(html).toContain('<link rel="stylesheet" href="/_next/a.css">');
  });
});

describe('resolveFile', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'wt-'));
  mkdirSync(path.join(root, 'docs'));
  writeFileSync(path.join(root, 'docs', 'case-study.html'), 'x');
  writeFileSync(path.join(root, 'index.html'), 'x');

  it('resolves extension-less routes to .html', () => {
    expect(resolveFile(root, '/docs/case-study')).toBe(path.join(root, 'docs', 'case-study.html'));
  });

  it('resolves / to index.html', () => {
    expect(resolveFile(root, '/')).toBe(path.join(root, 'index.html'));
  });

  it('refuses paths that climb out of the root', () => {
    expect(resolveFile(root, '/../../etc/passwd')).toBeNull();
  });
});
