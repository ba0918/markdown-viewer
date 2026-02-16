# Project Status

**Last Updated:** 2026-02-17 01:10:00

---

## 🎯 Current Session

| Field        | Value                                                                                                                               |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Cycle ID** | `20260217011000`                                                                                                                    |
| **Feature**  | Logger Utility & DEBUG自動注入                                                                                                      |
| **Started**  | 2026-02-17 01:10:00                                                                                                                 |
| **Phase**    | 🟡 Planning                                                                                                                         |
| **Plan**     | [docs/cycles/20260217011000_logger-utility-debug-auto-injection.md](./cycles/20260217011000_logger-utility-debug-auto-injection.md) |

**Current Focus:** `if (DEBUG) console.log(...)`
パターンの冗長性を解消。esbuildのdefineでDEBUG自動注入 +
shared/にloggerユーティリティを抽出し、開発体験を向上させる。

---

## 📜 Session History

### 20260216190941 - ToC アクティブハイライト安定化

- **Started:** 2026-02-16 19:09:41
- **Completed:** 2026-02-17
- **Status:** 🟢 Completed
- **Summary:**
  ToCのアクティブハイライト安定化。IntersectionObserverのrootMargin設定とフォールバックロジック追加で安定化。
- **Plan:**
  [docs/cycles/20260216190941_toc-active-highlight-stability.md](./cycles/20260216190941_toc-active-highlight-stability.md)

### 20260216170708 - Code Review - Comprehensive Improvements

- **Started:** 2026-02-16 17:07:08
- **Completed:** 2026-02-16 18:30:00
- **Status:** 🟢 Completed
- **Summary:** コードレビューで検出された全問題を体系的に修正。 Phase 1:
  メモリリーク修正4件（リスナー重複登録防止フラグ、タイマークリーンアップ）
  Phase 2: パフォーマンス/論理問題修正6件（Mermaid並列化、null
  guard、isMountedフラグ） Phase 3: デッドコード削除2件（空ファイル、未使用型）
  Phase 4: 重複コード共通化3件（unique-id.ts、encode.ts新設） 全243 Unit tests +
  80 E2E tests通過。
- **Plan:**
  [docs/cycles/20260216170708_code-review-comprehensive-improvements.md](./cycles/20260216170708_code-review-comprehensive-improvements.md)
- **Commits:**
  - `[5dda076]` refactor: コードレビュー結果に基づく品質改善
- **Key Changes:**
  - src/content/index.ts: リスナー重複登録防止フラグ追加
  - src/ui-components/shared/Toast/toast-manager.ts: タイマーMap管理
  - src/ui-components/shared/CopyButton.tsx: useRef + useEffectクリーンアップ
  - src/content/components/MarkdownViewer.tsx:
    rawモード早期リターン、isMounted、Promise.all並列化
  - src/settings/options/App.tsx: タイマーRef管理、null guard
  - src/settings/popup/App.tsx: null guard
  - src/shared/utils/unique-id.ts: 新規作成（ID重複ロジック共通化）
  - src/shared/utils/encode.ts: 新規作成（Base64エンコード共通化）
  - src/domain/file-watcher/ 削除（空ファイル）
  - src/domain/frontmatter/types.ts: 未使用型削除
- **Learning:**
  メモリリーク防止パターン（フラグ、Map、useRef+useEffect）を一貫適用。
  Promise.allによるMermaid並列レンダリングでパフォーマンス向上。

### 20260216025915 - Export HTMLスタンドアロン改善

- **Started:** 2026-02-16 02:59:15
- **Completed:** 2026-02-16
- **Status:** 🟢 Completed
- **Summary:** Export HTMLが「見た目通りに出力」されない問題を修正。DOM
  innerHTML方式で Mermaid SVG・MathJax SVGをExport
  HTMLに埋め込み。ローカル画像をBase64 Data URLに変換。
  コピーボタン等のUI要素をクリーンアップ。リモート画像はCORS/権限の問題でURLのまま保持。
  MathJax/MermaidのCSSは不要（インラインスタイル適用済み）。全243 Unit tests +
  88 E2E tests通過。
- **Plan:**
  [docs/cycles/20260216025915_export-html-standalone-improvements.md](./cycles/20260216025915_export-html-standalone-improvements.md)
- **Key Changes:**
  - MarkdownViewer.tsx: `getRenderedHTML()` コールバック追加
  - ExportMenuItem.tsx: `html` props → `getRenderedHTML`
    に変更、`convertLocalImagesToBase64()` 追加
  - html-exporter.test.ts: Mermaid SVG/MathJax SVG/Base64画像テスト4件追加
  - html-export.spec.ts: DOM検証E2Eテスト5件追加
- **Learning:** DOM innerHTML方式でMermaid/MathJax変換後のHTMLを一括取得。
  個別処理不要で非常にエレガント。

### 20260215222433 - Pre-Release Quality Improvements

