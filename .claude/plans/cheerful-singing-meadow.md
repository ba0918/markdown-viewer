# Markdown Viewer Chrome拡張機能 - 仕様レビューと補完

## Context

ユーザーは[spec.md](../../../spec.md)に基づいて、ローカルMarkdownファイルを安全に表示するChrome拡張機能の開発を計画しています。プロジェクトは初期段階（ディレクトリ構造のみ存在）で、本格的な実装前に仕様の妥当性と実現可能性の厳格なレビューが求められました。

このレビューの目的は、技術的な落とし穴を事前に特定し、セキュリティリスクを最小化し、spec.mdに記載されていない重要な考慮事項を補完することです。

---

## 総合評価

### 実現可能性: 🟡 **条件付き可能**

spec.mdのコンセプトは基本的に実現可能ですが、**以下の重大な問題点と欠落事項**が存在します：

| カテゴリ | 判定 | 深刻度 |
|---------|------|--------|
| **技術スタック** | 🟡 要調整 | 中 |
| **セキュリティ設計** | 🔴 不十分 | **致命的** |
| **アーキテクチャ** | 🟡 要再設計 | 高 |
| **機能要件** | 🟡 部分的にリスク高 | 中〜高 |
| **実装計画** | 🔴 重要項目欠落 | 高 |

---

## 🔴 Critical Issues（致命的問題）

### 1. セキュリティ設計の具体性欠如

**問題点:**
- spec.mdに「Secure design」とあるが、**具体的な対策が一切記載されていない**
- Markdown Viewerは攻撃ベクターが多い（XSS、CSS Injection、Path Traversal等）

**ユーザー決定事項:**
- ✅ Custom CSS機能：**プリセットテーマのみ**に変更 → セキュリティリスク大幅軽減
- ✅ Hot Reload：**エンドユーザー向けにも実装**（技術的課題あり、詳細は後述）

**必須の対策（spec.mdに追記すべき）:**

#### 1.1 Content Security Policy (CSP)
```json
// manifest.json で設定必須
"content_security_policy": {
  "extension_pages": "script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'self'"
}
```

#### 1.2 Markdown XSS対策
```typescript
// DOMPurify等のサニタイザーが必須
import DOMPurify from 'dompurify';

const cleanHTML = DOMPurify.sanitize(markdownHTML, {
  ALLOWED_TAGS: ['p', 'b', 'i', 'code', 'pre', 'a', 'img', 'h1', 'h2', 'h3', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'class'],
  ALLOW_DATA_ATTR: false
});
```

**攻撃例:**
```markdown
[Click me](javascript:alert('XSS'))
![](onerror=alert('XSS'))
<img src=x onerror="alert('XSS')">
```

#### 1.3 Custom CSS機能 → プリセットテーマのみに変更（✅ユーザー決定）

**採用方針: プリセットテーマのみ**

**実装方針:**
- 事前定義されたテーマファイルのみ提供
- ユーザーカスタムCSSは**一切受け付けない**
- セキュリティリスク完全排除

**提供するテーマ:**
```typescript
// src/shared/constants/themes.ts
export const PRESET_THEMES = {
  light: 'Light Theme (Default)',
  dark: 'Dark Theme',
  github: 'GitHub Style',
  minimal: 'Minimal',
  solarized_light: 'Solarized Light',
  solarized_dark: 'Solarized Dark'
} as const;
```

**実装:**
```typescript
// src/content/styles/themes/
// - light.css
// - dark.css
// - github.css
// - minimal.css
// - solarized-light.css
// - solarized-dark.css

// テーマ切り替え
const loadTheme = (themeName: keyof typeof PRESET_THEMES) => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL(`themes/${themeName}.css`);
  document.head.appendChild(link);
};
```

**メリット:**
- ✅ CSS Injection攻撃リスク **完全排除**
- ✅ 実装がシンプル
- ✅ パフォーマンス良好
- ✅ 品質保証されたテーマのみ提供

---

### 2. Manifest V2/V3の明記なし

**問題点:**
- Chrome拡張のマニフェストバージョンが未指定
- **Manifest V2は2024年に廃止済み**
- Manifest V3では設計が大きく異なる

**必須対応:**

