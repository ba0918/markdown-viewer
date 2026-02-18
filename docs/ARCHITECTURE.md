# アーキテクチャ設計

このドキュメントでは、Markdown Viewer
Chrome拡張機能のアーキテクチャについて説明します。

## 設計思想

### 核心原則

1. **責務の厳格な分離**
   - 各層が単一の責務のみを持つ
   - メッセージパッシング経由でも破綻しない設計

2. **messagingとビジネスロジックの完全分離**
   - messaging層にビジネスロジックを持たせない

3. **テスト容易性**
   - services/domain は純粋関数として実装
   - UI層から完全に分離されたビジネスロジック

4. **セキュリティファースト**
   - XSS対策を最優先
   - xss (js-xss)による厳格なサニタイゼーション

---

## 全体構成

Chrome拡張機能は**メッセージパッシングベースの分散アーキテクチャ**です。

```
┌──────────────────────────────────────────────────────────┐
│                  Chrome Extension                         │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────┐                                      │
│  │ Service Worker  │  バックグラウンド処理                │
│  │  (background/)  │  - messaging I/O のみ                │
│  └────────┬────────┘  - 状態管理                          │
│           │                                                │
│           │ chrome.runtime.sendMessage                     │
│           ↓                                                │
│  ┌─────────────────┐                                      │
│  │ Content Script  │  ページ内での処理                    │
│  │   (content/)    │  - Markdown描画                      │
│  └────────┬────────┘  - DOM操作                           │
│           │           - messaging I/O のみ                 │
│           │                                                │
│           │ Preact Components                              │
│           ↓                                                │
│  ┌─────────────────┐                                      │
│  │   Markdown UI   │  最終的な表示                        │
│  └─────────────────┘                                      │
│                                                            │
│  ┌─────────────────┐  ┌─────────────────┐                │
│  │     Popup       │  │    Options      │  設定UI         │
│  │ (settings/)     │  │  (settings/)    │                │
│  └─────────────────┘  └─────────────────┘                │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

---

## レイヤー構成

### 依存関係図

```
┌──────────────────────────────────────────────────────┐
│              UI Layer (実行コンテキスト)                │
│  background/ content/ settings/                      │
│  ❗ messaging とのやり取り"のみ"                       │
│  ❗ ビジネスロジック禁止                               │
└────────────────────┬─────────────────────────────────┘
                     │
                     ↓
         ┌───────────────────────┐
         │   ui-components/      │ ← UI部品（全UI層で共有）
         └───────────────────────┘
                     │
                     ↓
         ┌───────────────────────┐
         │    messaging/         │ ← ルーティングのみ
         │  ❗ ビジネスロジック禁止│
         └───────────┬───────────┘
                     │
                     ↓
         ┌───────────────────────┐
         │     services/         │ ← ドメイン組み合わせ
         │  ✅ ビジネスフロー実装  │
         └───────────┬───────────┘
                     │
                     ↓
         ┌───────────────────────┐
         │      domain/          │ ← 純粋なビジネスロジック
         │  ✅ 単一責任           │
         └───────────┬───────────┘
                     │
                     ↓
         ┌───────────────────────┐
         │      shared/          │ ← 汎用ユーティリティ
         └───────────────────────┘
```

---

## 実行コンテキスト

### 1. Service Worker (background/)

**役割:**

- **messaging I/O のみ**
- アプリケーション状態管理（chrome.storage）
- 拡張機能のライフサイクル管理

**制約:**

- DOM APIアクセス不可
- 非アクティブ時に停止される可能性
- Manifest V3必須

**❌ 絶対禁止:**

- ビジネスロジックの実装
- ドメインロジックの実装
- services/domain の直接呼び出し

**実装例:**

```typescript
// src/background/service-worker.ts
import { handleBackgroundMessage } from "../messaging/handlers/background-handler.ts";

