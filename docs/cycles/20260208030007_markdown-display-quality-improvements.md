# Cycle: 20260208030007 - Markdown Display Quality Improvements

**Type:** Enhancement **Started:** 2026-02-08 03:00:07 **Status:** 🟡 Planning

## Overview

Markdown表示機能の品質改善を行う。現在、基本的なレンダリングは動作しているが、以下の3つの問題が存在する：

### 現在の問題

1. **シンタックスハイライトが効いていない**
   - コードブロックがプレーンテキストとして表示される
   - highlight.js が依存関係には含まれているが使われていない

2. **外部CSSファイルが読み込まれていない**
   - `loader.ts` のハードコードされた簡易CSSのみが使用されている
   - Phase 3-1で実装した外部CSSファイル（6テーマ）が活用されていない
   - デザイン品質が低い

3. **テーマ変更時の再レンダリングに問題がある**
   - テーマ切り替え時に表示が消える
   - リロードすると正しく反映される（永続化自体は成功している）

### 目標

- ✅ コードブロックに適切なシンタックスハイライトを適用
- ✅ Phase 3-1で作成した外部CSSファイル（6テーマ）を正しく読み込む
- ✅ テーマ変更時にスムーズに再レンダリング（表示が消えない）

## Architecture Analysis

### レイヤー構造と責務

```
domain/markdown/
  ├── parser.ts         # Markdown → HTML変換（marked使用）
  ├── sanitizer.ts      # XSS対策（xss使用）
  └── highlighter.ts    # 🆕 シンタックスハイライト（highlight.js使用）

domain/theme/
  ├── loader.ts         # テーマデータ読み込み（要修正: 外部CSS対応）
  ├── applier.ts        # HTMLにテーマ適用（要確認: CSS読み込み方法）
  └── types.ts          # ThemeData型定義

services/
  └── markdown-service.ts  # ビジネスフロー統合（highlighter追加）

content/
  └── index.ts          # Content Script（再レンダリング修正）
```

### 依存関係フロー

```
content/index.ts
  → messaging → background-handler
    → services/markdown-service
      → domain/markdown/parser (marked)
      → domain/markdown/highlighter (highlight.js) 🆕
      → domain/markdown/sanitizer (xss)
      → domain/theme/loader (外部CSS読み込み) 🔧
      → domain/theme/applier (テーマ適用)
```

## Implementation Steps

### Step 1: シンタックスハイライト実装（domain層）

**目的:** コードブロックにhighlight.jsを適用

**影響ファイル:**

- 🆕 `src/domain/markdown/highlighter.ts` - highlight.js wrapper（純粋関数）
- 🔧 `src/domain/markdown/parser.ts` - marked の renderer カスタマイズ
- 🔧 `src/services/markdown-service.ts` - highlighter を統合

**実装内容:**

1. **highlighter.ts 作成**
   ```typescript
   // Service Worker 対応のため動的import使用
   export const highlightCode = async (code: string, lang: string): Promise<string>
   ```

2. **parser.ts 修正**
   ```typescript
   // marked の renderer をカスタマイズ
   // コードブロックでhighlightCode()を呼び出す
   marked.setOptions({
     renderer: customRenderer,
     highlight: (code, lang) => highlightCode(code, lang),
   });
   ```

3. **markdown-service.ts 修正**
   ```typescript
   async render(markdown: string, theme: ThemeData): Promise<string> {
     const parsed = await parseMarkdown(markdown); // async化
     const sanitized = await sanitizeHTML(parsed);
     return applyTheme(sanitized, theme);
   }
   ```

**テスト:**

- `highlighter.test.ts` - JavaScript/Python/TypeScript コードのハイライト
- `parser.test.ts` - コードブロックがhighlight.jsを通るか確認
- `markdown-service.test.ts` - 統合テスト（既存修正）

---

### Step 2: 外部CSSファイル読み込み実装（domain/theme層）

**目的:** Phase 3-1で作成した6テーマのCSSファイルを読み込む

**影響ファイル:**

- 🔧 `src/domain/theme/loader.ts` - 外部CSS読み込みロジック追加
- 🔧 `src/domain/theme/types.ts` - ThemeData に cssUrl 追加？
- 🔧 `src/content/index.ts` - CSS link タグ管理

**実装内容:**

1. **loader.ts 修正**
   ```typescript
   export const loadTheme = (themeId?: Theme): ThemeData => {
     return {
       id: themeId || "light",
       cssUrl: chrome.runtime.getURL(
         `content/styles/themes/${themeId || "light"}.css`,
       ),
     };
   };
   ```

2. **applier.ts 修正（またはcontent層で対応）**
   - `<link rel="stylesheet" href="${theme.cssUrl}">` を挿入
   - または `fetch()` でCSSを取得してインライン化

3. **manifest.json 確認**
   - `web_accessible_resources` にCSSファイルが含まれているか確認

**テスト:**

- `loader.test.ts` - 各テーマのcssUrlが正しく生成されるか
- E2E - 実際にCSSが読み込まれてスタイルが適用されるか

---

### Step 3: テーマ変更時の再レンダリング修正（content層）

**目的:** テーマ切り替え時に表示が消えないようにする

**影響ファイル:**

- 🔧 `src/content/index.ts` - chrome.storage.onChanged ハンドラ修正

