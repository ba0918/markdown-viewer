# ディレクトリ構造と責務定義

このドキュメントでは、各ディレクトリの**厳密な責務**と**禁止事項**を定義します。

## 📁 全体構造

```
src/
├── background/        # Service Worker層（messaging専用）
├── content/           # Content Script層（UI + messaging専用）
├── settings/          # 設定画面層
│   ├── popup/
│   ├── options/
│   └── shared/
├── ui-components/     # UI部品層（全UI層で共有）
│   ├── markdown/
│   └── shared/
├── services/          # ドメイン組み合わせ + ビジネスフロー層
│   ├── markdown-service.ts
│   └── toc-service.ts
├── domain/            # ビジネスロジック層（純粋関数）
│   ├── markdown/
│   ├── theme/
│   ├── toc/
│   ├── math/
│   └── frontmatter/
├── shared/            # 汎用ユーティリティ層（ドメイン非依存）
└── messaging/         # メッセージング層
    ├── types.ts
    ├── client.ts
    └── handlers/
        ├── background-handler.ts
        ├── action-registry.ts
        └── actions/
```

## レイヤー構成

| レイヤー               | 責務                                | 例                                     |
| ---------------------- | ----------------------------------- | -------------------------------------- |
| **実行コンテキスト層** | messaging I/O **のみ**              | `background/`, `content/`, `settings/` |
| **UI部品層**           | 再利用可能なUIパーツ                | `ui-components/`                       |
| **サービス層**         | ドメイン組み合わせ + ビジネスフロー | `services/`                            |
| **ドメイン層**         | 純粋なビジネスロジック              | `domain/`                              |
| **メッセージング層**   | ルーティング **のみ**               | `messaging/`                           |
| **共通層**             | 汎用処理（ドメイン非依存）          | `shared/`                              |

---

## 🚨 重要原則: 責務の厳格な分離

### Chrome拡張の特性を考慮した設計

```
❌ 過去の失敗パターン
background/content に ビジネスロジックを書く
messaging層 に ビジネスロジックを書く
→ 複雑怪奇になり、不具合多発

✅ 成功パターン
background/content: messaging I/O のみ
messaging/handlers: ルーティングのみ
services: ビジネスフロー
domain: 純粋関数
→ 各層が単一責任
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

---

## 2. content/ - Content Script層

### 📋 責務

- **messaging とのやり取り"のみ"**
- ページ内でのUI描画
- DOM操作

### ✅ 許可される処理

- DOM操作（`document.*`, `window.*`）
- Preactコンポーネントのレンダリング
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
├── hot-reload.ts               # Hot Reload機能
├── relative-links.ts           # 相対リンク処理
├── theme-loader.ts             # テーマローダー
├── components/
│   ├── MarkdownViewer.tsx      # メインビューアコンポーネント
│   ├── ErrorBoundary.tsx       # エラーバウンダリ
│   └── hooks/                  # MarkdownViewer専用カスタムフック（ADR-007例外）
│       ├── useCopyButtons.ts   # コードブロックコピーボタン
│       ├── useMathJax.ts       # MathJax数式レンダリング
│       └── useMermaid.ts       # Mermaidダイアグラムレンダリング
└── styles/                     # (empty)
```

### 📝 実装例

```typescript
// content/index.ts
import { sendMessage } from "../messaging/client.ts";
import { render } from "preact";
import { MarkdownViewer } from "./components/MarkdownViewer.tsx";

// ✅ OK: messaging経由でserviceを利用
const init = async () => {
  if (!isMarkdownFile()) return;

  const markdown = document.body.textContent || "";

  // background → service に委譲
  const result = await sendMessage({
    type: "RENDER_MARKDOWN",
    payload: { markdown },
  });

  document.body.innerHTML = "";
  render(<MarkdownViewer html={result.html} />, document.body);
};

// ❌ NG: domainを直接呼び出す
import { parseMarkdown } from "../domain/markdown/parser.ts"; // ← ダメ！
const html = parseMarkdown(markdown); // ← ダメ！
```

---

## 3. settings/ - 設定画面層

