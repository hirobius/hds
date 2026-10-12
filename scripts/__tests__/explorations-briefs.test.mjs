/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * hds#628 phase 0 — the content of eval/explorations/: one brief per screen with
 * the sections every brief owes, shared sections that cannot drift apart, invented
 * fixture data that passes the PII check, and gap ids that match the briefs.
 */
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { clientDenylist, scanPaths } from '../lib/explorations/pii.mjs';
import { GAP_KINDS } from '../lib/explorations/gaps.mjs';
import { REQUIRED_STATES, SCREENS, SCREEN_IDS } from '../lib/explorations/spec.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DIR = path.join(ROOT, 'eval/explorations');
const read = (...p) => readFileSync(path.join(DIR, ...p), 'utf8');
const brief = (id) => read('screens', id, 'brief.md');
const fixture = (id) => JSON.parse(read('screens', id, 'fixture.json'));

/** The text of a `## <heading>` section, up to the next `## `. */
function section(md, heading) {
  const lines = md.split('\n');
  const start = lines.findIndex((l) => l === `## ${heading}`);
  if (start === -1) return null;
  const end = lines.findIndex((l, i) => i > start && l.startsWith('## '));
  return lines.slice(start, end === -1 ? undefined : end).join('\n');
}

const SECTIONS = [
  'The job',
  'The screen',
  'Fixture data',
  'Required states',
  'The three directions',
  'Viewports and tenants',
  'Allowed inputs',
  'Output contract',
  'Gaps to confirm, not to build ahead',
];
const SHARED = [
  'The three directions',
  'Viewports and tenants',
  'Allowed inputs',
  'Output contract',
];
const STATE_KEYS = ['empty', 'loading', 'error', 'longContent', 'tokenFailure'];