// ✅ OK: handlerに委譲するだけ
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleBackgroundMessage(message)
    .then(sendResponse)
    .catch((error) => sendResponse({ success: false, error: error.message }));
  return true; // 非同期レスポンス
});

// ❌ NG: ビジネスロジックを直接書く
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "RENDER_MARKDOWN") {
    const parsed = marked.parse(message.payload); // ← ダメ！
    const sanitized = xss(parsed); // ← ダメ！
    sendResponse({ html: sanitized });
  }
});
```

### 2. Content Script (content/)

**役割:**

- **messaging I/O のみ**
- Markdownファイル検出
- Preactでの描画
- DOM操作

**制約:**

- ページのJavaScriptとは分離された環境
- chrome APIの一部のみ利用可能
- ページの`window`オブジェクトには直接アクセス不可

**❌ 絶対禁止:**

- ビジネスロジックの実装
- ドメインロジックの実装
- services/domain の直接呼び出し（必ず messaging 経由）
- `chrome.storage` への直接アクセス

**実装例:**

```typescript
// src/content/index.ts
import { sendMessage } from "../messaging/client.ts";
import { render } from "preact";
import { MarkdownViewer } from "./components/MarkdownViewer.tsx";

// ✅ OK: messaging経由でserviceを利用
const init = async () => {
  if (!isMarkdownFile()) return;

  const markdown = document.body.textContent || "";

  // background → service に委譲
  const result = await sendMessage({
    type: "RENDER_MARKDOWN_WITH_HOT_RELOAD",
    payload: { markdown, fileUrl: location.href, themeId: "github" },
  });

  document.body.innerHTML = "";
  render(
    <MarkdownViewer html={result.html} watcherId={result.watcherId} />,
    document.body,
  );
};

// ❌ NG: domainを直接呼び出す
import { parseMarkdown } from "../domain/markdown/parser.ts"; // ← ダメ！
const html = parseMarkdown(markdown); // ← ダメ！
```

### 3. Settings (settings/)

**役割:**

- **messaging I/O のみ**
- popup（クイック設定）とoptions（詳細設定）の管理

#### popup/ と options/ の違い

|              | popup/                     | options/                            |
| ------------ | -------------------------- | ----------------------------------- |
| **表示**     | ツールバーアイコンクリック | 右クリック→「拡張機能のオプション」 |
| **サイズ**   | 小（数百px）               | 大（フルページ）                    |
| **用途**     | クイック操作               | 詳細設定                            |
| **manifest** | `action.default_popup`     | `options_ui.page`                   |

**❌ 絶対禁止:**

- ビジネスロジックの実装
- services/domain の直接呼び出し
- `chrome.storage` への直接アクセス

**実装例:**

```typescript
// src/settings/popup/components/QuickSettings.tsx
import { sendMessage } from "../../../messaging/client.ts";
import { ThemeSelector } from "../../../ui-components/settings/ThemeSelector.tsx";

// ✅ OK: messaging経由で設定変更
export const QuickSettings = () => {
  const [theme, setTheme] = useState<Theme>("light");

  const handleThemeChange = async (newTheme: Theme) => {
    await sendMessage({ type: "UPDATE_THEME", payload: newTheme });
    setTheme(newTheme);
  };

  return <ThemeSelector theme={theme} onChange={handleThemeChange} />;
};
```

---

## UI部品層 (ui-components/)

**役割:**

- 再利用可能なUIコンポーネント
- **全UI層（content/settings）で共有**

**構成:**

```
ui-components/
├── markdown/                 # Markdown表示用
│   ├── DocumentHeader/       # ドキュメントヘッダーメニュー
│   │   └── DocumentHeader.tsx
│   ├── RawTextView/          # 生テキスト表示切替
│   │   └── RawTextView.tsx
│   └── TableOfContents/      # 目次（ToC）
│       ├── TableOfContents.tsx
│       ├── TableOfContents.test.tsx
│       ├── useActiveHeading.ts
│       └── useResizable.ts
└── shared/                   # 汎用UI
    ├── CopyButton.tsx        # コードブロックコピーボタン
    ├── CopyButton.test.tsx
    └── Toast/                # トースト通知
        ├── Toast.tsx
        ├── ToastContainer.tsx
        ├── toast-manager.ts
        ├── types.ts
        ├── Toast.test.tsx
        └── index.ts
