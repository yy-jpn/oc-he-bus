# 休復職フロー管理システム — 設計仕様書

> **ドキュメント種別**: プロダクト設計仕様（Claude Code 開発用）
> **作成日**: 2026-03-21
> **ステータス**: Initial Draft
> **対象読者**: Claude Code（実装AI）、開発者

---

## 1. プロダクト概要

### 1.1 ミッション

50人未満の小規模事業場において、メンタルヘルス不調による休復職プロセスを、人事労務担当者が一人でも適切に運用できるフロー管理システムを提供する。

### 1.2 解決する課題

- 50人未満の事業場には産業医の選任義務がなく、休復職の判断基準やプロセスが属人化・ブラックボックス化している
- 既存の休復職支援サービスは大企業向けEAPが中心で、小規模事業場が利用できる価格帯・複雑度のプロダクトが存在しない
- 厚労省ガイドライン（治療と仕事の両立支援ガイドライン 令和6年3月版）は包括的だが、小規模事業場の実態（産業医不在、専任人事不在）に即した運用ガイダンスがない

### 1.3 スコープ

| 項目 | 初期スコープ（MVP） | 将来拡張 |
|------|---------------------|----------|
| 対象疾病 | メンタルヘルス（うつ病等） | 身体疾患（がん・脳卒中・心疾患・糖尿病等） |
| 企業規模 | 50人未満の小規模事業場 | 300人以上の中〜大企業 |
| データ入力 | 人事労務アプリAPI連携（勤怠・ストレスチェック・健診）＋手動入力 | 連携先の拡充 |
| 労働者ポータル | 復職申出、生活リズム表の提出 | セルフチェック機能、診断書アップロード |
| 書類管理 | スコープ外 | 主治医意見書テンプレート・アップロード管理 |
| 就業規則連動 | スコープ外 | 休職期間上限設定・アラート |
| 休職中の連絡 | スケジュールリマインドのみ | 連絡記録管理 |

### 1.4 ユーザーペルソナ（優先順）

| 優先度 | ユーザー | 説明 | 主な利用シーン |
|--------|----------|------|----------------|
| 1 | 人事労務担当者 | 小規模事業場で総務・人事を兼務。産業保健の専門知識は限定的 | フロー全体の管理・推進 |
| 2 | 労働者本人 | 休職中または復職準備中の従業員 | 復職の申出、生活リズム表の提出、セルフチェック入力 |
| 3 | 産業医・産業保健スタッフ | 地域産業保健センター経由で関与する場合あり | （将来）意見入力・閲覧 |
| 4 | 上司・管理職 | 直属の上司。労務パフォーマンスの第一観察者 | 予兆報告の入力 |

---

## 2. コアポリシー（設計原則）

以下は本プロダクト全体を貫く設計原則であり、すべての機能設計・UI設計の判断基準となる。

### P1: 労務提供能力の十分な回復を復職の前提とする

- 原則として、労働者が通常勤務に耐えうる労務提供能力を十分に回復してから復職させる
- 復職 = 通常勤務での復帰。「段階的復職（試し出勤・短時間勤務）」は原則として行わない
- 労務提供能力が十分に回復するまでの期間は、リワークプログラム等の外部制度を活用する
- 例外: 後遺症等により労務提供能力が恒久的に損なわれる場合のみ、段階的復職ルートに分岐する

### P2: 主治医意見書ベースの判断フロー

- 50人未満の事業場では産業医がいないケースが大半であるため、主治医の意見書を判断の基本とする
- 必要に応じて地域産業保健センター（地さんぽ）と連携する
- システムは「産業医がいない前提」で設計し、産業医がいる場合はオプションとして意見聴取ステップを追加できる構造とする

### P3: 再休職時は初回と同一フロー

- P1の原則に基づき、労務提供能力が十分に回復してから復職するため、再休職リスクは構造的に低い
- 再休職が発生した場合は、初回休職と同一のフローを再度実行する（特別な再発防止フローは不要）
- 例外: 段階的復職を行ったケースでは、職場の調整が継続中であるため、再発防止計画の策定が必要

### P4: 人事労務担当者が一人で運用できるシンプルさ

- 専門知識がなくても「次に何をすべきか」が明確に分かるガイド付きフロー
- 各ステップで「なぜこれが必要か」「何を確認すべきか」を平易な日本語で提示

---

## 3. フロー定義

### 3.1 フロー全体像

```
Phase 0: 予兆検知・早期介入
  ↓ [休職が必要と判断]
Phase 1: 休職開始
  ↓
Phase 2: 療養期間（主治医意見書ベース）
  ↓ [本人の復職意思 + 主治医が復職可能と判断]
Phase 3: 復職準備（リワーク等の活用）
  ↓ [職業準備性ピラミッド L1〜L5を充足]
Phase 4: 復職判定
  ├─→ [L1〜L5すべて充足] → Phase 5A: 通常勤務で復職
  └─→ [後遺症等でL5が恒久的に不足] → Phase 5B: 段階的復職 → 再発防止計画策定
```

### 3.2 各フェーズ詳細

---

#### Phase 0: 予兆検知・早期介入

**目的**: メンタルヘルス不調の予兆を早期にキャッチし、休職に至る前に介入する

**厚労省ガイドラインとの関係**: ガイドラインには存在しないフェーズ。本プロダクト独自の追加。

**トリガー（検知経路）**:

| トリガー種別 | データソース | 検知者 | 説明 |
|-------------|-------------|--------|------|
| 勤怠異常 | 勤怠データ | 自動検知 | 欠勤・遅刻・早退の増加パターン |
| 長時間労働 | 勤怠データ | 自動検知 | 残業時間の異常値（月80時間超等） |
| ストレスチェック高リスク | ストレスチェック結果 | 自動検知 | 高ストレス者と判定された従業員 |
| 健康診断結果 | 健診データ | 自動検知 | 就業判定で要配慮と判定された従業員 |
| 上司からの報告 | 手動入力 | 上司 | 労務パフォーマンスの低下を観察した場合 |

