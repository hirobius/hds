#!/usr/bin/env bash
# CI secrets scan (hds#263). check-secrets.mjs is pre-commit only and skips when
# the binary is missing, so CI is the one place a scan must really run. Installs
# a pinned, checksum-verified gitleaks release and scans the whole git history
# (seconds at this size). The gitleaks-action needs a paid licence for org
# repos; the release binary does not.
set -euo pipefail

version="${GITLEAKS_VERSION:-8.28.0}"
dir="${RUNNER_TEMP:-$(mktemp -d)}"
base="https://github.com/gitleaks/gitleaks/releases/download/v${version}"
tarball="gitleaks_${version}_linux_x64.tar.gz"

curl -sSfL -o "$dir/$tarball" "$base/$tarball"
curl -sSfL -o "$dir/checksums.txt" "$base/gitleaks_${version}_checksums.txt"
(cd "$dir" && grep " $tarball\$" checksums.txt | sha256sum -c -)
tar -xzf "$dir/$tarball" -C "$dir" gitleaks

"$dir/gitleaks" git --config .gitleaks.toml --no-banner --redact --exit-code 1
