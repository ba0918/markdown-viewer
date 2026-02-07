# ba-markdown-viewer 詳細実装プラン

## Context

このプランは、セキュリティファーストなMarkdown Viewer Chrome拡張機能を段階的に実装するためのものです。

### なぜこの変更が必要か

- プロジェクトはドキュメント設計が完了している（spec.md、docs/配下）
- `src/`ディレクトリは完全に空で、これから実装を開始する段階
- 過去の失敗（DuckDB + offscreen）から学んだ教訓を活かした設計が文書化済み
- レイヤー分離とTDD原則を絶対遵守する実装が必要

### 解決すべき問題

1. ゼロからの実装開始（設定ファイルすら存在しない）
2. レイヤー分離の徹底（messaging層にビジネスロジックを書かない）
3. TDD原則の遵守（Red-Green-Refactorサイクル）
4. セキュリティファースト（全Markdown描画でDOMPurify必須）

### 期待される成果

Chrome拡張として動作する、セキュリティが堅牢で保守性の高いMarkdown Viewerの完成。

---

## 実装原則

### 絶対遵守事項

1. **レイヤー分離**: shared/types/ → domain/ → services/ → messaging/ → UI層
2. **messaging層にビジネスロジック禁止**（過去の最大の教訓）
3. **TDD絶対遵守**: Red-Green-Refactorサイクル
4. **セキュリティファースト**: 全Markdown描画でDOMPurify必須

### 実装順序の原則

- **型定義ファースト**: shared/types/から開始
- **最下層から実装**: 依存関係の逆方向（下から上へ）
- **各ステップでTDD**: テストファイル → 実装 → リファクタリング

---

## Phase 1: 基盤構築（MVP）

### Step 1: プロジェクトセットアップ

**作成ファイル:**

1. `deno.json`
   - tasks定義: dev, build, test, test:watch, lint, fmt, bundle
   - compilerOptions: JSX設定（Preact）
   - imports: preact, marked, dompurify, highlight.js, esbuild

2. `manifest.json`
   - Manifest V3設定
   - permissions: storage, activeTab
   - host_permissions: file:///*
   - content_security_policy: script-src 'self' 'wasm-unsafe-eval'

3. `.gitignore`
   - dist/, node_modules/, coverage/, .DS_Store

**検証:**
```bash
deno task --list
cat manifest.json | jq .
```

---

### Step 2: 型定義層（shared/types/）

**作成ファイル:**

1. `src/shared/types/theme.ts`
```typescript
export type Theme =
  | 'light'
  | 'dark'
  | 'github'
  | 'minimal'
  | 'solarized_light'
  | 'solarized_dark';
```

2. `src/shared/types/state.ts`
```typescript
export interface AppState {
  theme: Theme;
  hotReload: {
    enabled: boolean;
    interval: number; // 0 = タブフォーカス時のみ
    autoReload: boolean;
  };
}
```

3. `src/shared/types/message.ts`
```typescript
export type Message =
  | { type: 'RENDER_MARKDOWN'; payload: { markdown: string; themeId?: string } }
  | { type: 'LOAD_THEME'; payload: { themeId: string } }
  | { type: 'UPDATE_THEME'; payload: Theme };

export type MessageResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };
```

**検証:**
```bash
deno check src/shared/types/*.ts
```

---

### Step 3: ドメイン層実装（TDD）

#### 3-1: Markdown Sanitizer（最優先：セキュリティ）

**TDD Red Phase:**

`src/domain/markdown/sanitizer.test.ts`
```typescript
import { assertEquals } from '@std/assert';
import { sanitizeHTML } from './sanitizer.ts';

Deno.test('XSS: javascript: protocol', () => {
  const malicious = '<a href="javascript:alert(\'XSS\')">Click</a>';
  const result = sanitizeHTML(malicious);
  assertEquals(result.includes('javascript:'), false);
});

Deno.test('XSS: onerror attribute', () => {
  const malicious = '<img src="x" onerror="alert(\'XSS\')">';
  const result = sanitizeHTML(malicious);
  assertEquals(result.includes('onerror'), false);
});

Deno.test('XSS: onclick attribute', () => {
  const malicious = '<button onclick="alert(\'XSS\')">Click</button>';
  const result = sanitizeHTML(malicious);
  assertEquals(result.includes('onclick'), false);
});

Deno.test('正常なHTML: リンク保持', () => {
  const valid = '<a href="https://example.com">Link</a>';
  const result = sanitizeHTML(valid);
  assertEquals(result.includes('https://example.com'), true);
});
```

