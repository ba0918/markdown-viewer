# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## プロジェクト概要

Markdown Viewer Chrome拡張機能 -
セキュリティファーストなローカルMarkdownファイル表示ツール

**重要**: このプロジェクトは過去の失敗（DuckDB +
offscreen）から学んだ教訓を活かした設計になっています。レイヤー分離とTDDを絶対遵守してください。

## 技術スタック

- **開発環境**: Deno 2.x以上
- **ビルド**: esbuild
- **実行環境**: Chrome Extension (Manifest V3)
- **UI Framework**: Preact
- **Markdown Parser**: marked
- **Security**: DOMPurify
- **State Management**: Preact Signals
- **テスト**: Deno標準テストランナー + Playwright (E2E)

## 開発フロー必須ルール

### 1. ライブラリ使用時: Context7で最新情報確認

**⚠️ CRITICAL: AIの記憶は古い。必ずContext7で公式ドキュメント確認**

```bash
# 実装前にContext7で公式ドキュメント検索
mcp__plugin_context7_context7__resolve-library-id
mcp__plugin_context7_context7__query-docs
```

- ✅ Context7: 最新の公式ドキュメント、ベストプラクティス
- ❌ AI記憶: 古いAPI、非推奨パターン、ビルドエラーの原因

対象: Preact, esbuild, marked, DOMPurify, Deno, Chrome Extension API 全て

### 2. コミット管理: 未コミット蓄積の絶対防止

**⚠️ CRITICAL: 未コミットの蓄積は技術的負債。こまめなコミット必須**

#### 必須コミットタイミング

1. **機能単位の完成時** - テスト通過後、即コミット
2. **1ファイル以上の変更完了時** - 論理的なまとまりで即コミット
3. **作業セッション終了時** - 必ず `git status` 確認、コミット
4. **別タスク開始前** - 現在の変更を確実にコミット

#### コミット前チェック

```bash
# 毎回実行
git status
git diff

# 変更が2ファイル以上 or 1時間経過したら即コミット
```

#### 禁止事項

- ❌ 複数機能の変更を1コミットにまとめる
- ❌ 「後でまとめてコミット」の思考
- ❌ 10ファイル以上の未コミット放置
- ❌ 異なるレイヤー（domain/services/UI）の変更混在

#### `smart-commit` skill の活用

```
ユーザーが「コミットして」と言った時:
1. git status/diff で変更分析
2. 論理的な単位に分割（feat/fix/docs/style）
3. Conventional Commits形式でコミット
4. 履歴をキレイに保つ
```

**原則: "1機能 = 1コミット"。小さく頻繁にコミットする習慣を徹底。**

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

# E2Eテスト（Playwright）
deno task test:e2e

# E2Eテスト（WSL2環境下: xvfb使用）
deno task test:e2e:wsl2

# 特定のE2Eテストファイルを実行
deno task test:e2e:wsl2 tests/e2e/gfm-rendering.spec.ts

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

**⚠️ E2Eテストの重要情報**

- **E2Eテストの場所**: `tests/e2e/` ディレクトリ
  - テストファイル: `tests/e2e/*.spec.ts` (例: `gfm-rendering.spec.ts`)
  - フィクスチャ: `tests/e2e/fixtures/` (テスト用Markdownファイル等)
  - ヘルパー関数: `tests/e2e/helpers/extension-helpers.ts`
  - Playwright設定: `playwright.config.ts` (プロジェクトルート)

- **E2Eテストの実行環境**
  - Playwrightを使用してChrome拡張をロード
  - ローカルHTTPサーバー経由でテスト（`testServerUrl`）
  - WSL2環境では `xvfb-run` が必要

- **E2Eテストの書き方**
  ```typescript
  import { expect, test } from "./fixtures.ts";
  import {
    expectMarkdownRendered,
    openMarkdownFile,
  } from "./helpers/extension-helpers.ts";

  test("テスト名", async ({ page, testServerUrl }) => {
    await openMarkdownFile(page, `${testServerUrl}/tests/e2e/fixtures/test.md`);
    await expectMarkdownRendered(page);
    // assertions...
  });
  ```

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

**❌ messaging層にビジネスロジックを書く** -
これは過去に大失敗したパターンです！

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
    message.payload.themeId,
  );
  return { success: true, data: html };
};
```

**❌ UI層（content/settings）がservices/domainを直接呼ぶ**

```typescript
// ❌ NG: content層でdomainを直接呼び出し
import { parseMarkdown } from "../domain/markdown/parser.ts"; // ← ダメ！

