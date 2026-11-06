/**
 * hds#751 — the springs and motion constants in the JS token bridge must match
 * hirobius.tokens.json, which is where the CSS curves come from.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import hds from '../tokens';

const json = JSON.parse(readFileSync(join(__dirname, '../../../../hirobius.tokens.json'), 'utf8'));
const NS = 'com.hirobius.hds';

describe('hds.motion springs', () => {
  it('match the spring tokens in hirobius.tokens.json', () => {
    const easing = json.primitive.easing;
    for (const [name, value] of Object.entries(hds.motion.springs)) {
      const token = easing[name]?.$extensions?.[NS]?.$value;
      expect(token, `primitive.easing.${name}`).toBeDefined();
      expect(value).toEqual({
        type: 'spring',
        stiffness: token.stiffness,
        damping: token.damping,
        mass: token.mass,
      });
    }
  });

  it('has the scale and duration tokens', () => {
    const scale = json.primitive.scale;
    expect(hds.motion.scale).toEqual({
      dialog: scale['96'].$value,
      menu: scale['97'].$value,
      tooltip: scale['98'].$value,
    });
    expect(hds.motion.stagger).toBe(json.primitive.duration.stagger.$value.value / 1000);
    expect(hds.motion.extended).toBe(json.primitive.duration.extended.$value.value / 1000);
  });
});