```

**❌ 絶対禁止:**

- ビジネスロジックの実装
- services/domain の直接呼び出し
- `chrome.runtime.sendMessage()` （親コンポーネントに委譲）

**実装例:**

```typescript
// src/ui-components/settings/ThemeSelector.tsx
import type { Theme } from "../../shared/types/theme.ts";

// ✅ OK: 純粋なUIコンポーネント
export const ThemeSelector = ({ theme, onChange }: Props) => {
  return (
    <select
      value={theme}
      onChange={(e) => onChange(e.currentTarget.value)}
    >
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="github">GitHub</option>
    </select>
  );
};
```

---

## サービス層 (services/)

**役割:**

- **ドメイン組み合わせ**
- **ビジネスフローの実装**
- 複数domainの協調

**実装例:**

```typescript
// src/services/markdown-service.ts
import { parseMarkdown } from "../domain/markdown/parser.ts";
import { sanitizeHTML } from "../domain/markdown/sanitizer.ts";
import { applyTheme } from "../domain/theme/applier.ts";
import { addHeadingIds } from "../domain/toc/html-processor.ts";
import { parseFrontmatter } from "../domain/frontmatter/parser.ts";
import { tocService } from "./toc-service.ts";

/**
 * Markdownレンダリングサービス（データフローオーケストレーター）
 * 責務: 複数のドメインロジックを組み合わせて1つのビジネスフローを実現
 */
export class MarkdownService {
  /**
   * Markdownを完全にレンダリング
   * ✅ OK: 複数domainを組み合わせたビジネスフロー
   */
  render(markdown: string, theme: ThemeData): RenderResult {
    // 0. YAML Frontmatter解析
    const { data: frontmatter, content } = parseFrontmatter(markdown);
    // 1. Markdown → HTML変換
    const parsed = parseMarkdown(content);
    // 2. XSS対策サニタイズ
    const sanitized = sanitizeHTML(parsed);
    // 3. 見出しID付与（ToC用）
    const withHeadingIds = addHeadingIds(sanitized);
    // 4. テーマ適用
    const html = applyTheme(withHeadingIds, theme);
    // 5. TOC生成
    const tocItems = tocService.generateToc(content);

    return { html, rawMarkdown: markdown, content, frontmatter, tocItems };
  }
}

export const markdownService = new MarkdownService();
```

---

## ドメイン層 (domain/)

**役割:**

- **純粋なビジネスロジック（単一責任）**
- **純粋関数**
- UIから完全に分離

**構成:**

```
domain/
├── markdown/
│   ├── parser.ts              # Markdown→HTML変換
│   ├── sanitizer.ts           # XSS対策（xss (js-xss) wrapper）
│   ├── highlighter.ts         # シンタックスハイライト
│   ├── mermaid-detector.ts    # Mermaidコードブロック検出
│   └── mermaid-renderer.ts    # Mermaidダイアグラムレンダリング
├── theme/
│   ├── loader.ts              # テーマ読み込み
│   ├── applier.ts             # テーマ適用
│   └── types.ts               # テーマ型定義
├── toc/
│   ├── extractor.ts           # 見出し抽出
│   ├── tree-builder.ts        # ToC木構造構築
│   ├── html-processor.ts      # HTML見出しID付与
│   ├── normalizer.ts          # 見出しレベル正規化
│   ├── collapse-manager.ts    # 折りたたみ状態管理
│   └── types.ts               # ToC型定義
├── math/
│   ├── detector.ts            # 数式検出
│   └── renderer.ts            # MathJaxレンダリング
└── frontmatter/
    ├── parser.ts              # YAML Frontmatter解析
    └── types.ts               # Frontmatter型定義