#### manifest.jsonの基本構造（Manifest V3）
```json
{
  "manifest_version": 3,
  "name": "Markdown Viewer",
  "version": "1.0.0",
  "description": "Secure local Markdown file viewer",

  "background": {
    "service_worker": "background.js",
    "type": "module"
  },

  "content_scripts": [{
    "matches": ["file:///*.md", "file:///*.markdown"],
    "js": ["content.js"],
    "css": ["content.css"],
    "run_at": "document_end"
  }],

  "permissions": [
    "storage",
    "activeTab"
  ],

  "host_permissions": [
    "file:///*"
  ],

  "web_accessible_resources": [{
    "resources": ["assets/*"],
    "matches": ["file:///*"]
  }]
}
```

**Manifest V3の制約:**
- Service Workerベースのbackground処理（Background Pageは廃止）
- `chrome.scripting.executeScript` APIの使用
- Dynamic Code Evaluationの禁止（`eval`, `new Function`不可）

---

### 3. Markdownパーサー・サニタイザーの未選定

**問題点:**
- spec.mdに「Markdown Compiler」とあるが、**具体的なライブラリが未定**
- GitHub Flavored Markdown (GFM)対応が必要
- セキュリティ要件を満たすパーサーの選定が必須

**推奨ライブラリ:**

| ライブラリ | サイズ | GFM対応 | セキュリティ | 推奨度 |
|-----------|--------|---------|------------|--------|
| `marked` | 35KB | ✅ | DOMPurify併用必須 | 🟢 高 |
| `markdown-it` | 100KB | ✅ | プラグインで対応 | 🟡 中 |
| `micromark` | 小 | ✅ | 最新仕様準拠 | 🟢 高 |

**実装例:**
```typescript
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({
  gfm: true,           // GitHub Flavored Markdown
  breaks: true,        // 改行をbrタグに変換
  sanitize: false      // DOMPurifyで処理するためfalse
});

const rawHTML = marked.parse(markdownContent);
const safeHTML = DOMPurify.sanitize(rawHTML);
```

---

## 🟡 Medium/High Issues（要調整事項）

### 4. 技術スタック「Deno + Chrome拡張」の誤解

**問題点:**
- spec.mdでは「Deno」を技術スタックに挙げているが、**Denoは直接Chrome拡張を実行できない**
- Chrome拡張の実行環境はブラウザのV8エンジン

**正しい理解:**

```
【開発時】
Deno → 型チェック、テスト、リンティング
  ↓
esbuild → トランスパイル、バンドル
  ↓
【実行時】
Chrome Extension Environment (V8) → 実際の実行
```

**Denoの役割:**
- 開発環境のツールチェイン
- TypeScriptネイティブサポート
- テストランナー（`deno test`）
- リンター（`deno lint`）

**実装上の注意:**
- esbuildはNode.js製 → Denoから`npm:esbuild`経由で使用
- または、ビルドプロセスのみNode.js環境を使用

---

### 5. アーキテクチャ設計の不整合

**問題点:**
- spec.mdのディレクトリ構造が**一般的なWebアプリの設計**に基づいている
- Chrome拡張は**メッセージパッシングベースの分散アーキテクチャ**
- `application/`と`presentation/`の責務分離がChrome拡張の実行コンテキストと対応していない

**Chrome拡張の実行コンテキスト:**

```
┌─────────────────────┐
│  Service Worker     │ ← バックグラウンド処理
│  (background/)      │   メッセージルーティング、状態管理
└──────────┬──────────┘
           │ chrome.runtime.sendMessage
           ↓
┌─────────────────────┐
│  Content Script     │ ← ページ内での処理
│  (content/)         │   DOM操作、Markdown描画
└──────────┬──────────┘
           │ Preact Components
           ↓
┌─────────────────────┐
│  Rendered Markdown  │ ← 最終的な表示
└─────────────────────┘
```

**推奨ディレクトリ構造（改訂版）:**

```
src/
  background/              # Service Worker (Manifest V3)
    service-worker.ts      # メインエントリーポイント
    message-handler.ts     # メッセージルーティング
    state-manager.ts       # 状態管理（chrome.storage）

  content/                 # Content Scripts
    index.ts               # エントリーポイント
    markdown/
      parser.ts            # Markdownパース処理
      renderer.ts          # Preactでのレンダリング
    components/            # Preactコンポーネント
      MarkdownViewer.tsx
      CodeBlock.tsx
      MermaidDiagram.tsx
    styles/
      themes/
        light.css
        dark.css
      markdown.css

  popup/                   # 拡張機能ポップアップ
    index.tsx

  options/                 # 設定ページ
    index.tsx
    components/
      ThemeSelector.tsx
      CSSVariablesEditor.tsx

  shared/                  # 共通コード
    types/                 # 型定義
      message.ts
      theme.ts
    utils/                 # ユーティリティ
      security/
        sanitizer.ts       # DOMPurify wrapper
        css-validator.ts   # CSS変数バリデーション
    constants/
      defaults.ts

  messaging/               # メッセージング統一層
    types.ts               # メッセージ型定義
    router.ts              # 型安全なメッセージング
```

