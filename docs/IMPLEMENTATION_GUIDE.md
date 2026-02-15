# 実装ガイド

このドキュメントでは、Markdown Viewer
Chrome拡張機能の実装手順を段階的に説明します。

**重要**: 実装前に必ず [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md)
と [DIRECTORY_STRUCTURE.md](./DIRECTORY_STRUCTURE.md) を読んでください。

---

## 前提条件

- Deno 2.x以上
- Chrome 120以上
- Git

---

## セットアップ

### 1. プロジェクト初期化

```bash
# deno.json作成
cat > deno.json <<EOF
{
  "tasks": {
    "dev": "deno run --allow-all scripts/watch.ts",
    "build": "deno run --allow-all scripts/build.ts",
    "test": "deno test --allow-all",
    "test:watch": "deno test --allow-all --watch",
    "test:e2e": "playwright test",
    "lint": "deno lint",
    "fmt": "deno fmt",
    "bundle": "deno task build && deno run --allow-all scripts/bundle.ts"
  },
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "deno.ns"],
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "strict": true
  },
  "imports": {
    "preact": "npm:preact@^10.19.0",
    "preact/": "npm:preact/",
    "@preact/signals": "npm:@preact/signals@^1.2.0",
    "marked": "npm:marked@^11.0.0",
    "dompurify": "npm:dompurify@^3.0.0",
    "highlight.js": "npm:highlight.js@^11.9.0",
    "esbuild": "npm:esbuild@^0.19.0",
    "@std/assert": "jsr:@std/assert@^1.0.0"
  },
  "exclude": ["dist/", "node_modules/"]
}
EOF
```

### 2. manifest.json作成

```bash
cat > manifest.json <<'EOF'
{
  "manifest_version": 3,
  "name": "Markdown Viewer",
  "version": "0.1.0",
  "description": "Secure local Markdown file viewer with Hot Reload",

  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },

  "background": {
    "service_worker": "dist/background.js",
    "type": "module"
  },

  "content_scripts": [{
    "matches": ["file:///*.md", "file:///*.markdown"],
    "js": ["dist/content.js"],
    "css": ["dist/content.css"],
    "run_at": "document_end"
  }],

  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png"
    }
  },

  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  },

  "permissions": [
    "storage",
    "activeTab"
  ],

  "host_permissions": [
    "file:///*"
  ],

  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; object-src 'self'"
  },

  "web_accessible_resources": [{
    "resources": ["themes/*"],
    "matches": ["file:///*"]
  }]
}
EOF
```

---

## Phase 1: 基盤構築（MVP）

### Step 1: 型定義（shared/types/）

**TDD原則**: 型定義から始める

```typescript
// src/shared/types/theme.ts
export type Theme =
  | "light"
  | "dark"
  | "github"
  | "minimal"
  | "solarized_light"
  | "solarized_dark";

// src/shared/types/state.ts
export interface AppState {
  theme: Theme;
  hotReload: {
    enabled: boolean;
    interval: number; // 0 = タブフォーカス時のみ
    autoReload: boolean;
  };
}

// src/shared/types/message.ts
export type Message =
  | { type: "RENDER_MARKDOWN"; payload: { markdown: string; themeId?: string } }
  | {
    type: "RENDER_MARKDOWN_WITH_HOT_RELOAD";
    payload: { markdown: string; fileUrl: string; themeId?: string };
  }
  | { type: "LOAD_THEME"; payload: { themeId: string } }
  | { type: "UPDATE_THEME"; payload: Theme };

export type MessageResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };
```

### Step 2: domain層実装（純粋関数）

**TDD サイクル**: RED → GREEN → REFACTOR

#### domain/markdown/sanitizer.ts

