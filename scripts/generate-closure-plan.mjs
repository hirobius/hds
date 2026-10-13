#!/usr/bin/env node
/**
 * scripts/generate-closure-plan.mjs
 *
 * Auto-regenerates the per-row table in
 * `docs/guardrails/full-strictness-closure-plan.md` from
 * `docs/guardrails/full-strictness-inventory.json`. Per unit 13p-10.
 *
 * Each violation entry across all gates becomes one row. Row key:
 *   <gate-id>::<file>::<line>::<rule>
 *
 * On regen:
 *   - Parses the existing markdown between
 *     `<!-- BEGIN auto-generated rows -->` and
 *     `<!-- END auto-generated rows -->` markers.
 *   - Extracts the (row-key → classification) map from the existing rows.
 *   - For each new row from the current inventory:
 *       * If row-key matches an existing entry, preserve classification.
 *       * Otherwise, classification: TODO.
 *   - Removed rows (existed before, not in current inventory) get logged
 *     to `docs/guardrails/closure-plan-removed.jsonl` for audit.
 *   - The hand-edited preamble + open-question section OUTSIDE the
 *     markers stays untouched. Only the table body changes.
 *
 * Idempotency: running twice with the same inventory produces a
 * byte-identical plan (rows are stably sorted, and scripts/lib/generated-check.mjs
 * writes it in the Prettier form lint-staged commits).
 *
 * Usage:
 *   node scripts/generate-closure-plan.mjs                # regen plan in place
 *   node scripts/generate-closure-plan.mjs --check        # exit 1 if regen would change the plan
 *   node scripts/generate-closure-plan.mjs --root <dir>   # against a copy of the tree (tests)
 *
 * @module generate-closure-plan
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rootFromArgv, runGenerator } from './lib/generated-check.mjs';

const INVENTORY = 'docs/guardrails/full-strictness-inventory.json';
const PLAN = 'docs/guardrails/full-strictness-closure-plan.md';
const REMOVED_LOG = 'docs/guardrails/closure-plan-removed.jsonl';

const BEGIN_MARKER = '<!-- BEGIN auto-generated rows -->';
const END_MARKER = '<!-- END auto-generated rows -->';

// Row format we emit (and parse back):
//   | <gate-id> | <file> | <line> | <rule> | <severity> | <classification> |
// HTML comment above each row carries the row key (Prettier puts a blank line
// between them; the parser carries the key across it):
//   <!-- key: <gate-id>::<file>::<line>::<rule> -->
const KEY_COMMENT_RE = /<!--\s*key:\s*([^\s][^>]*?)\s*-->/;
const TABLE_ROW_RE =
  /^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$/;

// Severity-first (error > warn > baselined > info), then gate, file, line, rule.
const SEVERITY_ORDER = { error: 0, warn: 1, baselined: 2, info: 3 };

/** One row per violation in the inventory, stably sorted. */
function inventoryRows(inventory) {
  const rows = [];
  for (const gate of inventory.gates ?? []) {
    if (!Array.isArray(gate.violations)) continue;
    for (const v of gate.violations) {
      const file = v.file ?? '*';
      const line = v.line == null ? 'null' : String(v.line);
      const rule = v.rule ?? 'unknown';
      rows.push({
        key: `${gate.id}::${file}::${line}::${rule}`,
        gateId: gate.id,
        file,
        line,
        rule,
        severity: v.severity ?? 'info',
      });
    }
  }
  return rows.sort((a, b) => {
    const sa = SEVERITY_ORDER[a.severity] ?? 4;
    const sb = SEVERITY_ORDER[b.severity] ?? 4;
    if (sa !== sb) return sa - sb;
    if (a.gateId !== b.gateId) return a.gateId.localeCompare(b.gateId);
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    if (a.line !== b.line) return a.line.localeCompare(b.line);
    return a.rule.localeCompare(b.rule);
  });
}

/** row key → hand-set classification, read from the rows between the markers. */
function preservedClassifications(block) {
  const preserved = new Map();
  let pendingKey = null;
  for (const line of block.split('\n')) {
    const km = line.match(KEY_COMMENT_RE);
    if (km) {
      pendingKey = km[1].trim();
      continue;
    }
    const m = pendingKey ? line.match(TABLE_ROW_RE) : null;
    if (m) {
      const classification = (m[6] || '').trim();
      if (classification && !/^classification\b/i.test(classification)) {
        preserved.set(pendingKey, classification);
      }
      pendingKey = null;
    }
  }
  return preserved;
}