**実行: RED確認**
```bash
deno test src/domain/markdown/sanitizer.test.ts
```

**TDD Green Phase:**

`src/domain/markdown/sanitizer.ts`
```typescript
import DOMPurify from 'dompurify';

export const sanitizeHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
      'a', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'table', 'thead',
      'tbody', 'tr', 'th', 'td', 'hr', 'div', 'span'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id'
    ],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false
  });
};
```

**実行: GREEN確認**
```bash
deno test src/domain/markdown/sanitizer.test.ts
```

**TDD Refactor Phase:**
- エッジケーステスト追加
- カバレッジ確認

---

#### 3-2: Markdown Parser

**TDD Red Phase:**

`src/domain/markdown/parser.test.ts`
```typescript
import { assertEquals, assertStringIncludes } from '@std/assert';
import { parseMarkdown } from './parser.ts';

Deno.test('基本的なMarkdown変換', () => {
  const markdown = '# Hello\n\nThis is **bold**.';
  const html = parseMarkdown(markdown);
  assertStringIncludes(html, '<h1');
  assertStringIncludes(html, '<strong>bold</strong>');
});

Deno.test('GFM: テーブル', () => {
  const markdown = '| A | B |\n|---|---|\n| 1 | 2 |';
  const html = parseMarkdown(markdown);
  assertStringIncludes(html, '<table');
});
```

**TDD Green Phase:**

`src/domain/markdown/parser.ts`
```typescript
import { marked } from 'marked';

export const parseMarkdown = (markdown: string): string => {
  marked.setOptions({
    gfm: true,
    breaks: true,
    sanitize: false // DOMPurifyで処理
  });

  return marked.parse(markdown) as string;
};
```

---

#### 3-3: Theme Domain

**作成ファイル:**

1. `src/domain/theme/types.ts`
```typescript
export interface ThemeData {
  id: string;
  css: string;
}
```

2. `src/domain/theme/applier.test.ts` (TDD Red)
3. `src/domain/theme/applier.ts` (TDD Green)
```typescript
import type { ThemeData } from './types.ts';

export const applyTheme = (html: string, theme: ThemeData): string => {
  return `
    <style>${theme.css}</style>
    <div class="markdown-body theme-${theme.id}">
      ${html}
    </div>
  `;
};
```

4. `src/domain/theme/loader.test.ts` (TDD Red)
5. `src/domain/theme/loader.ts` (TDD Green)
```typescript
import type { ThemeData } from './types.ts';

const THEMES: Record<string, ThemeData> = {
  light: {
    id: 'light',
    css: '/* Light theme CSS */'
  },
  dark: {
    id: 'dark',
    css: '/* Dark theme CSS */'
  }
};

export const loadTheme = async (themeId?: string): Promise<ThemeData> => {
  return THEMES[themeId || 'light'] || THEMES.light;
};
```

---

### Step 4: サービス層実装（ドメイン組み合わせ）

#### 4-1: Markdown Service

**TDD Red Phase:**

`src/services/markdown-service.test.ts`
```typescript
import { assertEquals } from '@std/assert';
import { MarkdownService } from './markdown-service.ts';

Deno.test('MarkdownService: 基本的なレンダリング', async () => {
  const service = new MarkdownService();
  const markdown = '# Hello\n\nThis is **bold**.';
  const theme = { id: 'light', css: '.markdown-body { color: #000; }' };

  const html = await service.render(markdown, theme);

  assertEquals(html.includes('theme-light'), true);
  assertEquals(html.includes('<h1'), true);
  assertEquals(html.includes('<strong>bold</strong>'), true);
});

Deno.test('MarkdownService: XSS防御', async () => {
  const service = new MarkdownService();
  const malicious = '[Click](javascript:alert("XSS"))';
  const theme = { id: 'light', css: '' };

  const html = await service.render(malicious, theme);

  assertEquals(html.includes('javascript:'), false);
});
```

**TDD Green Phase:**

`src/services/markdown-service.ts`
```typescript
import { parseMarkdown } from '../domain/markdown/parser.ts';
import { sanitizeHTML } from '../domain/markdown/sanitizer.ts';
import { applyTheme, type ThemeData } from '../domain/theme/applier.ts';

export class MarkdownService {
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

**重要**: この層でビジネスフローを実装。messaging層には書かない！

---

### Step 5: メッセージング層実装（ルーティングのみ）

**作成ファイル:**

1. `src/messaging/types.ts`
```typescript
export * from '../shared/types/message.ts';
```

2. `src/messaging/client.ts`
```typescript
import type { Message, MessageResponse } from './types.ts';