**変更の理由:**
- `application/background/frontend` → Chrome拡張の実行コンテキストに対応
- `presentation/components/functional/layouts/ui-elements/ui-parts` → 過度な階層を排除、シンプルに`components/`
- `shared/utils/security/` → セキュリティ関連を明示的に分離

---

### 6. 機能要件のリスク分析

#### 6.1 Hot Reload（✅ユーザー決定: エンドユーザー向けにも実装）

**実装方針: エンドユーザー向けにも提供**

**技術的課題:**
- Chrome拡張からローカルファイルシステムの**直接監視は不可能**
- File System Access APIも`file://`プロトコルでは制限的
- 代替アプローチが必要

**実装アプローチ（推奨）:**

**方式: タブフォーカス時 + 定期チェックのハイブリッド**

```typescript
// src/content/hot-reload/file-watcher.ts

class FileWatcher {
  private fileUrl: string;
  private lastHash: string;
  private intervalId: number | null = null;

  constructor(fileUrl: string) {
    this.fileUrl = fileUrl;
    this.lastHash = '';
  }

  async start() {
    // 初回ハッシュ取得
    this.lastHash = await this.fetchFileHash();

    // 1. タブフォーカス時にチェック（UX重視）
    document.addEventListener('visibilitychange', async () => {
      if (!document.hidden) {
        await this.checkForUpdates();
      }
    });

    // 2. 定期チェック（ユーザー設定可能、デフォルト30秒）
    const interval = await this.getCheckInterval();
    if (interval > 0) {
      this.intervalId = window.setInterval(
        () => this.checkForUpdates(),
        interval * 1000
      );
    }
  }

  private async fetchFileHash(): Promise<string> {
    try {
      const response = await fetch(this.fileUrl, { cache: 'no-store' });
      const content = await response.text();
      // 簡易ハッシュ（または crypto.subtle.digest）
      return this.simpleHash(content);
    } catch (error) {
      console.error('File fetch error:', error);
      return '';
    }
  }

  private async checkForUpdates(): Promise<void> {
    const currentHash = await this.fetchFileHash();
    if (currentHash && currentHash !== this.lastHash) {
      this.lastHash = currentHash;
      // リロード通知
      this.notifyReload();
    }
  }

  private notifyReload(): void {
    // ユーザーに通知して自動リロード or 手動リロード選択
    const autoReload = localStorage.getItem('autoReload') === 'true';

    if (autoReload) {
      location.reload();
    } else {
      this.showReloadPrompt();
    }
  }

  private showReloadPrompt(): void {
    // トースト通知表示
    const toast = document.createElement('div');
    toast.className = 'reload-toast';
    toast.innerHTML = `
      <p>ファイルが更新されました</p>
      <button id="reload-btn">リロード</button>
      <button id="dismiss-btn">無視</button>
    `;
    document.body.appendChild(toast);

    document.getElementById('reload-btn')?.addEventListener('click', () => {
      location.reload();
    });
    document.getElementById('dismiss-btn')?.addEventListener('click', () => {
      toast.remove();
    });
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private async getCheckInterval(): Promise<number> {
    const settings = await chrome.storage.sync.get('hotReloadInterval');
    return settings.hotReloadInterval ?? 30; // デフォルト30秒
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
```

**設定画面での制御:**
```typescript
// src/options/components/HotReloadSettings.tsx
export const HotReloadSettings = () => {
  return (
    <div>
      <h3>Hot Reload設定</h3>
      <label>
        <input type="checkbox" id="enable-hot-reload" />
        Hot Reload を有効化
      </label>
      <label>
        チェック間隔:
        <select id="check-interval">
          <option value="0">タブフォーカス時のみ</option>
          <option value="10">10秒</option>
          <option value="30" selected>30秒（推奨）</option>
          <option value="60">60秒</option>
        </select>
      </label>
      <label>
        <input type="checkbox" id="auto-reload" />
        ファイル更新時に自動リロード（通知なし）
      </label>
    </div>
  );
};
```

