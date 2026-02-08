# Cycle 20260208235036: MarkdownViewer UI Refinement

**Status:** 🟡 Planning **Started:** 2026-02-08 23:50:36 **Type:** Enhancement

## Overview

frontend-design スキルを使用してMarkdownViewerの見た目を洗練させる。
現在の機能は完成しているため、UIの美しさと使いやすさを向上させることが目的。

### Goals

- frontend-design スキルで全体的なUI改善案を取得
- 提案された改善をCSSおよびコンポーネントに適用
- レスポンシブデザインとアクセシビリティを維持
- 全6テーマでの統一感を保つ

## Current State Analysis

### 実装済みの主要コンポーネント

1. **MarkdownViewer** (`src/content/components/MarkdownViewer.tsx`)
   - Markdown描画のメインコンポーネント
   - View/Raw切り替え
   - ToC統合
   - MathJax/Mermaid対応

2. **TableOfContents** (`src/ui-components/markdown/TableOfContents/`)
   - 折りたたみ可能な目次
   - スクロール連動
   - リサイズ機能

3. **DocumentHeader** (`src/ui-components/markdown/DocumentHeader/`)
   - View/Rawモード切り替えボタン
   - テーマ切り替えボタン

4. **CopyButton** (`src/ui-components/shared/CopyButton.tsx`)
   - コードブロック用コピーボタン
   - Rawモード用コピーボタン

5. **RawTextView** (`src/ui-components/markdown/RawTextView/`)
   - 生Markdown表示

### 改善が必要な可能性がある箇所

- 全体的なspacing/padding/marginの調整
- Typography（フォント、サイズ、行間）
- 色の調和とコントラスト
- ボタンやUI要素のホバー/フォーカススタイル
- アニメーション/トランジションの追加
- レスポンシブデザインの最適化

## Architecture Design

### レイヤー分析

```
UI Components (改善対象)
├── MarkdownViewer.tsx (Layout)
├── TableOfContents/ (Navigation)
├── DocumentHeader/ (Controls)
├── CopyButton (Interaction)
└── RawTextView/ (Display)

Themes (改善対象)
├── light.css
├── dark.css
├── github.css
├── minimal.css
├── solarized-light.css
└── solarized-dark.css
```

### 変更が必要なファイル

1. **CSS/スタイル**
   - `src/content/styles/themes/*.css` - テーマCSS
   - `src/ui-components/markdown/TableOfContents/toc.css` - ToC
   - `src/ui-components/markdown/DocumentHeader/styles.css` - ヘッダー
   - `src/ui-components/markdown/RawTextView/styles.css` - Raw表示
   - `src/ui-components/shared/CopyButton.css` - コピーボタン
   - `src/ui-components/markdown/CodeBlock.css` - コードブロック

2. **コンポーネント（必要に応じて）**
   - `src/content/components/MarkdownViewer.tsx`
   - `src/ui-components/markdown/TableOfContents/TableOfContents.tsx`
   - `src/ui-components/markdown/DocumentHeader/DocumentHeader.tsx`

## Implementation Steps

### Step 1: frontend-design スキルで改善案を取得

**作業内容:**

1. frontend-design スキルを起動
2. 現在のMarkdownViewerの状態を説明
3. 改善案（CSS変更、コンポーネント調整）を受け取る

**確認ポイント:**

- 提案が6テーマ全てに適用可能か
- レスポンシブデザインを損なわないか
- アクセシビリティが維持されるか

### Step 2: CSS改善の適用

**作業内容:**

1. テーマCSSファイルの更新
   - spacing/padding/margin
   - typography
   - 色の調整
2. コンポーネント固有CSSの更新
   - ToC
   - DocumentHeader
   - CopyButton
   - CodeBlock

**影響ファイル:**

- `src/content/styles/themes/*.css`
- `src/ui-components/**/styles.css` or `*.css`

### Step 3: コンポーネントの調整（必要な場合）

**作業内容:**

1. JSX構造の微調整（必要な場合）
2. クラス名の追加/変更
3. アニメーション/トランジションの追加

**影響ファイル:**

- `src/content/components/MarkdownViewer.tsx`
- `src/ui-components/markdown/**/*.tsx`

### Step 4: ビルド & 動作確認

**作業内容:**

1. `deno task build` 実行
2. Chrome拡張として読み込み
3. 全テーマで見た目確認
4. View/Rawモード切り替え確認
5. ToC動作確認
6. コピーボタン動作確認

**確認ポイント:**

- ビルドエラーなし
- 全テーマで統一感がある
- レスポンシブデザインが正常
- 既存機能が全て動作する

### Step 5: コミット

**作業内容:**

- `smart-commit` スキルでコミット
- コミットメッセージは改善内容を明確に記載

## Test List

### UI/視覚テスト

- [ ] light テーマでの表示確認
- [ ] dark テーマでの表示確認
- [ ] github テーマでの表示確認
- [ ] minimal テーマでの表示確認
- [ ] solarized-light テーマでの表示確認
- [ ] solarized-dark テーマでの表示確認
- [ ] ToC の視覚的改善確認
- [ ] DocumentHeader の視覚的改善確認
- [ ] CopyButton のホバー/フォーカス確認
- [ ] CodeBlock の視覚的改善確認

### 機能テスト（既存機能の回帰テスト）

- [ ] View/Raw切り替えが正常動作
- [ ] ToCの折りたたみが正常動作
- [ ] ToCのスクロール連動が正常動作
- [ ] コピーボタンが正常動作
- [ ] テーマ切り替えが正常動作
- [ ] MathJax数式レンダリングが正常
- [ ] Mermaid図レンダリングが正常
- [ ] Hot Reload設定が正常動作

### レスポンシブ/アクセシビリティ

- [ ] ウィンドウリサイズ時のレイアウト崩れなし
- [ ] ToC リサイズ時のレイアウト正常
- [ ] キーボードナビゲーション確認
- [ ] スクリーンリーダー対応維持
- [ ] focus-visible スタイル確認

## Security Checklist

- [ ] XSS対策維持（DOMPurify使用継続）
- [ ] CSP遵守
- [ ] 外部リソースの読み込みなし
- [ ] ユーザー入力の適切なサニタイズ

## Progress Tracking

| Step                         | Status     | Started | Completed | Notes |
| ---------------------------- | ---------- | ------- | --------- | ----- |
| 1. frontend-design改善案取得 | ⏳ Pending | -       | -         | -     |
| 2. CSS改善適用               | ⏳ Pending | -       | -         | -     |
| 3. コンポーネント調整        | ⏳ Pending | -       | -         | -     |
| 4. ビルド & 動作確認         | ⏳ Pending | -       | -         | -     |
| 5. コミット                  | ⏳ Pending | -       | -         | -     |

**Status Legend:**

- ⏳ Pending: Not started
- 🔄 In Progress: Currently working
- ✅ Done: Completed
- ⚠️ Blocked: Waiting for dependency

## Notes

- frontend-design スキルに任せるため、具体的な改善内容は実行時に決定
- 既存機能を壊さないことを最優先
- 全6テーマでの統一感を保つ
- ビルドスクリプトは既にCSS統合を行っているため、変更不要

## References

- CLAUDE.md: プロジェクト原則
- ARCHITECTURE.md: アーキテクチャ設計
- frontend-design skill: UI改善提案