- **Started:** 2026-02-15 22:24:33
- **Completed:** 2026-02-16 02:55:00
- **Status:** 🟢 Completed
- **Summary:**
  ストア公開前の品質改善。レビュー結果に基づく修正、競合分析、Store掲載
  ドキュメント全面更新（STORE_LISTING.md, PRIVACY.md/ja, README.md/ja）、
  相対パス画像表示対応（sanitizerのimg src許可 + Unit/E2Eテスト追加）、
  デモMarkdown作成。Export HTMLの中途半端さ（Mermaid/MathJax/画像未対応）を
  発見し、次サイクルで対応決定。
- **Plan:**
  [docs/cycles/20260215222433_pre-release-quality-improvements.md](./cycles/20260215222433_pre-release-quality-improvements.md)
- **Commits:**
  - `[abb9763]` docs: Export HTML・downloads権限・最新機能をドキュメントに反映
  - `[5be53fd]` feat: sanitizerで画像の相対パスsrcを許可
  - `[bce8d1e]` docs: READMEスクリーンショットを単一デモ画像に変更

### 20260215171626 - Toast Notification System

- **Started:** 2026-02-15 17:16:26
- **Completed:** 2026-02-15 18:30:00
- **Status:** 🟢 Completed
- **Summary:** 汎用トースト通知システムを実装してalert()を置き換え。Preact
  Signalsベースのリアクティブ状態管理、glassmorphismデザイン、4種類のトーストタイプ(error,
  success, info,
  warning)対応。自動消滅(デフォルト4秒)と手動クローズ機能、スタック表示。UI層にToast/ToastContainer、toast-manager.tsでSignals管理。ExportMenuItemでshowToast()使用。E2Eテストはセキュリティ上の理由からToastContainer存在確認のみ(window.showToast露出せず)。全228
  Unit tests通過、69 E2E tests通過。
- **Plan:**
  [docs/cycles/20260215171626_toast-notification-system.md](./cycles/20260215171626_toast-notification-system.md)
- **Commits:**
  - `[7b10a09]` feat: トースト通知システムを実装してalert()を置き換え
- **Key Changes:**
  - src/ui-components/shared/Toast/ 新規作成 (types.ts, toast-manager.ts,
    Toast.tsx, ToastContainer.tsx, Toast.test.tsx)
  - src/styles/components/toast/base.css 新規作成 (glassmorphismデザイン)
  - src/ui-components/markdown/DocumentHeaderMenu/ExportMenuItem.tsx
    showToast()に置き換え
  - tests/e2e/toast.spec.ts 新規作成 (ToastContainer存在確認のみ)
  - .claude/rules/testing.md 新規作成 (Deno.testパターン記録)
- **Learning:** Chrome拡張Content ScriptはIsolated Worldで動作し、Page
  Contextと分離されている。E2Eテストでwindow.showToast()を公開すると脆弱性になるため、ToastContainer存在確認のみ実施し、Toast動作は実際のユーザー操作(Export失敗など)を通じてテストする方針に決定。

### 20260215152537 - HTML Export Feature & Downloads Permission Removal

- **Started:** 2026-02-15 15:25:37
- **Completed:** 2026-02-15 17:30:00
- **Status:** 🟢 Completed
- **Summary:**
  レンダリング済みMarkdownをスタンドアロンHTMLファイルとしてエクスポートする機能を実装。Domain層でHTML生成ロジック（exportAsHTML,
  escapeHtml）、Services層でCSSフェッチとData
  URL変換、Messaging層でGENERATE_EXPORT_HTMLメッセージタイプ、UI層でDocumentHeaderMenu（汎用コンテナ）+
  ExportMenuItem（具体的項目）を実装。当初chrome.downloads
  APIを使用したが、権限削減のため`<a>`タグダウンロード方式に変更（Background
  Script: HTML生成、Content Script: Data
  URL化+ダウンロード）。frontend-designスキルによる"Crystalline Precision"
  glassmorphismデザイン適用。CSS build pipeline統合修正（scripts/build.ts
  hardcoded imports同期問題解決）。全219 Unit tests通過、5 E2E tests通過。
- **Plan:**
  [docs/cycles/20260215152537_html-export-feature.md](./cycles/20260215152537_html-export-feature.md)
- **Commits:**
  - `[9a52c4c]` feat: HTML export機能を拡張可能なメニューアーキテクチャで実装
  - `[680f9c0]` refactor: downloads権限を削除し`<a>`タグダウンロードに変更
- **Key Changes:**
  - domain/export/html-exporter.ts, html-exporter.test.ts, types.ts 新規作成
  - services/export-service.ts 新規作成（後にdownloads権限削除対応で修正）
  - ui-components/markdown/DocumentHeaderMenu/ 新規作成
  - src/styles/components/document-header-menu/base.css 新規作成
  - tests/e2e/html-export.spec.ts 新規作成
  - scripts/build.ts CSS import追加（document-header-menu統合）
  - manifest.json `downloads`権限削除

### 20260215131738 - Code Quality Comprehensive Refactoring