**パフォーマンス対策:**
- デフォルトは「タブフォーカス時のみ」チェック
- 定期チェックはオプトイン、30秒以上を推奨
- `fetch`にキャッシュ無効化オプション使用
- ファイル全体ではなくヘッダー情報（ETag, Last-Modified）の確認も検討

**制限事項:**
- ⚠️ ブラウザがバックグラウンドの場合、定期チェックが停止する可能性
- ⚠️ 非常に大きなファイル（数MB以上）では定期チェックに時間がかかる
- ⚠️ ネットワークアクセス（`file://`も内部的にはfetch）のため、完全なファイルシステム監視ではない

**ユーザー体験:**
1. デフォルトでHot Reload有効
2. タブに戻ると自動的に更新チェック
3. 更新があれば通知またはリロード
4. 設定で動作カスタマイズ可能

#### 6.2 Mermaid diagram（中リスク）

**課題:**
- バンドルサイズ: ~800KB（minified）
- CSP制約: `'wasm-unsafe-eval'`が必要

**対策:**

1. **Dynamic Import（必須）**
```typescript
// 必要時のみロード
const renderMermaid = async (code: string, element: HTMLElement) => {
  const mermaid = await import('mermaid');
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict'  // XSS対策
  });
  await mermaid.render('mermaid-graph', code);
};
```

2. **CSP設定**
```json
"content_security_policy": {
  "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
}
```

#### 6.3 MathJax formulas（低〜中リスク）

**MathJax 3はCSP対応済み** → Mermaidより低リスク

**実装:**
```typescript
import 'mathjax/es5/tex-chtml.js';

window.MathJax = {
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']]
  },
  options: {
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
  }
};
```

**CSP:**
```json
"style-src 'self' 'unsafe-inline'"  // MathJaxのインラインスタイル用
```

#### 6.4 Syntax Highlight Code Block

**spec.mdに記載あるが、ライブラリ未選定**

**推奨:**

| ライブラリ | サイズ | 特徴 | 推奨度 |
|-----------|--------|------|--------|
| `highlight.js` | ~500KB | 多言語、人気 | 🟢 |
| `prism.js` | 軽量 | カスタマイズ可 | 🟢 |
| `shiki` | 重い | VSCode同等品質 | 🟡 |

**バンドルサイズ対策:**
```typescript
// 必要な言語のみインポート
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);
```

---

## 📋 欠落している重要事項

### 7. State Management（状態管理）

**spec.mdに記載なし、必須要素:**

**必要な状態:**
- 現在のテーマ (Preset themesから選択)
- Hot Reload設定（有効/無効、チェック間隔、自動リロード）
- ユーザー設定（オプション）

**推奨アプローチ:**

```typescript
// chrome.storage.sync で設定を同期
interface AppState {
  // テーマ設定
  theme: 'light' | 'dark' | 'github' | 'minimal' | 'solarized_light' | 'solarized_dark';

  // Hot Reload設定
  hotReloadEnabled: boolean;
  hotReloadInterval: number; // 0 = タブフォーカス時のみ
  autoReload: boolean; // true = 通知なし自動リロード

  // オプション設定（将来拡張）
  // fontSize?: number;
  // lineHeight?: number;
}

// Preact Signals（軽量状態管理）
import { signal } from '@preact/signals';

const appState = signal<AppState>({
  theme: 'light',
  hotReloadEnabled: true,
  hotReloadInterval: 30,
  autoReload: false
});
```

---

### 8. エラーハンドリング

**spec.mdに記載なし:**

**必要なエラー処理:**
1. ファイル読み込み失敗
2. Markdown解析エラー
3. Mermaid/MathJax初期化失敗
4. 権限不足（`file:///*`へのアクセス拒否）
5. 大きすぎるファイル（メモリ制限）

**実装例:**
```typescript
try {
  const markdown = await fetchMarkdownFile(url);
  const html = await parseMarkdown(markdown);
  render(html);
} catch (error) {
  if (error instanceof PermissionError) {
    showPermissionPrompt();
  } else if (error instanceof ParseError) {
    showErrorMessage('Markdown解析エラー', error.message);
  } else {
    showGenericError();
  }
}
```

---

### 9. パフォーマンス考慮

**大規模Markdownファイルへの対策なし:**

**推奨対策:**

1. **Virtual Scrolling**
   - 数千行のMarkdownでもスムーズ描画
   - `react-window`またはカスタム実装

