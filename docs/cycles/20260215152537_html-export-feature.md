# HTML Export Feature

**Cycle ID:** `20260215152537` **Started:** 2026-02-15 15:25:37 **Completed:**
2026-02-15 17:30:00 **Status:** 🟢 Completed

---

## 📝 What & Why

レンダリング済みのMarkdown
HTMLをスタンドアロンHTMLファイルとしてエクスポートする機能を追加する。ユーザーがMarkdownファイルをHTMLとして保存・共有できるようにし、オフライン閲覧やメール添付などのユースケースに対応する。

## 🎯 Goals

- レンダリング済みHTMLを完全なスタンドアロンHTMLファイルとして出力
- テーマCSSを埋め込み、ブラウザで直接開けるHTMLを生成
- エクスポートボタンをMarkdownViewer UIに追加
- レイヤー分離原則を厳守（domain → services → messaging → UI）
- セキュリティ重視（XSS対策、安全なファイル名生成）
- 全テスト通過（Unit + E2E）

## 📐 Design

### Architecture Overview

```
┌─────────────────────────────────────────────────┐
│ 1. domain/export/                               │
│    ├── html-exporter.ts      (HTML生成ロジック) │
│    ├── html-exporter.test.ts (Unitテスト)       │
│    └── types.ts              (Export型定義)     │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 2. services/export-service.ts                   │
│    - domainロジック組み合わせ                     │
│    - ファイルダウンロード処理                     │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 3. messaging/handlers/background-handler.ts     │
│    - EXPORT_HTML メッセージルーティング           │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 4. content/components/ExportButton.tsx          │
│    - エクスポートボタンUI                         │
│    - クリックイベント処理                         │
└─────────────────────────────────────────────────┘
```

### Files to Change/Add

```
src/
  domain/
    export/
      html-exporter.ts         # (新規) スタンドアロンHTML生成ロジック
      html-exporter.test.ts    # (新規) Unitテスト
      types.ts                 # (新規) Export型定義

  services/
    export-service.ts          # (新規) エクスポートサービス
    export-service.test.ts     # (新規) Serviceテスト

  shared/
    types/
      message.ts               # (変更) EXPORT_HTML メッセージ型追加

  messaging/
    handlers/
      background-handler.ts    # (変更) EXPORT_HTML ハンドラ追加

  content/
    components/
      ExportButton.tsx         # (新規) エクスポートボタンコンポーネント
      MarkdownViewer.tsx       # (変更) ExportButton統合

  styles/
    components/
      export-button/
        base.css               # (新規) エクスポートボタンスタイル

tests/
  e2e/
    html-export.spec.ts        # (新規) E2Eテスト
```

### Key Points

- **スタンドアロンHTML生成**:
  - テーマCSSを`<style>`タグで埋め込み
  - HTML, CSS, 全て1ファイルに集約
  - ブラウザで直接開ける完全なHTML

- **ファイル名生成**:
  - 元のMarkdownファイル名.html（例: `README.md` → `README.html`）
  - XSS対策: ファイル名のサニタイズ

- **UIデザイン**:
  - DocumentHeader右側に「📥 Export HTML」ボタン配置
  - 全6テーマで統一感のあるデザイン

- **セキュリティ**:
  - `escapeHtml()`でタイトルエスケープ
  - Blobダウンロード後のURLクリーンアップ
  - Content-Type: `text/html;charset=utf-8`

## ✅ Tests

### domain/export/html-exporter.test.ts

- [ ] `exportAsHTML`: 有効なHTMLを生成
- [ ] `exportAsHTML`: テーマCSSを埋め込み
- [ ] `exportAsHTML`: タイトルをエスケープ（XSS対策）
- [ ] `exportAsHTML`: metadataを含める
- [ ] `exportAsHTML`: スタンドアロンで動作するHTML生成

### services/export-service.test.ts

- [ ] `downloadAsHTML`: Blobを正しく生成
- [ ] `downloadAsHTML`: ファイル名を正しく変換（.md → .html）
- [ ] `downloadAsHTML`: ダウンロード後にURLをクリーンアップ

### E2E Tests (tests/e2e/html-export.spec.ts)

- [ ] エクスポートボタンが表示される
- [ ] エクスポートボタンクリックでHTMLダウンロード
- [ ] ダウンロードされたファイル名が正しい（basic-test.html）
- [ ] エクスポートされたHTMLがブラウザで開ける
- [ ] エクスポートされたHTMLにテーマCSSが含まれる

## 🔒 Security

