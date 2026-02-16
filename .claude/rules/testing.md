---
paths: ["tests/**", "src/**/*.test.ts"]
---

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

## Chrome拡張機能のE2Eテスト

### chrome.runtime.sendMessage のモック方法

Chrome拡張機能のE2Eテストで `chrome.runtime.sendMessage`
をモックする場合、**Content Script側ではなくBackground Script (Service
Worker)側**でモックする必要がある。

#### ❌ 間違ったアプローチ

Content Script側で `chrome.runtime.sendMessage`
を上書きしようとしても動作しない:

```typescript
// ❌ これは動かない
await page.addInitScript(() => {
  window.chrome.runtime.sendMessage = (message) => {
    // モック処理
  };
});
```

#### ✅ 正しいアプローチ

Service Worker側で `chrome.runtime.onMessage`
リスナーを追加してレスポンスを制御する:

```typescript
test("should show error toast when HTML export fails", async ({page,testServerUrl,context, // ← BrowserContext を取得
}) => {
  // Markdownファイルを開く
  await openMarkdownFile(page, `${testServerUrl}/tests/e2e/fixtures/simple.md`);
  await expectMarkdownRendered(page);

  // Service Worker (Background Script) を取得
  const [serviceWorker] = context.serviceWorkers();
  if (!serviceWorker) {
    throw new Error("Service worker not found");
  }

  // Background Script側で chrome.runtime.onMessage ハンドラーをモック
  await serviceWorker.evaluate(() => {
    // 新しいモックハンドラーを追加
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      console.log("Received message:", message);

      if (message.type === "GENERATE_EXPORT_HTML") {
        // エラーレスポンスを返す
        sendResponse({
          success: false,
          error: "Export operation failed: Invalid theme data",
        });
        return true; // 非同期レスポンスを示す
      }

      // 他のメッセージは元のハンドラーに委譲
      return false;
    });
  });

  // 以降、通常通りUI操作をテスト
  const menuButton = page.locator(".document-header-menu-button");
  await menuButton.click();
  // ...
});
```

#### 重要なポイント

1. **`context.serviceWorkers()` でService Workerを取得**
   - fixtures.tsで既にService Workerは起動済み

2. **`serviceWorker.evaluate()` でBackground Script内のコードを実行**
   - ページコンテキストではなく、Service Workerコンテキストで実行される

3. **`chrome.runtime.onMessage.addListener()` でハンドラー追加**
   - 既存のハンドラーより先に実行されるため、特定メッセージのみインターセプト可能
   - `return true` で非同期レスポンスを示す
   - `return false` で元のハンドラーに処理を委譲

4. **モックは`openMarkdownFile()`の後に設定**
   - ページロード後にService Workerが確実に起動している状態で設定

### 参考資料

- [Chrome extensions | Playwright](https://playwright.dev/docs/chrome-extensions)
- [Test Chrome Extensions with Puppeteer | Chrome for Developers](https://developer.chrome.com/docs/extensions/how-to/test/puppeteer)