2. **Lazy Rendering**
   ```typescript
   // Mermaid diagramの遅延描画
   const observer = new IntersectionObserver((entries) => {
     entries.forEach(entry => {
       if (entry.isIntersecting) {
         renderMermaid(entry.target);
       }
     });
   });
   ```

3. **Web Worker**
   ```typescript
   // Markdown parsingをWorkerで処理
   const worker = new Worker('markdown-parser.worker.js');
   worker.postMessage({ markdown: content });
   worker.onmessage = (e) => {
     const html = e.data;
     render(html);
   };
   ```

---

### 10. テスト戦略の具体化

**spec.mdには「TDD絶対遵守」とあるが、具体的なテスト項目が不明**

**必須テストケース:**

#### Unit Tests
```typescript
// src/shared/utils/security/sanitizer.test.ts
describe('Markdown Sanitizer', () => {
  test('XSS攻撃の防御: javascript: protocol', () => {
    const malicious = '[Click](javascript:alert("XSS"))';
    const result = sanitize(parse(malicious));
    expect(result).not.toContain('javascript:');
  });

  test('XSS攻撃の防御: onerror attribute', () => {
    const malicious = '![](x onerror=alert("XSS"))';
    const result = sanitize(parse(malicious));
    expect(result).not.toContain('onerror');
  });
});

// src/shared/utils/security/css-validator.test.ts
describe('CSS Validator', () => {
  test('CSS Injection攻撃の防御: url()', () => {
    const malicious = 'body { background: url("http://evil.com") }';
    expect(() => validateCSS(malicious)).toThrow();
  });

  test('有効なCSS変数は許可', () => {
    const valid = '--primary-color: #007bff;';
    expect(validateCSS(valid)).toBe(true);
  });
});
```

#### E2E Tests（Playwright）
```typescript
// e2e/markdown-rendering.spec.ts
test('ローカルMarkdownファイルの表示', async ({ page }) => {
  await page.goto('file:///path/to/test.md');
  await expect(page.locator('h1')).toHaveText('Test Markdown');
});

test('ダークテーマの切り替え', async ({ page }) => {
  await page.goto('file:///path/to/test.md');
  await page.click('[data-testid="theme-toggle"]');
  await expect(page.locator('body')).toHaveClass(/dark-theme/);
});

test('Mermaidダイアグラムのレンダリング', async ({ page }) => {
  await page.goto('file:///path/to/mermaid-test.md');
  await expect(page.locator('.mermaid svg')).toBeVisible();
});
```

#### Security Tests
```typescript
// e2e/security.spec.ts
test('XSS攻撃の防御', async ({ page }) => {
  const xssPayload = `
# Test
[Click me](javascript:alert('XSS'))
<img src=x onerror="alert('XSS')">
  `;

  await page.goto('data:text/markdown,' + encodeURIComponent(xssPayload));

  // アラートが表示されないことを確認
  page.on('dialog', () => {
    throw new Error('XSS detected!');
  });
});
```

---

### 11. ビルドプロセスの詳細化

**spec.mdには「esbuild」とあるが、設定詳細なし**

**推奨 deno.json:**
```json
{
  "tasks": {
    "dev": "deno run --allow-all scripts/watch.ts",
    "build": "deno run --allow-all scripts/build.ts",
    "test": "deno test --allow-all",
    "test:e2e": "playwright test",
    "lint": "deno lint",
    "fmt": "deno fmt",
    "bundle": "deno task build && deno run --allow-all scripts/bundle.ts"
  },
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "deno.ns"],
    "jsx": "react-jsx",
    "jsxImportSource": "preact"
  },
  "imports": {
    "preact": "npm:preact@^10.19.0",
    "preact/": "npm:preact/",
    "@preact/signals": "npm:@preact/signals@^1.2.0",
    "marked": "npm:marked@^11.0.0",
    "dompurify": "npm:dompurify@^3.0.0",
    "highlight.js": "npm:highlight.js@^11.9.0",
    "esbuild": "npm:esbuild@^0.19.0"
  }
}
```

**esbuild設定例:**
```typescript
// scripts/build.ts
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: [
    'src/background/service-worker.ts',
    'src/content/index.ts',
    'src/popup/index.tsx',
    'src/options/index.tsx'
  ],
  bundle: true,
  outdir: 'dist',
  format: 'esm',
  splitting: true,
  minify: true,
  sourcemap: true,
  target: ['chrome120'],
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
  jsxImportSource: 'preact'
});
```