```typescript
// src/domain/markdown/sanitizer.ts
import xss from "xss";

/**
 * HTMLサニタイゼーション
 * XSS対策を行う純粋関数
 */
export const sanitizeHTML = (html: string): string => {
  return xss(html, {
    whiteList: {
      "p": ["class", "id"],
      "br": [],
      "strong": ["class", "id"],
      "em": ["class", "id"],
      "u": ["class", "id"],
      "s": ["class", "id"],
      "code": ["class", "id"],
      "pre": ["class", "id"],
      "a": ["href", "title", "class", "id"],
      "img": ["src", "alt", "title", "class", "id"],
      "h1": ["class", "id"],
      "h2": ["class", "id"],
      "h3": ["class", "id"],
      "h4": ["class", "id"],
      "h5": ["class", "id"],
      "h6": ["class", "id"],
      "ul": ["class", "id"],
      "ol": ["class", "id"],
      "li": ["class", "id"],
      "blockquote": ["class", "id"],
      "table": ["class", "id"],
      "thead": ["class", "id"],
      "tbody": ["class", "id"],
      "tr": ["class", "id"],
      "th": ["class", "id"],
      "td": ["class", "id"],
      "hr": ["class", "id"],
      "div": ["class", "id"],
      "span": ["class", "id"],
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ["script", "style"],
  });
};
```

```typescript
// src/domain/markdown/sanitizer.test.ts
import { assertEquals } from "@std/assert";
import { sanitizeHTML } from "./sanitizer.ts";

Deno.test("XSS: javascript: protocol", () => {
  const malicious = "<a href=\"javascript:alert('XSS')\">Click</a>";
  const result = sanitizeHTML(malicious);
  assertEquals(result.includes("javascript:"), false);
});

Deno.test("XSS: onerror attribute", () => {
  const malicious = '<img src="x" onerror="alert(\'XSS\')">';
  const result = sanitizeHTML(malicious);
  assertEquals(result.includes("onerror"), false);
});

Deno.test("XSS: onclick attribute", () => {
  const malicious = "<button onclick=\"alert('XSS')\">Click</button>";
  const result = sanitizeHTML(malicious);
  assertEquals(result.includes("onclick"), false);
});
```

**実行:**

```bash
# RED: テスト失敗確認
deno test src/domain/markdown/sanitizer.test.ts

# GREEN: 実装してテスト通過
# REFACTOR: コード改善
```

#### domain/markdown/parser.ts

```typescript
// src/domain/markdown/parser.ts
import { marked } from "marked";

/**
 * Markdown → HTML 変換
 * 純粋関数として実装
 */
export const parseMarkdown = (markdown: string): string => {
  marked.setOptions({
    gfm: true,
    breaks: true,
    sanitize: false, // xss (js-xss)で処理
  });

  return marked.parse(markdown) as string;
};
```

```typescript
// src/domain/markdown/parser.test.ts
import { assertEquals, assertStringIncludes } from "@std/assert";
import { parseMarkdown } from "./parser.ts";

Deno.test("基本的なMarkdown変換", () => {
  const markdown = "# Hello\n\nThis is **bold**.";
  const html = parseMarkdown(markdown);
  assertStringIncludes(html, "<h1");
  assertStringIncludes(html, "<strong>bold</strong>");
});

Deno.test("GFM: テーブル", () => {
  const markdown = "| A | B |\n|---|---|\n| 1 | 2 |";
  const html = parseMarkdown(markdown);
  assertStringIncludes(html, "<table");
});
```

#### domain/theme/applier.ts

```typescript
// src/domain/theme/applier.ts
import type { Theme } from "../../shared/types/theme.ts";

export interface ThemeData {
  id: string;
  css: string;
}

/**
 * HTMLにテーマを適用
 * 純粋関数として実装
 */
export const applyTheme = (html: string, theme: ThemeData): string => {
  return `
    <style>${theme.css}</style>
    <div class="markdown-body theme-${theme.id}">
      ${html}
    </div>
  `;
};
```

### Step 3: services層実装（ドメイン組み合わせ）