- **Started:** 2026-02-15 13:17:38
- **Completed:** 2026-02-15 16:30:00
- **Status:** 🟢 Completed
- **Summary:** ストア公開前のコード品質改善完了。Phase 1 & 2: (1)
  StateManager型バリデーション（interval≥1000ms必須）、(2) Hot Reload Race
  Condition修正、(3) console.log DEBUG化、(4)
  デッドコード削除（CodeBlock.tsx、未使用関数4個）、(5)
  未使用パッケージ削除（lightningcss、dompurify：868KB削減）、(6)
  @preact/signals保持決定（テーマ変更時のスムーズな再レンダリングに必須）。Phase
  3: (7) useResizable useRef最適化、(8) normalizer O(n)最適化、(9) YAML
  Frontmatterプロトタイプ汚染対策、(10) CLAUDE.md修正、(11)
  README.mdスクリーンショット追加、(12)
  テーマ切り替え最適化（リンクpreload方式）。全209テスト通過。
- **Plan:**
  [docs/cycles/20260215131738_code-quality-comprehensive-refactoring.md](./cycles/20260215131738_code-quality-comprehensive-refactoring.md)
- **Commits:**
  - `[0b72598]` refactor: code quality improvements (Phase 1 & 2)
  - `[4420aea]` docs: keep @preact/signals for smooth theme switching
  - `[75c2f49]` refactor: Phase 3 implementation (optimization & security)
  - `[6561f0d]` fix: improve theme switching performance
- **Progress:** Phase 1 & 2 & 3全完了 (合計2時間)

### 20260209045749 - UI Test, Mermaid Race Condition, Settings Validation Improvements

- **Started:** 2026-02-09 04:57:49
- **Completed:** 2026-02-09 06:30:00 (推定)
- **Status:** 🟢 Completed
- **Summary:** 前回のコードレビューで特定された改善タスク完了。(1)
  UIコンポーネント単体テスト16個追加（CopyButton 7個、TableOfContents
  9個、linkedom導入でDOM環境セットアップ）、(2) Mermaid race
  condition修正（Promise-based初期化で並行初期化防止）、(3)
  Settings画面バリデーション追加（Hot Reload
  interval検証、エラー表示UI実装）。全214テスト通過。
- **Plan:**
  [docs/cycles/20260209045749_ui-test-mermaid-settings-improvements.md](./cycles/20260209045749_ui-test-mermaid-settings-improvements.md)
- **Key Changes:**
  - linkedom (npm:linkedom@0.18.12) 導入
  - CopyButton.test.tsx, TableOfContents.test.tsx 新規作成
  - mermaid-renderer.ts: async/await初期化、initPromise共有
  - HotReloadSettings.tsx: バリデーションロジック、エラーUI

### 20260209045421 - Code Review & Critical Issues Fix

- **Started:** 2026-02-09 04:54:21
- **Completed:** 2026-02-09 04:57:49
- **Status:** 🟢 Completed
- **Summary:**
  E2E/UIコンポーネントの包括的レビュー（SubAgent並行実行）、Critical問題修正（セキュリティテスト13ケース追加、TableOfContentsグローバルSignal
  → ローカル修正）完了。次フェーズではUIコンポーネント単体テスト作成、Mermaid
  race condition修正、Settings画面バリデーション追加を実施予定。
- **Plan:**
  [docs/cycles/20260209045421_code-review-critical-fixes.md](./cycles/20260209045421_code-review-critical-fixes.md)

### 20260209024545 - CSS Build System Refactoring

- **Started:** 2026-02-09 02:45:45
- **Completed:** 2026-02-09 04:00:00（推定）
- **Status:** 🟢 Completed
- **Summary:**
  CSS構造を分割・整理し、ビルドシステムを堅牢に。手動の行数ハードコード +
  括弧カウントから、PostCSS + Lightning CSSによるツール駆動ビルドへ移行。ToC
  CSSファイルを分割（base.css +
  variables/各テーマ.css）し、@importで正しい順序を保証。ダークテーマのホバー色バグ修正も含む。
- **Plan:**
  [docs/cycles/20260209024545_css-build-system-refactoring.md](./cycles/20260209024545_css-build-system-refactoring.md)

### 20260208235036 - MarkdownViewer UI Refinement

- **Started:** 2026-02-08 23:50:36
- **Completed:** 2026-02-09 02:45:45
- **Status:** 🟡 Planning（実装未着手）
- **Summary:**
  frontend-designスキルを使用してMarkdownViewerの見た目を洗練させる計画。機能は完成しているため、調整レベルの改善。spacing/padding/margin、typography、色の調和、ホバー/フォーカススタイル等を微調整予定。
- **Plan:**
  [docs/cycles/20260208235036_markdown-viewer-ui-refinement.md](./cycles/20260208235036_markdown-viewer-ui-refinement.md)
- **Note:** 計画のみで実装未着手。CSS Build System
  Refactoringを優先したため保留。

---

## 🔗 Quick Links

- [Architecture](./ARCHITECTURE.md)
- [Coding Principles](./CODING_PRINCIPLES.md)
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md)
- [Security](./SECURITY.md)
- [All Cycles](./cycles/)
- [Project Root](../)

---

**Note:** このファイルは `timestamped-plan` skill によって自動管理されています。
