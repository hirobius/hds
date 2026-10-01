/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * format.mjs — how the upgrade scripts (hds#447) write the JSON they commit.
 *
 * The writer owns the layout, not Prettier: docs/api/releases/, upgrade/releases/
 * and upgrade/schema.json are in .prettierignore, so `--check` compares exactly
 * these bytes and a Prettier upgrade cannot make a committed file stale.
 */

/** 2-space indent and a trailing newline. */
export function formatJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/** A copy of `object` with its keys sorted, each value passed through `map`. */
export function sortedObject(object, map = (value) => value) {
  return Object.fromEntries(
    Object.keys(object ?? {})
      .sort()
      .map((key) => [key, map(object[key], key)]),
  );
}
