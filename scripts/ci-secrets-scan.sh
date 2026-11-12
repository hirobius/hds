#!/usr/bin/env bash
# CI secrets scan (hds#263). check-secrets.mjs is pre-commit only and skips when
# the binary is missing, so CI is the one place a scan must really run. Installs
# a pinned, checksum-verified gitleaks release (scripts/install-gitleaks.sh) and
# scans the whole git history (seconds at this size). The gitleaks-action needs
# a paid licence for org repos; the release binary does not.
set -euo pipefail

gitleaks="$(bash "$(dirname "$0")/install-gitleaks.sh")"

"$gitleaks" git --config .gitleaks.toml --no-banner --redact --exit-code 1