---

### 12. CI/CD

**spec.mdに記載なし:**

**推奨 GitHub Actions:**
```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/setup-deno@v1
      - run: deno task lint
      - run: deno task test
      - run: deno task build

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install -g playwright
      - run: deno task test:e2e
```

---

### 13. Internationalization (i18n)

**多言語対応の考慮なし:**

**推奨:**
```typescript
// src/shared/i18n/
chrome.i18n.getMessage('extensionName');
```

```json
// _locales/ja/messages.json
{
  "extensionName": {
    "message": "Markdownビューアー"
  }
}
```

---

### 14. Accessibility (a11y)

**アクセシビリティ要件なし:**

**必須対応:**
- キーボードナビゲーション（Tab, Enter, Esc）
- スクリーンリーダー対応（ARIA属性）
- カラーコントラスト（WCAG 2.1 AA準拠）
- フォーカス管理

---

## 推奨実装フェーズ

### Phase 1: 基盤構築（MVP）
**目標: 安全な基本機能**

1. ✅ Manifest V3基本設定
2. ✅ Markdownパーサー（marked + DOMPurify）
3. ✅ Basic Themes（Light/Dark）
4. ✅ シンタックスハイライト（highlight.js）
5. ✅ セキュリティテスト（XSS防御確認）

**成果物:**
- ローカル`.md`ファイルを安全に表示
- テーマ切り替え可能
- コードブロックのハイライト

---

### Phase 2: 拡張機能
**目標: 高度なMarkdown記法対応**

6. ✅ GitHub Flavored Markdown (GFM)
7. ✅ MathJax数式表示
8. ✅ Mermaidダイアグラム（Dynamic Import）
9. ✅ パフォーマンス最適化（Virtual Scrolling）

---

### Phase 3: カスタマイズ機能
**目標: ユーザー体験向上**

10. ✅ CSS変数ベースのテーマカスタマイズ
11. ✅ 設定画面（Options Page）
12. ✅ 状態管理（chrome.storage.sync）

---

### Phase 4: 開発者向け機能
**目標: DX向上**

13. ✅ Hot Reload（開発モードのみ）
14. ✅ CI/CD整備
15. ✅ E2Eテストカバレッジ向上

---

## Critical Files（実装に必要なファイル）

### 最優先で作成すべきファイル:

1. **[manifest.json](../../../manifest.json)** - Manifest V3設定、権限、CSP
2. **[deno.json](../../../deno.json)** - Denoプロジェクト設定、依存関係
3. **[src/shared/utils/security/sanitizer.ts](../../../src/shared/utils/security/sanitizer.ts)** - DOMPurify wrapper、XSS対策の中核
4. **[src/shared/utils/security/css-validator.ts](../../../src/shared/utils/security/css-validator.ts)** - CSS変数バリデーション
5. **[src/content/markdown/parser.ts](../../../src/content/markdown/parser.ts)** - Markdownパース処理
6. **[src/messaging/types.ts](../../../src/messaging/types.ts)** - メッセージング型定義
7. **[scripts/build.ts](../../../scripts/build.ts)** - esbuildビルド設定

---

## spec.md 修正推奨事項

以下をspec.mdに追記・修正すべきです：

### セキュリティセクション追加
```markdown
## Security

### XSS Protection
- DOMPurify による HTML サニタイゼーション
- Content Security Policy (CSP) 厳格設定
- javascript: protocol の完全ブロック

### CSS Injection Protection
- Custom Theme: CSS Variables のみ許可
- フルCSS対応は **非推奨**（セキュリティリスク）

### Permissions
- Minimal permissions (activeTab, storage のみ)
- file:///* は明示的なユーザー許可が必要
```

### 技術スタック修正
```markdown
## 技術スタック

- **開発環境**: Deno (型チェック、テスト、リンティング)
- **ビルド**: esbuild
- **実行環境**: Chrome Extension (Manifest V3)
- **UI**: Preact
- **Markdown**: marked + DOMPurify
- **シンタックスハイライト**: highlight.js
```

### Features修正
```markdown
## Features

- Secure design
  - XSS Protection (DOMPurify)
  - CSP strict mode
  - CSS Injection防御（Custom CSSは提供しない）
- Markdown Compiler (marked + GFM)
- Hot Reload (Tab focus + Optional periodic check)
- Theme (Preset themes only: Light, Dark, GitHub, Minimal, Solarized)
- Mermaid diagram
- GitHub Flavored Markdown
- Syntax highlight code block (highlight.js)
- Markdown Content-type detection
- MathJax formulas
```

