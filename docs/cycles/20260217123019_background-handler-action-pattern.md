# background-handler Action Pattern リファクタリング

**Cycle ID:** `20260217123019` **Started:** 2026-02-17 12:30:19 **Status:** 🟢
Implementation Complete

---

## What & Why

`background-handler.ts`（264行、9 case）のswitch文を、Action Patternで分離する。
messaging層の責務を「純粋なルーティング」に絞り、各caseの処理（バリデーション +
service委譲）を独立したaction関数として抽出する。

**動機:**

- 各caseは小さいが、1ファイルに9種類の処理が混在している
- 新メッセージタイプ追加時にbackground-handlerを毎回変更する必要がある（Open-Closed原則違反）
- 個別actionのテストが書きにくい（現状は全てhandleBackgroundMessage経由）

## Goals

- background-handlerを純粋なルーティング（5-10行）に絞る
- 各メッセージタイプの処理を独立したaction関数として抽出する
- 既存テスト339件を全て維持する（振る舞い変更なし）
- 新メッセージタイプ追加時のコストを下げる（actionファイル追加のみ）

## Design

### アーキテクチャ

```
background-handler.ts (ルーティングのみ)
  ↓
action-registry.ts (message-type → action 関数の静的マッピング)
  ↓
actions/ (1 message type = 1 action ファイル)
  ├── render-markdown.ts
  ├── load-theme.ts
  ├── update-theme.ts
  ├── update-hot-reload.ts
  ├── check-file-change.ts
  ├── get-settings.ts
  ├── update-settings.ts
  ├── generate-export-html.ts
  └── export-and-download.ts
```

### 設計判断

**関数ベース vs classベース:**

- **関数ベースを採用** - 各caseの中身はほぼ純粋関数的（バリデーション → 委譲 →
  レスポンス）
- classにする利点が薄い（状態を持たない、継承も不要）
- プロジェクトの既存パターン（domain層の純粋関数）と一貫性がある

**stateManagerの共有方法:**

- action-registry.tsでstateManagerインスタンスを生成し、必要なactionに注入する
- DI的アプローチで、テスタビリティを向上させる

**Action型定義:**

```typescript
// 共通のAction型 - シンプルな関数シグネチャ
type ActionHandler = (payload: unknown) => Promise<MessageResponse>;

// action-registry のマッピング型
type ActionRegistry = Record<string, ActionHandler>;
```

### Files to Change

```
src/messaging/handlers/
  background-handler.ts          - switch文削除、registryへの委譲のみ（5-10行）
  background-handler.test.ts     - import先は変わらない（振る舞い不変のため）
  action-registry.ts             - NEW: message-type → action のマッピング
  action-types.ts                - NEW: ActionHandler型定義
  actions/                       - NEW: ディレクトリ
    render-markdown.ts           - NEW: RENDER_MARKDOWN 処理
    render-markdown.test.ts      - NEW: 個別テスト
    load-theme.ts                - NEW: LOAD_THEME 処理
    load-theme.test.ts           - NEW: 個別テスト
    update-theme.ts              - NEW: UPDATE_THEME 処理
    update-theme.test.ts         - NEW: 個別テスト
    update-hot-reload.ts         - NEW: UPDATE_HOT_RELOAD 処理
    update-hot-reload.test.ts    - NEW: 個別テスト
    check-file-change.ts         - NEW: CHECK_FILE_CHANGE 処理
    check-file-change.test.ts    - NEW: 個別テスト
    get-settings.ts              - NEW: GET_SETTINGS 処理
    get-settings.test.ts         - NEW: 個別テスト
    update-settings.ts           - NEW: UPDATE_SETTINGS 処理
    update-settings.test.ts      - NEW: 個別テスト
    generate-export-html.ts      - NEW: GENERATE_EXPORT_HTML 処理
    generate-export-html.test.ts - NEW: 個別テスト
    export-and-download.ts       - NEW: EXPORT_AND_DOWNLOAD 処理
    export-and-download.test.ts  - NEW: 個別テスト
```

### Key Points

- **振る舞い完全不変**:
  外部API（handleBackgroundMessage）のシグネチャは変わらない
- **既存テストそのまま**:
  background-handler.test.tsはそのまま動く（リグレッションガード）
- **個別テスト追加**: 各actionに対する単体テストを新規追加（テスタビリティ向上）
- **stateManager DI**: registryでインスタンス管理、action関数に引数として渡す
- **Chrome API型定義**:
  background-handler.tsから適切な場所に移動（action-types.tsまたは各action）

### 実装イメージ

**background-handler.ts（リファクタ後）:**

```typescript
import { createActionRegistry } from "./action-registry.ts";
import type { Message, MessageResponse } from "../types.ts";

const registry = createActionRegistry();

export const handleBackgroundMessage = async (
  message: Message,
  _sender?: { tab?: { id?: number } },
): Promise<MessageResponse> => {
  try {
    const action = registry[message.type];
    if (!action) {
      return { success: false, error: "Unknown message type" };
    }
    return await action(message.payload);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
```

