# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Markdown Viewer Chrome拡張機能 - セキュリティファーストなローカルMarkdownファイル表示ツール

**重要**: このプロジェクトは過去の失敗（DuckDB + offscreen）から学んだ教訓を活かした設計になっています。レイヤー分離とTDDを絶対遵守してください。

## 技術スタック

- **開発環境**: Deno 2.x以上
- **ビルド**: esbuild
- **実行環境**: Chrome Extension (Manifest V3)
- **UI Framework**: Preact
- **Markdown Parser**: marked
- **Security**: DOMPurify
- **State Management**: Preact Signals
- **テスト**: Deno標準テストランナー + Playwright (E2E)

## ライブラリ使用時の必須ルール

**⚠️ CRITICAL: 古い情報・記憶による実装は絶対禁止**

ライブラリの使用方法を実装する際は、**必ず以下の手順を踏むこと**：

### 1. Context7 で最新ドキュメントを確認（最優先）

```bash
# 実装前に必ずContext7で公式ドキュメントを検索
mcp__plugin_context7_context7__resolve-library-id
↓
mcp__plugin_context7_context7__query-docs
```

**例：Preact の JSX 設定を確認する場合**
```
Query: "How to configure JSX with TypeScript and esbuild? JSX pragma setup"
Library ID: /preactjs/preact-www
```

### 2. なぜContext7を使うのか

- ❌ **AIの記憶は古い**: 2025年以前の情報で、APIが変わっている可能性が高い
- ❌ **推測で実装**: 動くかもしれないが、非推奨のパターンやバグを含む危険性
- ✅ **Context7は最新**: 公式ドキュメントから最新のコードスニペットと設定を取得
- ✅ **正確性保証**: ベストプラクティスと推奨される方法が明確

### 3. 実装の流れ

1. **調査フェーズ**
   - Context7でライブラリIDを検索
   - 公式ドキュメントから該当する設定・使用方法を取得
   - 複数のコードスニペットを比較検討

2. **実装フェーズ**
   - Context7で得た情報をベースに実装
   - 推測や古い記憶に頼らない

3. **ドキュメント化フェーズ**
   - 調査結果を `docs/` に記録
   - 他の開発者（未来の自分）のために知見を残す

### 4. 対象ライブラリ（例）

このプロジェクトで使用するライブラリは全て対象：

- **Preact**: JSX設定、hooks使用方法、レンダリング
- **esbuild**: ビルド設定、プラグイン、最適化
- **marked**: Markdown変換、拡張機能、オプション
- **DOMPurify**: サニタイゼーション設定、セキュリティ
- **Deno**: モジュール、テスト、権限管理
- **Chrome Extension API**: Manifest V3、Storage API、Messaging

### 5. NG行動パターン

```typescript
// ❌ NG: 記憶だけで実装
import { h } from 'preact'; // ← これで合ってたっけ...？

// ✅ OK: Context7で確認してから実装
// Context7で「Preact JSX classic transform」を検索
// → jsxFactory: 'h' が必要と確認
// → import { h } from 'preact' が必須と確認
import { h } from 'preact';
```

**この教訓は過去の失敗から学んだもの**：
- Preact JSX設定で `h is not defined` エラー
- 古いAPI使用で動かない
- 非推奨パターンでビルドエラー

### 6. 例外: Context7が使えない場合

- ライブラリが見つからない → コードベースを直接分析
- それでも不明 → `docs/` に調査結果を記録してから実装

---

**Remember: "動いた" ≠ "正しい"。Context7で最新の公式情報を確認してから実装すること。**

## コマンド

### 開発コマンド

```bash
# 開発モード（watch）
deno task dev

# ビルド
deno task build

# テスト実行（必ず deno task test を使う！）
deno task test

# テスト（watchモード）
deno task test:watch

# E2Eテスト
deno task test:e2e

# リンティング
deno task lint

# フォーマット
deno task fmt

# 配布用バンドル
deno task bundle

# テストカバレッジ
deno task test --coverage=coverage
deno coverage coverage --lcov > coverage.lcov
```

**⚠️ テスト実行の重要ルール**

- **必ず `deno task test` を使うこと**
  - `deno test` を直接使うと型チェックで失敗する
  - `deno.json` の `tasks.test` に `--allow-all` が設定されている
  - Chrome API モック等、必要な権限が全て含まれている

- **特定ファイルのテストの場合のみ**直接実行可
  - 例: `deno test src/background/state-manager.test.ts --no-check --allow-all`
  - ただし、権限とフラグを忘れずに指定すること

### Chrome拡張として読み込み

1. `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」
4. プロジェクトのルートディレクトリを選択

## アーキテクチャの核心原則

### 1. レイヤー分離の絶対遵守

```
UI層（background/content/offscreen/settings）
  ↓ messaging I/O のみ（ビジネスロジック禁止）
ui-components/
  ↓ 再利用可能なUIパーツ（messaging直接呼び出し禁止）
messaging/
  ↓ ルーティングのみ、serviceへの委譲（ビジネスロジック禁止）
services/
  ↓ ドメイン組み合わせ、ビジネスフロー（Chrome API直接使用禁止）
