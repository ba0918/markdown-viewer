# ディレクトリ構造と責務定義

このドキュメントでは、各ディレクトリの**厳密な責務**と**禁止事項**を定義します。

## 📁 全体構造

```
src/
├── background/        # Service Worker層（messaging専用）
├── content/           # Content Script層（UI + messaging専用）
├── offscreen/         # Offscreen Document層（messaging専用）
├── settings/          # 設定画面層
│   ├── popup/
│   └── options/
├── ui-components/     # UI部品層（全UI層で共有）
│   ├── markdown/
│   ├── settings/
│   └── shared/
├── services/          # ドメイン組み合わせ + ビジネスフロー層
│   ├── markdown-service.ts
│   ├── theme-service.ts
│   └── file-watch-service.ts
├── domain/            # ビジネスロジック層（純粋関数）
│   ├── markdown/
│   ├── theme/
│   └── file-watcher/
├── shared/            # 汎用ユーティリティ層（ドメイン非依存）
└── messaging/         # メッセージング層
    ├── types.ts
    ├── router.ts
    ├── client.ts
    └── handlers/
```

## レイヤー構成

| レイヤー | 責務 | 例 |
|---------|------|-----|
| **実行コンテキスト層** | messaging I/O **のみ** | `background/`, `content/`, `offscreen/`, `settings/` |
| **UI部品層** | 再利用可能なUIパーツ | `ui-components/` |
| **サービス層** | ドメイン組み合わせ + ビジネスフロー | `services/` |
| **ドメイン層** | 純粋なビジネスロジック | `domain/` |
| **メッセージング層** | ルーティング **のみ** | `messaging/` |
| **共通層** | 汎用処理（ドメイン非依存） | `shared/` |

---

## 🚨 重要原則: 責務の厳格な分離

### Chrome拡張の特性を考慮した設計

```
❌ 過去の失敗パターン
background/content/offscreen に ビジネスロジックを書く
messaging層 に ビジネスロジックを書く
→ offscreen が絡むと複雑怪奇になり、不具合多発

✅ 成功パターン
background/content/offscreen: messaging I/O のみ
messaging/handlers: ルーティングのみ
services: ビジネスフロー
domain: 純粋関数
→ 各層が単一責任、offscreen でも破綻しない
```

---

## 1. background/ - Service Worker層

### 📋 責務
- **messaging とのやり取り"のみ"**
- Chrome拡張のライフサイクル管理
- タブ間の状態同期

### ✅ 許可される処理
- `chrome.runtime.onMessage.addListener()` によるメッセージ受信
- `chrome.runtime.sendMessage()` によるメッセージ送信
- `messaging/handlers/` への委譲
- `chrome.storage.*` API使用（状態管理のみ）
- `chrome.tabs.*` API使用

### ❌ 絶対禁止
- **ビジネスロジックの実装**
- **ドメインロジックの実装**
- **複数domainの組み合わせ**
- DOM操作（Service WorkerにはDOMがない）
- `services/` や `domain/` の直接呼び出し（必ず `messaging/handlers/` 経由）

### 📂 内部構造

```
background/
├── service-worker.ts      # エントリーポイント（messaging I/O のみ）
└── state-manager.ts       # 状態管理（chrome.storage操作）
```

### 📝 実装例

```typescript
// background/service-worker.ts
import { handleBackgroundMessage } from '../messaging/handlers/background-handler.ts';

// ✅ OK: handlerに委譲するだけ
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleBackgroundMessage(message)
    .then(sendResponse)
    .catch(error => sendResponse({ success: false, error: error.message }));
  return true; // 非同期レスポンス
});

// ❌ NG: ビジネスロジックを直接書く
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'RENDER_MARKDOWN') {
    const parsed = marked.parse(message.payload); // ← ダメ！
    const sanitized = DOMPurify.sanitize(parsed); // ← ダメ！
    sendResponse({ html: sanitized });
  }
});
```

---

## 2. content/ - Content Script層

### 📋 責務
- **messaging とのやり取り"のみ"**
- ページ内でのUI描画
- DOM操作

### ✅ 許可される処理
- DOM操作（`document.*`, `window.*`）
- Preact/Reactコンポーネントのレンダリング
- `chrome.runtime.sendMessage()` によるメッセージ送信
- `ui-components/` の使用
- イベントリスナー登録

