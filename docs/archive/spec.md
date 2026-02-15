# SPEC

ローカルのmarkdownを開いた時、サーバから text/markdown
なテキストを受け取った時に markdown-viewerで表示を行う chrome拡張機能。
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
    background/        # Service Worker層（messaging I/O のみ）
      service-worker.ts
      state-manager.ts

    content/           # Content Script層（UI + messaging I/O のみ）
      index.ts
      components/
        MarkdownViewer.tsx
        ErrorBoundary.tsx
      styles/
        themes/
          light.css
          dark.css
          github.css
          minimal.css
          solarized-light.css
          solarized-dark.css
        markdown.css

    offscreen/         # Offscreen Document層（将来用、messaging I/O のみ）
      index.html
      index.ts

    settings/          # 設定画面層（messaging I/O のみ）
      popup/           # クイック設定
        index.tsx
        components/
          QuickSettings.tsx
        popup.html
      options/         # 詳細設定
        index.tsx
        components/
          ThemeSettings.tsx
          HotReloadSettings.tsx
        options.html

    ui-components/     # UI部品層（全UI層で共有）
      markdown/        # Markdown表示用
        CodeBlock.tsx
        MermaidDiagram.tsx
        SyntaxHighlighter.tsx
      settings/        # 設定画面用
        ThemeSelector.tsx
        HotReloadToggle.tsx
        SettingsForm.tsx
      shared/          # 汎用UI
        Button.tsx
        Select.tsx
        Toggle.tsx

    services/          # サービス層（ドメイン組み合わせ + ビジネスフロー）
      markdown-service.ts
      markdown-service.test.ts
      theme-service.ts
      theme-service.test.ts
      file-watch-service.ts

    domain/            # ドメイン層（純粋なビジネスロジック）
      markdown/
        parser.ts      # Markdown parsing
        parser.test.ts
        sanitizer.ts   # XSS対策
        sanitizer.test.ts
        highlighter.ts # シンタックスハイライト
      theme/
        loader.ts      # テーマ読み込み
        applier.ts     # テーマ適用
        validator.ts
        theme.test.ts
      file-watcher/
        watcher.ts     # ファイル監視
        watcher.test.ts
        hash.ts

    shared/            # 汎用ユーティリティ層（ドメイン非依存）
      types/
        message.ts
        theme.ts
        state.ts
      utils/
        string.ts      # 文字列操作
        array.ts       # 配列操作
        object.ts      # オブジェクト操作
      constants/
        themes.ts
        defaults.ts

    messaging/         # メッセージング層（ルーティングのみ）
      types.ts
      router.ts
      client.ts
      guards.ts
      handlers/        # コンテキスト別ハンドラ
        background-handler.ts
        content-handler.ts
        offscreen-handler.ts

  docs/                # ドキュメント群
  e2e/                 # E2Eテスト (Playwright)
  scripts/             # ビルドスクリプト
    build.ts
    watch.ts
    bundle.ts
```

### レイヤー責務定義

| レイヤー                                  | 責務                                 | 禁止事項                                |
| ----------------------------------------- | ------------------------------------ | --------------------------------------- |
| **background/content/offscreen/settings** | messaging I/O のみ                   | ビジネスロジック、ドメイン組み合わせ    |
| **ui-components**                         | 再利用可能なUIパーツ                 | ビジネスロジック、messaging直接呼び出し |
| **messaging/handlers**                    | ルーティングのみ、serviceへの委譲    | ビジネスロジック、domain直接呼び出し    |
| **services**                              | ドメイン組み合わせ、ビジネスフロー   | Chrome API直接使用、UI処理              |
| **domain**                                | 純粋なビジネスロジック（単一責任）   | 他domainへの依存、副作用の隠蔽          |
| **shared**                                | 汎用ユーティリティ（ドメイン非依存） | Chrome API、特定レイヤーへの依存        |

### メッセージフロー

```
UI層（content/settings）
  ↓ chrome.runtime.sendMessage()
background層
  ↓ 委譲
messaging/handlers
  ↓ serviceへの委譲
services層（ドメイン組み合わせ）
  ↓ domain呼び出し
domain層（純粋関数）
  ↓ shared呼び出し
shared層（汎用ユーティリティ）
```

**重要**: offscreen が絡む場合も同じフローを維持。 各層が messaging I/O
のみに専念することで、複雑なメッセージ経路でも破綻しない。

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

## 状態管理

### AppState定義

```typescript
interface AppState {
  // テーマ設定
  theme:
    | "light"
    | "dark"
    | "github"
    | "minimal"
    | "solarized_light"
    | "solarized_dark";

  // Hot Reload設定
  hotReloadEnabled: boolean;
  hotReloadInterval: number; // 0 = タブフォーカス時のみ
  autoReload: boolean; // true = 通知なし自動リロード
}
```

### 永続化

- `chrome.storage.sync` で設定を同期
- Preact Signalsで状態管理

## エラーハンドリング

### 必須対応

1. ファイル読み込み失敗 → エラーメッセージ表示
2. Markdown解析エラー → フォールバック表示
3. Mermaid/MathJax初期化失敗 → Graceful degradation
4. 権限不足 → 権限リクエストプロンプト表示
5. 大きすぎるファイル → 警告表示

## パフォーマンス対策

### 必須対応

1. **Lazy Rendering**
   - Mermaid diagramの遅延描画（IntersectionObserver使用）
   - 画像のLazy Load

2. **Dynamic Import**
   - Mermaid、MathJaxは必要時のみロード
   - シンタックスハイライトの言語別ロード

3. **Virtual Scrolling** (Optional)
   - 大規模ファイル対応時に検討

## 実装フェーズ

### Phase 1: 基盤構築（MVP）

1. Manifest V3基本設定
2. Markdownパーサー（marked + DOMPurify）
3. Basic Themes（Light/Dark）
4. シンタックスハイライト（highlight.js）
5. セキュリティテスト（XSS防御確認）

### Phase 2: 拡張機能

6. GitHub Flavored Markdown (GFM)
7. MathJax数式表示
8. Mermaidダイアグラム（Dynamic Import）
9. 残りのプリセットテーマ（GitHub, Minimal, Solarized）

### Phase 3: ユーザー体験向上

10. Hot Reload機能（タブフォーカス+定期チェック）
11. 設定画面（Options Page）
12. 状態管理（chrome.storage.sync）
13. エラーハンドリング完全実装

### Phase 4: 品質向上

14. パフォーマンス最適化
15. E2Eテストカバレッジ向上
16. CI/CD整備
