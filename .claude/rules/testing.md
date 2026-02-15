# Testing Rules

## Unit Test

### 使用するライブラリ

- `@std/assert` (assertEquals, assertStringIncludes等)
- `linkedom` (DOM環境セットアップ用)
- `preact` (render as preactRender)

### ❌ 使用禁止

- `@std/testing/bdd` (describe, it) → 使用しない
- `@std/expect` → 使用しない
- `@testing-library/preact` → 使用しない

### テストの書き方

```typescript
import { assertEquals } from "@std/assert";
import { parseHTML } from "linkedom";
import { render as preactRender } from "preact";

// DOM環境セットアップ（UIコンポーネントテストの場合）
const { document } = parseHTML("<!DOCTYPE html><html><body></body></html>");
globalThis.document = document as unknown as Document;

// Deno.test()を使用（describe/it は使わない）
Deno.test("テスト名", () => {
  // テストコード
  assertEquals(actual, expected);
});

// 非同期テスト
Deno.test("非同期テスト", async () => {
  await someAsyncFunction();
  assertEquals(actual, expected);
});

// タイマーリークを無視する場合
Deno.test({
  name: "タイマーを使うテスト",
  fn: () => {
    // showToast()などsetTimeout()を使う関数のテスト
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
```

## E2E Test (Playwright)

### page.evaluate()内でのwindow使用

- `page.evaluate()`内でブラウザグローバル変数（window等）を使う場合、Deno
  lintの`no-window`ルールに引っかかる
- Content Script内で公開した関数を呼び出す場合も同様

### 解決方法

**ファイル先頭に以下を追加**:

```typescript
// deno-lint-ignore-file no-window
```

**または特定行のみ無視**:

```typescript
// deno-lint-ignore no-window
window.someFunction();
```

### E2Eテストの注意点

- `page.evaluate()`内のコードはブラウザコンテキストで実行される
- Content Scriptでグローバルに公開した関数（例:
  `window.showToast`）を呼び出す場合:
  - Content Script側で公開:
    `window.someFunction = fn;`に`deno-lint-ignore no-window`を追加
  - E2Eテスト側でも`deno-lint-ignore-file no-window`を追加

### シンプルなE2Eテストを優先

- `page.evaluate()`で複雑な処理を実行するよりも、実際のUI操作をテストする方が良い
- 例:
  トースト表示のテストは、Export失敗時に自動的にテストされるため、ToastContainerの存在確認のみで十分
