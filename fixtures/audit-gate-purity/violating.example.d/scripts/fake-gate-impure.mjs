#!/usr/bin/env node
// Fixture gate: reads an env var NOT in the audit-gate-purity allowlist.
// This makes audit-gate-purity flag this gate as IMPURE (no pureExceptions).
const token = process.env.MY_SECRET_TOKEN;
if (token) process.stdout.write('token found\n');
process.exit(0);
