#!/usr/bin/env node
// Fixture gate: reads an env var NOT in the audit-gate-purity allowlist.
// The registry entry has pureExceptions: ["env: ..."] so this gate is
// classified EXEMPTED (not IMPURE) — audit-gate-purity exits 0.
const token = process.env.MY_SECRET_TOKEN;
if (token) process.stdout.write('token found\n');
process.exit(0);
