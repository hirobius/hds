import { describe, expect, it } from 'vitest';
import * as sheetEntry from './sheet';
import * as root from './index';

// hds#1433: the ./sheet subpath gives the same Sheet as the root barrel.
describe('@hirobius/design-system/sheet', () => {
  it('re-exports the root Sheet and its compound parts', () => {
    expect(sheetEntry.Sheet).toBe(root.Sheet);
    expect(sheetEntry.Sheet.Content).toBe(root.Sheet.Content);
    expect(sheetEntry.Sheet.Title).toBeDefined();
  });
});