**現在の問題:**

```typescript
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.appState) {
    const newState = changes.appState.newValue as AppState;
    renderMarkdown(currentMarkdown, newState.theme); // ← 表示が消える
  }
});
```

**修正案:**

1. **CSSのみ差し替え方式**
   - `<link>` タグのhrefを変更（DOMの再レンダリング不要）
   - Markdown HTMLはそのまま維持

2. **非同期レンダリング改善**
   - `renderMarkdown()` 中に一時的なローディング表示
   - 新しいHTMLが準備できてから一気に差し替え

**実装内容:**

```typescript
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.appState) {
    const newState = changes.appState.newValue as AppState;

    // CSSファイルのみ差し替え（高速）
    const linkElement = document.querySelector("link[data-markdown-theme]");
    if (linkElement) {
      linkElement.setAttribute("href", getCssUrl(newState.theme));
    }
  }
});
```

**テスト:**

- E2E - テーマ切り替え時に表示が維持されるか

---

### Step 4: highlight.js用CSSテーマ追加（任意）

**目的:** シンタックスハイライトのカラーテーマを各テーマに合わせる

**影響ファイル:**

- 🔧 各テーマCSSファイル（`src/content/styles/themes/*.css`）

**実装内容:**

- highlight.jsのテーマCSSを各テーマファイルに追加
  - light: `github.css`
  - dark: `github-dark.css`
  - solarized-light: `solarized-light.css`
  - solarized-dark: `solarized-dark.css`

## Test List

### Unit Tests (domain層)

#### highlighter.ts

- [ ] `highlightCode()` - JavaScript コードをハイライト
- [ ] `highlightCode()` - Python コードをハイライト
- [ ] `highlightCode()` - TypeScript コードをハイライト
- [ ] `highlightCode()` - 未対応言語は元のコードを返す
- [ ] `highlightCode()` - 空文字列を処理
- [ ] Service Worker環境で動的importが動作する

#### parser.ts (既存修正)

- [ ] `parseMarkdown()` - コードブロックがハイライトされる
- [ ] `parseMarkdown()` - 複数のコードブロックを処理
- [ ] 既存テストがすべてパス

#### loader.ts (既存修正)

- [ ] `loadTheme()` - 各テーマのcssUrlが正しい
- [ ] `loadTheme()` - デフォルトテーマ（light）のcssUrl
- [ ] 既存テストがすべてパス

### Integration Tests (services層)

#### markdown-service.ts (既存修正)

- [ ] `render()` - シンタックスハイライト付きでレンダリング
- [ ] `render()` - 外部CSSテーマが適用される
- [ ] XSS防御が維持されている
- [ ] 既存テストがすべてパス

### E2E Tests

- [ ] Markdownファイルを開く → コードブロックがハイライトされる
- [ ] テーマ切り替え → 表示が消えずにスタイルが変わる
- [ ] 各テーマ（6種類）でスタイルが正しく適用される
- [ ] リロード → 設定が維持される

## Security Checklist

- [ ] highlight.js の動的importがService Workerで安全に動作
- [ ] XSS対策（sanitizeHTML）がhighlighter実行後も維持される
- [ ] 外部CSSファイルの読み込みがCSP違反しない
- [ ] `chrome.runtime.getURL()` で安全なURL取得
- [ ] `web_accessible_resources` が適切に設定されている

## Progress Tracking

| Step | Description                | Status     | Files Modified                                 |
| ---- | -------------------------- | ---------- | ---------------------------------------------- |
| 1    | シンタックスハイライト実装 | ⏸️ Pending | highlighter.ts, parser.ts, markdown-service.ts |
| 2    | 外部CSS読み込み実装        | ⏸️ Pending | loader.ts, types.ts, applier.ts, index.ts      |
| 3    | テーマ切り替え修正         | ⏸️ Pending | content/index.ts                               |
| 4    | highlight.js CSSテーマ追加 | ⏸️ Pending | themes/*.css                                   |

## Notes

### 技術的な注意点

1. **Service Worker制約**
   - highlight.js も動的importで遅延読み込み（xss と同じパターン）
   - Top-level await禁止

2. **Chrome拡張のCSS読み込み**
   - `chrome.runtime.getURL()` で拡張機能内のファイルパスを取得
   - `manifest.json` の `web_accessible_resources` に登録必須

3. **marked の highlight オプション**
   - marked v11 以降、`highlight` オプションで非同期対応可能
   - Context7で最新のmarked APIを確認すること

4. **レイヤー分離厳守**
   - highlighter は domain/markdown 層（純粋関数）
   - CSS読み込みロジックは domain/theme 層
   - Chrome API（`chrome.runtime.getURL`）は content 層で使用可能

### 過去の教訓

- ❌ messaging層にビジネスロジックを書かない
- ✅ Context7で最新ライブラリAPIを確認してから実装
- ✅ Service Worker制約（DOM API不要、top-level await禁止）を常に意識

## References

- [marked Documentation](https://marked.js.org/)
- [highlight.js Documentation](https://highlightjs.org/)
- [Chrome Extension: Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
- [Chrome Extension: Web Accessible Resources](https://developer.chrome.com/docs/extensions/mv3/manifest/web_accessible_resources/)

---

**Last Updated:** 2026-02-08 03:00:07
