# 本番デプロイ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 就業判定支援ツールをGitHub Pagesで公開する

**Architecture:** 単一HTMLファイル（src/index.html）にメタ情報を追加し、Tailwind CSS CDNをビルド済みCSSに置換するビルドパイプラインを構築。GitHub Actionsで自動デプロイ。

**Tech Stack:** Tailwind CSS CLI, Node.js, GitHub Actions, GitHub Pages

**Spec:** `docs/superpowers/specs/2026-03-20-production-deploy-design.md`

---

### Task 1: Git リポジトリ初期化 + .gitignore

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: git init（ブランチ名を main に指定）**

```bash
cd /c/Users/linus_pdyka7k/Dev/projects/oc-he-bus
git init -b main
```

- [ ] **Step 2: .gitignore を作成**

```
test/
定期健康診断結果_サンプル10名.csv
node_modules/
dist/
.claude/
```

- [ ] **Step 3: 初期コミット（既存ファイルも含む）**

```bash
git add .gitignore src/ docs/
git commit -m "chore: initialize repository with existing source and docs"
```

---

### Task 2: メタ情報追加

**Files:**
- Modify: `src/index.html:3-6` (`<head>` 内)

- [ ] **Step 1: メタタグとfaviconを追加**

`src/index.html` の `<title>` タグの直後（6行目の後）に以下を挿入:

```html
<meta name="description" content="健診CSVから就業判定を自動生成する無料Webツール">
<meta property="og:title" content="就業判定支援ツール">
<meta property="og:description" content="健診CSVから就業判定を自動生成する無料Webツール">
<meta property="og:type" content="website">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏥</text></svg>">
```

`<html lang="ja">` は既に設定済みなので変更不要。

- [ ] **Step 2: プレビューで確認**

プレビューサーバーをリロードし、以下を確認:
- タブにファビコン（🏥）が表示される
- ページが正常に表示される

- [ ] **Step 3: コミット**

```bash
git add src/index.html
git commit -m "feat: add meta tags and favicon for production"
```

---

### Task 3: Tailwind CSS ビルド環境セットアップ

**Files:**
- Create: `package.json`
- Create: `tailwind.config.js`

- [ ] **Step 1: package.json を作成**

```json
{
  "name": "oc-he-bus",
  "version": "1.0.0",
  "private": true,
  "description": "就業判定支援ツール — 健診CSVから就業判定を自動生成",
  "scripts": {
    "build": "bash scripts/build.sh"
  },
  "devDependencies": {
    "tailwindcss": "^3"
  }
}
```

- [ ] **Step 2: tailwind.config.js を作成**

```js
module.exports = {
  content: ['./src/index.html'],
  theme: {
    extend: {
      colors: { primary: '#1e40af' },
    },
  },
};
```

- [ ] **Step 3: npm install で tailwindcss をインストール**

```bash
npm install
```

Expected: `node_modules/` が作成され、`package-lock.json` が生成される。

- [ ] **Step 4: コミット**

```bash
git add package.json package-lock.json tailwind.config.js
git commit -m "chore: add Tailwind CSS build tooling"
```

---

### Task 4: ビルドスクリプト作成

**Files:**
- Create: `scripts/build.sh`
- Create: `scripts/inline-css.js`

- [ ] **Step 0: Tailwind入力CSSファイルを作成**

Create: `scripts/tailwind-input.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 1: scripts/build.sh を作成**

```bash
#!/bin/bash
set -e
mkdir -p dist
npx tailwindcss -i scripts/tailwind-input.css -o dist/styles.css --minify
node scripts/inline-css.js
echo "Build complete: dist/index.html"
```

- [ ] **Step 2: scripts/inline-css.js を作成**

```js
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'dist', 'styles.css'), 'utf8');

let output = html;

// Remove <script src="https://cdn.tailwindcss.com"></script>
output = output.replace(/<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>\n?/, '');

// Remove <script>tailwind.config = {...}</script>
output = output.replace(/<script>\s*tailwind\.config\s*=\s*\{[\s\S]*?\}\s*<\/script>\n?/, '');

// Insert built CSS before </head>
const styleTag = `<style>${css}</style>\n`;
output = output.replace('</head>', styleTag + '</head>');

fs.writeFileSync(path.join(__dirname, '..', 'dist', 'index.html'), output, 'utf8');
console.log('Inlined CSS into dist/index.html');
```

- [ ] **Step 3: ビルドを実行して検証**

```bash
bash scripts/build.sh
```

Expected:
- `dist/styles.css` が生成される（Tailwindユーティリティクラスのみ含む）
- `dist/index.html` が生成される
- `dist/index.html` に `cdn.tailwindcss.com` が含まれない
- `dist/index.html` に `tailwind.config` が含まれない
- `dist/index.html` に `<style>` タグでCSSがインライン化されている

検証コマンド:

```bash
grep -c "cdn.tailwindcss.com" dist/index.html  # Expected: 0
grep -c "tailwind.config" dist/index.html       # Expected: 0
grep -c "<style>" dist/index.html               # Expected: 2以上（元のstyleタグ + ビルド済み）
```

- [ ] **Step 4: dist/index.html をブラウザで開いて表示確認**

`python -m http.server 8080 --directory dist` でサーバーを起動し、ブラウザで確認:
- スタイルが正常に適用されている（レイアウト崩れなし）
- コンソールにTailwind CDN警告が出ない
- CSVアップロード → 判定が正常に動作する

- [ ] **Step 5: コミット**

```bash
git add scripts/
git commit -m "feat: add build scripts for Tailwind CSS inlining"
```

---

### Task 5: MIT License 追加

**Files:**
- Create: `LICENSE`

- [ ] **Step 1: LICENSE ファイルを作成**

MIT License テンプレート。著作権者名はユーザーに確認する。

- [ ] **Step 2: コミット**

```bash
git add LICENSE
git commit -m "chore: add MIT license"
```

---

### Task 6: GitHub Actions ワークフロー

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: deploy.yml を作成**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci
      - run: bash scripts/build.sh

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: コミット**

```bash
git add .github/
git commit -m "ci: add GitHub Pages deployment workflow"
```

---

### Task 7: GitHub リポジトリ作成 + Push

- [ ] **Step 1: GitHub にリポジトリを作成**

```bash
gh repo create oc-he-bus --public --source=. --push
```

ユーザーの GitHub アカウントにリポジトリが作成され、コードがpushされる。

- [ ] **Step 2: GitHub Pages を有効化**

GitHub リポジトリの Settings → Pages → Source を "GitHub Actions" に設定:

```bash
gh api repos/{owner}/oc-he-bus/pages -X POST -f build_type=workflow 2>/dev/null || echo "Pages may already be configured"
```

- [ ] **Step 3: デプロイ完了を確認**

```bash
gh run list --limit 1
```

ワークフローが成功したら、`https://<user>.github.io/oc-he-bus/` にアクセスして動作確認。

---

### Task 8: 最終動作確認

- [ ] **Step 1: 本番URLにアクセスし全フロー確認**

以下を確認:
1. ページが正常に表示される
2. ファビコン（🏥）が表示される
3. コンソールにTailwind CDN警告が出ない
4. CSVアップロード → 判定結果表示が動作する
5. 閾値設定の変更が動作する
6. 印刷プレビューが動作する

- [ ] **Step 2: モバイル表示確認**

ブラウザのDevToolsでモバイルビューに切り替え、レイアウト崩れがないことを確認。