**人事担当者のアクション**:

1. トリガーを受けてケースを作成
2. 本人との面談を実施（システムが面談ガイドを提示）
3. 面談結果に基づき、以下のいずれかに分岐:
   - **経過観察**: 定期的な状態確認のスケジュールを設定
   - **医療機関受診勧奨**: 本人に受診を促す
   - **休職手続きへ移行**: Phase 1へ

**データモデル（このフェーズで管理する情報）**:

```
Case {
  id: UUID
  employee_id: UUID
  trigger_type: enum[attendance, overtime, stress_check, health_check, manager_report]
  trigger_detail: text
  detected_at: datetime
  status: enum[open, monitoring, escalated_to_leave, resolved]
  interviews: Interview[]
  notes: text
}

Interview {
  id: UUID
  case_id: UUID
  conducted_at: datetime
  conducted_by: UUID  // 人事担当者
  outcome: enum[continue_monitoring, recommend_medical, proceed_to_leave]
  summary: text
}
```

---

#### Phase 1: 休職開始

**目的**: 適切な手続きを経て休職を開始する

**厚労省ガイドラインとの対応**: 「5 (5) ウ (ア) 休業開始前の対応」に対応

**前提条件**: 以下のいずれか
- Phase 0から escalate されたケース
- 労働者本人からの休職申出
- 主治医からの診断書提出（就労不能の判断）

**人事担当者のアクション**:

1. 休職開始の記録
   - 休職開始日
   - 休職事由（メンタルヘルス不調）
   - 主治医の診断書の受領記録（※書類自体の管理はスコープ外）
2. 労働者への情報提供（システムがチェックリストとして提示）
   - 休職中の連絡方法・頻度の取り決め
   - 傷病手当金等の社会保障制度の案内
   - 休職中の過ごし方に関するガイダンス
3. 休職中の連絡スケジュールの設定

**データモデル**:

```
Leave {
  id: UUID
  case_id: UUID  // Phase 0のケースと紐付け（直接申出の場合はnull可）
  employee_id: UUID
  start_date: date
  reason: enum[mental_health, physical_other]  // 将来拡張用
  diagnosis_received: boolean  // 診断書を受領したか（書類自体は管理しない）
  contact_schedule: ContactSchedule
  info_provided_checklist: {
    contact_method: boolean
    social_insurance: boolean
    rest_guidance: boolean
  }
  status: enum[active, in_return_preparation, returned, cancelled]
}

ContactSchedule {
  frequency: enum[weekly, biweekly, monthly]
  method: enum[phone, email, in_person]
  next_contact_date: date
}
```

---

#### Phase 2: 療養期間

**目的**: 労働者の療養を見守りつつ、定期的に状況を確認する

**厚労省ガイドラインとの対応**: 「5 (5) ウ (イ) 休業期間中のフォローアップ」に対応

**人事担当者のアクション**:

1. 定期連絡の実施（スケジュールに基づくリマインド）
   - MVP: リマインド通知のみ
   - 将来: 連絡記録の管理、セルフチェック機能
2. 主治医の意見書による状況更新
   - 「復職可能」の判断が出た場合 → Phase 3へ移行
   - 療養継続の場合 → 次回連絡スケジュールを更新

**状態遷移のルール**:
- Phase 2 → Phase 3 への移行条件: 主治医から「復職可能」の意見が出されたことを人事担当者がシステムに記録

---

#### Phase 3: 復職準備（リワーク等の活用）

**目的**: 復職判定に向けて、労務提供能力の回復を確認・支援する

**厚労省ガイドラインとの対応**: ガイドラインでは「試し出勤制度」として言及されるが、本プロダクトでは「リワーク等の外部制度を活用して労務提供能力を十分に回復させる期間」として再定義。

**コアポリシーとの関係**: P1「労務提供能力の十分な回復を復職の前提とする」を実現するための準備フェーズ。

**人事担当者のアクション**:

1. リワークプログラム等の外部制度の利用状況を記録
2. 復職判定に必要な情報の収集状況を管理（職業準備性ピラミッドに基づくチェックリスト）
   - [ ] L1: 本人から復職の意思表示がある
   - [ ] L2: 主治医の復職可能診断書を受領
   - [ ] L3: セルフケアの確立（生活リズム表の提出・整容・外出状況の確認）
   - [ ] L4: コミュニケーションの確認（面談・リワークでの観察）
   - [ ] L5: 業務遂行能力の確認（リワーク修了判定・通勤訓練等）
3. L1・L2が揃った時点で復職準備を本格開始し、L3〜L5を順次確認
4. すべての判定基準が揃った場合 → Phase 4へ移行

**データモデル**:

```
ReturnPreparation {
  id: UUID
  leave_id: UUID
  started_at: date
  rework_program: {
    enrolled: boolean
    facility_name: text?
    start_date: date?
    status: enum[in_progress, completed, not_applicable]
  }
  readiness_checklist: {
    l1_return_intention: boolean         // 本人の復職意思
    l2_doctor_clearance: boolean         // 主治医の復職可能診断書
    l3_self_care_confirmed: boolean      // セルフケアの確立
    l4_communication_confirmed: boolean  // コミュニケーションの確認
    l5_work_performance_confirmed: boolean // 業務遂行能力の確認
  }
  notes: text
}
```

---

#### Phase 4: 復職判定

**目的**: 職業準備性ピラミッドに基づき、労務提供能力が十分に回復したことを段階的に確認し、復職の可否を判断する