```

**実装例:**

```typescript
// src/domain/markdown/parser.ts
import { marked } from "marked";

/**
 * Markdown → HTML 変換
 * ✅ OK: 純粋関数、単一責任
 */
export const parseMarkdown = (markdown: string): string => {
  marked.setOptions({
    gfm: true,
    breaks: true,
  });

  return marked.parse(markdown) as string;
};

// src/domain/markdown/sanitizer.ts
import xss from "xss";

/**
 * HTMLサニタイゼーション
 * ✅ OK: 純粋関数、XSS対策に特化
 */
export const sanitizeHTML = (html: string): string => {
  return xss(html, {
    whiteList: {
      "p": [],
      "b": [],
      "i": [],
      "code": [],
      "pre": [],
      "a": ["href"],
      "img": ["src", "alt"],
      "h1": [],
      "h2": [],
      "h3": [],
    },
  });
};

// src/domain/theme/applier.ts
import type { Theme } from "../../shared/types/theme.ts";

/**
 * HTMLにテーマを適用
 * ✅ OK: 純粋関数、単一責任
 */
export const applyTheme = (html: string, theme: Theme): string => {
  return `
    <style>${theme.css}</style>
    <div class="markdown-body theme-${theme.id}">
      ${html}
    </div>
  `;
};
```

---

## メッセージング設計

### メッセージング層の責務

**✅ 許可される処理:**

- メッセージ型定義
- メッセージルーティング（どのserviceを呼ぶか判断）
- 型チェック・バリデーション
- エラーハンドリング
- services への委譲

**❌ 絶対禁止:**

- ビジネスロジックの実装
- ドメインロジックの実装
- 複数domainの組み合わせ
- domain の直接呼び出し（必ず services 経由）

### メッセージ型定義

```typescript
// src/messaging/types.ts
export type Message =
  | { type: "RENDER_MARKDOWN"; payload: { markdown: string; themeId?: string } }
  | {
    type: "RENDER_MARKDOWN_WITH_HOT_RELOAD";
    payload: { markdown: string; fileUrl: string; themeId?: string };
  }
  | { type: "LOAD_THEME"; payload: { themeId: string } }
  | { type: "UPDATE_THEME"; payload: Theme }
  | { type: "RELOAD_MARKDOWN" };

export type MessageResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };
```

### メッセージハンドラ

```typescript
// src/messaging/handlers/background-handler.ts
import { markdownService } from "../../services/markdown-service.ts";
import { themeService } from "../../services/theme-service.ts";
import type { Message, MessageResponse } from "../types.ts";

/**
 * background層のメッセージハンドラ
 * ✅ OK: ルーティングのみ、serviceに委譲
 */
export const handleBackgroundMessage = async (
  message: Message,
): Promise<MessageResponse> => {
  switch (message.type) {
    case "RENDER_MARKDOWN":
      // ✅ OK: serviceに委譲するだけ
      const html = await markdownService.render(
        message.payload.markdown,
        message.payload.themeId,
      );
      return { success: true, data: html };

    case "RENDER_MARKDOWN_WITH_HOT_RELOAD":
      // ✅ OK: serviceに委譲するだけ
      const result = await markdownService.renderWithHotReload(message.payload);
      return { success: true, data: result };

    case "LOAD_THEME":
      // ✅ OK: serviceに委譲するだけ
      const theme = await themeService.load(message.payload.themeId);
      return { success: true, data: theme };

    default:
      return { success: false, error: "Unknown message type" };
  }
};
```

### メッセージフロー全体像

```
┌────────────────────────────────────────────────────────────┐
│                 Complete Message Flow                       │
└────────────────────────────────────────────────────────────┘