---

## 最終判定

### ✅ 実装可能な条件

1. **Custom CSS機能をCSS変数のみに制限**
2. **セキュリティ対策を具体化** (DOMPurify, CSP)
3. **Manifest V3に完全準拠**
4. **アーキテクチャをChrome拡張パターンに修正**
5. **Hot ReloadをDevelopment modeのみに限定**

### ⚠️ 高リスク要素（要慎重検討）

- Custom CSSフル対応（**強く非推奨**）
- エンドユーザー向けHot Reload（パフォーマンス問題）
- Mermaidのバンドルサイズ（800KB）

### 🔴 絶対避けるべき実装

- サニタイゼーション無しのMarkdown描画
- CSP設定なし
- Manifest V2の使用
- `eval`, `new Function`の使用
- ユーザー入力の無検証な使用

---

## Verification Plan（検証計画）

実装後の検証手順：

### 1. セキュリティテスト
```bash
# XSS攻撃ベクターのテスト
deno task test src/shared/utils/security/sanitizer.test.ts

# E2Eセキュリティテスト
deno task test:e2e e2e/security.spec.ts
```

### 2. 機能テスト
```bash
# ユニットテスト全実行
deno task test

# E2Eテスト全実行
deno task test:e2e
```

### 3. ビルド検証
```bash
# ビルド実行
deno task build

# バンドルサイズ確認
ls -lh dist/

# manifest.json検証
cat dist/manifest.json
```

### 4. 手動テスト
1. Chrome拡張を読み込み (`chrome://extensions/`)
2. テストMarkdownファイルを開く
3. XSSペイロードを含むMarkdownで攻撃されないか確認
4. テーマ切り替え動作確認
5. Mermaid/MathJax表示確認

---

## まとめ

spec.mdのコンセプトは**実現可能**ですが、以下の対応が必須です：

### 最優先事項（MUST）
1. ✅ セキュリティ設計の具体化（DOMPurify, CSP）
2. ✅ Custom CSS機能 → **プリセットテーマのみに変更**（ユーザー決定）
3. ✅ Manifest V3対応の明記
4. ✅ Markdownパーサー・サニタイザーの選定

### 推奨事項（SHOULD）
5. ✅ アーキテクチャのChrome拡張パターンへの修正
6. ✅ Hot Reload → **エンドユーザー向けにも実装**（タブフォーカス+定期チェック）
7. ✅ 状態管理、エラーハンドリング、パフォーマンス対策の追加
8. ✅ テスト戦略の具体化（XSS防御テスト含む）

### 参考情報（NICE TO HAVE）
9. CI/CD、i18n、a11y対応

上記対応により、**安全で実用的なMarkdown Viewer Chrome拡張**の実装が可能です。

---

## ユーザー決定事項の反映

### ✅ Custom CSS機能 → プリセットテーマのみ

**決定:**
- ユーザーカスタムCSSは一切受け付けない
- 事前定義された6種類のテーマから選択のみ
- Light, Dark, GitHub, Minimal, Solarized Light, Solarized Dark

**メリット:**
- ✅ CSS Injection攻撃リスク完全排除
- ✅ セキュリティ実装がシンプル
- ✅ 品質保証されたテーマのみ提供
- ✅ パフォーマンス良好

**実装影響:**
- spec.mdの「Custom Theme (Original css)」を「Preset Themes」に変更
- CSS変数バリデーション実装が不要
- テーマファイル作成（6種類）が必要

### ✅ Hot Reload → エンドユーザー向けにも実装

**決定:**
- 開発モード限定ではなく、本番環境でも提供
- タブフォーカス時チェック + オプション定期チェック
- ユーザー設定でカスタマイズ可能

**実装方針:**
1. **タブフォーカス時チェック**（デフォルト、パフォーマンス影響小）
2. **定期チェック**（オプション、30秒/60秒等から選択）
3. **自動リロード設定**（通知あり/なし）

**技術的課題:**
- Chrome拡張からのファイルシステム直接監視は不可能
- `fetch`によるファイルハッシュ比較で実装
- バックグラウンドタブでは定期チェック停止の可能性