```typescript
// src/services/markdown-service.ts
import { parseMarkdown } from "../domain/markdown/parser.ts";
import { sanitizeHTML } from "../domain/markdown/sanitizer.ts";
import { applyTheme, type ThemeData } from "../domain/theme/applier.ts";

/**
 * Markdownレンダリングサービス
 * 複数のドメインロジックを組み合わせてビジネスフローを実現
 */
export class MarkdownService {
  /**
   * Markdownを完全にレンダリング
   */
  async render(markdown: string, theme: ThemeData): Promise<string> {
    // 1. Markdown解析（domain/markdown）
    const parsed = parseMarkdown(markdown);

    // 2. サニタイズ（domain/markdown）
    const sanitized = sanitizeHTML(parsed);

    // 3. テーマ適用（domain/theme）
    return applyTheme(sanitized, theme);
  }
}

export const markdownService = new MarkdownService();
```

```typescript
// src/services/markdown-service.test.ts
import { assertEquals } from "@std/assert";
import { MarkdownService } from "./markdown-service.ts";

Deno.test("MarkdownService: 基本的なレンダリング", async () => {
  const service = new MarkdownService();
  const markdown = "# Hello\n\nThis is **bold**.";
  const theme = { id: "light", css: ".markdown-body { color: #000; }" };

  const html = await service.render(markdown, theme);

  // テーマが適用されているか
  assertEquals(html.includes("theme-light"), true);
  // Markdown変換されているか
  assertEquals(html.includes("<h1"), true);
  assertEquals(html.includes("<strong>bold</strong>"), true);
});

Deno.test("MarkdownService: XSS防御", async () => {
  const service = new MarkdownService();
  const malicious = '[Click](javascript:alert("XSS"))';
  const theme = { id: "light", css: "" };

  const html = await service.render(malicious, theme);

  // javascript:がサニタイズされているか
  assertEquals(html.includes("javascript:"), false);
});
```

### Step 4: messaging層実装（ルーティングのみ）

```typescript
// src/messaging/types.ts
export * from "../shared/types/message.ts";
```

```typescript
// src/messaging/client.ts
import type { Message, MessageResponse } from "./types.ts";

/**
 * メッセージ送信ヘルパー
 */
export const sendMessage = async <T = unknown>(
  message: Message,
): Promise<T> => {
  const response: MessageResponse<T> = await chrome.runtime.sendMessage(
    message,
  );

  if (!response.success) {
    throw new Error(response.error);
  }

  return response.data;
};
```

```typescript
// src/messaging/handlers/background-handler.ts
import { markdownService } from "../../services/markdown-service.ts";
import type { Message, MessageResponse } from "../types.ts";

/**
 * background層のメッセージハンドラ
 * ルーティングのみ、serviceに委譲
 */
export const handleBackgroundMessage = async (
  message: Message,
): Promise<MessageResponse> => {
  try {
    switch (message.type) {
      case "RENDER_MARKDOWN": {
        // ✅ OK: serviceに委譲するだけ
        const theme = { id: "light", css: "" }; // TODO: theme-serviceから取得
        const html = await markdownService.render(
          message.payload.markdown,
          theme,
        );
        return { success: true, data: html };
      }

      default:
        return { success: false, error: "Unknown message type" };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
```

### Step 5: background層実装（messaging I/O のみ）

```typescript
// src/background/service-worker.ts
import { handleBackgroundMessage } from "../messaging/handlers/background-handler.ts";

/**
 * Service Worker
 * ❗ messaging I/O のみ
 * ❌ ビジネスロジック禁止
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log("Markdown Viewer installed");
});

// ✅ OK: handlerに委譲するだけ
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleBackgroundMessage(message)
    .then(sendResponse)
    .catch((error) => sendResponse({ success: false, error: error.message }));
  return true; // 非同期レスポンス
});
```

### Step 6: content層実装（UI + messaging I/O のみ）

