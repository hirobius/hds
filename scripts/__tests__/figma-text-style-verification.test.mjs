import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { buildVerification } from '../figma-text-style-verification.mjs';

const read = {
  totalTextLayers: 10,
  textLayersWithoutStyle: 4,
  componentsWithUnstyledText: [
    { page: 'Archive', id: '1:1', name: '_Calendar (archived)', text: 3, unstyled: 3, mixed: 0 },
    { page: 'Buttons', id: '2:2', name: 'Button', text: 2, unstyled: 1, mixed: 0 },
  ],
};

describe('buildVerification', () => {
  it('gives archived/deprecated layers a reason and counts live ones as to-bind', () => {
    const v = buildVerification(read, { readAt: '2026-11-02' });
    expect(v.textLayersWithoutStyle).toBe(4);
    expect(v.liveTextLayersWithoutStyle).toBe(1);
    expect(v.components[0].reason).toMatch(/Archive/);
    expect(v.components[1].reason).toBeNull();
  });
  it('the committed file has no live unstyled layer left unexplained', () => {
    const v = JSON.parse(
      readFileSync(path.resolve(__dirname, '../../figma/text-style-verification.json'), 'utf8'),
    );
    expect(v.fileKey).toBe('2VgBbVpKiDnu0aftJEVyBQ');
    expect(v.components.filter((c) => !c.reason).reduce((s, c) => s + c.unstyled, 0)).toBe(
      v.liveTextLayersWithoutStyle,
    );
    expect(v.components.reduce((s, c) => s + c.unstyled, 0)).toBe(v.textLayersWithoutStyle);
  });
});