**厚労省ガイドラインとの対応**: 「5 (5) ウ (ウ) 職場復帰の可否の判断」に対応。ただし、産業医意見聴取を主治医意見書ベースに置き換え、JEED職業準備性ピラミッド（健康管理→日常生活管理→対人技能→基本的労働習慣→職業適性）を休復職文脈に再構成した5層の判定基準を適用。

**判定基準（職業準備性ピラミッド準拠・5層構造）**:

各層は下から順に積み上げる。下位層が満たされていない状態で上位層の評価に進むことはできない。

```
        ┌─────────────────────┐
        │  L5 業務遂行能力     │  ← リワーク・職業リハビリでの評価
        ├─────────────────────┤
        │  L4 コミュニケーション │  ← 対人場面での確認
        ├─────────────────────┤
        │  L3 セルフケアの確立   │  ← 生活リズム・整容・外出
        ├─────────────────────┤
        │  L2 主治医の診断書    │  ← 症状安定・エピソード想起耐性
        ├─────────────────────┤
        │  L1 復職の意思        │  ← 本人の復職希望
        └─────────────────────┘
```

| 層 | 判定項目 | 判定者 | 必須/任意 | ゲート条件 |
|----|---------|--------|----------|-----------|
| L1 | 復職の意思 | 労働者本人 | 必須 | 本人から復職希望の申出があること。これがなければ復職フローに乗せない |
| L2 | 主治医の復職可能診断書 | 主治医 | 必須 | 症状が安定し、エピソードを思い出しても病状が悪化しないことを主治医が担保。これがなければ復職フローに乗せない |
| L3 | セルフケアの確立 | 本人（生活リズム表提出）＋人事担当者 | 必須 | 一人で問題なく暮らせる状態であること |
| L4 | コミュニケーション | 人事担当者（面談観察）＋リワーク施設 | 必須 | 日常生活場面での対人コミュニケーションに問題がないこと |
| L5 | 業務遂行能力 | リワーク施設＋人事担当者 | 必須 | リワークや職業リハビリテーションでの勤怠・パフォーマンス評価 |

**L1: 復職の意思（詳細）**:

- 労働者本人からシステム上で復職希望の申出を行う（employeeロールでの入力）
- 人事担当者が面談で復職の意思を確認し記録する
- 復職の意思がない場合は、療養継続としてPhase 2に留まる

**L2: 主治医の復職可能診断書（詳細）**:

- 主治医が復職可能と判断した診断書の受領を記録する（書類自体の管理はスコープ外）
- 確認すべき要件:
  - 症状が安定していること
  - エピソード（発症の契機となった出来事）を思い出しても病状が悪化しないこと
  - 通常勤務に耐えうる状態であること
- 診断書がない場合は復職フローに乗せず、Phase 2（療養期間）に留まる

**L3: セルフケアの確立（詳細）**:

「問題なく一人で暮らすことができる」ことを判断基準とする。

チェック項目:
- 生活リズムの安定（起床・就寝時間が一定、日中の活動が可能）
- 通院・服薬の自己管理ができている
- 整容・身だしなみ（歯磨き、髭剃り/化粧、入浴、洗濯、アイロンがけ等）が整えられている
- 日中の外出が可能である
- 食事を適切に摂れている

確認方法:
- 労働者本人が生活リズム表をシステムから提出（employeeロールでの入力）
- 人事担当者が面談時に整容・外出状況等を観察・確認

**L4: コミュニケーション（詳細）**:

日常生活場面での他者とのコミュニケーションに問題がないことを確認する。

チェック項目:
- 家族・友人との日常的なコミュニケーションが問題なくできる
- 店員等の第三者との簡単なやりとりが問題なくできる
- リワーク施設の職員・他の利用者とのコミュニケーションが問題なくできる（リワーク利用時）
- 人事部職員との面談でのコミュニケーションが円滑である

確認方法:
- 人事担当者が面談時に観察・評価
- リワーク施設からのフィードバック（リワーク利用時）

**L5: 業務遂行能力（詳細）**:

実際の業務遂行に近い環境でのパフォーマンスを評価する。

チェック項目:
- リワークまたは職業リハビリテーションでの出席率・勤怠が安定している
- 所定の作業・課題を遂行できる
- 集中力が業務に耐えうる水準である
- 通勤訓練を問題なく実施できる

確認方法:
- リワーク施設の修了判定・評価レポート（推奨）
- 職業リハビリテーション施設の評価
- 通勤訓練の実施記録

**注意**: 試し出勤制度では休職中に実際の業務を行わせると賃金が発生するため、休職中には実際の業務を行わせることができず自習等になることが多い。そのため、業務遂行能力の評価にはリワーク（医療リハビリテーション）や職業リハビリテーションの活用を推奨する。

**判定結果の分岐**:

```
if (L1〜L5すべて充足) {
  → Phase 5A: 通常勤務で復職
} else if (後遺症等によりL5が恒久的に十分なレベルに達しない) {
  → Phase 5B: 段階的復職
} else {
  → Phase 3に戻る（復職準備の継続。不足している層を明示）
}
```

**データモデル**:

```
ReturnDecision {
  id: UUID
  leave_id: UUID
  decided_at: date
  decision: enum[approved_full, approved_gradual, deferred]

  // L1: 復職の意思
  l1_return_intention: boolean
  l1_intention_expressed_at: date?
  l1_intention_confirmed_by: UUID?  // 面談で確認した人事担当者

  // L2: 主治医の復職可能診断書
  l2_doctor_clearance: boolean
  l2_symptom_stable: boolean           // 症状が安定している
  l2_episode_recall_tolerance: boolean // エピソード想起耐性あり
  l2_clearance_received_at: date?

  // L3: セルフケアの確立
  l3_life_rhythm_stable: boolean       // 生活リズムが安定
  l3_medication_self_managed: boolean  // 通院・服薬の自己管理
  l3_grooming_adequate: boolean        // 整容・身だしなみ
  l3_daily_outing_possible: boolean    // 日中の外出が可能
  l3_eating_adequate: boolean          // 食事を適切に摂れている

  // L4: コミュニケーション
  l4_family_friends_ok: boolean        // 家族・友人とのコミュニケーション
  l4_strangers_ok: boolean             // 第三者とのやりとり
  l4_rework_staff_ok: boolean?         // リワーク職員とのコミュニケーション
  l4_hr_interview_ok: boolean          // 人事面談でのコミュニケーション

  // L5: 業務遂行能力
  l5_attendance_stable: boolean        // リワーク等での出席率安定
  l5_task_performance_ok: boolean      // 作業・課題の遂行
  l5_concentration_adequate: boolean   // 集中力
  l5_commute_training_ok: boolean      // 通勤訓練
  l5_rework_completion: boolean?       // リワーク修了判定

  // 地域産業保健センター（任意）
  regional_ohc_consulted: boolean
  regional_ohc_opinion: text?

  // メタ
  decided_by: UUID  // 人事担当者
  notes: text
}
```

---

#### Phase 5A: 通常勤務で復職（標準ルート）

**目的**: 労務提供能力が十分に回復した労働者を通常勤務に復帰させる

**厚労省ガイドラインとの対応**: 「5 (5) ウ (エ)(オ) 職場復帰支援プランの策定と実施」に対応。ただし、段階的復帰ではなく通常勤務での復帰を前提とする。

**人事担当者のアクション**:

1. 復職日の確定・記録
2. 復職先部署・業務内容の確認
3. 復職の実行

**データモデル**:

```
Return {
  id: UUID
  leave_id: UUID
  return_type: enum[full_duty, gradual]  // 5A = full_duty
  return_date: date
  department: text
  position: text
  notes: text
}
```

**再休職が発生した場合**: Phase 0（またはPhase 1）に戻り、初回と同一のフローを再度実行する。特別な再発防止フローは不要（P3に基づく）。

---

#### Phase 5B: 段階的復職（例外ルート）

**目的**: 後遺症等により労務提供能力が恒久的に損なわれている場合に、段階的に復帰させる

**発動条件**: Phase 4の復職判定において、後遺症等の理由で通常勤務での復職が困難と判断された場合のみ

**人事担当者のアクション**:

1. 段階的復職計画の策定
   - 復職日
   - 勤務時間・日数の段階的引き上げスケジュール
   - 業務内容の調整内容
   - 定期面談のスケジュール
2. 再発防止計画の策定（Phase 5Bの場合は必須）
   - 職場調整の継続事項
   - ストレス要因の特定と対策
   - 定期的なモニタリング項目
3. 計画に基づく実施とフォローアップ

**データモデル**:

```
GradualReturn {
  id: UUID
  leave_id: UUID
  return_date: date
  schedule: GradualScheduleStep[]
  relapse_prevention_plan: RelapsePrevention
  status: enum[in_progress, completed, re_leave]
}

GradualScheduleStep {
  id: UUID
  step_number: int
  start_date: date
  end_date: date
  work_hours_per_day: float
  work_days_per_week: int
  duty_adjustments: text
  review_date: date
}

RelapsePrevention {
  id: UUID
  workplace_adjustments: text[]        // 継続する職場調整
  identified_stressors: text[]         // 特定されたストレス要因
  countermeasures: text[]              // 対策
  monitoring_items: text[]             // モニタリング項目
  monitoring_schedule: MonitoringSchedule
}

MonitoringSchedule {
  frequency: enum[weekly, biweekly, monthly]
  duration_months: int                  // モニタリング期間（月数）
  next_review_date: date
}
```

**再休職が発生した場合**: Phase 0（またはPhase 1）に戻り、初回と同一のフローを再度実行する。ただし、段階的復職中の再休職であるため、前回の再発防止計画の振り返りを記録する。

---

## 4. 状態遷移図

```
[予兆検知]
    │
    ├─ 経過観察 ─→ (解決) ─→ [クローズ]
    │
    ├─ 受診勧奨 ─→ (改善) ─→ [クローズ]
    │
    └─ 休職へ ─┐
               │
[休職申出] ────┤
               │
[診断書提出] ──┘
               │
               ▼
         [休職開始手続き]
               │
               ▼
         [療養中] ◄──────────────────────┐
               │                          │
               │ (主治医「復職可能」)       │
               ▼                          │
         [復職準備中]                       │
               │                          │
               │ (L1〜L5充足)             │ (判定基準未充足)
               ▼                          │
         [復職判定] ──────────────────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
  [通常勤務復職]  [段階的復職]
       │               │
       │               ├─→ 再発防止計画策定
       │               │
       ▼               ▼
  [復職完了]      [段階的復帰中]
       │               │
       │ (再休職)       │ (再休職)
       └───────┬───────┘
               │
               ▼
         [休職開始手続き] に戻る（同一フロー再実行）
```

---

## 5. MVP機能一覧

### 5.1 機能マトリクス