### ❌ 絶対禁止
- **ビジネスロジックの実装**
- **ドメインロジックの実装**
- **複数domainの組み合わせ**
- `services/` や `domain/` の直接呼び出し（必ず messaging 経由）
- `chrome.storage` への直接アクセス（messaging経由必須）

### 📂 内部構造

```
content/
├── index.ts                    # エントリーポイント（messaging I/O のみ）
├── components/                 # UIコンポーネント
│   ├── MarkdownViewer.tsx
│   └── ErrorBoundary.tsx
└── styles/
    ├── themes/
    └── markdown.css
```

### 📝 実装例

```typescript
// content/index.ts
import { sendMessage } from '../messaging/client.ts';
import { render } from 'preact';
import { MarkdownViewer } from './components/MarkdownViewer.tsx';

// ✅ OK: messaging経由でserviceを利用
const init = async () => {
  if (!isMarkdownFile()) return;

  const markdown = document.body.textContent || '';

  // background → service に委譲
  const result = await sendMessage({
    type: 'RENDER_MARKDOWN_WITH_HOT_RELOAD',
    payload: { markdown, fileUrl: location.href, themeId: 'github' }
  });

  document.body.innerHTML = '';
  render(
    <MarkdownViewer html={result.html} watcherId={result.watcherId} />,
    document.body
  );
};

// ❌ NG: domainを直接呼び出す
import { parseMarkdown } from '../domain/markdown/parser.ts'; // ← ダメ！
const html = parseMarkdown(markdown); // ← ダメ！
```

---

## 3. offscreen/ - Offscreen Document層

### 📋 責務
- **messaging とのやり取り"のみ"**
- Offscreen APIが必要な処理の実行

### ✅ 許可される処理
- `chrome.runtime.onMessage.addListener()` によるメッセージ受信
- `messaging/handlers/` への委譲
- Offscreen API使用

### ❌ 絶対禁止
- **ビジネスロジックの実装**
- **ドメインロジックの実装**
- `services/` や `domain/` の直接呼び出し（必ず `messaging/handlers/` 経由）

### 📂 内部構造

```
offscreen/
├── index.html
└── index.ts                   # messaging I/O のみ
```

### 📝 実装例

```typescript
// offscreen/index.ts
import { handleOffscreenMessage } from '../messaging/handlers/offscreen-handler.ts';

// ✅ OK: handlerに委譲するだけ
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleOffscreenMessage(message)
    .then(sendResponse)
    .catch(error => sendResponse({ success: false, error: error.message }));
  return true;
});
```

---

## 4. settings/ - 設定画面層

### 📋 責務
- **messaging とのやり取り"のみ"**
- 設定UIの描画
- popup（クイック設定）とoptions（詳細設定）の管理

### popup/ と options/ の違い

| | popup/ | options/ |
|---|--------|----------|
| **表示** | ツールバーアイコンクリック | 右クリック→「拡張機能のオプション」 |
| **サイズ** | 小（数百px） | 大（フルページ） |
| **用途** | クイック操作 | 詳細設定 |
| **manifest** | `action.default_popup` | `options_ui.page` |

### ✅ 許可される処理
- Preactコンポーネント
- `chrome.runtime.sendMessage()` によるメッセージ送信
- `ui-components/` の使用
- 軽量なUI処理

### ❌ 絶対禁止
- **ビジネスロジックの実装**
- **ドメインロジックの実装**
- `services/` や `domain/` の直接呼び出し（必ず messaging 経由）
- `chrome.storage` への直接アクセス（messaging経由必須）

### 📂 内部構造

```
settings/
├── popup/
│   ├── index.tsx              # エントリーポイント（messaging I/O のみ）
│   ├── components/
│   │   └── QuickSettings.tsx
│   └── popup.html
└── options/
    ├── index.tsx              # エントリーポイント（messaging I/O のみ）
    ├── components/
    │   ├── ThemeSettings.tsx
    │   └── HotReloadSettings.tsx
    └── options.html
```

### 📝 実装例

