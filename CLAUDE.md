# OC-HE-BUS Project

産業保健業務支援ツール群。小規模事業場（50人未満）向け。

## Structure
```
apps/
├── flow-app/     # 休復職フロー管理（Next.js 16 + Supabase）← メイン開発対象
└── hantei-app/   # 健康診断判定意見書生成（単体 HTML + Tailwind）
docs/
├── requirements/design-doc.md   # 製品設計仕様書（~50KB、全フェーズ記載）
├── research/01-market-survey.md # 市場調査
└── guideline.pdf                # 厚労省メンタルヘルス指針
test/                            # テストデータ（健診 PDF/画像、サンプル 10名分）
```

## flow-app: 休復職フロー管理

### Domain Context
厚労省「心の健康問題により休業した労働者の職場復帰支援の手引き」に基づく休復職支援システム。

**7フェーズ**:
- Phase 0: 早期発見（出勤状況・ストレスチェック）
- Phase 1: 休職開始
- Phase 2: 療養期間
- Phase 3: 復職準備（リワークプログラム）
- Phase 4: 復職判定
- Phase 5A: 通常復帰 / 5B: 段階的復帰

### Architecture
```
src/
├── app/
│   ├── (app)/               # 認証済みルート
│   │   ├── cases/[id]/      # ケース管理（contact/decision/gradual-return/interview/leave/preparation/return）
│   │   ├── candidates/      # 休復職候補者一覧
│   │   ├── dashboard/       # ダッシュボード
│   │   └── settings/        # 設定（connections/employee-config/import/thresholds）
│   ├── (auth)/login/        # 認証
│   └── api/
│       ├── oauth/           # OAuth フロー
│       └── cron/hr-sync/    # 人事システム同期（cronジョブ）
├── lib/
│   ├── actions/             # Server Actions
│   ├── hr-integration/      # 人事システム連携
│   └── supabase/            # DB クライアント
└── components/              # candidates/, cases/, dashboard/, layout/, settings/, ui/
```

### Database
- 13 マイグレーション: `supabase/migrations/`
- 主要テーブル: companies, users, employees, cases, interviews, leaves, contact_reminders, return_preparations, return_decisions, gradual_return_schedules
- HR 連携: api_connections, hr_sync_logs, employees_hr_source
- 設定: attendance_config（閾値設定）

### Commands (flow-app ディレクトリ内で実行)
```bash
cd apps/flow-app
npm run dev       # 開発サーバー
npm run build
npm run db:push
npm run db:link
```

## hantei-app: 健康診断判定ツール

静的単体 HTML アプリ。CSV 健診データから就業判定意見書を自動生成。
- ビルド: Tailwind CSS 3 でコンパイル → HTML にインライン化
- 出力: `dist/index.html`（自己完結型）

## Important Notes
- モノレポだが Turborepo/Nx 未使用。各 app は独立
- flow-app と hantei-app は別々の Supabase プロジェクト
- `docs/requirements/design-doc.md` が仕様の正式ドキュメント