| # | 機能 | Phase | ユーザー | MVP | 将来 |
|---|------|-------|----------|-----|------|
| F01 | 勤怠異常の自動検知（API連携/手動） | 0 | システム/人事 | ○ | - |
| F02 | ストレスチェック高リスク者の取込（API連携/手動） | 0 | システム/人事 | ○ | - |
| F03 | 上司からの報告入力フォーム | 0 | 上司 | ○ | - |
| F04 | ケース作成・管理 | 0 | 人事 | ○ | - |
| F05 | 面談ガイド表示 | 0 | 人事 | ○ | - |
| F06 | 休職開始記録 | 1 | 人事 | ○ | - |
| F07 | 労働者への情報提供チェックリスト | 1 | 人事 | ○ | - |
| F08 | 連絡スケジュール設定・リマインド | 1-2 | 人事 | ○ | - |
| F09 | 連絡記録管理 | 2 | 人事 | - | ○ |
| F10 | 労働者からの復職申出入力 | 3-4 | 本人 | ○ | - |
| F11 | 生活リズム表の提出（労働者向け） | 3-4 | 本人 | ○ | - |
| F12 | セルフチェック入力（労働者向け） | 2-3 | 本人 | - | ○ |
| F13 | 診断書・意見書アップロード | 2-4 | 人事 | - | ○ |
| F14 | リワーク利用状況の記録 | 3 | 人事 | ○ | - |
| F15 | 復職準備チェックリスト（ピラミッド準拠） | 3 | 人事 | ○ | - |
| F16 | 復職判定（5層ピラミッドチェックリスト） | 4 | 人事 | ○ | - |
| F17 | 地さんぽ相談記録 | 4 | 人事 | ○ | - |
| F18 | 通常勤務復職の記録 | 5A | 人事 | ○ | - |
| F19 | 段階的復職計画の策定・管理 | 5B | 人事 | ○ | - |
| F20 | 再発防止計画の策定・管理 | 5B | 人事 | ○ | - |
| F21 | ダッシュボード（全ケース一覧） | 全体 | 人事 | ○ | - |
| F22 | 「次にやるべきこと」ガイド表示 | 全体 | 人事 | ○ | - |
| F23 | 人事労務アプリAPI連携設定 | 設定 | 人事 | ○ | - |

### 5.2 データ入力のソース設計（MVP）

MVPから既存の人事労務アプリのAPIを利用した自動データ取込に対応する。API連携が設定されていない場合は手動入力にフォールバックする。

| データ | API連携（MVP） | 手動入力（フォールバック） | 連携先例 |
|--------|---------------|------------------------|---------|
| 勤怠データ | 勤怠管理システムAPIから欠勤・遅刻・早退・残業時間を自動取込 | 人事担当者がトリガーを手動登録 | freee勤怠、KING OF TIME、ジョブカン等 |
| ストレスチェック結果 | ストレスチェックシステムAPIから高ストレス者を自動取込 | 人事担当者が高リスク者を手動登録 | ストレスチェッカー、Co-Labo等 |
| 健康診断結果 | 健診管理システムAPIから就業判定結果を自動取込 | 人事担当者が要配慮者を手動登録 | Growbase、Carely等 |
| 上司報告 | — （手動入力のみ） | 上司が専用フォームから入力 | — |
| 労働者からの申出 | — （手動入力のみ） | 労働者本人がフォームから入力 | — |

**API連携の設計方針**:
- 各人事労務アプリとの連携はアダプターパターンで実装し、新規連携先の追加を容易にする
- API連携の設定は企業ごとの設定画面（S10）で行う
- 連携設定がない場合でも全機能が手動入力で利用可能であること（API連携は必須ではない）
- 自動取込されたデータは人事担当者が確認してからケース作成に進む（自動でケースは作成しない）

---

## 6. 画面構成（ワイヤーフレーム指針）

### 6.1 画面一覧

| 画面ID | 画面名 | 主な機能 |
|--------|--------|----------|
| S01 | ダッシュボード | 全ケース一覧、フェーズ別件数、アクション待ちリスト |
| S02 | ケース詳細 | 次のアクション表示（最上部）、タイムライン、現在のフェーズ |
| S03 | 予兆トリガー登録 | 勤怠異常・ストレスチェック・上司報告の新規登録 |
| S04 | 面談記録 | 面談結果の入力、面談ガイドの表示 |
| S05 | 休職開始 | 休職情報の入力、情報提供チェックリスト |
| S06 | 連絡スケジュール | 連絡予定の設定・リマインド確認 |
| S07 | 復職準備 | リワーク状況・復職準備チェックリスト（ピラミッド準拠）の管理 |
| S08 | 復職判定 | 5層ピラミッドチェックリスト、判定結果の記録 |
| S09 | 段階的復職計画 | スケジュール策定、再発防止計画（Phase 5Bのみ） |
| S10 | 設定 | 企業情報、API連携設定、連絡スケジュールのデフォルト値 |
| S11 | 労働者ポータル | 復職申出、生活リズム表提出（employeeロール用） |

### 6.2 ダッシュボード（S01）の構成

```
┌──────────────────────────────────────────────┐
│  ダッシュボード                                │
├──────────────────────────────────────────────┤
│                                              │
│  [要対応] ──────────────────────               │
│  ・山田太郎: 復職判定チェックリスト未完了       │
│  ・佐藤花子: 定期連絡日（本日）                │
│                                              │
│  [フェーズ別サマリー] ─────────                 │
│  予兆監視中: 2件                              │
│  休職中(療養): 1件                            │
│  復職準備中: 1件                              │
│  段階的復職中: 0件                             │
│                                              │
│  [ケース一覧] ─────────────────                │
│  名前 | ステータス | 経過日数 | 次アクション    │
│  ─────────────────────────────                │
│  山田太郎 | 復職判定 | 90日 | チェックリスト入力 │
│  佐藤花子 | 療養中 | 45日 | 定期連絡            │
│  鈴木一郎 | 予兆監視中 | 10日 | 面談実施         │
│  ...                                         │
└──────────────────────────────────────────────┘
```

**フェーズの表示名マッピング**:

| 内部値 | 表示名 |
|--------|--------|
| phase0_detection | 予兆検知 |
| phase0_monitoring | 予兆監視中 |
| phase1_leave_start | 休職開始手続き |
| phase2_rest | 療養中 |
| phase3_preparation | 復職準備中 |
| phase4_decision | 復職判定 |
| phase5a_full_return | 復職済（通常勤務） |
| phase5b_gradual_return | 段階的復職中 |
| resolved_without_leave | 解決（休職なし） |
| closed | 完了 |

### 6.3 ケース詳細（S02）の構成

```
┌──────────────────────────────────────────────┐
│  山田太郎 ── 復職判定                          │
├──────────────────────────────────────────────┤
│                                              │
│  [次にやるべきこと] ─────────                   │
│  ✅ L1 復職の意思: 本人から復職希望あり         │
│  ✅ L2 主治医の診断書: 復職可能意見書 受領済み  │
│  ⬜ L3 セルフケア: 生活リズム表 未提出          │
│  ⬜ L4 コミュニケーション: 未評価               │
│  ── L5 業務遂行能力: リワーク修了待ち          │
│                                              │
│  [アクション]                                  │
│  [生活リズム表を確認する] [判定を記録する]       │
│                                              │
│  [タイムライン] ──────────────                  │
│  ● 2026-01-10  予兆検知（勤怠異常）            │
│  ● 2026-01-15  面談実施 → 受診勧奨             │
│  ● 2026-01-25  診断書提出 → 休職開始           │
│  ● 2026-01-25  情報提供完了                    │
│  ● 2026-02-25  定期連絡実施                    │
│  ● 2026-03-10  主治医「復職可能」              │
│  ● 2026-03-10  リワーク利用開始                │
│  ○ 2026-04-10  復職判定（← 現在地）            │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 7. 技術要件

### 7.1 技術スタック（推奨）

| レイヤー | 技術 | 理由 |
|---------|------|------|
| フロントエンド | Next.js (App Router) + TypeScript | SSR/ISR対応、型安全 |
| UIライブラリ | shadcn/ui + Tailwind CSS | 高品質なUIコンポーネント、カスタマイズ性 |
| バックエンド | Next.js API Routes | フロントと同一リポジトリで管理 |
| データベース | PostgreSQL (Supabase) | RLS（行レベルセキュリティ）で企業間データ分離 |
| 認証 | Supabase Auth | メール/パスワード認証 |
| ホスティング | Vercel | Next.jsとの親和性 |

### 7.2 データベーススキーマ（概要）

```sql
-- 企業
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  employee_count INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ユーザー（人事担当者、上司、労働者）
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('hr_admin', 'manager', 'employee')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 従業員
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  user_id UUID REFERENCES users(id),  -- employeeロールのユーザーアカウントと紐付け
  name TEXT NOT NULL,
  department TEXT,
  position TEXT,
  manager_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ケース（Phase 0で作成、全フローを通じて管理）
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  employee_id UUID REFERENCES employees(id),
  current_phase TEXT NOT NULL CHECK (current_phase IN (
    'phase0_detection', 'phase0_monitoring',
    'phase1_leave_start',
    'phase2_rest',
    'phase3_preparation',
    'phase4_decision',
    'phase5a_full_return',
    'phase5b_gradual_return',
    'closed', 'resolved_without_leave'
  )),
  trigger_type TEXT CHECK (trigger_type IN (
    'attendance', 'overtime', 'stress_check', 'health_check', 'manager_report', 'self_report'
  )),
  trigger_detail TEXT,
  detected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 面談記録
CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id),
  conducted_at TIMESTAMPTZ NOT NULL,
  conducted_by UUID REFERENCES users(id),
  outcome TEXT CHECK (outcome IN ('continue_monitoring', 'recommend_medical', 'proceed_to_leave')),
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 休職情報
CREATE TABLE leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id),
  start_date DATE NOT NULL,
  end_date DATE,  -- 復職日が確定した時点で記録
  diagnosis_received BOOLEAN DEFAULT false,
  contact_frequency TEXT CHECK (contact_frequency IN ('weekly', 'biweekly', 'monthly')),
  contact_method TEXT CHECK (contact_method IN ('phone', 'email', 'in_person')),
  info_provided_contact_method BOOLEAN DEFAULT false,
  info_provided_social_insurance BOOLEAN DEFAULT false,
  info_provided_rest_guidance BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 連絡スケジュール・リマインド
CREATE TABLE contact_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_id UUID REFERENCES leaves(id),
  scheduled_date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  notes TEXT
);

-- 復職準備
CREATE TABLE return_preparations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_id UUID REFERENCES leaves(id),
  started_at DATE,
  rework_enrolled BOOLEAN DEFAULT false,
  rework_facility_name TEXT,
  rework_status TEXT CHECK (rework_status IN ('in_progress', 'completed', 'not_applicable')),
  -- 職業準備性ピラミッド準拠チェックリスト
  checklist_l1_return_intention BOOLEAN DEFAULT false,
  checklist_l2_doctor_clearance BOOLEAN DEFAULT false,
  checklist_l3_self_care BOOLEAN DEFAULT false,
  checklist_l4_communication BOOLEAN DEFAULT false,
  checklist_l5_work_performance BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 復職判定（職業準備性ピラミッド準拠）