```typescript
// settings/popup/components/QuickSettings.tsx
import { sendMessage } from '../../../messaging/client.ts';
import { ThemeSelector } from '../../../ui-components/settings/ThemeSelector.tsx';

// ✅ OK: messaging経由で設定変更
export const QuickSettings = () => {
  const [theme, setTheme] = useState<Theme>('light');

  const handleThemeChange = async (newTheme: Theme) => {
    await sendMessage({ type: 'UPDATE_THEME', payload: newTheme });
    setTheme(newTheme);
  };

  return <ThemeSelector theme={theme} onChange={handleThemeChange} />;
};
```

---

## 5. ui-components/ - UI部品層

### 📋 責務
- 再利用可能なUIコンポーネント
- **全UI層（content/settings）で共有**

### ✅ 許可される処理
- Preactコンポーネント
- `shared/` の使用
- プロップス経由でのデータ受け取り

### ❌ 絶対禁止
- ビジネスロジックの実装
- `services/` や `domain/` の直接呼び出し
- `chrome.runtime.sendMessage()` （親コンポーネントに委譲）

### 📂 内部構造

```
ui-components/
├── markdown/                  # Markdown表示用
│   ├── CodeBlock.tsx
│   ├── MermaidDiagram.tsx
│   └── SyntaxHighlighter.tsx
├── settings/                  # 設定画面用
│   ├── ThemeSelector.tsx
│   ├── HotReloadToggle.tsx
│   └── SettingsForm.tsx
└── shared/                    # 汎用UI
    ├── Button.tsx
    ├── Select.tsx
    └── Toggle.tsx
```

### 📝 実装例

```typescript
// ui-components/settings/ThemeSelector.tsx
import type { Theme } from '../../shared/types/theme.ts';

// ✅ OK: 純粋なUIコンポーネント
export const ThemeSelector = ({ theme, onChange }: Props) => {
  return (
    <select value={theme} onChange={(e) => onChange(e.currentTarget.value)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="github">GitHub</option>
    </select>
  );
};
```

---

## 6. services/ - サービス層（ドメイン組み合わせ + ビジネスフロー）

### 📋 責務
- **複数domainの組み合わせ**
- **ビジネスフローの実装**
- domain層の呼び出し
- トランザクション管理

### ✅ 許可される処理
- 複数 domain の組み合わせ
- ビジネスフロー実装
- `domain/` の呼び出し
- `shared/` の呼び出し
- エラーハンドリング

### ❌ 絶対禁止
- Chrome API 直接使用（`chrome.storage`, `chrome.runtime` など）
- UI コンポーネント
- DOM 操作
- メッセージ送受信（messaging層の責務）

### 📂 内部構造

```
services/
├── markdown-service.ts
├── markdown-service.test.ts
├── theme-service.ts
├── theme-service.test.ts
└── file-watch-service.ts
```

### 📝 実装例

```typescript
// services/markdown-service.ts
import { parseMarkdown } from '../domain/markdown/parser.ts';
import { sanitizeHTML } from '../domain/markdown/sanitizer.ts';
import { highlightCode } from '../domain/markdown/highlighter.ts';
import { loadTheme } from '../domain/theme/loader.ts';
import { applyTheme } from '../domain/theme/applier.ts';
import { FileWatcher } from '../domain/file-watcher/watcher.ts';

/**
 * Markdownレンダリングサービス
 * 責務: 複数のドメインロジックを組み合わせて1つのビジネスフローを実現
 */
export class MarkdownService {
  /**
   * Markdownを完全にレンダリング
   * ✅ OK: 複数domainを組み合わせたビジネスフロー
   */
  async render(markdown: string, themeId?: string): Promise<string> {
    // 1. テーマ読み込み（domain/theme）
    const theme = await loadTheme(themeId);

    // 2. Markdown解析（domain/markdown）
    const parsed = parseMarkdown(markdown);

    // 3. サニタイズ（domain/markdown）
    const sanitized = sanitizeHTML(parsed);

    // 4. シンタックスハイライト（domain/markdown）
    const highlighted = highlightCode(sanitized);

    // 5. テーマ適用（domain/theme）
    return applyTheme(highlighted, theme);
  }

  /**
   * Hot Reload機能付きでレンダリング
   * ✅ OK: さらに複雑なビジネスフロー
   */
  async renderWithHotReload(params: {
    markdown: string;
    fileUrl: string;
    themeId?: string;
  }): Promise<{ html: string; watcherId: string }> {
    // 基本レンダリング
    const html = await this.render(params.markdown, params.themeId);

    // ファイル監視開始（domain/file-watcher）
    const watcher = new FileWatcher(params.fileUrl);
    await watcher.start();

    return { html, watcherId: watcher.id };
  }
}

export const markdownService = new MarkdownService();
```

