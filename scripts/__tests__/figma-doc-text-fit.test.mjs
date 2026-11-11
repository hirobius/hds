/** hds#1462: generated doc sheets' text hugs its text and nothing clips. */
import { describe, expect, it } from 'vitest';
import { hdsFitDocText, docTextFitScript } from '../lib/figma-doc-text-fit.mjs';

const text = (characters, extra = {}) => ({
  type: 'TEXT',
  id: extra.id ?? characters,
  characters,
  textAutoResize: 'NONE',
  layoutSizingHorizontal: 'FIXED',
  ...extra,
});
const frame = (children, extra = {}) => ({
  type: 'FRAME',
  id: extra.id ?? 'f',
  layoutMode: 'VERTICAL',
  primaryAxisSizingMode: 'AUTO',
  counterAxisSizingMode: 'AUTO',
  clipsContent: false,
  children,
  ...extra,
});

describe('hdsFitDocText (hds#1462)', () => {
  it('a fixed-width caption hugs its text', () => {
    const caption = text('Primary · Default');
    hdsFitDocText(frame([caption]));
    expect(caption.textAutoResize).toBe('WIDTH_AND_HEIGHT');
    expect(caption.layoutSizingHorizontal).toBe('HUG');
  });

  it('a paragraph that fills its column wraps and grows in height', () => {
    const para = text('A long paragraph.\nSecond line.', { layoutSizingHorizontal: 'FILL' });
    hdsFitDocText(frame([para]));
    expect(para.textAutoResize).toBe('HEIGHT');
    expect(para.layoutSizingHorizontal).toBe('FILL');
  });

  it('a fixed-height parent of a fitted text hugs, and stops clipping', () => {
    const caption = text('Secondary · Pressed');
    const cell = frame([caption], {
      id: 'cell',
      layoutMode: 'VERTICAL',
      primaryAxisSizingMode: 'FIXED',
      counterAxisSizingMode: 'FIXED',
      clipsContent: true,
    });
    hdsFitDocText(frame([cell]));
    expect(cell.primaryAxisSizingMode).toBe('AUTO');
    expect(cell.counterAxisSizingMode).toBe('AUTO');
    expect(cell.clipsContent).toBe(false);
  });

  it('leaves instances alone and reports what changed; a second run changes nothing', () => {
    const inner = text('Label');
    const root = frame([{ type: 'INSTANCE', id: 'btn', children: [inner] }, text('Hover')]);
    const first = hdsFitDocText(root);
    expect(inner.textAutoResize).toBe('NONE');
    expect(first.map((c) => c.id)).toEqual(['Hover']);
    expect(hdsFitDocText(root)).toEqual([]);
  });

  it('a clipping frame narrower than its hugging text stops clipping and re-hugs (Surface, hds#1462)', () => {
    const caption = text('Primary · Default', {
      textAutoResize: 'WIDTH_AND_HEIGHT',
      layoutSizingHorizontal: 'HUG',
      width: 114,
    });
    const live = frame([caption], { id: 'live', width: 110, clipsContent: true });
    const slot = { type: 'INSTANCE', id: 'kit', children: [frame([live], { id: 'slot' })] };
    const changes = hdsFitDocText(frame([slot], { id: 'sheet' }), { slots: true });
    expect(live.clipsContent).toBe(false);
    expect(changes.map((c) => c.id)).toContain('live');
  });

  it('the use_figma script carries the function and names the sheet ids it touches', () => {
    const code = docTextFitScript(['2555:3288']);
    expect(code).toContain('function hdsFitDocText');
    expect(code).toContain('"2555:3288"');
  });
});
