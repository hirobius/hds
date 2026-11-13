import { describe, expect, it } from 'vitest';
import * as buttonEntry from './button';
import * as root from './index';

// hds#1502: the ./button subpath gives the same Button as the root barrel.
describe('@hirobius/design-system/button', () => {
  it('re-exports the root Button', () => {
    expect(buttonEntry.Button).toBe(root.Button);
  });
});