// ✅ OK: messaging経由
import { sendMessage } from "../messaging/client.ts";
const html = await sendMessage({
  type: "RENDER_MARKDOWN",
  payload: { markdown },
});
```

**❌ services層がChrome APIを叩く**

```typescript
// ❌ NG: services層でChrome API直接使用
export class ThemeService {
  async load(): Promise<Theme> {
    const result = await chrome.storage.sync.get("theme"); // ← ダメ！
  }
}

// ✅ OK: Chrome API操作はbackground/state-manager.tsで行う
```

**❌ domain層が他のdomainに依存する**

```typescript
// ❌ NG: domain間の依存
// src/domain/markdown/parser.ts
import { loadTheme } from "../theme/loader.ts"; // ← ダメ！

// ✅ OK: services層でdomainを組み合わせる
// src/services/markdown-service.ts
import { parseMarkdown } from "../domain/markdown/parser.ts";
import { loadTheme } from "../domain/theme/loader.ts";
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
Deno.test("XSS: javascript: protocol", () => {
  const malicious = "<a href=\"javascript:alert('XSS')\">Click</a>";
  const result = sanitizeHTML(malicious);
  assertEquals(result.includes("javascript:"), false);
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

## 実装パターン

### Markdown機能追加: domain → services → messaging → UI

1. **domain層**: 純粋関数 + テスト
2. **services層**: domain組み合わせ
3. **messaging層**: 変更不要（すでにservice委譲）
4. **UI層**: 変更不要（messaging使用）

### メッセージタイプ追加: types → services → messaging

1. **shared/types/message.ts**: 型定義追加
2. **services層**: ビジネスロジック実装
3. **messaging層**: ルーティング追加

詳細は `docs/IMPLEMENTATION_GUIDE.md` 参照。

## デバッグ & トラブルシューティング

- **Content Script**: DevToolsでconsole.log確認
- **Background Script**: `chrome://extensions/` → サービスワーカー
- **ソースマップ**: `sourcemap: true` で元のTypeScriptデバッグ可能
- **拡張読み込み失敗**: manifest.json構文、ビルドエラー確認
- **Markdown表示失敗**: `file:///*` 権限、Content Script実行、Consoleエラー
- **テスト失敗**: 型定義最新化、deno.json imports確認

## チェックリスト

### 実装前

- [ ] レイヤー確認: UI/ui-components/messaging/services/domain/shared?
- [ ] 責務適切: 各レイヤーの責務を守っているか?
- [ ] 重複確認: 同じ処理が既存コードにないか? shared/に汎用化すべきか?
- [ ] 依存方向: import文の方向、循環依存がないか?
- [ ] セキュリティ: sanitizeHTML使用、XSS対策、入力検証

### 作業完了時（コミット前）

- [ ] **テスト全通過**: `deno task test` 実行、全テスト通過確認
- [ ] **ビルド成功**: `deno task build` 実行、エラーなし確認
- [ ] **git status確認**: 意図しないファイル変更がないか
- [ ] **変更レビュー**: `git diff` で変更内容を自己レビュー
- [ ] **論理的分割**: 複数機能が混在していないか? 分割すべきか?
- [ ] **即コミット**: 完了したら即コミット（未コミット放置禁止）

## 重要な心構え

1. **レイヤー意識** - コードがどのレイヤーか常に意識
2. **過去の失敗回避** - messaging層にビジネスロジック禁止
3. **型駆動設計** - 実装前に型定義、型で設計表現
4. **TDD遵守** - RED→GREEN→REFACTOR、テストできない設計は悪い設計
5. **迷ったら分離** - 共通化・汎用化を優先
6. **こまめなコミット** - 1機能完了 = 即コミット、未コミット放置は技術的負債

## 参考ドキュメント

プロジェクトルートの以下のドキュメントに詳細な情報があります:

- `spec.md` - 機能仕様とフェーズ計画
- `docs/ARCHITECTURE.md` - アーキテクチャ設計の詳細
- `docs/CODING_PRINCIPLES.md` - コーディング原則と実装パターン
- `docs/IMPLEMENTATION_GUIDE.md` - 段階的な実装手順
- `docs/SECURITY.md` - セキュリティ設計と脅威モデル
- `docs/DIRECTORY_STRUCTURE.md` - ディレクトリ構造と責務定義
- `docs/ARCHITECTURE_DECISIONS.md` - アーキテクチャ決定記録

**原則を守れば、offscreen
を含む複雑なChrome拡張でも保守性の高いコードベースが実現できます。**