describe('eval/explorations/screens: one brief and one fixture per screen', () => {
  it('has exactly the six screens of the hds#628 table', () => {
    expect(SCREEN_IDS).toEqual([
      'standing',
      'ops-home',
      'drops-inbox',
      'pitch',
      'leads',
      'client-dashboard',
    ]);
    expect(readdirSync(path.join(DIR, 'screens')).sort()).toEqual([...SCREEN_IDS].sort());
    for (const id of SCREEN_IDS) {
      expect(readdirSync(path.join(DIR, 'screens', id)).sort()).toEqual([
        'brief.md',
        'fixture.json',
      ]);
    }
  });

  describe.each(SCREENS.map((s) => [s.id, s]))('%s', (id, screen) => {
    const md = brief(id);

    it('has every section a generator needs, in order', () => {
      const headings = md.split('\n').filter((l) => l.startsWith('## '));
      expect(headings).toEqual(SECTIONS.map((s) => `## ${s}`));
    });

    it('is headed with the screen, and names the feature it is for', () => {
      expect(md).toMatch(/^# Exploration brief: /);
      expect(md).toContain(`Screen ${SCREEN_IDS.indexOf(id) + 1} of 6`);
      for (const f of screen.feature) {
        // the table in hds#628 names a ticket or a pass; the brief names every ticket
        for (const ticket of f.match(/hirobius\/(?:ops|hds)#\d+/g) ?? []) {
          expect(md, ticket).toContain(ticket);
        }
      }
    });

    it('requires the five states, in order, as labelled regions', () => {
      const states = section(md, 'Required states');
      const found = [...states.matchAll(/`State: ([^`]+)`:/g)].map((m) => m[1]);
      expect(found).toEqual(REQUIRED_STATES);
    });

    it('states the job in user terms and gives the fixture shape as TypeScript', () => {
      expect(
        section(md, 'The job')
          .split('\n')
          .filter((l) => l.startsWith('- ')).length,
      ).toBeGreaterThanOrEqual(5);
      expect(section(md, 'Fixture data')).toMatch(/```ts\n[\s\S]+\n```/);
    });

    it('has a fixture that says it is invented, names its screen and carries every state', () => {
      const f = fixture(id);
      expect(f.$comment).toMatch(/^INVENTED data/);
      expect(f.screen).toBe(id);
      expect(Object.keys(f.states)).toEqual(STATE_KEYS);
      expect(typeof f.states.loading.note).toBe('string');
    });

    it('has fixture data that passes the PII check, against every real client tenant', () => {
      const findings = scanPaths([path.join(DIR, 'screens', id)], {
        denylist: clientDenylist(path.join(ROOT, 'tenants')),
        root: ROOT,
      });
      expect(findings).toEqual([]);
    });
  });

  it('keeps the shared sections identical in all six briefs, so one cannot drift from the others', () => {
    for (const heading of SHARED) {
      const texts = SCREEN_IDS.map((id) => section(brief(id), heading));
      for (const t of texts) expect(t, heading).not.toBeNull();
      expect(new Set(texts).size, heading).toBe(1);
    }
  });

  it('states the gates by direction the harness enforces', () => {
    const directions = section(brief('standing'), 'The three directions');
    expect(directions).toMatch(/A, Faithful.*0 lint violations/);
    expect(directions).toMatch(/B, Ceiling.*0 lint violations/);
    expect(directions).toMatch(/C, Wildcard.*every violation listed in `bend-log\.json`/);
    expect(directions).toMatch(/axe finds 0 serious or critical.*light and dark.*1280 and 390/);
  });

  it('tells a generator the same allowed inputs the spec set promises, and nothing that edits a 21st account', () => {
    const allowed = section(brief('pitch'), 'Allowed inputs');
    expect(allowed).toMatch(/`search`, `get_inspiration` and `get_theme`/);
    expect(allowed).toMatch(/`get_component` only when/);
    expect(allowed).toMatch(/Not allowed:.*another direction's app/);
    expect(allowed).toMatch(/any 21st tool that changes the account/);
  });
});

describe('eval/explorations/screens: fixtures keep the shape their brief promises', () => {
  const bandKeys = ['fire', 'waiting', 'running', 'parked', 'backlog', 'shipped'];

  it('standing: six bands, in every state, and a token failure that is one fire row', () => {
    const f = fixture('standing');
    expect(Object.keys(f.bands)).toEqual(bandKeys);
    for (const key of STATE_KEYS.filter((k) => k !== 'loading')) {
      expect(Object.keys(f.states[key].bands), key).toEqual(bandKeys);
    }
    expect(f.states.empty.bands.fire).toEqual([]);
    const { bands, sourceErrors } = f.states.tokenFailure;
    expect(bands.fire).toHaveLength(1);
    expect(bands.fire[0]).toMatchObject({ kind: 'alert', ref: 'GITHUB_TOKEN' });
    expect(bands.fire[0].why).toMatch(/Rotate GITHUB_TOKEN.*redeploy/);
    expect(sourceErrors[0]).toMatchObject({ variable: 'GITHUB_TOKEN' });
    expect(f.bands.backlog.length).toBeGreaterThan(f.showFirst);
  });

  it('ops-home: the four routes of hirobius/ops#591 and a token failure naming both variables', () => {
    const f = fixture('ops-home');
    expect(f.routes).toEqual(['github-issue', 'idea', 'client-note', 'discard']);
    expect(f.states.tokenFailure.suggest.error).toMatch(/DROPS_ROUTINE_ID and DROPS_ROUTINE_TOKEN/);
    expect(f.states.error.capture.files.some((x) => x.status === 'failed')).toBe(true);
    expect(f.states.error.capture.draft.length).toBeGreaterThan(0);
  });

  it('drops-inbox: the three tabs add up, and the selected drop is in the list', () => {
    const f = fixture('drops-inbox');
    expect(Object.keys(f.tabs)).toEqual(['new', 'sorted', 'done']);
    expect(f.tabs.new + f.tabs.sorted + f.tabs.done).toBe(f.drops.length);
    expect(f.drops.some((d) => d.id === f.selectedId)).toBe(true);
    expect(f.states.longContent.drops[0].history).toHaveLength(14);
  });

  it('pitch: the eight outcomes of hirobius/ops#489, due follow-ups first, 555-01xx numbers', () => {
    const f = fixture('pitch');
    expect(f.outcomes.map((o) => o.id)).toEqual([
      'no-answer',
      'voicemail',
      'gatekeeper',
      'callback',
      'interested',
      'not-interested',
      'wrong-number',
      'meeting-booked',
    ]);
    expect(f.followUps.map((x) => x.label)).toEqual([
      'Tomorrow',
      '3 days',
      'Next week',
      'Pick date',
    ]);
    const due = (l) => /^(due today|overdue)/.test(l.followUp);
    const firstFresh = f.today.findIndex((l) => !due(l));
    expect(f.today.slice(firstFresh).some(due)).toBe(false);
    for (const lead of f.today) expect(lead.phone).toMatch(/555-01\d\d$/);
  });

  it('leads: the eight stages of the chain, in funnel order', () => {
    const f = fixture('leads');
    expect(f.chain.stages.map((s) => s.key)).toEqual([
      'lead',
      'score',
      'site',
      'preview',
      'outreach',
      'reply',
      'deal',
      'invoice',
    ]);
    expect(f.chain.break).toBe('invoice');
    expect(f.states.empty.chain.stages.every((s) => s.count === 0)).toBe(true);
    expect(f.states.tokenFailure.setupError).toMatch(/OUTSCRAPER_API_KEY/);
  });

  it('client-dashboard: a fictional client, and a token failure inside one panel', () => {
    const f = fixture('client-dashboard');
    expect(f.phases.length).toBeGreaterThan(0);
    expect(f.states.tokenFailure.panelError.panel).toBe('engagement');
    expect(f.states.empty.client.status).toBe('prospect');
  });
});

describe('eval/explorations/gap-ids.json', () => {
  const { ids } = JSON.parse(read('gap-ids.json'));

  it('lists the seven gaps hds#628 predicts, each once, in kebab-case, with a valid kind', () => {
    expect(ids.map((i) => i.id).sort()).toEqual([
      'activity-timeline',
      'band-section',
      'file-drop-control',
      'label-value-lockup',
      'phone-action-bar',
      'stage-chain',
      'supporting-accent',
    ]);
    for (const i of ids) {
      expect(i.id).toMatch(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);
      expect(GAP_KINDS).toContain(i.kind);
      expect(i.summary.length).toBeGreaterThan(10);
      for (const s of i.predictedFor) expect(SCREEN_IDS).toContain(s);
    }
  });

  it('matches the briefs: each brief lists exactly the ids predicted for its screen', () => {
    for (const id of SCREEN_IDS) {
      const listed = [
        ...section(brief(id), 'Gaps to confirm, not to build ahead').matchAll(/^- `([a-z-]+)`:/gm),
      ]
        .map((m) => m[1])
        .sort();
      const predicted = ids
        .filter((i) => i.predictedFor.includes(id))
        .map((i) => i.id)
        .sort();
      expect(listed, id).toEqual(predicted);
    }
  });
});

describe('eval/explorations: the README and the run directory', () => {
  const readme = read('README.md');

  it('names every screen and every command it documents', () => {
    for (const id of SCREEN_IDS) expect(readme).toContain(`\`${id}\``);
    for (const flag of [
      '--explorations',
      '--offline',
      '--gaps',
      '--pii',
      '--denylist',
      '--skip-build',
    ]) {
      expect(readme).toContain(flag);
    }
  });

  it('says why this is a directory of its own, and not a second spec set in eval/consistency', () => {
    expect(readme).toMatch(/## Why a directory of its own/);
  });

  it('keeps runs committed: unlike eval/consistency/runs/, nothing ignores them', () => {
    const ignored = (file) =>
      spawnSync('git', ['check-ignore', '-q', file], { cwd: ROOT }).status === 0;
    expect(ignored('eval/consistency/runs/2026-10-13/standing-A/src/App.tsx')).toBe(true);
    expect(ignored('eval/explorations/runs/2026-10-13/standing-A/src/App.tsx')).toBe(false);
    expect(ignored('eval/explorations/runs/2026-10-13/standing-A/gaps.json')).toBe(false);
  });

  it('documents the CLI exactly as the harness prints it', () => {
    const help = spawnSync(
      process.execPath,
      [path.join(ROOT, 'scripts/eval-consistency.mjs'), '--help'],
      {
        cwd: ROOT,
        encoding: 'utf8',
      },
    ).stdout;
    expect(help).toContain('eval/explorations/README.md');
    expect(existsSync(path.join(DIR, 'README.md'))).toBe(true);
  });
});
