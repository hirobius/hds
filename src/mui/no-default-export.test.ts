import { describe, expect, it } from 'vitest';
import * as callout from '../app/components/callout';
import * as mui from './index';

// hds#1007: named exports only; the duplicate defaults had no consumer.
describe('no duplicate default exports', () => {
  it('./mui has no default export', () => {
    expect('default' in mui).toBe(false);
    expect(typeof mui.hdsMuiThemeOptions).toBe('function');
  });
  it('callout has no default export', () => {
    expect('default' in callout).toBe(false);
    expect(callout.Callout).toBeDefined();
  });
});
