# Logger Utility & DEBUG自動注入

**Cycle ID:** `20260217011000` **Started:** 2026-02-17 01:10:00 **Status:** 🟡
Planning

---

## 📝 What & Why

`if (DEBUG) console.log(...)`
パターンが冗長で、DEBUGフラグが手動切り替えなのを改善する。
esbuildのdefineでDEBUGを自動注入し、shared/にloggerユーティリティを抽出することで、開発体験を向上させる。

## 🎯 Goals

- 開発ビルド（`deno task dev`）で自動的にDEBUG=true、本番ビルド（`deno task build`）でDEBUG=false
- `if (DEBUG) console.log(...)` パターンを `logger.log(...)` に統一
- 本番ビルドではlogger呼び出しがtree-shakingで完全に消える（バンドルサイズ影響ゼロ）
- console.error/console.warnはエラーハンドリング用なので変更しない（本番でも出力されるべき）

## 📐 Design

### アーキテクチャ分析

loggerは `shared/` レイヤーに配置する。理由：

- 純粋なユーティリティ（他レイヤーへの依存なし）
- どのレイヤーからも利用可能（shared → 全レイヤーから依存OK）
- Chrome API不使用、ビジネスロジック不含

### Files to Change

```
scripts/
  build.ts     - commonConfigのdefineに "DEBUG": "false" 追加
  watch.ts     - commonConfigのdefineに "DEBUG": "true" 追加

src/
  shared/
    utils/
      logger.ts      - 新規: loggerユーティリティ
      logger.test.ts - 新規: loggerのUnit test

  content/
    index.ts   - const DEBUG = false を削除、if(DEBUG)パターンをlogger呼び出しに置換
```

### Key Points

- **esbuild define**: `"DEBUG": "true"` / `"false"`
  でグローバル定数として注入。esbuildがDEBUGをリテラル値に置換するため、`if (false) { ... }`
  は本番ビルドでtree-shakingにより完全削除される
- **declare const DEBUG**: TypeScript向けのアンビエント宣言。logger.ts内で
  `declare const DEBUG: boolean;` を宣言
- **loggerのAPI設計**: `logger.log()` と `logger.warn()`
  のみ（DEBUGログ用途に限定）。`logger.error()`
  は不要（console.errorはエラーハンドリング用で常に出力されるべき）
- **プレフィックス統一**: `[Markdown Viewer]`
  プレフィックスをlogger内で自動付与。各呼び出し元で "Markdown Viewer: "
  を書く必要がなくなる
- **watch.tsのdefine不足**:
  現在watch.tsにはdefine設定がない。build.tsと同様にdefine設定を追加する必要がある

### logger.ts 設計

```typescript
// shared/utils/logger.ts
declare const DEBUG: boolean;

/**
 * 開発用ログユーティリティ
 *
 * - 開発ビルド（deno task dev）: ログ出力あり
 * - 本番ビルド（deno task build）: tree-shakingで完全削除
 */
export const logger = {
  log: (...args: unknown[]): void => {
    if (DEBUG) console.log("[Markdown Viewer]", ...args);
  },
  warn: (...args: unknown[]): void => {
    if (DEBUG) console.warn("[Markdown Viewer]", ...args);
  },
} as const;
```

### esbuild設定変更

**build.ts（本番）:**

```typescript
define: {
  "global": "globalThis",
  "process.env.NODE_ENV": '"production"',
  "DEBUG": "false",  // 追加
},
```

**watch.ts（開発）:**

```typescript
const commonConfig: Partial<esbuild.BuildOptions> = {
  // ...既存設定...
  define: {
    "global": "globalThis",
    "process.env.NODE_ENV": '"development"',
    "DEBUG": "true", // 追加
  },
};
```

### content/index.ts 変更例

```typescript
// Before
const DEBUG = false; // 削除
if (DEBUG) console.log(`Markdown Viewer: Theme CSS loaded - ${theme}`);

// After
import { logger } from "../shared/utils/logger.ts";
logger.log(`Theme CSS loaded - ${theme}`);
```

## ✅ Tests

### Unit Tests (logger.test.ts)

- [x] `logger.log()` がDEBUG=trueの時にconsole.logを呼び出す 🟢 DONE
- [x] `logger.warn()` がDEBUG=trueの時にconsole.warnを呼び出す 🟢 DONE
- [x] `logger.log()` がDEBUG=falseの時にconsole.logを呼び出さない 🟢 DONE
- [x] `logger.warn()` がDEBUG=falseの時にconsole.warnを呼び出さない 🟢 DONE
- [x] プレフィックス `[Markdown Viewer]` が付与される 🟢 DONE
- [x] 複数引数が正しく渡される 🟢 DONE

### 既存テストの確認

- [ ] `deno task test` 全通過
- [ ] `deno task lint` 0件
- [ ] `deno task test:e2e:wsl2` 全通過（ビルド設定変更のため）

### テスト実装の注意点

logger.tsはグローバル変数 `DEBUG` に依存するため、テスト時は以下の方法で制御：

```typescript
// テスト時のDEBUGフラグ制御
// deno test --allow-all でグローバル変数を直接設定可能
(globalThis as Record<string, unknown>).DEBUG = true;
// テスト後にクリーンアップ
(globalThis as Record<string, unknown>).DEBUG = false;
```

## 🔒 Security

- [ ] loggerはconsole.log/warnのラッパーのみ（入力検証不要）
- [ ] 本番ビルドでログ出力が完全に消えることを確認（情報漏洩防止）

## 📊 Progress

| Step                                 | Status |
| ------------------------------------ | ------ |
| Tests (logger.test.ts)               | 🟢     |
| Implementation (logger.ts)           | 🟢     |
| esbuild設定変更 (build.ts, watch.ts) | 🟢     |
| content/index.ts リファクタリング    | 🟢     |
| 全テスト通過確認                     | 🟢     |
| Commit                               | ⚪     |

**Legend:** ⚪ Pending · 🟡 In Progress · 🟢 Done

---

**Next:** Write tests → Implement → Commit with `smart-commit` 🚀