/**
 * The plan regenerated from `inventory`, keeping the text outside the markers
 * and every classification a person set on a row that still exists.
 *
 * @param {{ inventory: object, planRaw: string }} input
 * @returns {{ plan: string, rows: object[], preserved: Map<string, string>, removedKeys: string[] }}
 */
export function buildClosurePlan({ inventory, planRaw }) {
  const beginIdx = planRaw.indexOf(BEGIN_MARKER);
  const endIdx = planRaw.indexOf(END_MARKER);
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
    throw new Error(
      `closure plan must contain BEGIN/END markers. Add these on their own lines: ${BEGIN_MARKER}  ...  ${END_MARKER}`,
    );
  }
  const preamble = planRaw.slice(0, beginIdx + BEGIN_MARKER.length);
  const postamble = planRaw.slice(endIdx);
  const preserved = preservedClassifications(planRaw.slice(beginIdx + BEGIN_MARKER.length, endIdx));

  const rows = inventoryRows(inventory);
  const currentKeys = new Set(rows.map((r) => r.key));
  const removedKeys = [...preserved.keys()].filter((key) => !currentKeys.has(key));

  const lines = [
    '',
    `> Auto-generated by \`scripts/generate-closure-plan.mjs\` from \`${INVENTORY}\`. ${rows.length} row(s). Do not edit between BEGIN/END markers — re-run \`pnpm closure:plan\`. Edit only the **classification** column; row keys preserve your edits across regens.`,
    '',
  ];
  if (rows.length === 0) {
    lines.push('_(No violation rows in the current inventory.)_', '');
  } else {
    lines.push('| gate | file | line | rule | severity | classification |');
    lines.push('|---|---|---|---|---|---|');
    // Pipe characters in cell content would break the markdown table — escape them.
    const safe = (s) => String(s).replace(/\|/g, '\\|');
    for (const r of rows) {
      const cls = preserved.get(r.key) || 'classification: TODO';
      lines.push(`<!-- key: ${r.key} -->`);
      lines.push(
        `| ${safe(r.gateId)} | ${safe(r.file)} | ${safe(r.line)} | ${safe(r.rule)} | ${safe(r.severity)} | ${safe(cls)} |`,
      );
    }
    lines.push('');
  }

  return { plan: preamble + lines.join('\n') + postamble, rows, preserved, removedKeys };
}

async function main() {
  const root = rootFromArgv(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
  const verbose = process.argv.includes('--verbose');

  const inventoryPath = path.join(root, INVENTORY);
  if (!fs.existsSync(inventoryPath)) {
    console.error(`✗ generate-closure-plan: inventory not found at ${inventoryPath}`);
    console.error(
      `  Run: node scripts/run-gates.mjs --channel pre-commit --emit-inventory ${INVENTORY}`,
    );
    return 2;
  }
  const planPath = path.join(root, PLAN);
  if (!fs.existsSync(planPath)) {
    console.error(`✗ generate-closure-plan: plan not found at ${planPath}`);
    return 2;
  }

  let built;
  try {
    built = buildClosurePlan({
      inventory: JSON.parse(fs.readFileSync(inventoryPath, 'utf8')),
      planRaw: fs.readFileSync(planPath, 'utf8'),
    });
  } catch (e) {
    console.error(`✗ generate-closure-plan: ${e.message}`);
    return 2;
  }

  const result = await runGenerator({
    root,
    outputs: { [PLAN]: built.plan },
    label: 'generate-closure-plan',
    fix: 'node scripts/generate-closure-plan.mjs',
  });
  if (result.check) return result.exitCode;

  const { rows, preserved, removedKeys } = built;
  // Append-only audit log of the classified rows a regen dropped.
  if (removedKeys.length > 0) {
    const ts = new Date().toISOString();
    const entries = removedKeys.map((key) =>
      JSON.stringify({ ts, removedRowKey: key, priorClassification: preserved.get(key) }),
    );
    fs.mkdirSync(path.dirname(path.join(root, REMOVED_LOG)), { recursive: true });
    fs.appendFileSync(path.join(root, REMOVED_LOG), `${entries.join('\n')}\n`);
  }
  const kept = rows.filter((r) => preserved.has(r.key)).length;
  console.log(
    `  rows: ${rows.length} (${kept} preserved · ${rows.length - kept} new · ${removedKeys.length} removed)`,
  );
  if (verbose && removedKeys.length > 0) {
    console.log(`\nRemoved rows (logged to ${REMOVED_LOG}):`);
    for (const k of removedKeys) console.log(`  - ${k}`);
  }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
