/**
 * Seam under test: the walkthrough video on the case study page (hds#1148). It
 * must never play on its own (no autoplay, so reduced motion is respected),
 * must not download until asked (preload none, with a poster), and must carry
 * a captions track. The files it points at are the ones the recorder writes
 * (scripts/walkthrough/record.mjs), and the MP4 stays under 8 MB.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { WalkthroughVideo, WALKTHROUGH } from '../../docs-site/components/walkthrough-video';

const ROOT = join(__dirname, '..', '..');
const PUBLIC = join(ROOT, 'docs-site', 'public');
const html = renderToStaticMarkup(<WalkthroughVideo />);

describe('walkthrough video', () => {
  it('never autoplays and does not preload', () => {
    expect(html).not.toMatch(/autoplay/i);
    expect(html).toContain('preload="none"');
  });

  it('is muted, has controls and plays inline', () => {
    expect(html).toMatch(/<video[^>]*\bcontrols\b/);
    expect(html).toMatch(/<video[^>]*\bmuted\b/);
    expect(html).toMatch(/<video[^>]*\bplaysInline\b|playsinline/i);
  });

  it('shows a poster and carries an English captions track', () => {
    expect(html).toContain(`poster="${WALKTHROUGH.poster}"`);
    expect(html).toMatch(/<track[^>]*kind="captions"/);
    expect(html).toMatch(/<track[^>]*srcLang="en"|srclang="en"/i);
    expect(html).toContain(`src="${WALKTHROUGH.captions}"`);
  });

  it('points at files that exist, with the MP4 under 8 MB', () => {
    for (const url of [WALKTHROUGH.video, WALKTHROUGH.poster, WALKTHROUGH.captions]) {
      expect(existsSync(join(PUBLIC, url)), url).toBe(true);
    }
    expect(statSync(join(PUBLIC, WALKTHROUGH.video)).size).toBeLessThan(8 * 1024 * 1024);
    expect(readFileSync(join(PUBLIC, WALKTHROUGH.captions), 'utf8').startsWith('WEBVTT')).toBe(
      true,
    );
  });

  it('is on the case study page', () => {
    const mdx = readFileSync(join(ROOT, 'content', 'docs', 'case-study.mdx'), 'utf8');
    expect(mdx).toContain('<WalkthroughVideo />');
  });
});