CREATE TABLE return_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_id UUID REFERENCES leaves(id),
  decided_at DATE,
  decision TEXT CHECK (decision IN ('approved_full', 'approved_gradual', 'deferred')),
  -- L1: 復職の意思
  l1_return_intention BOOLEAN DEFAULT false,
  l1_intention_expressed_at DATE,
  l1_intention_confirmed_by UUID REFERENCES users(id),
  -- L2: 主治医の復職可能診断書
  l2_doctor_clearance BOOLEAN DEFAULT false,
  l2_symptom_stable BOOLEAN DEFAULT false,
  l2_episode_recall_tolerance BOOLEAN DEFAULT false,
  l2_clearance_received_at DATE,
  -- L3: セルフケアの確立
  l3_life_rhythm_stable BOOLEAN DEFAULT false,
  l3_medication_self_managed BOOLEAN DEFAULT false,
  l3_grooming_adequate BOOLEAN DEFAULT false,
  l3_daily_outing_possible BOOLEAN DEFAULT false,
  l3_eating_adequate BOOLEAN DEFAULT false,
  -- L4: コミュニケーション
  l4_family_friends_ok BOOLEAN DEFAULT false,
  l4_strangers_ok BOOLEAN DEFAULT false,
  l4_rework_staff_ok BOOLEAN,
  l4_hr_interview_ok BOOLEAN DEFAULT false,
  -- L5: 業務遂行能力
  l5_attendance_stable BOOLEAN DEFAULT false,
  l5_task_performance_ok BOOLEAN DEFAULT false,
  l5_concentration_adequate BOOLEAN DEFAULT false,
  l5_commute_training_ok BOOLEAN DEFAULT false,
  l5_rework_completion BOOLEAN,
  -- 地域産業保健センター
  regional_ohc_consulted BOOLEAN DEFAULT false,
  regional_ohc_opinion TEXT,
  -- メタ
  decided_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 復職記録
CREATE TABLE returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_id UUID REFERENCES leaves(id),
  return_type TEXT CHECK (return_type IN ('full_duty', 'gradual')),
  return_date DATE NOT NULL,
  department TEXT,
  position TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 段階的復職スケジュール（Phase 5Bのみ）
CREATE TABLE gradual_schedule_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID REFERENCES returns(id),
  step_number INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  work_hours_per_day NUMERIC(3,1),
  work_days_per_week INT,
  duty_adjustments TEXT,
  review_date DATE,
  status TEXT CHECK (status IN ('planned', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 再発防止計画（Phase 5Bのみ）
CREATE TABLE relapse_prevention_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID REFERENCES returns(id),
  workplace_adjustments TEXT[],
  identified_stressors TEXT[],
  countermeasures TEXT[],
  monitoring_items TEXT[],
  monitoring_frequency TEXT CHECK (monitoring_frequency IN ('weekly', 'biweekly', 'monthly')),
  monitoring_duration_months INT,
  next_review_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ケースイベントログ（タイムライン表示用）
CREATE TABLE case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id),
  event_type TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  description TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 復職意思の申出（労働者本人が入力）
CREATE TABLE return_intentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id),
  expressed_by UUID REFERENCES users(id),  -- employeeロールのユーザー
  expressed_at TIMESTAMPTZ NOT NULL,
  confirmed_by UUID REFERENCES users(id),  -- 人事担当者が面談で確認
  confirmed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 生活リズム表（労働者本人が提出）
CREATE TABLE life_rhythm_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id),
  submitted_by UUID REFERENCES users(id),  -- employeeロールのユーザー
  record_date DATE NOT NULL,               -- 記録対象日
  wake_time TIME,                          -- 起床時間
  sleep_time TIME,                         -- 就寝時間
  outing BOOLEAN DEFAULT false,            -- 日中の外出
  outing_detail TEXT,                      -- 外出先・内容
  meals_adequate BOOLEAN DEFAULT false,    -- 食事を適切に摂れたか
  medication_taken BOOLEAN DEFAULT false,  -- 服薬できたか
  grooming_done BOOLEAN DEFAULT false,     -- 整容・身だしなみを整えたか
  mood_score INT CHECK (mood_score BETWEEN 1 AND 5),  -- 気分（1:悪い〜5:良い）
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- API連携設定（企業ごと）
CREATE TABLE api_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  service_type TEXT NOT NULL CHECK (service_type IN (
    'attendance', 'stress_check', 'health_check'
  )),
  provider_name TEXT NOT NULL,            -- freee, KING_OF_TIME, jobcan 等
  api_endpoint TEXT,
  api_key_encrypted TEXT,                 -- 暗号化されたAPIキー
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 7.3 セキュリティ要件

| 要件 | 実装方針 |
|------|---------|
| 企業間データ分離 | Supabase RLS（Row Level Security）で company_id ベースのポリシー |
| 個人情報保護 | 健康情報は機微な個人情報。従業員名等の個人識別情報の暗号化を検討 |
| アクセス制御 | hr_admin: 全操作可、manager: 自部署の予兆報告入力のみ、employee: 自身のケースに対する申出・生活リズム表提出・セルフチェック入力のみ |
| 監査ログ | case_events テーブルで全操作を記録 |

**ロール別アクセス権限の詳細**:

| 操作 | hr_admin | manager | employee |
|------|----------|---------|----------|
| ダッシュボード閲覧 | ○（全ケース） | ×  | × |
| ケース詳細閲覧 | ○（全ケース） | ×  | ○（自身のケースのみ、限定情報） |
| ケース作成 | ○ | × | × |
| 予兆報告の入力 | ○ | ○（自部署のみ） | × |
| 休職・復職の申出 | × | × | ○（自身のみ） |
| 生活リズム表の提出 | × | × | ○（自身のみ） |
| セルフチェック入力 | × | × | ○（自身のみ） |
| 復職判定チェックリスト | ○ | × | × |
| 各種記録の入力・更新 | ○ | × | × |

---

## 8. ガイドライン対応表

本プロダクトのフローと厚労省ガイドラインの対応関係を示す。

