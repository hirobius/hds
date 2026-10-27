/**
 * The props baseline (hds#461): every component's props with their type,
 * whether they are optional, their allowed values and their default, read
 * from component-api.json and the cva defaultVariants, and the upgrade facts
 * the gate draws from it: a prop removed or renamed, a prop now required, an
 * allowed value removed (each breaking) and a default changed (a look step).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkUpgradeLedger } from '../check-upgrade-ledger.mjs';
import { diffSnapshots } from '../upgrade/diff.mjs';
import { factImpact } from '../upgrade/ledger.mjs';
import { writeNote } from '../upgrade/note.mjs';
import { PROPS_BASELINE, literalValues, propsFromManifest } from '../upgrade/props.mjs';
import { PendingStep } from '../upgrade/schema.mjs';
import { snapshotFromSource } from '../upgrade/snapshot.mjs';
import {
  RELEASED_API,
  buttonSource,
  changeset,
  cleanUpRepos,
  note,
  propsRepo,
  readNote,
  write,
  writeComponentApi,
} from './helpers/upgrade-repo.mjs';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');

afterEach(cleanUpRepos);

const rules = (result) => result.violations.map((v) => v.rule).sort();
const factIds = (result) => result.violations.map((v) => v.fact).filter(Boolean);

/** RELEASED_API with Button's props passed through `change`. */
function withButtonProps(change) {
  const api = structuredClone(RELEASED_API);
  api.components.Button.props = change(api.components.Button.props);
  return api;
}

const renameSize = (props) => props.map((p) => (p.name === 'size' ? { ...p, name: 'scale' } : p));

describe('literalValues', () => {
  it('reads a string-literal union in either quote style, dropping null and undefined', () => {
    expect(literalValues('"sm" | "md" | "lg" | null')).toEqual(['sm', 'md', 'lg']);
    expect(literalValues("'start' | 'center' | undefined")).toEqual(['start', 'center']);
  });

  it('is null for anything that is not only string literals', () => {
    expect(literalValues('string')).toBeNull();
    expect(literalValues('"sm" | number')).toBeNull();
    expect(literalValues('() => void')).toBeNull();
    expect(literalValues('null')).toBeNull();
  });
});

describe('propsFromManifest', () => {
  it('takes a default from cva defaultVariants when docgen has none', () => {
    const props = propsFromManifest(RELEASED_API, () => buttonSource());
    expect(props.Button.size).toEqual({
      type: '"sm" | "md" | "lg" | null',
      optional: true,
      values: ['sm', 'md', 'lg'],
      default: 'md',
    });
    expect(props.Button.onClick).toEqual({
      type: '() => void',
      optional: true,
      values: null,
      default: null,
    });
  });

  it('keeps the docgen default over a cva one', () => {
    const api = withButtonProps((props) =>
      props.map((p) => (p.name === 'size' ? { ...p, default: 'lg' } : p)),
    );
    expect(propsFromManifest(api, () => buttonSource()).Button.size.default).toBe('lg');
  });
});

describe('the committed baseline', () => {
  const baseline = JSON.parse(readFileSync(join(REPO, PROPS_BASELINE), 'utf8'));

  it('stores Stack gap and Text variant as expanded literal sets', () => {
    expect(baseline.Stack.gap.values).toEqual(expect.arrayContaining(['tight', 'px128']));
    expect(baseline.Stack.gap.values.length).toBeGreaterThan(20);
    expect(baseline.Text.variant.values).toEqual(expect.arrayContaining(['body', 'docCode']));
  });

  it("records Button's cva defaults", () => {
    expect(baseline.Button.size.default).toBe('md');
    expect(baseline.Button.variant.default).toBe('secondary');
  });
});

