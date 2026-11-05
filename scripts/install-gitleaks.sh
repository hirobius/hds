#!/usr/bin/env bash
# Install a pinned, checksum-verified gitleaks release binary and print its path
# (ops#27). check-pack-scan calls this in CI when gitleaks is not on PATH, so
# the release workflow's `pnpm release` can run the tarball scan without a
# workflow step. Same pin and verification as scripts/ci-secrets-scan.sh.
set -euo pipefail

version="${GITLEAKS_VERSION:-8.28.0}"
dir="${RUNNER_TEMP:-$(mktemp -d)}/gitleaks-${version}"
mkdir -p "$dir"
base="https://github.com/gitleaks/gitleaks/releases/download/v${version}"
tarball="gitleaks_${version}_linux_x64.tar.gz"

if [ ! -x "$dir/gitleaks" ]; then
  curl -sSfL -o "$dir/$tarball" "$base/$tarball"
  curl -sSfL -o "$dir/checksums.txt" "$base/gitleaks_${version}_checksums.txt"
  (cd "$dir" && grep " $tarball\$" checksums.txt | sha256sum -c - >&2)
  tar -xzf "$dir/$tarball" -C "$dir" gitleaks
fi
echo "$dir/gitleaks"
