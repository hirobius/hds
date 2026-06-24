#!/usr/bin/env node
// Fixture gate: does NOT support --json; emits plain text instead of JSON.
process.stdout.write('gate ran ok but no json here\n');
process.exit(0);
