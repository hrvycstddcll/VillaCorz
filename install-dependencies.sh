#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

for command in npm composer; do
    if ! command -v "$command" >/dev/null 2>&1; then
        printf 'Error: %s is required but was not found in PATH.\n' "$command" >&2
        exit 1
    fi
done

printf '\nInstalling repository dependencies...\n'
(cd "$ROOT_DIR" && npm ci)

printf '\nInstalling frontend dependencies...\n'
(cd "$ROOT_DIR/VillaCorz" && npm ci)

printf '\nInstalling Laravel PHP dependencies...\n'
(cd "$ROOT_DIR/VillaCorz/backend" && composer install)

printf '\nInstalling Laravel asset-tooling dependencies...\n'
(cd "$ROOT_DIR/VillaCorz/backend" && npm ci)

printf '\nAll dependencies installed successfully.\n'