domain/
  ↓ 純粋なビジネスロジック（他domain依存禁止）
shared/
  汎用ユーティリティ（ドメイン非依存）
```

### 2. 絶対禁止事項（過去の失敗から）

**❌ messaging層にビジネスロジックを書く** - これは過去に大失敗したパターンです！

```typescript
// ❌ NG: messagingでMarkdown処理（死亡フラグ）
export const handleBackgroundMessage = async (message: Message) => {
  const parsed = marked.parse(message.payload.markdown); // ← ダメ！
  const sanitized = DOMPurify.sanitize(parsed); // ← ダメ！
  return { success: true, data: sanitized };
};

// ✅ OK: serviceに委譲
export const handleBackgroundMessage = async (message: Message) => {
  const html = await markdownService.render(
    message.payload.markdown,
    message.payload.themeId
  );
  return { success: true, data: html };
};
```

**❌ UI層（content/settings）がservices/domainを直接呼ぶ**

```typescript
// ❌ NG: content層でdomainを直接呼び出し
import { parseMarkdown } from '../domain/markdown/parser.ts'; // ← ダメ！

// ✅ OK: messaging経由
import { sendMessage } from '../messaging/client.ts';
const html = await sendMessage({ type: 'RENDER_MARKDOWN', payload: { markdown } });
```

**❌ services層がChrome APIを叩く**

```typescript
// ❌ NG: services層でChrome API直接使用
export class ThemeService {
  async load(): Promise<Theme> {
    const result = await chrome.storage.sync.get('theme'); // ← ダメ！
  }
}

// ✅ OK: Chrome API操作はbackground/state-manager.tsで行う
```

**❌ domain層が他のdomainに依存する**

```typescript
// ❌ NG: domain間の依存
// src/domain/markdown/parser.ts
import { loadTheme } from '../theme/loader.ts'; // ← ダメ！

// ✅ OK: services層でdomainを組み合わせる
// src/services/markdown-service.ts
import { parseMarkdown } from '../domain/markdown/parser.ts';
import { loadTheme } from '../domain/theme/loader.ts';
```

### 3. DRY原則の徹底

- 同じロジックは**一度だけ**実装
- 2回目に同じコードを書きたくなったら`shared/`に移動
- 「ほぼ同じ」でも許さない → 共通化してパラメータで分岐

### 4. TDD絶対遵守

**Red-Green-Refactor サイクル**を必ず実行する:

1. **RED**: テストを先に書き、失敗することを確認
2. **GREEN**: 最小限の実装でテストを通す
3. **REFACTOR**: コード品質を改善

```bash
# テストファイルは実装と同層に配置（Denoの思想）
message.ts         # 実装
message.test.ts    # テスト
```

## ディレクトリ構造と責務

```
src/
  background/          # Service Worker層
    責務: messaging I/O のみ、状態管理
    禁止: ビジネスロジック、ドメインロジック
    依存: messaging/, shared/

  content/             # Content Script層
    責務: messaging I/O のみ、UI描画
    禁止: ビジネスロジック、services/domain直接呼び出し
    依存: ui-components/, messaging/, shared/

  offscreen/           # Offscreen Document層（将来用）
    責務: messaging I/O のみ
    禁止: ビジネスロジック
    依存: messaging/, shared/

  settings/            # 設定画面層
    popup/             # クイック設定（ツールバーアイコンクリック）
    options/           # 詳細設定（フルページ）
    責務: messaging I/O のみ、設定UI
    禁止: ビジネスロジック、services/domain直接呼び出し
    依存: ui-components/, messaging/, shared/

  ui-components/       # UI部品層（全UI層で共有）
    markdown/          # Markdown表示用
    settings/          # 設定画面用
    shared/            # 汎用UI
    責務: 再利用可能なUIコンポーネント
    禁止: ビジネスロジック、messaging直接呼び出し
    依存: shared/

  messaging/           # メッセージング層
    責務: ルーティングのみ、serviceへの委譲
    禁止: ビジネスロジック、domain直接呼び出し
    依存: services/, shared/

  services/            # サービス層
    責務: ドメイン組み合わせ、ビジネスフロー
    禁止: Chrome API直接使用、UI処理
    依存: domain/, shared/

  domain/              # ドメイン層（純粋関数のみ）
    markdown/          # Markdown処理
    theme/             # テーマ処理
    file-watcher/      # ファイル監視
    責務: 純粋なビジネスロジック（単一責任）
    禁止: 他domainへの依存、副作用の隠蔽
    依存: shared/

  shared/              # 共通層
    types/             # 型定義
    utils/             # ユーティリティ
    constants/         # 定数
    責務: 汎用ユーティリティ（ドメイン非依存）
    禁止: Chrome API、特定レイヤーへの依存
    依存: なし
```

## セキュリティ要件（最優先）

### XSS Protection

- **DOMPurify**による厳格なHTMLサニタイゼーション必須
- `javascript:` protocol完全ブロック
- `onerror`, `onload`等のイベントハンドラ除去
- **全てのMarkdown描画でsanitizeHTML()を必ず通す**

### セキュリティテスト必須

```typescript
// XSS攻撃ベクターのテスト例
Deno.test('XSS: javascript: protocol', () => {
  const malicious = '<a href="javascript:alert(\'XSS\')">Click</a>';
  const result = sanitizeHTML(malicious);
  assertEquals(result.includes('javascript:'), false);
});
```

### Content Security Policy

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; object-src 'self'"
  }
}
```

