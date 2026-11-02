/** @internal — the gap ranking shared by the gap log and the index board (hds#628). */
/**
 * What makes two gaps the same gap, and how a set of gaps ranks. gaps.mjs
 * (`aggregateGaps`) and board-index.mjs (`rankGaps`) both call `rankGapGroups`
 * with their own screen order and direction letters, so the two cannot drift.
 */

export const GAP_KINDS = ['token', 'component', 'pattern', 'rule', 'bug'];

const fold = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** What makes two gaps the same gap: the id, else the kind plus the folded wording. */
export const gapKey = (g) => g.id ?? `${g.kind}:${fold(g.needed)}`;

const unique = (list) => [...new Set(list)];

/**
 * Rank gaps by how many distinct screens hit them (a screen counts once however
 * many of its directions hit it), then by total hits, then by key.
 * @param {object[]} gaps valid gap objects from any number of logs
 * @param {{ compareScreens: (a:string, b:string) => number, letters: string[] }} opts
 */
export function rankGapGroups(gaps, { compareScreens, letters }) {
  // A stable order in, so the representative wording and the evidence list never depend on read order.
  const ordered = gaps
    .map((g, index) => ({ g, index }))
    .sort(
      (a, b) =>
        compareScreens(a.g.screen, b.g.screen) ||
        a.g.direction.localeCompare(b.g.direction) ||
        a.index - b.index,
    )
    .map(({ g }) => g);

  const groups = new Map();
  for (const g of ordered) {
    const key = gapKey(g);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(g);
  }

  const ranked = [...groups].map(([key, members]) => {
    const counts = new Map();
    for (const m of members) counts.set(m.kind, (counts.get(m.kind) ?? 0) + 1);
    const kinds = GAP_KINDS.filter((k) => counts.has(k));
    const kind = kinds.length
      ? kinds.reduce((best, k) => (counts.get(k) > counts.get(best) ? k : best))
      : members[0].kind;
    const screens = unique(members.map((m) => m.screen));
    const directions = Object.fromEntries(letters.map((l) => [l, 0]));
    for (const m of members) directions[m.direction] += 1;
    return {
      key,
      id: members.find((m) => m.id)?.id ?? null,
      kind,
      kinds,
      needed: members[0].needed,
      screens,
      screenCount: screens.length,
      hits: members.length,
      directions,
      proposals: unique(members.map((m) => m.proposal).filter(Boolean)),
      didInstead: unique(members.map((m) => m.didInstead).filter(Boolean)),
      evidence: members.map((m) => ({
        screen: m.screen,
        direction: m.direction,
        evidence: m.evidence,
      })),
    };
  });

  return ranked.sort(
    (a, b) => b.screenCount - a.screenCount || b.hits - a.hits || a.key.localeCompare(b.key),
  );
}