---

## 7. domain/ - ドメイン層（純粋なビジネスロジック）

### 📋 責務
- **ドメイン固有のビジネスロジック（単一責任）**
- **純粋関数**
- UIから完全に分離

### ✅ 許可される処理
- ドメインロジックの実装
- 純粋関数
- `shared/` の呼び出し
- テスト可能な処理

### ❌ 絶対禁止
- 他の domain への依存
- Chrome API 使用
- UI 処理
- 副作用の隠蔽

### 📂 内部構造

```
domain/
├── markdown/
│   ├── parser.ts              # Markdown→HTML変換
│   ├── parser.test.ts
│   ├── sanitizer.ts           # XSS対策（DOMPurify wrapper）
│   ├── sanitizer.test.ts
│   └── highlighter.ts         # シンタックスハイライト
├── theme/
│   ├── loader.ts              # テーマ読み込み
│   ├── applier.ts             # テーマ適用
│   ├── validator.ts           # テーマバリデーション
│   └── theme.test.ts
└── file-watcher/
    ├── watcher.ts             # ファイル監視ロジック
    ├── watcher.test.ts
    └── hash.ts                # ハッシュ計算
```

### 📝 実装例

```typescript
// domain/markdown/parser.ts
import { marked } from 'marked';

/**
 * Markdown → HTML 変換
 * ✅ OK: 純粋関数、単一責任
 */
export const parseMarkdown = (markdown: string): string => {
  marked.setOptions({
    gfm: true,
    breaks: true
  });

  return marked.parse(markdown) as string;
};

// domain/theme/applier.ts
import type { Theme } from '../../shared/types/theme.ts';

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

## 8. messaging/ - メッセージング層

### 📋 責務
- **メッセージルーティング"のみ"**
- 型安全なメッセージング
- メッセージの検証

### ✅ 許可される処理
- メッセージ型定義
- メッセージルーティング（どのserviceを呼ぶか判断）
- 型チェック・バリデーション
- エラーハンドリング
- `services/` への委譲

### ❌ 絶対禁止
- **ビジネスロジックの実装**
- **ドメインロジックの実装**
- **複数domainの組み合わせ**
- `domain/` の直接呼び出し（必ず `services/` 経由）
- 状態管理

### 📂 内部構造

```
messaging/
├── types.ts               # メッセージ型定義
├── router.ts              # メッセージルーター
├── client.ts              # クライアント側ヘルパー
├── guards.ts              # Type Guards
└── handlers/              # コンテキスト別ハンドラ（ルーティング専用）
    ├── background-handler.ts
    ├── content-handler.ts
    └── offscreen-handler.ts
```

### 📝 実装例

```typescript
// messaging/types.ts
export type Message =
  | { type: 'RENDER_MARKDOWN'; payload: { markdown: string; themeId?: string } }
  | { type: 'RENDER_MARKDOWN_WITH_HOT_RELOAD'; payload: { markdown: string; fileUrl: string; themeId?: string } }
  | { type: 'LOAD_THEME'; payload: { themeId: string } }
  | { type: 'UPDATE_THEME'; payload: Theme };

export type MessageResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

// messaging/handlers/background-handler.ts
import { markdownService } from '../../services/markdown-service.ts';
import { themeService } from '../../services/theme-service.ts';
import type { Message, MessageResponse } from '../types.ts';

/**
 * background層のメッセージハンドラ
 * ✅ OK: ルーティングのみ、serviceに委譲
 */
export const handleBackgroundMessage = async (
  message: Message
): Promise<MessageResponse> => {
  switch (message.type) {
    case 'RENDER_MARKDOWN':
      // ✅ OK: serviceに委譲するだけ
      const html = await markdownService.render(
        message.payload.markdown,
        message.payload.themeId
      );
      return { success: true, data: html };

    case 'LOAD_THEME':
      // ✅ OK: serviceに委譲するだけ
      const theme = await themeService.load(message.payload.themeId);
      return { success: true, data: theme };

    default:
      return { success: false, error: 'Unknown message type' };
  }
};