- [ ] タイトル・メタデータのHTMLエスケープ（XSS対策）
- [ ] ファイル名のサニタイゼーション
- [ ] Blob URLのクリーンアップ（メモリリーク防止）
- [ ] Content-Typeヘッダー指定（`text/html;charset=utf-8`）

## 📊 Progress

| Step                        | Status |
| --------------------------- | ------ |
| domain/export実装           | 🟢     |
| services/export-service実装 | 🟢     |
| messaging層統合             | 🟢     |
| ExportButton UI実装         | 🟢     |
| スタイリング                | 🟢     |
| Tests (Unit)                | 🟢     |
| Tests (E2E)                 | 🟢     |
| Commit                      | 🟢     |

**Legend:** ⚪ Pending · 🟡 In Progress · 🟢 Done

## ✅ Completed Summary

**実装完了日**: 2026-02-15 17:30:00

**最終コミット**: `[9a52c4c]` feat: HTML
export機能を拡張可能なメニューアーキテクチャで実装

**実装内容**:

- ✅ Domain層: `exportAsHTML()`, `escapeHtml()` (スタンドアロンHTML生成)
- ✅ Services層: `export-service.ts` (CSSフェッチ、Data
  URL変換、chrome.downloads API)
- ✅ Messaging層: `EXPORT_HTML` メッセージタイプ
- ✅ UI層: `DocumentHeaderMenu` (汎用コンテナ) + `ExportMenuItem` (具体的項目)
- ✅ CSS: "Crystalline Precision" glassmorphismデザイン、テーマ統合
- ✅ Build: CSS pipeline統合 (`scripts/build.ts` 修正)
- ✅ Tests: Unit 219件通過、E2E 5件通過

**デザインコンセプト変更**:

- 当初: `ExportButton` → 最終: `DocumentHeaderMenu` (拡張可能な汎用メニュー)
- 理由: Export専用ではなく、将来的にPDF Export、Copy
  HTML等の追加機能に対応可能な設計

**技術的ハイライト**:

- Chrome拡張のManifest V3で `chrome.downloads.download()` API使用
- Data URL encoding with TextEncoder for UTF-8 support
- CSS @layer priority issue解決（separate `<style>` tags）
- frontend-design スキルによる洗練されたUI実装
- Build script hardcoded CSS imports 同期問題の修正

---

## 📋 Implementation Details

### 1. domain/export/html-exporter.ts

```typescript
/**
 * HTMLエクスポートロジック
 *
 * 責務: レンダリング済みHTMLをスタンドアロンHTMLに変換
 * ✅ OK: 純粋関数、テスト可能
 * ❌ NG: DOM操作、副作用
 */

import type { Theme } from "../../shared/types/theme.ts";

export interface ExportOptions {
  /** レンダリング済みHTML */
  html: string;
  /** テーマ設定 */
  theme: Theme;
  /** ドキュメントタイトル */
  title?: string;
  /** メタデータ */
  metadata?: {
    author?: string;
    description?: string;
  };
}

/**
 * スタンドアロンHTMLを生成
 *
 * テーマCSS、フォント、全てを1ファイルに埋め込み
 * ブラウザで直接開けるHTMLを生成
 */
export const exportAsHTML = (options: ExportOptions): string => {
  const { html, theme, title = "Markdown Document", metadata } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="generator" content="Markdown Viewer - Simple & Secure">
  ${
    metadata?.author
      ? `<meta name="author" content="${escapeHtml(metadata.author)}">`
      : ""
  }
  ${
    metadata?.description
      ? `<meta name="description" content="${
        escapeHtml(metadata.description)
      }">`
      : ""
  }
  <title>${escapeHtml(title)}</title>

  <!-- Theme Styles -->
  <style>
    ${theme.css}

    /* Export-specific styles */
    body {
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
    }

    /* Print styles */
    @media print {
      body {
        max-width: 100%;
        padding: 0;
      }
    }
  </style>
</head>
<body class="markdown-viewer-theme-${theme.id}">
  <div class="markdown-viewer">
    <div class="markdown-body">
      ${html}
    </div>
  </div>

  <!-- Metadata -->
  <footer style="margin-top: 4rem; padding-top: 2rem; border-top: 1px solid #e5e7eb; font-size: 0.875rem; color: #6b7280;">
    <p>Generated by <a href="https://github.com/ba0918/markdown-viewer" style="color: #2563eb;">Markdown Viewer</a></p>
  </footer>
</body>
</html>`;
};

/**
 * HTMLエスケープ（XSS対策）
 */
const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};
```