describe('props facts', () => {
  it('renaming Button size fails without a step, as a breaking removal', () => {
    const root = propsRepo();
    writeComponentApi(root, withButtonProps(renameSize));
    const result = checkUpgradeLedger(root);
    expect(result.ok).toBe(false);
    expect(factIds(result)).toEqual(['prop-removed:Button.size']);
    expect(result.violations[0].message).toContain('Button no longer takes the prop size');
  });

  it('passes a rename with a prop-renamed step under a minor changeset', () => {
    const root = propsRepo();
    writeComponentApi(root, withButtonProps(renameSize));
    changeset(root, 'scale', 'minor');
    const plain = 'Rename the Button prop size to scale.';
    note(root, 'scale', {
      impact: 'breaking',
      plain,
      steps: [
        {
          id: 'prop-renamed/Button.size',
          kind: 'prop-renamed',
          impact: 'breaking',
          plain,
          prop: { component: 'Button', name: 'size', to: 'scale' },
          facts: ['prop-removed:Button.size'],
        },
      ],
    });
    expect(checkUpgradeLedger(root).violations).toEqual([]);
  });

  it('removing a variant value fails as breaking, even with a step, under a patch', () => {
    const root = propsRepo();
    const api = withButtonProps((props) =>
      props.map((p) =>
        p.name === 'variant' ? { ...p, type: '"primary" | "secondary" | null' } : p,
      ),
    );
    writeComponentApi(root, api);
    expect(factIds(checkUpgradeLedger(root))).toEqual([
      'prop-value-removed:Button.variant:tertiary',
    ]);
    changeset(root, 'no-tertiary', 'patch');
    const plain = 'Use secondary where a Button used tertiary.';
    note(root, 'no-tertiary', {
      impact: 'behavior',
      plain,
      steps: [
        {
          id: 'prop-value-mapped/Button.variant',
          kind: 'prop-value-mapped',
          impact: 'behavior',
          plain,
          prop: { component: 'Button', name: 'variant', values: { tertiary: 'secondary' } },
          facts: ['prop-value-removed:Button.variant:tertiary'],
        },
      ],
    });
    const result = checkUpgradeLedger(root);
    expect(rules(result)).toEqual(['bump-too-small']);
    expect(result.violations[0].message).toContain('prop-value-removed:Button.variant:tertiary');
  });

  it('pre-fills one prop-value-mapped step per prop, whose TODO map the gate refuses', () => {
    const root = propsRepo();
    const api = withButtonProps((props) =>
      props.map((p) => (p.name === 'variant' ? { ...p, type: '"primary" | null' } : p)),
    );
    writeComponentApi(root, api);
    changeset(root, 'primary-only', 'minor');
    writeNote(root, { name: 'primary-only' });
    const [step] = readNote(root, 'primary-only').steps;
    expect(step).toMatchObject({
      id: 'prop-value-mapped/Button.variant',
      impact: 'breaking',
      prop: {
        component: 'Button',
        name: 'variant',
        values: { secondary: 'TODO', tertiary: 'TODO' },
      },
      facts: [
        'prop-value-removed:Button.variant:secondary',
        'prop-value-removed:Button.variant:tertiary',
      ],
    });
    expect(new RegExp(step.detect.regex[1]).test('<Button variant="tertiary" />')).toBe(true);
    expect(rules(checkUpgradeLedger(root))).toEqual(['note-invalid']);
  });

  it('flags a prop that became required as breaking', () => {
    const root = propsRepo();
    writeComponentApi(
      root,
      withButtonProps((props) =>
        props.map((p) => (p.name === 'onClick' ? { ...p, required: true } : p)),
      ),
    );
    const [fact] = diffSnapshots(
      JSON.parse(readFileSync(join(root, 'docs/api/releases/0.20.0.json'), 'utf8')),
      snapshotFromSource(root),
    );
    expect(fact.id).toBe('prop-required:Button.onClick');
    expect(factImpact(fact)).toBe('breaking');
  });

  it('changing Button defaultVariants creates a look step', () => {
    const root = propsRepo();
    write(root, 'src/button.tsx', buttonSource("size: 'lg', variant: 'secondary'"));
    writeComponentApi(root, RELEASED_API);
    const result = checkUpgradeLedger(root);
    expect(factIds(result)).toEqual(['prop-default-changed:Button.size']);
    expect(result.violations[0].message).toContain('from md to lg');
    changeset(root, 'bigger', 'patch');
    writeNote(root, { name: 'bigger' });
    const [step] = readNote(root, 'bigger').steps;
    expect(step).toMatchObject({
      id: 'look/Button.size',
      kind: 'look',
      impact: 'look',
      facts: ['prop-default-changed:Button.size'],
    });
  });

  it('fails a committed baseline that no longer matches component-api.json', () => {
    const root = propsRepo();
    write(root, 'src/app/data/component-api.json', JSON.stringify(withButtonProps(renameSize)));
    expect(rules(checkUpgradeLedger(root))).toContain('props-baseline-stale');
  });

  it('reports nothing against a release snapshot with no props section', () => {
    const root = propsRepo();
    const snapshot = JSON.parse(readFileSync(join(root, 'docs/api/releases/0.20.0.json'), 'utf8'));
    delete snapshot.props;
    write(root, 'docs/api/releases/0.20.0.json', JSON.stringify(snapshot));
    writeComponentApi(root, withButtonProps(renameSize));
    expect(checkUpgradeLedger(root).violations).toEqual([]);
  });
});

describe('prop step schema', () => {
  const step = (extra) => ({
    impact: 'breaking',
    plain: 'Rename the prop.',
    facts: ['prop-removed:Button.size'],
    ...extra,
  });

  it('needs prop.to on a prop-renamed step and prop.values on a prop-value-mapped one', () => {
    const renamed = { id: 'prop-renamed/Button.size', kind: 'prop-renamed' };
    expect(PendingStep.safeParse(step(renamed)).success).toBe(false);
    expect(
      PendingStep.safeParse(
        step({ ...renamed, prop: { component: 'Button', name: 'size', to: 'scale' } }),
      ).success,
    ).toBe(true);
    const mapped = { id: 'prop-value-mapped/Button.variant', kind: 'prop-value-mapped' };
    expect(
      PendingStep.safeParse(step({ ...mapped, prop: { component: 'Button', name: 'variant' } }))
        .success,
    ).toBe(false);
  });
});
