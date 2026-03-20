# 就業判定支援ツール — 本番デプロイ設計書

## 概要

就業判定支援ツール（単一HTMLファイルのWebアプリ）をGitHub Pagesで無償公開する。Tailwind CSS CDNを本番用ビルド済みCSSに置換し、GitHub Actionsで自動デプロイする。

## 決定事項

- **配布形態**: GitHub Pagesでのホスティング（URLアクセス）
- **ライセンス**: MIT License（無償・制限なし）
- **免責事項**: アプリ内の判定結果画面に記載済み（追加不要）
- **Tailwind CSS**: CDN → ビルド済みCSSにインライン化（アプローチA）

## リポジトリ構成

```
oc-he-bus/
├── src/
│   └── index.html              # メインアプリ（開発時はTailwind CDN使用）
├── scripts/
│   ├── build.sh                # ビルドスクリプト
│   └── inline-css.js           # CSSインライン化スクリプト
├── tailwind.config.js          # Tailwind CSS設定（content + カスタムカラー）
├── package.json                # tailwindcss devDependency + buildスクリプト
├── .gitignore                  # 除外ファイル定義
├── LICENSE                     # MIT License
├── docs/                       # 既存ドキュメント（そのまま維持）
│   ├── research/
│   └── superpowers/specs/
└── .github/
    └── workflows/
        └── deploy.yml          # GitHub Pages自動デプロイワークフロー
```

## ビルドフロー

### 開発時
- `src/index.html` はTailwind CDN `<script>` タグをそのまま使用
- `python -m http.server 3000 --directory src` でローカル確認

### デプロイ時（GitHub Actions）
1. `npm ci` で tailwindcss をインストール
2. `npx tailwindcss -i /dev/null -o dist/styles.css --minify` で使用クラスのみのCSSを生成
   - `tailwind.config.js` の `content` 設定により `src/index.html` 内のクラスをスキャン
   - カスタムカラー（`primary: '#1e40af'`）も `tailwind.config.js` に定義
3. ビルドスクリプトで `src/index.html` をコピーし:
   - Tailwind CDN `<script>` タグを除去（`<script src="https://cdn.tailwindcss.com">` と `tailwind.config` インラインスクリプトの両方）
   - ビルド済みCSSを `<style>` タグとしてインライン化
4. 成果物（`dist/index.html`）をGitHub Pagesにデプロイ

### ビルドスクリプト（`scripts/build.sh`）

```bash
#!/bin/bash
set -e
mkdir -p dist
npx tailwindcss -i scripts/tailwind-input.css -o dist/styles.css --minify
# index.htmlからCDN関連タグをすべて除去し、ビルド済みCSSをインライン化
node scripts/inline-css.js
```

### CSSインライン化スクリプト（`scripts/inline-css.js`）

src/index.html を読み込み:
- `<script src="https://cdn.tailwindcss.com">` タグを除去
- `<script>tailwind.config = {...}</script>` インラインスクリプトを除去
- `</head>` の直前に `<style>{ビルド済みCSS}</style>` を挿入
- `dist/index.html` として出力

### tailwind.config.js

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

## GitHub Actions ワークフロー

- **トリガー**: `main` ブランチへのpush
- **Node.js**: v20
- **ステップ**: checkout → Node.js setup → npm ci → build → upload artifact → deploy to GitHub Pages
- **デプロイ方式**: `actions/upload-pages-artifact` + `actions/deploy-pages`
- **必要な permissions**: `pages: write`, `id-token: write`
- **デプロイ先**: `dist/` ディレクトリの内容

## メタ情報追加

`src/index.html` の `<head>` に以下を追加:

```html
<html lang="ja">
<meta name="description" content="健診CSVから就業判定を自動生成する無料Webツール">
<meta property="og:title" content="就業判定支援ツール">
<meta property="og:description" content="健診CSVから就業判定を自動生成する無料Webツール">
<meta property="og:type" content="website">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏥</text></svg>">
```

## .gitignore

```
test/
定期健康診断結果_サンプル10名.csv
node_modules/
dist/
.claude/
```

## 除外するファイル

以下はCSV専用化に伴い不要となったため、リポジトリに含めない:
- `test/` — PDF/JPGダミーデータ（2.2MB）
- `定期健康診断結果_サンプル10名.csv` — テスト用サンプルデータ
- `server.py` — 削除済み（YomiToku OCRサーバー）
- `requirements.txt` — 削除済み

## セキュリティ・プライバシー

- 健診データはブラウザ内でのみ処理され、サーバーに送信されない
- 閾値設定はlocalStorageに保存（ユーザーのブラウザ内のみ）
- Google Fontsへの接続あり（Noto Sans JP読み込み）。それ以外の外部通信なし

## 成功基準

1. `https://<user>.github.io/oc-he-bus/` でアプリにアクセスできる
2. Tailwind CDN警告がコンソールに出ない
3. CSVアップロード → 判定 → 意見書生成の全フローが動作する
4. モバイル・デスクトップ両方で表示が崩れない