### 📋 責務

- **messaging とのやり取り"のみ"**
- 設定UIの描画
- popup（クイック設定）とoptions（詳細設定）の管理

### popup/ と options/ の違い

|              | popup/                     | options/                            |
| ------------ | -------------------------- | ----------------------------------- |
| **表示**     | ツールバーアイコンクリック | 右クリック→「拡張機能のオプション」 |
| **サイズ**   | 小（数百px）               | 大（フルページ）                    |
| **用途**     | クイック操作               | 詳細設定                            |
| **manifest** | `action.default_popup`     | `options_ui.page`                   |

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
│   ├── index.tsx              # エントリーポイント
│   ├── App.tsx
│   ├── popup.html
│   ├── popup.css
│   └── components/
│       └── ThemeSelector.tsx
├── options/
│   ├── index.tsx              # エントリーポイント
│   ├── App.tsx
│   ├── options.html
│   ├── options.css
│   └── components/
│       ├── ThemeSelector.tsx
│       ├── HotReloadSettings.tsx
│       └── RemoteUrlSettings.tsx
└── shared/
    ├── components/
    │   └── SettingsLayout.tsx
    └── hooks/
        └── useSettings.ts
```

---

## 4. ui-components/ - UI部品層

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
├── markdown/                 # Markdown表示用
│   ├── DocumentHeader/       # ドキュメントヘッダーメニュー（Export等）
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
    └── Toast/                # トースト通知システム
        ├── Toast.tsx
        ├── ToastContainer.tsx
        ├── toast-manager.ts
        ├── types.ts
        ├── Toast.test.tsx
        └── index.ts
```

---

## 5. services/ - サービス層（ドメイン組み合わせ + ビジネスフロー）

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
├── markdown-service.ts        # Markdownレンダリングパイプライン
├── markdown-service.test.ts
├── toc-service.ts             # TOC生成サービス（domain組み合わせ）
└── toc-service.test.ts
```

### 📝 実装例

```typescript
// services/markdown-service.ts
import { parseMarkdown } from "../domain/markdown/parser.ts";
import { sanitizeHTML } from "../domain/markdown/sanitizer.ts";
import { addHeadingIds } from "../domain/toc/html-processor.ts";
import { parseFrontmatter } from "../domain/frontmatter/parser.ts";
import { tocService } from "./toc-service.ts";

export class MarkdownService {
  render(markdown: string): RenderResult {
    const { data: frontmatter, content } = parseFrontmatter(markdown);
    const parsed = parseMarkdown(content);
    const sanitized = sanitizeHTML(parsed);
    // 見出しIDとToCのIDを同一の走査結果から生成する
    const { html, headings } = addHeadingIds(sanitized);
    const tocItems = tocService.generateToc(headings);
    return { html, rawMarkdown: markdown, content, frontmatter, tocItems };
  }
}

export const markdownService = new MarkdownService();
```

---

## 6. domain/ - ドメイン層（純粋なビジネスロジック）

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
│   ├── sanitizer.ts           # XSS対策（xss (js-xss) wrapper）
│   ├── sanitizer.test.ts
│   ├── highlighter.ts         # シンタックスハイライト
│   ├── highlighter.test.ts
│   ├── mermaid-detector.ts    # Mermaidブロック検出
│   ├── mermaid-detector.test.ts
│   ├── mermaid-renderer.ts    # Mermaidダイアグラムレンダリング
│   └── mermaid-renderer.test.ts
├── theme/
│   ├── loader.ts              # テーマ読み込み
│   ├── loader.test.ts
│   └── types.ts               # テーマ型定義
├── toc/
│   ├── heading-id.ts          # 見出しID生成
│   ├── heading-id.test.ts
│   ├── html-processor.ts      # HTML見出しID付与 + 見出し抽出
│   ├── html-processor.test.ts
│   ├── normalizer.ts          # 見出しレベル正規化
│   ├── normalizer.test.ts
│   ├── tree-builder.ts        # ツリー構造構築
│   ├── tree-builder.test.ts
│   └── types.ts               # ToC型定義
├── math/
│   ├── detector.ts            # 数式検出
│   ├── detector.test.ts
│   ├── renderer.ts            # MathJaxレンダリング
│   └── renderer.test.ts
└── frontmatter/
    ├── parser.ts              # YAML Frontmatter解析（プロトタイプ汚染防止付き）
    ├── parser.test.ts
    └── types.ts               # Frontmatter型定義
```

