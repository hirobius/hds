#!/usr/bin/env node
// Fixture gate: fully compliant --json output.
process.stdout.write(JSON.stringify({ violations: [], ok: true }) + '\n');
process.exit(0);
