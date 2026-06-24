#!/usr/bin/env node
// Fixture gate: exits 0 with valid JSON output so audit-soft-gates
// classifies it as promote-to-pre-commit and exits 0 in fixture mode.
process.stdout.write(JSON.stringify({ violations: [], ok: true }) + '\n');
process.exit(0);
