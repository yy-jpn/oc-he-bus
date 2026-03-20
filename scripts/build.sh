#!/bin/bash
set -e
mkdir -p dist
npx tailwindcss -i scripts/tailwind-input.css -o dist/styles.css --minify
node scripts/inline-css.js
echo "Build complete: dist/index.html"