## 実装パターン例

### 新しいMarkdown機能の追加

```typescript
// Step 1: domain層に純粋関数を追加 + テスト
// src/domain/markdown/table-formatter.ts
export const formatTable = (html: string): string => {
  // 純粋関数として実装
  return html;
};

// src/domain/markdown/table-formatter.test.ts
Deno.test('formatTable: 基本的な整形', () => {
  const input = '<table>...</table>';
  const output = formatTable(input);
  assertEquals(output.includes('formatted'), true);
});

// Step 2: services層でdomain組み合わせ
// src/services/markdown-service.ts
export class MarkdownService {
  async render(markdown: string, themeId?: string): Promise<string> {
    const theme = await loadTheme(themeId);
    const parsed = parseMarkdown(markdown);
    const sanitized = sanitizeHTML(parsed);
    const formatted = formatTable(sanitized); // ← 追加
    return applyTheme(formatted, theme);
  }
}

// Step 3: messaging層は変更不要（すでにserviceに委譲している）
// Step 4: UI層も変更不要（messagingを使っている）
```

### 新しいメッセージタイプの追加

```typescript
// Step 1: 型定義を追加
// src/shared/types/message.ts
export type Message =
  | { type: 'RENDER_MARKDOWN'; payload: { markdown: string; themeId?: string } }
  | { type: 'EXPORT_PDF'; payload: { markdown: string } }; // ← 追加

// Step 2: services層に実装
// src/services/pdf-service.ts
export class PdfService {
  async generate(markdown: string): Promise<Blob> {
    // PDF生成ロジック
  }
}

// Step 3: messaging層にルーティング追加
// src/messaging/handlers/background-handler.ts
export const handleBackgroundMessage = async (message: Message) => {
  switch (message.type) {
    case 'EXPORT_PDF':
      const pdf = await pdfService.generate(message.payload.markdown);
      return { success: true, data: pdf };
  }
};
```

## デバッグ

### Chrome DevTools

```javascript
// Content Script のデバッグ
console.log('Content Script loaded');

// Background Script のデバッグ
// chrome://extensions/ → 「サービスワーカー」をクリック
```

### ソースマップ

ビルド時に `sourcemap: true` を設定しているため、DevToolsで元のTypeScriptコードをデバッグ可能。

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
2. `deno.json` の imports が正しいか確認（まだない場合は作成が必要）
3. テストファイルのパスが正しいか確認

## 実装前のチェックリスト

### このコードはどのレイヤーか？

- [ ] UI層（background/content/offscreen/settings）
- [ ] UI部品層（ui-components）
- [ ] メッセージング層（messaging）
- [ ] サービス層（services）
- [ ] ドメイン層（domain）
- [ ] 共通層（shared）

### 責務は適切か？

- [ ] UI層 → messaging I/O のみ？
- [ ] messaging層 → ルーティングのみ？
- [ ] services層 → ドメイン組み合わせ？
- [ ] domain層 → 純粋関数？
- [ ] shared層 → ドメイン非依存？

### 既存コード確認

- [ ] 同じ処理が既に存在しないか？
- [ ] 似た処理が他のファイルにないか？
- [ ] `shared/`に汎用化できないか？

### 依存関係は正しいか？

- [ ] import文の方向を確認
- [ ] 逆方向の依存がないか
- [ ] 循環依存がないか

### セキュリティチェック

- [ ] 全てのMarkdown描画でDOMPurify使用
- [ ] `javascript:` プロトコル完全ブロック
- [ ] イベントハンドラ属性除去
- [ ] ユーザー入力の検証

## 重要な心構え

1. **レイヤーを意識** - 今書こうとしているコードはどのレイヤーか
2. **過去の失敗を繰り返さない** - messaging層にビジネスロジックを書かない
3. **型を先に定義** - 実装前に型定義、型で設計を表現
4. **テストを書く** - TDDサイクル遵守、テストできない設計は悪い設計
5. **迷ったら分離** - 「これは共通化すべきか？」→ Yes

## 参考ドキュメント

プロジェクトルートの以下のドキュメントに詳細な情報があります:

- `spec.md` - 機能仕様とフェーズ計画
- `docs/ARCHITECTURE.md` - アーキテクチャ設計の詳細
- `docs/CODING_PRINCIPLES.md` - コーディング原則と実装パターン
- `docs/IMPLEMENTATION_GUIDE.md` - 段階的な実装手順
- `docs/SECURITY.md` - セキュリティ設計と脅威モデル
- `docs/DIRECTORY_STRUCTURE.md` - ディレクトリ構造と責務定義
- `docs/ARCHITECTURE_DECISIONS.md` - アーキテクチャ決定記録

**原則を守れば、offscreen を含む複雑なChrome拡張でも保守性の高いコードベースが実現できます。**
