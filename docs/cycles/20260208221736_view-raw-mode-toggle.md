# View/Raw モード切り替え機能

**Cycle ID:** `20260208221736`
**Started:** 2026-02-08 22:17:36
**Status:** 🟡 Planning

---

## 📝 What & Why

Markdownビューア上で「View（プレビュー）」と「Raw（原文テキスト）」を切り替える機能を実装。レンダリング結果の確認やソースコピーを容易にする。

## 🎯 Goals

- [ ] 薄く固定された半透明ヘッダーを表示（右上に `[ View | Raw ]` タブ）
- [ ] `View` モード: 現在のMarkdownレンダリング結果を表示（デフォルト）
- [ ] `Raw` モード: 元のMarkdownテキスト（Frontmatter含む）を`<pre>`で表示
- [ ] モード切り替え時にスムーズなトランジション
- [ ] frontend-design スキルを活用した美しいデザイン
- [ ] すべてのテーマ（全6種）に対応

## 📐 Design

### Files to Change

```
src/
  shared/types/
    view-mode.ts - ViewMode型定義（'view' | 'raw'）を追加

  ui-components/markdown/
    DocumentHeader/
      DocumentHeader.tsx - ヘッダーコンポーネント（View/Raw切り替えタブ）
      DocumentHeader.test.ts - ヘッダーのテスト
      styles.css - ヘッダーのスタイル（固定・半透明）

    RawTextView/
      RawTextView.tsx - Rawモード表示コンポーネント
      RawTextView.test.ts - Rawビューのテスト
      styles.css - Rawビューのスタイル

  content/components/
    MarkdownViewer.tsx - View/Raw切り替えロジック統合
      - useStateでviewModeを管理（'view' | 'raw'）
      - DocumentHeaderを追加
      - viewMode === 'raw' の場合は RawTextView を表示
      - viewMode === 'view' の場合は既存のレンダリング結果を表示
```

### Key Points

- **ViewMode型**: `'view' | 'raw'` のユニオン型を定義（shared/types/）
- **DocumentHeader**: 固定ヘッダー（`position: fixed; top: 0; z-index: 1000`）、半透明背景、右端にタブUI
- **RawTextView**: `<pre><code>` でrawMarkdownを表示、スクロール可能、シンタックスハイライトなし（プレーンテキスト）
- **frontend-design適用**: タブのホバーエフェクト、アクティブ状態のスタイル、スムーズなトランジション
- **レイアウト**: ヘッダーの高さ分（例: 60px）だけ `.markdown-viewer` と `.toc-container` の `padding-top` を追加
- **アクセシビリティ**: キーボード操作可能（Tabキー、Enterキー）、ARIA属性適用

## ✅ Tests

### Unit Tests

- [ ] **ViewMode型のテスト** (`view-mode.test.ts`)
  - `'view'` と `'raw'` の型チェック

- [ ] **DocumentHeaderのテスト** (`DocumentHeader.test.ts`)
  - タブが2つレンダリングされること（View, Raw）
  - デフォルトで `View` がアクティブ
  - タブクリック時にonModeChange()が呼ばれること
  - アクティブなタブに `.active` クラスが付与されること

- [ ] **RawTextViewのテスト** (`RawTextView.test.ts`)
  - rawMarkdownが `<pre><code>` 内に表示されること
  - Frontmatterを含むテキストが正しく表示されること
  - HTMLエスケープが正しく行われること（XSS対策）

- [ ] **MarkdownViewerのテスト** (`MarkdownViewer.test.ts`)
  - DocumentHeaderが表示されること
  - viewMode='view'の場合、既存のレンダリング結果が表示されること
  - viewMode='raw'の場合、RawTextViewが表示されること
  - モード切り替え時にstateが正しく更新されること

### E2E Tests

- [ ] **View/Rawモード切り替え** (`view-raw-toggle.spec.ts`)
  - Markdownファイルを開く
  - デフォルトでViewモード（レンダリング結果）が表示されること
  - ヘッダーの `Raw` タブをクリック
  - Rawモードに切り替わり、元のMarkdownテキストが表示されること
  - `View` タブをクリック
  - Viewモードに戻り、レンダリング結果が表示されること

## 🔒 Security

- [ ] RawTextView内でのHTMLエスケープ（dangerouslySetInnerHTML使用禁止）
- [ ] XSS対策: `<pre><code>{rawMarkdown}</code></pre>` のみ使用（Preactが自動エスケープ）
- [ ] CSP違反がないことを確認

## 🎨 Design with frontend-design

### DocumentHeader Design
- **半透明背景**: `rgba(255, 255, 255, 0.9)` （lightテーマ）/ `rgba(30, 30, 30, 0.9)` （darkテーマ）
- **Blur Effect**: `backdrop-filter: blur(8px)` でモダンな半透明効果
- **タブデザイン**:
  - Inactive: 淡い灰色、`opacity: 0.7`
  - Hover: `opacity: 1`、下線アニメーション
  - Active: 太字、下線（`border-bottom: 2px solid`）、テーマカラー
- **アニメーション**: タブ切り替え時に `transition: all 0.2s ease`
- **シャドウ**: `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1)` で浮遊感

### RawTextView Design
- **フォント**: `font-family: 'Courier New', monospace`
- **背景**: テーマに応じた淡い背景色
- **パディング**: `padding: 1.5rem`
- **スクロール**: `overflow: auto`
- **行番号**: オプション（将来拡張）

### Layout Adjustment
- **固定ヘッダー**: `position: fixed; top: 0; left: 0; right: 0; height: 60px; z-index: 1000`
- **コンテンツのpadding-top**: `.markdown-viewer` と `.toc-container` に `padding-top: 60px` を追加
- **ToCとの共存**: ToCは `top: 60px` から開始（ヘッダーの下）

## 📊 Progress

| Step | Status |
|------|--------|
| 型定義 (ViewMode) | ⚪ |
| DocumentHeader実装 | ⚪ |
| RawTextView実装 | ⚪ |
| MarkdownViewer統合 | ⚪ |
| スタイリング（CSS） | ⚪ |
| Unit Tests | ⚪ |
| E2E Tests | ⚪ |
| Commit | ⚪ |

**Legend:** ⚪ Pending · 🟡 In Progress · 🟢 Done

---

## 📚 Technical Notes

### RenderResult型の活用

`RenderResult` インターフェースにすでに `rawMarkdown` プロパティが存在する:

```typescript
export interface RenderResult {
  html: string;           // Viewモードで使用
  rawMarkdown: string;    // Rawモードで使用 ← これを活用！
  content: string;
  frontmatter: Record<string, unknown>;
}
```

### 実装パターン（レイヤー分離遵守）

1. **型定義層** (`shared/types/view-mode.ts`)
   - ViewMode型のみ定義（ビジネスロジックなし）

2. **UI部品層** (`ui-components/markdown/`)
   - DocumentHeader: タブUIのみ、messaging禁止
   - RawTextView: テキスト表示のみ、messaging禁止

3. **UI層** (`content/components/MarkdownViewer.tsx`)
   - useState でviewMode管理
   - DocumentHeader と RawTextView を統合
   - messaging使用禁止（すでにRenderResultを受け取っているため）

### frontend-design スキル活用

- タブのインタラクション設計
- ホバー・アクティブ状態のアニメーション
- 半透明ヘッダーのモダンなスタイリング
- テーマごとの色調整（全6テーマ対応）

---

**Next:** Write tests → Implement → Commit with `smart-commit` 🚀
