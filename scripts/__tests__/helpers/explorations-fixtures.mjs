/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * In-memory directions for the explorations gate tests (hds#628): a direction
 * that passes every static gate, to be broken one piece at a time.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const CLEAN_APP = [
  "import { Button, Card, Stack } from '@hirobius/design-system';",
  "import fixture from './fixture.json';",
  'export default function App() {',
  '  return (',
  '    <Stack direction="column" gap="normal">',
  '      <Card><p>{fixture.title}</p></Card>',
  '      <Button>Save</Button>',
  '    </Stack>',
  '  );',
  '}',
  '',
].join('\n');

export const HEX_APP = CLEAN_APP.replace(
  '<Button>Save</Button>',
  `<Button sx={{ background: '#7c3aed' }}>Save</Button>`,
);

export const TENANTS = {
  'accent-lilac': { demo: true },
  'brutalist-demo': { demo: true },
  'alder-bay-plumbing': { demo: false },
};

export const gap = (screen, direction) => ({
  screen,
  direction,
  kind: 'pattern',
  needed: 'An activity timeline',
  didInstead: 'A plain list',
  proposal: 'Add a Timeline pattern',
  evidence: 'src/App.tsx:12',
});

/** A direction that passes every static gate; override one piece to break it. */
export function direction(letter, over = {}) {
  const screen = over.screen ?? 'standing';
  const files = over.files ?? { 'src/App.tsx': CLEAN_APP };
  const present = (value) => ({ present: true, value });
  const meta = {
    rationale: { present: true, text: 'The same bands, with the accent pair doing the ranking.\n' },
    refs: present({
      tenant: letter === 'A' ? null : 'accent-lilac',
      searches: [{ tool: 'search', query: 'status bands list' }],
      refs: [
        { url: 'https://21st.dev/community/example', took: 'Idea: collapse after three rows' },
      ],
    }),
    bendLog: letter === 'C' ? present([]) : { present: false },
    gaps: present([gap(screen, letter)]),
    ...over.meta,
  };
  return {
    id: `${screen}-${letter}`,
    screen,
    letter,
    files,
    texts: { ...files, ...over.texts },
    meta,
  };
}

/** Write a direction (as `direction()` builds it) to `<runDir>/<id>/`, the way a session leaves it. */
export function writeDirection(runDir, d) {
  const dir = path.join(runDir, d.id);
  const put = (rel, text) => {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    writeFileSync(path.join(dir, rel), text);
  };
  for (const [rel, text] of Object.entries({ ...d.files, ...d.texts })) put(rel, text);
  const { rationale, refs, bendLog, gaps } = d.meta;
  if (rationale.present) put('rationale.md', rationale.text);
  if (refs.present) put('refs.json', JSON.stringify(refs.value));
  if (bendLog.present) put('bend-log.json', JSON.stringify(bendLog.value));
  if (gaps.present) put('gaps.json', JSON.stringify(gaps.value));
  return dir;
}