// ❌ NG例: messagingでビジネスロジック
export const handleBackgroundMessageBAD = async (message: Message) => {
  switch (message.type) {
    case 'RENDER_MARKDOWN':
      // ❌ ダメ！！！ ここでビジネスロジックを書いてはいけない！
      const parsed = marked.parse(message.payload.markdown);
      const sanitized = DOMPurify.sanitize(parsed);
      const theme = await chrome.storage.sync.get('theme');
      const styled = applyTheme(sanitized, theme);
      return { success: true, data: styled };
  }
};

// messaging/client.ts
export const sendMessage = async <T = unknown>(
  message: Message
): Promise<T> => {
  const response = await chrome.runtime.sendMessage(message);

  if (!response.success) {
    throw new Error(response.error);
  }

  return response.data as T;
};
```

---

## 9. shared/ - 汎用ユーティリティ層

### 📋 責務
- **ドメイン非依存**な汎用コード
- 型定義
- ユーティリティ関数
- 定数定義

### ✅ 許可される処理
- 純粋関数
- 型定義
- 定数定義
- ドメイン非依存な処理

### ❌ 絶対禁止
- Chrome API直接使用
- 特定レイヤーへの依存
- ドメイン固有のロジック
- 副作用のある処理

### 📂 内部構造

```
shared/
├── types/                     # 型定義（ドメイン非依存）
│   ├── message.ts            # メッセージ型
│   ├── theme.ts              # テーマ型
│   └── state.ts              # 状態型
├── utils/                     # 汎用ユーティリティ
│   ├── string.ts             # 文字列操作
│   ├── array.ts              # 配列操作
│   └── object.ts             # オブジェクト操作
└── constants/                 # 定数
    ├── themes.ts             # テーマ定数
    └── defaults.ts           # デフォルト値
```

### 📝 実装例

```typescript
// shared/types/theme.ts
export type Theme =
  | 'light'
  | 'dark'
  | 'github'
  | 'minimal'
  | 'solarized_light'
  | 'solarized_dark';

// shared/utils/string.ts
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

// shared/constants/themes.ts
export const PRESET_THEMES = {
  light: 'Light Theme',
  dark: 'Dark Theme',
  github: 'GitHub Style',
  minimal: 'Minimal',
  solarized_light: 'Solarized Light',
  solarized_dark: 'Solarized Dark'
} as const;
```

---

## 📊 メッセージフロー全体像

```
┌────────────────────────────────────────────────────────────┐
│         Complete Message Flow (offscreen対応)              │
└────────────────────────────────────────────────────────────┘

Pattern 1: シンプル（background経由）
┌─────────┐   ┌──────────────┐   ┌─────────┐   ┌────────┐
│ content │──→│  background  │──→│messaging│──→│service │
│         │   │              │   │ handler │   │        │
│         │   │              │   │         │   ├────────┤
│         │   │              │   │         │   │ domain │
│         │←──│              │←──│         │←──│ domain │
└─────────┘   └──────────────┘   └─────────┘   └────────┘
   UI層         messaging送受信      ルーティング   ビジネス
                のみ                 のみ          ロジック

Pattern 2: 複雑（offscreen経由 - DuckDBケース）
┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  ┌────────┐
│ content │─→│background│─→│offscreen │─→│messaging│─→│service │
│         │  │          │  │          │  │ handler │  │        │
│         │  │          │  │          │  │         │  ├────────┤
│         │  │          │  │          │  │         │  │ domain │
│         │←─│          │←─│          │←─│         │←─│ domain │
└─────────┘  └──────────┘  └──────────┘  └─────────┘  └────────┘
   UI層      messaging     messaging       ルーティング   ビジネス
            中継のみ      送受信のみ         のみ        ロジック
```

---

## 📊 依存関係図

```
┌──────────────────────────────────────────────────────┐
│              UI Layer (実行コンテキスト)                │
│  background/ content/ offscreen/ settings/           │
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