---

## 7. messaging/ - メッセージング層

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
├── types.ts                   # メッセージ型定義
├── client.ts                  # クライアント側ヘルパー
├── client.test.ts
└── handlers/
    ├── background-handler.ts  # バックグラウンドハンドラ（Action Pattern）
    ├── background-handler.test.ts
    ├── action-registry.ts     # アクション登録・ルーティング
    ├── action-types.ts        # アクション型定義
    └── actions/               # 個別アクション（各serviceに委譲）
        ├── action-registry.test.ts
        ├── render-markdown.ts     # Markdownレンダリング
        ├── render-markdown.test.ts
        ├── load-theme.ts          # テーマ読込
        ├── load-theme.test.ts
        ├── update-theme.ts        # テーマ更新
        ├── update-theme.test.ts
        ├── validate-theme.ts      # テーマ検証
        ├── validate-theme.test.ts
        ├── get-settings.ts        # 設定取得
        ├── get-settings.test.ts
        ├── update-hot-reload.ts   # Hot Reload更新
        ├── update-hot-reload.test.ts
        ├── check-file-change.ts   # ファイル変更チェック
        └── check-file-change.test.ts
```

### 📝 実装例

```typescript
// messaging/handlers/background-handler.ts
// Action Patternで各アクションに委譲
import { actionRegistry } from "./action-registry.ts";

export const handleBackgroundMessage = async (
  message: Message,
): Promise<MessageResponse> => {
  const action = actionRegistry.get(message.type);
  if (!action) {
    return { success: false, error: "Unknown message type" };
  }
  return action(message);
};
```

---

## 8. shared/ - 汎用ユーティリティ層

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
│   ├── chrome.d.ts            # Chrome API型定義
│   ├── custom-origin.ts       # カスタムオリジン型
│   ├── message.ts             # メッセージ型
│   ├── render.ts              # レンダリング結果型
│   ├── state.ts               # 状態型
│   ├── theme.ts               # テーマ型
│   ├── toc.ts                 # TOC型定義
│   └── view-mode.ts           # 表示モード型
├── utils/                     # 汎用ユーティリティ
│   ├── encode.ts              # Base64エンコード
│   ├── escape-html.ts         # HTMLエスケープ（XSS対策）
│   ├── hash.ts                # SHA-256ハッシュ計算
│   ├── logger.ts              # ログユーティリティ（DEBUG連動）
│   ├── markdown-detector.ts   # Markdown拡張子判定
│   ├── origin-validator.ts    # カスタムオリジンバリデーション
│   ├── toggle-set-item.ts     # 配列要素トグル操作
│   ├── unique-id.ts           # ユニークID生成
│   ├── url-resolver.ts        # 相対URL解決
│   ├── url-validator.ts       # ローカルURL判定
│   ├── validators.ts          # 汎用バリデーション型
│   └── wsl-detector.ts        # WSL2環境検出
└── constants/                 # 定数
    ├── themes.ts              # テーマ定数
    └── markdown.ts            # Markdown拡張子定義（manifest.jsonと同期必須）
```

---

## 📊 メッセージフロー全体像

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
```

---

## 📊 依存関係図

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
   - background/content に ビジネスロジックがないか
   - messaging層 に ビジネスロジックがないか
   - UIコンポーネントに domain 直接呼び出しがないか

2. **責務が適切か**
   - ファイルが単一責任になっているか
   - 関数が純粋か、副作用が明示されているか

3. **型安全性**
   - `any`型が使われていないか
   - 型定義が厳密か

---

このディレクトリ構造と責務定義に従うことで、**保守性が高く、テストしやすく、拡張可能な**コードベースを実現できます。