| ガイドライン項番 | ガイドラインの内容 | 本プロダクトでの対応 |
|----------------|-------------------|---------------------|
| 5 (2) | 労働者からの情報提供 | Phase 0: 本人申出トリガー、Phase 3-4: 復職意思の申出・生活リズム表提出（employeeロール） |
| 5 (3) | 主治医からの情報収集 | Phase 2-4: 主治医意見書ベース（L2） |
| 5 (4) | 産業医等の意見聴取 | Phase 4: 地さんぽ相談（任意）に置換 |
| 5 (5) ア | 産業医等の意見を踏まえた検討 | Phase 4: 職業準備性ピラミッド準拠5層チェックリストで代替 |
| 5 (5) ウ (ア) | 休業開始前の対応 | Phase 1: 情報提供チェックリスト |
| 5 (5) ウ (イ) | 休業期間中のフォローアップ | Phase 2: 連絡スケジュール・リマインド |
| 5 (5) ウ (ウ) | 職場復帰の可否の判断 | Phase 4: 復職判定（L1〜L5） |
| 5 (5) ウ (エ) | 職場復帰支援プランの策定 | Phase 5B: 段階的復職計画（例外ルートのみ） |
| 5 (5) ウ (オ) | プランに基づく実施とフォローアップ | Phase 5B: スケジュール管理 |
| 6 (3) | 疾病が再発した場合の対応 | 再休職時: Phase 1に戻り同一フロー再実行 |
| ― | （ガイドライン外）予兆検知 | Phase 0: 本プロダクト独自追加 |
| ― | （ガイドライン外）リワーク活用 | Phase 3: 本プロダクト独自追加 |
| ― | （ガイドライン外）JEED職業準備性ピラミッド | Phase 4: 復職判定基準の枠組みとして採用 |
| ― | （ガイドライン外）人事労務アプリAPI連携 | Phase 0: 勤怠・ストレスチェック・健診データの自動取込 |

---

## 9. 開発ロードマップ

### Phase A: MVP（3ヶ月）

- ケース管理の基本CRUD
- Phase 0〜5Aのフロー管理
- ダッシュボード（日本語ステータス表示）
- 「次にやるべきこと」ガイド表示（ケース詳細最上部）
- 連絡スケジュールリマインド
- 復職判定チェックリスト（職業準備性ピラミッド5層）
- 人事労務アプリAPI連携（勤怠・ストレスチェック・健診）＋手動入力フォールバック
- 労働者ポータル（復職申出、生活リズム表提出）
- 3ロール対応（hr_admin, manager, employee）

### Phase B: 段階的復職対応（+1ヶ月）

- Phase 5Bの段階的復職計画
- 再発防止計画
- スケジュール管理

### Phase C: 連携強化（+2ヶ月）

- 連絡記録管理
- セルフチェック機能（労働者向け、Phase 2対応）
- 診断書・意見書のアップロード管理
- メール/Slack通知

### Phase D: 規模拡張（+3ヶ月）

- 300人以上の中〜大企業向け機能（組織階層管理、産業医ロール追加）
- 身体疾患への対応拡張
- 就業規則連動（休職期間上限設定・アラート）
- 分析・レポート機能

---

## 付録A: 用語集

| 用語 | 定義 |
|------|------|
| 地さんぽ | 地域産業保健センター。50人未満の小規模事業場の産業保健活動を支援する無料の公的機関 |
| リワーク | 精神科等の医療機関やリワーク施設で実施される、復職に向けたリハビリテーションプログラム |
| 労務提供能力 | 労働契約に基づく業務を遂行するために必要な心身の能力 |
| 職業準備性ピラミッド | JEED（高齢・障害・求職者雇用支援機構）が提唱する、安定した職業生活に必要な能力の5層モデル。下から「健康管理」「日常生活管理」「対人技能」「基本的労働習慣」「職業適性」。本プロダクトではこれを休復職文脈に再構成し、L1復職の意思→L2主治医診断書→L3セルフケア→L4コミュニケーション→L5業務遂行能力の5層判定基準として採用 |
| エピソード想起耐性 | 発症の契機となった出来事を思い出しても病状が悪化しない状態。主治医が復職可能と判断する際の確認要件の一つ |
| EAP | Employee Assistance Program。従業員支援プログラム |
| 両立支援プラン | 厚労省ガイドラインに定められた、治療と仕事の両立のための計画書 |
| 試し出勤 | 休職中の労働者が復職前に職場に出勤する制度。ただし休職中に実際の業務を行わせると賃金が発生するため、自習等にとどまることが多い。本プロダクトではリワーク・職業リハビリテーションの活用を推奨 |

---

## 付録B: 職業準備性ピラミッドの出典

- JEED（独立行政法人 高齢・障害・求職者雇用支援機構）「就労移行支援のためのチェックリスト」
  - https://www.jeed.go.jp/location/chiiki/yamanashi/q2k4vk00000360vz.html
- 厚生労働省「就労準備性ピラミッド」
  - https://www.mhlw.go.jp/shingi/2006/12/dl/s1226-7c05.pdf

**JEEDオリジナルの5層と本プロダクトの対応**:

| JEED職業準備性ピラミッド | 本プロダクトの復職判定基準 |
|------------------------|-------------------------|
| ①健康管理 | L2: 主治医の復職可能診断書（症状安定・エピソード想起耐性） |
| ②日常生活管理 | L3: セルフケアの確立（生活リズム・整容・外出・服薬管理） |
| ③対人技能 | L4: コミュニケーション（家族・第三者・リワーク・人事との対人場面） |
| ④基本的労働習慣 | L5: 業務遂行能力（リワーク出席率・通勤訓練） |
| ⑤職業適性 | L5: 業務遂行能力（作業遂行・集中力） |
| ―（JEEDにない層） | L1: 復職の意思（本プロダクト独自。復職フローの起点として追加） |
