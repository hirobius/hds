/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Owner decision 2026-11-05: a Button with variant="link" is plain text in every tone, at
 * rest, on hover, while pressed and when disabled. Measured in Chromium against the real
 * stylesheet (src/styles/index.css compiled by Tailwind for the rendered classes), light
 * and dark: transparent background, no border, no box-shadow colour, no inline padding,
 * an underline, and the tone's (or the disabled) text colour. Skips without Chromium
 * (fails under HDS_REQUIRE_BROWSER=1).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium } from 'playwright';
import { chromiumForTests } from '../lib/browser-host.mjs';
import { compileHdsCss } from '../lib/compile-hds-css.mjs';

const CHROMIUM = chromiumForTests();

const CASES = [
  { id: 'neutral', props: { variant: 'link' }, text: 'var(--semantic-color-content-primary)' },
  {
    id: 'danger',
    props: { variant: 'link', tone: 'danger' },
    text: 'var(--semantic-color-feedback-error)',
  },
  {
    id: 'success',
    props: { variant: 'link', tone: 'success' },
    text: 'var(--semantic-color-feedback-success)',
  },
  {
    id: 'disabled',
    props: { variant: 'link', disabled: true },
    text: 'var(--component-button-primary-textDisabled)',
  },
  {
    id: 'danger-disabled',
    props: { variant: 'link', tone: 'danger', disabled: true },
    text: 'var(--component-button-primary-textDisabled)',
  },
];

describe.skipIf(!CHROMIUM)('Button variant="link" computed in Chromium', () => {
  let browser;
  let page;

  beforeAll(async () => {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const React = await import('react');
    const { Button } = await import('../../src/app/components/button.tsx');
    const markup = CASES.map(
      ({ id, props, text }) =>
        `<div style="margin:8px">${renderToStaticMarkup(
          React.createElement(Button, { ...props, id }, 'Remove item'),
        )}<span data-expect="${id}" style="color:${text}">x</span></div>`,
    ).join('');
    const classes = [...markup.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));
    const css = await compileHdsCss([...new Set(classes)]);
    browser = await chromium.launch({ executablePath: CHROMIUM });
    page = await browser.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setContent(
      `<html data-hds><head><style>${css}</style></head><body>${markup}</body></html>`,
    );
  }, 60_000);
  afterAll(() => browser?.close());

  const read = (id) =>
    page.evaluate((id) => {
      const cs = getComputedStyle(document.getElementById(id));
      return {
        background: cs.backgroundColor,
        backgroundImage: cs.backgroundImage,
        border: ['Top', 'Right', 'Bottom', 'Left'].map((s) => cs[`border${s}Width`]).join(' '),
        shadowColours: (cs.boxShadow.match(/rgba?\([^)]*\)/g) ?? []).filter(
          (c) => !/rgba\(0, 0, 0, 0\)/.test(c),
        ),
        paddingInline: `${cs.paddingLeft} ${cs.paddingRight}`,
        decoration: cs.textDecorationLine,
        color: cs.color,
        expected: getComputedStyle(document.querySelector(`[data-expect="${id}"]`)).color,
      };
    }, id);

  const plainText = (s) => {
    expect(s.background).toBe('rgba(0, 0, 0, 0)');
    expect(s.backgroundImage).toBe('none');
    expect(s.border).toBe('0px 0px 0px 0px');
    expect(s.shadowColours).toEqual([]);
    expect(s.paddingInline).toBe('0px 0px');
    expect(s.decoration).toBe('underline');
    expect(s.color).toBe(s.expected);
  };

  for (const theme of ['light', 'dark']) {
    describe(theme, () => {
      beforeAll(async () => {
        await page.evaluate((t) => {
          if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
          else document.documentElement.removeAttribute('data-theme');
          document.documentElement.classList.toggle('dark', t === 'dark');
        }, theme);
      });

      for (const { id } of CASES) {
        it(`${id}: plain text at rest, on hover and while pressed`, async () => {
          await page.mouse.move(0, 0);
          plainText(await read(id));
          const box = await page.$eval(`#${id}`, (b) => b.getBoundingClientRect().toJSON());
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          plainText(await read(id));
          await page.mouse.down();
          plainText(await read(id));
          await page.mouse.up();
        });
      }
    });
  }
});
