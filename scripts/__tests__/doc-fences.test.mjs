// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { extractTsxFences } from '../lib/doc-fences.mjs';

const md = (s) => s.replace(/^\|/gm, '');

describe('extractTsxFences', () => {
  it('returns each ```tsx fence with its file and 1-based line of the opening fence', () => {
    const text = md('|# T\n|\n|```tsx\n|<A />\n|```\n|\n|```ts\n|const x = 1;\n|```\n');
    const out = extractTsxFences(text, 'a.md');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ file: 'a.md', line: 3, code: '<A />' });
  });

  it('finds indented fences inside list items and strips the indent', () => {
    const text = '- item\n\n  ```tsx\n  const a = 1;\n    const b = 2;\n  ```\n';
    expect(extractTsxFences(text, 'a.md')[0].code).toBe('const a = 1;\n  const b = 2;');
  });

  it('exempts fences whose info string says before', () => {
    const text = '```tsx before\nimport { Gone } from "x";\n```\n\n```tsx\n<B />\n```\n';
    const out = extractTsxFences(text, 'a.md');
    expect(out.map((f) => f.code)).toEqual(['<B />']);
  });

  it('blanks a "// Before" region up to the next "// After" comment, keeping line numbers', () => {
    const text = '```tsx\n// Before\n<Old />\n\n// After: new\n<New />\n```\n';
    const [f] = extractTsxFences(text, 'a.md');
    expect(f.code).not.toContain('Old');
    expect(f.code).toContain('<New />');
    expect(f.code.split('\n')).toHaveLength(5);
  });

  it('tolerates tildes, CRLF and a longer fence', () => {
    const text = '````tsx\r\n<A />\r\n````\r\n';
    expect(extractTsxFences(text, 'a.md')[0].code).toBe('<A />');
  });
});