export const sendMessage = async <T = unknown>(
  message: Message
): Promise<T> => {
  const response: MessageResponse<T> = await chrome.runtime.sendMessage(message);

  if (!response.success) {
    throw new Error(response.error);
  }

  return response.data;
};
```

3. `src/messaging/handlers/background-handler.ts`
```typescript
import { markdownService } from '../../services/markdown-service.ts';
import type { Message, MessageResponse } from '../types.ts';

export const handleBackgroundMessage = async (
  message: Message
): Promise<MessageResponse> => {
  try {
    switch (message.type) {
      case 'RENDER_MARKDOWN': {
        // ✅ OK: serviceに委譲するだけ
        const theme = { id: 'light', css: '' }; // TODO: theme-serviceから取得
        const html = await markdownService.render(
          message.payload.markdown,
          theme
        );
        return { success: true, data: html };
      }

      default:
        return { success: false, error: 'Unknown message type' };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
```

**重要**: この層には**絶対にビジネスロジックを書かない**！ルーティングのみ！

---

### Step 6: Background層実装（messaging I/O のみ）

**作成ファイル:**

`src/background/service-worker.ts`
```typescript
import { handleBackgroundMessage } from '../messaging/handlers/background-handler.ts';

chrome.runtime.onInstalled.addListener(() => {
  console.log('Markdown Viewer installed');
});

// ✅ OK: handlerに委譲するだけ
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleBackgroundMessage(message)
    .then(sendResponse)
    .catch(error => sendResponse({ success: false, error: error.message }));
  return true; // 非同期レスポンス
});
```

---

### Step 7: Content層実装（UI + messaging I/O のみ）

**作成ファイル:**

1. `src/content/components/MarkdownViewer.tsx`
```typescript
import { h } from 'preact';

interface Props {
  html: string;
}

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

2. `src/content/components/ErrorBoundary.tsx`
```typescript
import { Component, h } from 'preact';

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <div class="error">Error: {this.state.error.message}</div>;
    }
    return this.props.children;
  }
}
```

3. `src/content/index.ts`
```typescript
import { sendMessage } from '../messaging/client.ts';
import { render } from 'preact';
import { MarkdownViewer } from './components/MarkdownViewer.tsx';

const isMarkdownFile = (): boolean => {
  return (
    document.contentType === 'text/markdown' ||
    location.pathname.match(/\.(md|markdown)$/i) !== null
  );
};

const init = async () => {
  if (!isMarkdownFile()) return;

  const markdown = document.body.textContent || '';

  try {
    // ✅ OK: messaging経由でserviceを利用
    const html = await sendMessage<string>({
      type: 'RENDER_MARKDOWN',
      payload: { markdown, themeId: 'light' }
    });

    document.body.innerHTML = '';
    render(<MarkdownViewer html={html} />, document.body);
  } catch (error) {
    console.error('Failed to render markdown:', error);
    document.body.textContent = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

**重要**: UI層は**messaging I/O のみ**！domain/servicesを直接呼ばない！

---

### Step 8: 基本テーマCSS

**作成ファイル:**

1. `src/content/styles/themes/light.css`
```css
.markdown-viewer {
  background: #ffffff;
  color: #24292e;
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
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

.markdown-body code {
  background: #f6f8fa;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}
```

2. `src/content/styles/themes/dark.css`
```css
.markdown-viewer {
  background: #0d1117;
  color: #c9d1d9;
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
}

.markdown-body h1 {
  font-size: 2rem;
  border-bottom: 1px solid #21262d;
  padding-bottom: 0.3em;
  margin-bottom: 1rem;
}

.markdown-body a {
  color: #58a6ff;
  text-decoration: none;
}

.markdown-body code {
  background: #161b22;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}
```

---

### Step 9: ビルドシステム

**作成ファイル:**

1. `scripts/build.ts`
```typescript
import * as esbuild from 'esbuild';

const commonConfig: esbuild.BuildOptions = {
  bundle: true,
  format: 'esm',
  target: 'chrome120',
  minify: true,
  sourcemap: true,
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
  jsxImportSource: 'preact'
};

console.log('Building Markdown Viewer...');

// Background Script
await esbuild.build({
  ...commonConfig,
  entryPoints: ['src/background/service-worker.ts'],
  outfile: 'dist/background.js'
});

// Content Script
await esbuild.build({
  ...commonConfig,
  entryPoints: ['src/content/index.ts'],
  outfile: 'dist/content.js'
});

console.log('Build completed!');
```

2. `scripts/watch.ts`
```typescript
import * as esbuild from 'esbuild';

// watch モード実装
// ... (省略)
```

---

### Step 10: Phase 1 動作確認

**検証手順:**

1. **ビルド実行**
```bash
deno task build
ls -la dist/  # background.js, content.js 確認
```

2. **Chrome拡張として読み込み**
   - chrome://extensions/ を開く
   - 「デベロッパーモード」有効化
   - 「パッケージ化されていない拡張機能を読み込む」
   - プロジェクトルートを選択

3. **テストMarkdownファイル作成**
```bash
cat > /tmp/test.md <<'EOF'
# Test Markdown

This is **bold** and *italic*.

## Code Block
```javascript
console.log('Hello, world!');
```

## XSS Test (should be blocked)
<script>alert('XSS')</script>
[Click me](javascript:alert('XSS'))
EOF
```

4. **ファイルを開く**
   - Chromeで file:///tmp/test.md を開く

5. **テスト実行**
```bash
deno task test
```

**Phase 1 成功基準:**
- ✅ Markdownが正しく描画される
- ✅ XSS攻撃が防御される（alertダイアログが出ない）
- ✅ テーマが適用される
- ✅ 全テストがパスする

---

## Critical Files

Phase 1実装で最も重要な5つのファイル:

1. **`src/domain/markdown/sanitizer.ts`**
   - セキュリティの要
   - 全Markdown描画で必須使用
   - XSS対策の中核

2. **`src/services/markdown-service.ts`**
   - ビジネスフローの中核
   - domain組み合わせのパターン参照
   - messagingとdomain層の橋渡し

3. **`src/messaging/handlers/background-handler.ts`**
   - ルーティングのみ実装の参考
   - 過去の失敗を繰り返さないための重要ファイル
   - ビジネスロジックを書かない模範例

4. **`src/content/index.ts`**
   - UI層とmessaging I/Oの分離パターン参照
   - domain/services直接呼び出し禁止の実装例

5. **`deno.json`**
   - プロジェクト設定
   - 依存関係管理
   - タスク定義

---

## 検証方法（Phase 1完了時）

### 1. ビルド検証
```bash
deno task build
# 期待: dist/background.js, dist/content.js が生成される
```

### 2. 型チェック
```bash
deno check src/**/*.ts
# 期待: エラーなし
```

### 3. テスト検証
```bash
deno task test
# 期待: 全テストパス
```

### 4. セキュリティ検証
```bash
deno test src/domain/markdown/sanitizer.test.ts
# 期待: XSS攻撃ベクターが全てブロックされる
```

### 5. 実機検証
- Chrome拡張として読み込み
- テストMarkdownファイルを開く
- 描画確認
- XSS攻撃が防御されることを確認

---

## レイヤー間依存関係フロー

```
実装順序（下から上へ）:

Step 2:  shared/types/          ← 型定義（最初）

Step 3:  domain/                ← 純粋関数（TDD）
         ├─ markdown/
         └─ theme/

Step 4:  services/              ← ドメイン組み合わせ（TDD）
         └─ markdown-service

Step 5:  messaging/             ← ルーティングのみ
         ├─ types
         ├─ client
         └─ handlers/

Step 6:  background/            ← Service Worker（messaging I/O のみ）

Step 7:  content/               ← Content Script（UI + messaging I/O のみ）

Step 8:  CSS                    ← スタイル

Step 9:  scripts/               ← ビルドシステム
```

---

## TDDサイクルの徹底

各実装ステップで以下を厳守:

### Red Phase
1. テストファイル作成 (`*.test.ts`)
2. 失敗するテスト実装
3. `deno test` 実行 → RED確認

### Green Phase
4. 実装ファイル作成 (`*.ts`)
5. 最小限の実装でテスト通過
6. `deno test` 実行 → GREEN確認

### Refactor Phase
7. コード改善
8. テストケース追加
9. `deno test` 実行 → GREEN維持確認

---

## 禁止パターンの検出方法

実装後、以下のコマンドでレイヤー違反を検出:

```bash
# messaging層にビジネスロジックがないか
grep -r "marked.parse\|DOMPurify" src/messaging/

# UI層がdomain/servicesを直接呼んでいないか
grep -r "from.*domain\|from.*services" src/content/ src/settings/

# services層がChrome APIを呼んでいないか
grep -r "chrome\." src/services/
```

全て結果なしが正常。

---

このプランは、レイヤー分離、TDD、セキュリティファーストの原則を徹底的に守りながら、段階的にPhase 1（基盤構築）を実装するように設計されています。
