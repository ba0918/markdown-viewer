# CLAUDE.md

Markdown Viewer Chrome拡張 - セキュリティファーストなローカルMarkdownビューア

**スタック**: Deno 2.x, esbuild, Preact, marked, xss (js-xss), Playwright(E2E)
**核心思想**:
レイヤー分離絶対遵守、TDD必須、過去の失敗(messaging層ビジネスロジック)から学習

## 🚨 絶対厳守ルール

### パッケージ管理（CRITICAL）

- ❌ `npm/pnpm install` 直接実行禁止 → ✅ `mise exec -- pnpm install`
- ❌ `package.json/pnpm-lock.yaml` 削除禁止（E2E完全破壊）

### ライブラリ使用（CRITICAL）

- ❌ AI記憶に頼る → ✅ Context7で最新公式ドキュメント必須確認
- 対象全て: Preact, esbuild, marked, xss (js-xss), Deno, Chrome API

### コミット管理（CRITICAL）

**原則**: 1機能=1コミット、未コミット蓄積=技術的負債

**pre-commitフック自動実行内容**（`.git/hooks/pre-commit`）:

```bash
1. deno task fmt     # フォーマット自動修正
2. deno task lint    # Lint 0件必須（エラーあるとコミット中断）
3. deno task test    # Unit test全通過必須
```

**⚠️ E2Eは自動実行されない → 手動確認必須**

**コミット前必須チェック**:

```bash
deno task lint           # Lint 0件
deno task test           # Unit test全通過
deno task test:e2e:wsl2  # E2E全通過（手動必須！pre-commitで実行されない）
```

**Lint修正後は必ずテスト再実行**（Lint修正→テスト破壊の事件多発中）

**禁止**:
Lint修正後テスト未実行（テスト破壊の主原因）、`--no-verify`、10+ファイル放置

**smart-commitスキル**: `git status/diff`分析→論理単位分割→Conventional
Commits形式コミット

## 主要コマンド

```bash
deno task dev               # 開発watch
deno task build             # ビルド
deno task test              # Unit (必ずtask経由！deno test直はNG)
deno task test:e2e:wsl2     # E2E (WSL2: xvfb必須)
deno task lint/fmt          # Lint/Format
```

**⚠️ `deno test`直接実行禁止理由**:

- `deno.json`の`tasks.test`に`--allow-all`設定済み
- Chrome APIモック等の必要権限が全て含まれる
- 直接実行すると型チェックで失敗する

**特定ファイルのみテスト**:
`deno test src/path/to/file.test.ts --no-check --allow-all`

**E2E構成**:

- テスト: `tests/e2e/*.spec.ts`
- フィクスチャ: `tests/e2e/fixtures/`
- ヘルパー: `tests/e2e/helpers/extension-helpers.ts`
- 設定: `playwright.config.ts`

**E2Eテンプレート**:

```typescript
import { expect, test } from "./fixtures.ts";
import {
  expectMarkdownRendered,
  openMarkdownFile,
} from "./helpers/extension-helpers.ts";

test("description", async ({ page, testServerUrl }) => {
  await openMarkdownFile(page, `${testServerUrl}/tests/e2e/fixtures/test.md`);
  await expectMarkdownRendered(page);
  // assertions...
});
```

## レイヤーアーキテクチャ（絶対遵守）

```
UI → messaging → services → domain → shared
```

**死亡フラグ（過去の大失敗パターン）**:

```typescript
// ❌ NG: messaging層でビジネスロジック（過去に大失敗）
export const handleBackgroundMessage = async (message: Message) => {
  const parsed = marked.parse(message.payload.markdown); // 死亡フラグ
  const sanitized = xss(parsed); // 死亡フラグ
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

// ❌ NG: UI層でdomain直接import
import { parseMarkdown } from "../domain/markdown/parser.ts";
// ✅ OK: messaging経由
import { sendMessage } from "../messaging/client.ts";
const html = await sendMessage({
  type: "RENDER_MARKDOWN",
  payload: { markdown },
});

// ❌ NG: services層でChrome API
const result = await chrome.storage.sync.get("theme");
// ✅ OK: background/state-manager経由

// ❌ NG: domain間依存
import { loadTheme } from "../theme/loader.ts"; // in domain/markdown/
// ✅ OK: services層で組み合わせ
```

**原則**: DRY徹底（2回目→shared/移動）、TDD必須（RED→GREEN→REFACTOR）

### 許容される例外（ADR-007参照）

以下のケースはレイヤールールの例外として許容される：

- **軽量なdomain関数のmessaging直接呼び出し**: `loadTheme()`
  等のルックアップ関数
- **DOM操作系domainのcontent直接呼び出し**: `renderMath()`, `renderMermaid()`
  等（ブラウザ専用API）
- **UIローカル状態のchrome.storage直接**:
  ToC状態永続化等（UIコンポーネント内の状態管理）
- **chrome.runtime.getURL()**: 静的リソースパス取得（全層で許可）

## レイヤー責務（詳細→`docs/DIRECTORY_STRUCTURE.md`）

| Layer                            | 責務                      | 禁止                                  | 依存              |
| -------------------------------- | ------------------------- | ------------------------------------- | ----------------- |
| UI (background/content/settings) | messaging I/O, UI         | ビジネスロジック, services/domain直接 | messaging, shared |
| ui-components                    | 再利用UI                  | messaging直接                         | shared            |
| messaging                        | ルーティング, service委譲 | ビジネスロジック                      | services, shared  |
| services                         | domain組合せ, フロー      | Chrome API直接                        | domain, shared    |
| domain                           | 純粋ビジネスロジック      | 他domain依存                          | shared            |
| shared                           | 汎用utility               | レイヤー依存                          | なし              |

## セキュリティ（最優先）

**XSS防御**: 全Markdown描画で`sanitizeHTML()`必須通過、xss
(js-xss)で`javascript:`/`onerror`等ブロック **テスト**:
XSS攻撃ベクター13ケース必須（`tests/e2e/xss.spec.ts`） 詳細→`docs/SECURITY.md`

## 実装フロー

**機能追加**: domain(純粋関数+test) → services(組合せ) → messaging(委譲) → UI
**型追加**: shared/types → services → messaging
詳細→`docs/IMPLEMENTATION_GUIDE.md`

## チェックリスト

**実装前**: レイヤー/責務確認, 重複排除(→shared/), 依存方向, sanitizeHTML
**コミット前**: lint 0件, test全通過, E2E通過, git diff確認,
即コミット（放置禁止）

## 詳細ドキュメント

`docs/ARCHITECTURE.md`, `docs/CODING_PRINCIPLES.md`,
`docs/IMPLEMENTATION_GUIDE.md`, `docs/SECURITY.md`,
`docs/DIRECTORY_STRUCTURE.md`, `docs/ARCHITECTURE_DECISIONS.md`

**原則厳守→保守性の高いコードベース実現**