### ルール
1. **上位層 → 下位層のみ許可**
   - `services/` → `domain/` → `shared/` ✅
   - `shared/` → `domain/` ❌

2. **実行コンテキスト層は messaging 経由のみ**
   - `content/` → `messaging/` → `services/` ✅
   - `content/` → `services/` ❌（直接呼び出し禁止）

3. **messaging層は services 経由のみ**
   - `messaging/handlers/` → `services/` ✅
   - `messaging/handlers/` → `domain/` ❌（直接呼び出し禁止）

4. **横方向の依存は禁止**
   - `background/` → `content/` ❌
   - `popup/` → `options/` ❌

5. **循環依存は絶対禁止**
   - A → B → A ❌

---

## 🔍 実装時のチェックポイント

### ファイルを作成する前に
1. **このファイルはどのレイヤーか？**
   - 責務を明確に定義
   - 適切なディレクトリに配置

2. **依存関係は正しいか？**
   - import文の方向を確認
   - 逆方向の依存がないか

3. **重複していないか？**
   - 既存のコードを検索
   - 共通化できる処理か判断

### コードレビュー時
1. **レイヤー違反がないか**
   - background/content/offscreen に ビジネスロジックがないか
   - messaging層 に ビジネスロジックがないか
   - UIコンポーネントに domain 直接呼び出しがないか

2. **責務が適切か**
   - ファイルが単一責任になっているか
   - 関数が純粋か、副作用が明示されているか

3. **型安全性**
   - `any`型が使われていないか
   - 型定義が厳密か

---

## 📖 ベストプラクティス

### 1. 新しい機能を追加するとき

```typescript
// ❌ NG: コンポーネントに全部詰め込む
const MarkdownViewer = ({ markdown }: Props) => {
  // ビジネスロジックをUI層に書いてはいけない
  const rawHTML = marked.parse(markdown);
  const cleanHTML = DOMPurify.sanitize(rawHTML);
  const highlightedHTML = hljs.highlightAuto(cleanHTML).value;

  return <div dangerouslySetInnerHTML={{ __html: highlightedHTML }} />;
};

// ✅ OK: レイヤー分離
// 1. domain/markdown/parser.ts
export const parseMarkdown = (md: string): string => {
  const raw = marked.parse(md) as string;
  return sanitizeHTML(raw);
};

// 2. services/markdown-service.ts
export class MarkdownService {
  async render(markdown: string, themeId?: string): Promise<string> {
    const parsed = parseMarkdown(markdown);
    const highlighted = highlightCode(parsed);
    const theme = await loadTheme(themeId);
    return applyTheme(highlighted, theme);
  }
}

// 3. messaging/handlers/background-handler.ts
case 'RENDER_MARKDOWN':
  const html = await markdownService.render(
    message.payload.markdown,
    message.payload.themeId
  );
  return { success: true, data: html };

// 4. content/components/MarkdownViewer.tsx
const MarkdownViewer = ({ markdown }: Props) => {
  const [html, setHtml] = useState('');

  useEffect(() => {
    sendMessage({
      type: 'RENDER_MARKDOWN',
      payload: { markdown, themeId: 'github' }
    }).then(setHtml);
  }, [markdown]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};
```

### 2. offscreen を使う場合

```typescript
// ✅ OK: offscreen でも責務分離を維持

// 1. services/database-service.ts
export class DatabaseService {
  async query(sql: string): Promise<QueryResult> {
    // DuckDB を使ったクエリ実行
    // （この実装はoffscreenで実行される必要がある）
  }
}

// 2. messaging/handlers/offscreen-handler.ts
case 'EXECUTE_QUERY':
  const result = await databaseService.query(message.payload.sql);
  return { success: true, data: result };

// 3. offscreen/index.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleOffscreenMessage(message)
    .then(sendResponse)
    .catch(error => sendResponse({ success: false, error: error.message }));
  return true;
});

// 4. content/index.ts
const result = await sendMessage({
  type: 'EXECUTE_QUERY',
  payload: { sql: 'SELECT * FROM users' }
});
```

---

このディレクトリ構造と責務定義に従うことで、**offscreen を含む複雑なChrome拡張でも保守性が高く、テストしやすく、拡張可能な**コードベースを実現できます。