```typescript
// src/content/index.ts
import { sendMessage } from "../messaging/client.ts";
import { render } from "preact";
import { MarkdownViewer } from "./components/MarkdownViewer.tsx";

/**
 * Content Script
 * ❗ messaging I/O のみ
 * ❌ ビジネスロジック禁止
 */

const isMarkdownFile = (): boolean => {
  return (
    document.contentType === "text/markdown" ||
    location.pathname.match(/\.(md|markdown)$/i) !== null
  );
};

const init = async () => {
  if (!isMarkdownFile()) return;

  const markdown = document.body.textContent || "";

  try {
    // ✅ OK: messaging経由でserviceを利用
    const html = await sendMessage<string>({
      type: "RENDER_MARKDOWN",
      payload: { markdown, themeId: "light" },
    });

    document.body.innerHTML = "";
    render(<MarkdownViewer html={html} />, document.body);
  } catch (error) {
    console.error("Failed to render markdown:", error);
    document.body.textContent = `Error: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
```

```typescript
// src/content/components/MarkdownViewer.tsx
import { h } from "preact";

interface Props {
  html: string;
}

/**
 * MarkdownViewerコンポーネント
 * ❗ 表示のみ
 * ❌ ビジネスロジック禁止
 */
export const MarkdownViewer = ({ html }: Props) => {
  return (
    <div class="markdown-viewer">
      <div
        class="markdown-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};
```

### Step 7: 基本テーマ（CSS）

```css
/* src/content/styles/themes/light.css */
.markdown-viewer {
  background: #ffffff;
  color: #24292e;
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
}

.markdown-body h1 {
  font-size: 2rem;
  border-bottom: 1px solid #eaecef;
  padding-bottom: 0.3em;
  margin-bottom: 1rem;
}

.markdown-body a {
  color: #0366d6;
  text-decoration: none;
}

.markdown-body a:hover {
  text-decoration: underline;
}

.markdown-body code {
  background: #f6f8fa;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: "Courier New", monospace;
}

.markdown-body pre {
  background: #f6f8fa;
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
}
```

### Step 8: ビルドスクリプト

```typescript
// scripts/build.ts
import * as esbuild from "esbuild";

const commonConfig: esbuild.BuildOptions = {
  bundle: true,
  format: "esm",
  target: "chrome120",
  minify: true,
  sourcemap: true,
  jsxFactory: "h",
  jsxFragment: "Fragment",
  jsxImportSource: "preact",
};

console.log("Building Markdown Viewer...");

// Background Script
await esbuild.build({
  ...commonConfig,
  entryPoints: ["src/background/service-worker.ts"],
  outfile: "dist/background.js",
});

// Content Script
await esbuild.build({
  ...commonConfig,
  entryPoints: ["src/content/index.ts"],
  outfile: "dist/content.js",
});

console.log("Build completed!");
```

### Step 9: 動作確認

```bash
# ビルド
deno task build

# Chrome拡張として読み込み
# 1. chrome://extensions/ を開く
# 2. 「デベロッパーモード」を有効化
# 3. 「パッケージ化されていない拡張機能を読み込む」
# 4. プロジェクトのルートディレクトリを選択

# テストMarkdownファイル作成
echo "# Test\n\nThis is **bold**." > test.md

# Chromeでファイルを開く
# file:///path/to/test.md
```

---

## Phase 2: 設定UI実装

### Step 10: settings層実装（messaging I/O のみ）

```typescript
// src/settings/popup/index.tsx
import { h, render } from "preact";
import { useState } from "preact/hooks";
import { sendMessage } from "../../messaging/client.ts";
import type { Theme } from "../../shared/types/theme.ts";

/**
 * Popup
 * ❗ messaging I/O のみ
 * ❌ ビジネスロジック禁止
 */

const Popup = () => {
  const [theme, setTheme] = useState<Theme>("light");

  const handleThemeChange = async (newTheme: Theme) => {
    try {
      await sendMessage({
        type: "UPDATE_THEME",
        payload: newTheme,
      });
      setTheme(newTheme);
    } catch (error) {
      console.error("Failed to update theme:", error);
    }
  };

  return (
    <div class="popup">
      <h2>Markdown Viewer</h2>
      <select
        value={theme}
        onChange={(e) => handleThemeChange(e.currentTarget.value as Theme)}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="github">GitHub</option>
      </select>
    </div>
  );
};

render(<Popup />, document.body);
```

---

## Phase 3: Hot Reload実装

### Step 11: domain/file-watcher/watcher.ts

```typescript
// src/domain/file-watcher/watcher.ts
import { simpleHash } from "./hash.ts";

/**
 * ファイル監視
 * ドメインロジックとして実装
 */
export class FileWatcher {
  private fileUrl: string;
  private lastHash: string = "";
  private intervalId: number | null = null;

  constructor(fileUrl: string) {
    this.fileUrl = fileUrl;
  }

  async start(): Promise<void> {
    this.lastHash = await this.fetchFileHash();

    // タブフォーカス時にチェック
    document.addEventListener("visibilitychange", async () => {
      if (!document.hidden) {
        await this.checkForUpdates();
      }
    });
  }

  private async fetchFileHash(): Promise<string> {
    try {
      const response = await fetch(this.fileUrl, { cache: "no-store" });
      const content = await response.text();
      return simpleHash(content);
    } catch (error) {
      console.error("File fetch error:", error);
      return "";
    }
  }

  private async checkForUpdates(): Promise<void> {
    const currentHash = await this.fetchFileHash();
    if (currentHash && currentHash !== this.lastHash) {
      this.lastHash = currentHash;
      this.notifyReload();
    }
  }

  private notifyReload(): void {
    // TODO: トースト通知実装
    if (confirm("ファイルが更新されました。リロードしますか？")) {
      location.reload();
    }
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
```

```typescript
// src/domain/file-watcher/hash.ts
/**
 * シンプルなハッシュ関数
 * 純粋関数として実装
 */
export const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};
```

---

## テスト戦略

### ユニットテスト実行

```bash
# 全テスト実行
deno task test

# 特定ファイルのみ
deno test src/domain/markdown/sanitizer.test.ts

# watch モード
deno task test:watch
```

### テストカバレッジ

```bash
# カバレッジレポート生成
deno test --coverage=coverage
deno coverage coverage --lcov > coverage.lcov
```

---

## デバッグ

### Chrome DevTools

```javascript
// Content Script のデバッグ
console.log("Content Script loaded");

// Background Script のデバッグ
// chrome://extensions/ → 「サービスワーカー」をクリック
```

### ソースマップ

ビルド時に `sourcemap: true`
を設定しているため、DevToolsで元のTypeScriptコードをデバッグ可能。

---

## トラブルシューティング

### 拡張機能が読み込まれない

1. `manifest.json` の構文エラーをチェック
2. `deno task build` でビルドエラーがないか確認
3. Chrome拡張のエラーログを確認

### Markdownが表示されない

1. `file:///*` の権限が許可されているか確認
2. Content Script が実行されているかDevToolsで確認
3. Console エラーをチェック

### テストが失敗する

1. 型定義が最新か確認
2. `deno.json` の imports が正しいか確認
3. テストファイルのパスが正しいか確認

---

## 参考資料

- [Chrome Extension 開発ガイド](https://developer.chrome.com/docs/extensions/)
- [Deno ドキュメント](https://deno.land/manual)
- [Preact ドキュメント](https://preactjs.com/)
- [marked ドキュメント](https://marked.js.org/)
- [js-xss ドキュメント](https://github.com/leizongmin/js-xss)
- [ARCHITECTURE.md](./ARCHITECTURE.md) - アーキテクチャ設計
- [DIRECTORY_STRUCTURE.md](./DIRECTORY_STRUCTURE.md) -
  ディレクトリ構造と責務定義
- [CODING_PRINCIPLES.md](./CODING_PRINCIPLES.md) - コーディング原則