┌─────────┐   ┌──────────────┐   ┌─────────┐   ┌────────┐
│ content │──→│  background  │──→│messaging│──→│service │
│         │   │              │   │ handler │   │        │
│         │   │              │   │         │   ├────────┤
│         │   │              │   │         │   │ domain │
│         │←──│              │←──│         │←──│ domain │
└─────────┘   └──────────────┘   └─────────┘   └────────┘
   UI層         messaging送受信      ルーティング   ビジネス
                のみ                 のみ          ロジック

❗ 重要ポイント:
- background は messaging の"中継"のみ
- ビジネスロジックは service層 に集約
- domain層 は純粋関数のみ
```

---

## 状態管理

### アプリケーション状態

```typescript
// src/shared/types/state.ts
export interface AppState {
  // テーマ設定
  theme: Theme;

  // Hot Reload設定
  hotReload: {
    enabled: boolean;
    interval: number; // 0 = タブフォーカス時のみ
    autoReload: boolean;
  };
}

export type Theme =
  | "light"
  | "dark"
  | "github"
  | "minimal"
  | "solarized_light"
  | "solarized_dark";
```

### 状態の永続化

```typescript
// src/background/state-manager.ts
import { signal } from "@preact/signals";
import type { AppState } from "../shared/types/state.ts";

const DEFAULT_STATE: AppState = {
  theme: "light",
  hotReload: {
    enabled: true,
    interval: 30,
    autoReload: false,
  },
};

export class StateManager {
  private state = signal<AppState>(DEFAULT_STATE);

  async load(): Promise<void> {
    const stored = await chrome.storage.sync.get();
    this.state.value = { ...DEFAULT_STATE, ...stored };
  }

  async save(updates: Partial<AppState>): Promise<void> {
    this.state.value = { ...this.state.value, ...updates };
    await chrome.storage.sync.set(this.state.value);
  }

  get(): AppState {
    return this.state.value;
  }
}
```

---

## セキュリティ設計

### XSS Protection

```typescript
// src/domain/markdown/sanitizer.ts
import xss from "xss";

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

### セキュリティテスト

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
```

---

## エラーハンドリング

### エラーバウンダリ

```typescript
// src/content/components/ErrorBoundary.tsx
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

---

## カスタムフック分割パターン（ADR-007例外）

Content Script の MarkdownViewer
コンポーネントでは、DOM操作系domainを直接呼び出すカスタムフックを使用している。
これはADR-007の例外「DOM操作系domainのcontent直接呼び出し」に該当する。

```
content/components/hooks/
├── useCopyButtons.ts   # コードブロックにコピーボタンを動的追加
├── useMathJax.ts       # MathJax数式レンダリング（domain/math直接呼び出し）
└── useMermaid.ts       # Mermaidダイアグラムレンダリング（domain/markdown直接呼び出し）
```

**設計方針:**

- 各フックは独立した依存配列を持ち、必要な時のみ再実行
- `isMounted` フラグで非同期処理のクリーンアップを保証（useMermaid）
- MarkdownViewer.tsx専用のため、`content/components/hooks/` に配置

---

## パフォーマンス最適化

### Dynamic Import

```typescript
// Mermaidの遅延ロード
const renderMermaid = async (code: string, element: HTMLElement) => {
  const mermaid = await import("mermaid");
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
  });
  await mermaid.render("mermaid-graph", code);
};
```

### Lazy Rendering

```typescript
// IntersectionObserver使用
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      renderMermaid(entry.target);
      observer.unobserve(entry.target);
    }
  });
});

// Mermaidブロックを監視
document.querySelectorAll(".mermaid").forEach((el) => {
  observer.observe(el);
});
```

---

## 参考資料

- [Chrome Extension Architecture](https://developer.chrome.com/docs/extensions/mv3/architecture-overview/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Preact Documentation](https://preactjs.com/)
- [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md) -
  アーキテクチャ決定記録
- [DIRECTORY_STRUCTURE.md](./DIRECTORY_STRUCTURE.md) -
  ディレクトリ構造と責務定義