**実装影響:**
- FileWatcherクラスの実装が必要
- オプション画面にHot Reload設定追加
- chrome.storage.syncに設定項目追加
- トースト通知UIの実装

---

## spec.md最終修正案

以下の内容でspec.mdを更新することを推奨します：

```markdown
# SPEC

ローカルのmarkdownを開いた時、サーバから text/markdown なテキストを受け取った時に
markdown-viewerで表示を行う chrome拡張機能。
既に類似のChrome拡張は世に存在するが、そこまで多機能である必要がないこと。セキュリティの面で自作したほうが安全なので自前実装を行う。

## Features

- **Secure design**
  - XSS Protection (DOMPurify)
  - Content Security Policy (CSP) strict mode
  - CSS Injection防御（Custom CSSは提供しない）
- **Markdown Compiler** (marked + DOMPurify)
- **Hot Reload**
  - Tab focus時の自動チェック
  - オプション定期チェック（30秒/60秒等）
  - 自動リロード設定可能
- **Theme** (Preset themes only)
  - Light Theme
  - Dark Theme
  - GitHub Style
  - Minimal
  - Solarized Light
  - Solarized Dark
- **Mermaid diagram** (Dynamic Import)
- **GitHub Flavored Markdown** (GFM)
- **Syntax highlight code block** (highlight.js)
- **Markdown Content-type detection**
- **MathJax formulas**

## 技術スタック

- **開発環境**: Deno (型チェック、テスト、リンティング)
- **ビルド**: esbuild
- **実行環境**: Chrome Extension (Manifest V3)
- **UI Framework**: Preact
- **Markdown Parser**: marked
- **Security**: DOMPurify
- **Syntax Highlight**: highlight.js
- **State Management**: Preact Signals

## セキュリティ要件

### XSS Protection
- DOMPurifyによるHTMLサニタイゼーション
- `javascript:` protocol完全ブロック
- `onerror`, `onload`等のイベントハンドラ除去

### Content Security Policy
```json
"content_security_policy": {
  "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; object-src 'self'"
}
```

### Permissions
- Minimal permissions (activeTab, storage)
- `file:///*`への明示的なユーザー許可

## Directory structure

```
/
  dist/                # buildの成果物 git の管理外とする
  src/
    background/        # Service Worker (Manifest V3)
      service-worker.ts
      message-handler.ts
      state-manager.ts

    content/           # Content Scripts
      index.ts
      markdown/
        parser.ts      # Markdown parsing
        renderer.ts    # Preact rendering
      components/
        MarkdownViewer.tsx
        CodeBlock.tsx
        MermaidDiagram.tsx
      styles/
        themes/
          light.css
          dark.css
          github.css
          minimal.css
          solarized-light.css
          solarized-dark.css
        markdown.css
      hot-reload/
        file-watcher.ts

    popup/             # 拡張機能ポップアップ
      index.tsx

    options/           # オプション設定
      index.tsx
      components/
        ThemeSelector.tsx
        HotReloadSettings.tsx

    shared/            # 共通コード
      types/
        message.ts
        theme.ts
        state.ts
      utils/
        security/
          sanitizer.ts       # DOMPurify wrapper
        hash.ts
      constants/
        themes.ts
        defaults.ts

    messaging/         # メッセージング統一層
      types.ts
      router.ts

  docs/                # ドキュメント群
  e2e/                 # E2Eテスト (Playwright)
  scripts/             # ビルドスクリプト
    build.ts
    watch.ts
    bundle.ts
```

## Testing rules

TDDを絶対遵守。Red-Green-Refactor サイクルで実装を行う。

### Unit Test

テストはdenoの思想に従い、実装と同層に配置する

```
message.ts         # 実装
message.test.ts    # テスト
```

### E2E Test

- playwright を使用する `e2e` 以下に実装
- frontendやUIに関するテストを行う

### Security Test

- XSS攻撃ベクターのテスト必須
- CSS Injection防御テスト
- Path Traversal攻撃テスト

## Build Process

```bash
# 開発モード（watch）
deno task dev

# ビルド
deno task build

# テスト実行
deno task test

# E2Eテスト
deno task test:e2e

# リンティング
deno task lint

# フォーマット
deno task fmt

# 配布用バンドル
deno task bundle
```

## Manifest V3対応

- Service Workerベースのbackground処理
- Dynamic Code Evaluation禁止（`eval`, `new Function`使用不可）
- `chrome.scripting.executeScript` API使用
- Permissions最小化の原則
```