### 2. services/export-service.ts

```typescript
import { exportAsHTML } from "../domain/export/html-exporter.ts";
import type { Theme } from "../shared/types/theme.ts";

export class ExportService {
  /**
   * HTMLファイルとしてダウンロード
   */
  downloadAsHTML(params: {
    html: string;
    theme: Theme;
    filename: string;
    title?: string;
  }): void {
    const { html, theme, filename, title } = params;

    // スタンドアロンHTML生成
    const exportedHTML = exportAsHTML({
      html,
      theme,
      title,
    });

    // Blob作成
    const blob = new Blob([exportedHTML], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    // ダウンロード
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.replace(/\.md$/, ".html");
    a.click();

    // クリーンアップ
    URL.revokeObjectURL(url);
  }
}

export const exportService = new ExportService();
```

### 3. messaging/handlers/background-handler.ts（追加部分）

```typescript
import { exportService } from "../../services/export-service.ts";

export const handleBackgroundMessage = async (
  message: Message,
): Promise<MessageResponse> => {
  switch (message.type) {
    // ... 既存のケース

    case "EXPORT_HTML":
      exportService.downloadAsHTML(message.payload);
      return { success: true, data: null };

    default:
      return { success: false, error: "Unknown message type" };
  }
};
```

### 4. content/components/ExportButton.tsx

```typescript
import { h } from "preact";
import { useCallback } from "preact/hooks";
import type { Signal } from "@preact/signals";

interface Props {
  html: string;
  themeId: Signal<string>;
  fileUrl: string;
}

export const ExportButton = ({ html, themeId, fileUrl }: Props) => {
  const handleExport = useCallback(async () => {
    // ファイル名を取得
    const filename = fileUrl.split("/").pop() || "document.md";
    const title = filename.replace(/\.md$/, "");

    // テーマ情報を取得（messaging経由）
    const response = await chrome.runtime.sendMessage({
      type: "LOAD_THEME",
      payload: { themeId: themeId.value },
    });

    if (!response.success) {
      console.error("Failed to load theme");
      return;
    }

    // エクスポート実行（messaging経由）
    await chrome.runtime.sendMessage({
      type: "EXPORT_HTML",
      payload: {
        html,
        theme: response.data,
        filename,
        title,
      },
    });
  }, [html, themeId.value, fileUrl]);

  return (
    <button
      type="button"
      class="export-button"
      onClick={handleExport}
      title="Export as HTML"
      aria-label="Export as HTML"
    >
      📥 Export HTML
    </button>
  );
};
```

### 5. content/components/MarkdownViewer.tsx（変更部分）

```typescript
import { ExportButton } from "./ExportButton.tsx";

export const MarkdownViewer = ({ html, themeId, fileUrl }: Props) => {
  // ... 既存のロジック

  return (
    <>
      <DocumentHeader>
        {/* 既存のボタン（View/Raw切り替え等） */}
        <ExportButton html={html} themeId={themeId} fileUrl={fileUrl} />
      </DocumentHeader>

      {/* 既存のMarkdown表示部分 */}
    </>
  );
};
```

---

## 🎯 Implementation Strategy

### Phase 1: Domain層（純粋関数）

1. `domain/export/html-exporter.ts` - HTML生成ロジック
2. `domain/export/html-exporter.test.ts` - テスト
3. `domain/export/types.ts` - 型定義

### Phase 2: Service層

4. `services/export-service.ts` - エクスポートサービス
5. `services/export-service.test.ts` - テスト

### Phase 3: Messaging層

6. `src/shared/types/message.ts` - メッセージ型追加
7. `messaging/handlers/background-handler.ts` - ハンドラ追加

### Phase 4: UI層

8. `content/components/ExportButton.tsx` - ボタンコンポーネント
9. `content/components/MarkdownViewer.tsx` - 統合

### Phase 5: スタイリング

10. `src/styles/components/export-button/base.css` - スタイル

### Phase 6: E2Eテスト

11. `tests/e2e/html-export.spec.ts` - E2Eテスト

---

## 📝 Notes

- **ファイル名ルール**: 元のファイル名 + `.html`（例: `README.md` →
  `README.html`）
- **XSS対策**: タイトル・メタデータを必ずエスケープ
- **テーマCSS**: `theme.css`を`<style>`タグで埋め込み
- **スタンドアロン**: ブラウザで直接開ける完全なHTML
- **UIデザイン**: DocumentHeader右側に配置、全テーマ対応

---

**Next:** Write tests → Implement → Commit with `smart-commit` 🚀
