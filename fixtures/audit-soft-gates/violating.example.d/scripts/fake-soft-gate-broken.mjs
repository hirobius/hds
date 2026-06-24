#!/usr/bin/env node
// Fixture gate: exits 1 (no parseable JSON) so audit-soft-gates
// classifies it as investigate-broken and exits non-zero in fixture mode.
process.stderr.write('fake-soft-gate-broken: something went wrong\n');
process.exit(1);
