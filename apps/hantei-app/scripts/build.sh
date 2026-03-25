#!/bin/bash
set -e
cd "$(dirname "$0")/.."
npx vite build
echo "Build complete: dist/"