**action-registry.ts:**

```typescript
import type { ActionHandler } from "./action-types.ts";
import { StateManager } from "../../background/state-manager.ts";
import { createRenderMarkdownAction } from "./actions/render-markdown.ts";
import { createLoadThemeAction } from "./actions/load-theme.ts";
// ... 他のaction imports

export const createActionRegistry = (): Record<string, ActionHandler> => {
  const stateManager = new StateManager();

  return {
    RENDER_MARKDOWN: createRenderMarkdownAction(),
    LOAD_THEME: createLoadThemeAction(),
    UPDATE_THEME: createUpdateThemeAction(stateManager),
    UPDATE_HOT_RELOAD: createUpdateHotReloadAction(stateManager),
    CHECK_FILE_CHANGE: createCheckFileChangeAction(),
    GET_SETTINGS: createGetSettingsAction(stateManager),
    UPDATE_SETTINGS: createUpdateSettingsAction(stateManager),
    GENERATE_EXPORT_HTML: createGenerateExportHtmlAction(),
    EXPORT_AND_DOWNLOAD: createExportAndDownloadAction(),
  };
};
```

**actions/render-markdown.ts（例）:**

```typescript
import { markdownService } from "../../../services/markdown-service.ts";
import { loadTheme } from "../../../domain/theme/loader.ts";
import type { ActionHandler } from "../action-types.ts";
import type { MessageResponse } from "../../types.ts";

export const createRenderMarkdownAction = (): ActionHandler => {
  return async (payload: unknown): Promise<MessageResponse> => {
    const p = payload as { markdown?: unknown; themeId?: unknown };
    if (typeof p?.markdown !== "string") {
      return {
        success: false,
        error: "Invalid payload: markdown must be a string",
      };
    }
    const theme = loadTheme(p.themeId as string | undefined);
    const result = markdownService.render(p.markdown, theme);
    return { success: true, data: result };
  };
};
```

## Implementation Steps

| # | Step                                       | Details                                        |
| - | ------------------------------------------ | ---------------------------------------------- |
| 1 | action-types.ts作成                        | ActionHandler型定義、Chrome API型定義の移動    |
| 2 | actions/ディレクトリ作成 + 9つのaction関数 | 各caseの処理をそのまま抽出（ロジック変更なし） |
| 3 | 各action関数の個別テスト作成               | バリデーション + 正常系をテスト                |
| 4 | action-registry.ts作成                     | message-type → action のマッピング             |
| 5 | background-handler.ts簡素化                | switch文をregistry lookup に置換               |
| 6 | 既存テスト全通過確認                       | deno task test + deno task test:e2e:wsl2       |

## Tests

### 既存テスト（そのまま維持）

- [x] background-handler.test.ts 全25テスト（リグレッションガード）

### 新規テスト（各action個別）

- [x] render-markdown: 正常系、markdown非文字列、payload未定義、空オブジェクト
- [x] load-theme: 正常系、無効themeId、themeId数値、未指定
- [x] update-theme: 正常系、無効themeId（XSS）、undefined
- [x] update-hot-reload:
      正常系、enabled文字列、interval文字列、autoReload欠損、undefined
- [x] check-file-change:
      URL空文字、URL数値、リモートURL（SSRF防止）、WSL2パス、undefined、スペースのみ
- [x] get-settings: 正常系、null payload
- [x] update-settings: 正常系、payload null、undefined、文字列
- [x] generate-export-html: html数値、filename数値、undefined、html未指定
- [x] export-and-download: html null、filename未指定、undefined
- [x] validate-theme: 有効6テーマ、無効文字列、数値、null、undefined、XSS

### Registry テスト

- [x] 全メッセージタイプが登録されている
- [x] 登録数が正確（9種類）
- [x] 未知のタイプはundefined

## Security

- [x] バリデーションロジックが各actionに正確に移植されていること
- [x] SSRF防止（isLocalUrl）がcheck-file-changeに維持されていること
- [x] themeIdバリデーション（validateThemeId）がload-theme/update-themeに維持されていること
- [x] XSSベクターに関わる変更なし（sanitizeHTMLはservices層のまま）

## Progress

| Step                        | Status |
| --------------------------- | ------ |
| action-types.ts作成         | 🟢     |
| 9つのaction関数作成         | 🟢     |
| 各actionの個別テスト作成    | 🟢     |
| action-registry.ts作成      | 🟢     |
| background-handler.ts簡素化 | 🟢     |
| 全テスト通過確認            | 🟢     |

**Legend:** ⚪ Pending · 🟡 In Progress · 🟢 Done

## Results

- **Unit tests:** 377 passed (既存331 + 新規46)、0 failed
- **E2E tests:** 87 passed、14 skipped（既存skip設定）、0 failed
- **Lint:** 0件
- **Build:** 正常
- **background-handler.ts:** 264行 → 33行（87%削減）

---

**Next:** Commit with `smart-commit`
