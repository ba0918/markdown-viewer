/**
 * Toast Notification E2E Tests
 *
 * Note: Toast通知は実際のユーザー操作(Export失敗など)を通じてテストする
 * セキュリティ上の理由から、E2Eテスト専用にwindow.showToast()を公開しない
 */

// deno-lint-ignore-file no-explicit-any

import { expect, test } from "./fixtures.ts";
import {
  expectMarkdownRendered,
  openMarkdownFile,
} from "./helpers/extension-helpers.ts";

test.describe("Toast Notification", () => {
  test("should have toast container in page", async ({ page, testServerUrl }) => {
    // Markdownファイルを開く
    await openMarkdownFile(
      page,
      `${testServerUrl}/tests/e2e/fixtures/simple.md`,
    );
    await expectMarkdownRendered(page);

    // トーストコンテナの存在を確認
    const toastContainer = page.locator(".toast-container");
    await expect(toastContainer).toBeAttached();
  });

  // NOTE: Export HTML UIは一時的に非表示（将来の復活用にコードは保持）
  test.skip("should show error toast when HTML export fails", async ({ page, testServerUrl, context }) => {
    // Console ログを収集
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

    // Markdownファイルを開く
    await openMarkdownFile(
      page,
      `${testServerUrl}/tests/e2e/fixtures/simple.md`,
    );
    await expectMarkdownRendered(page);

    // Service Worker (Background Script) を取得
    const [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      throw new Error("Service worker not found");
    }

    // Background Script側で handleBackgroundMessage の内部で使われる
    // exportService.generateExportHTML をモックして必ずエラーにする。
    // chrome.runtime.onMessage.addListener() でモックすると、
    // 元のハンドラーも同時に実行されて executeScript が走ってしまうため、
    // サービス層をモックする方が確実。
    await serviceWorker.evaluate(() => {
      // グローバルスコープに保存されている exportService のメソッドを上書き
      // esbuild でバンドルされているため、グローバル変数経由では直接アクセスできない。
      // 代わりに onMessage リスナーを追加して、EXPORT_AND_DOWNLOAD を完全に横取りし、
      // 元のリスナーには false を返さないようにする（return true で非同期レスポンスを示す）。
      // 注: Chrome では最初に sendResponse を呼んだリスナーのレスポンスが使われ、
      // 元のリスナーの sendResponse は無視される。ただし元のハンドラーの
      // 非同期処理（executeScript等）は止められないため、
      // fetch をモックして exportService.generateExportHTML を内部でエラーにする。
      const originalFetch = globalThis.fetch;
      (globalThis as any).__exportMockActive = true;
      globalThis.fetch = function (input: any, init?: any) {
        if (
          (globalThis as any).__exportMockActive && typeof input === "string" &&
          input.includes("themes/")
        ) {
          // テーマCSS の fetch を失敗させる → exportService.generateExportHTML がエラーになる
          return Promise.reject(
            new Error("Export operation failed: Invalid theme data"),
          );
        }
        return originalFetch.call(globalThis, input, init);
      } as typeof fetch;
    });

    // Document Header Menu ボタンをクリック
    const menuButton = page.locator(".document-header-menu-button");
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    // メニューが開くまで待つ
    await page.waitForTimeout(500);

    // Export HTML メニュー項目をクリック
    const exportMenuItem = page.locator(
      'button:has-text("Export HTML")',
    );
    await expect(exportMenuItem).toBeVisible();
    await exportMenuItem.click();

    // エラートーストが表示されることを確認
    const errorToast = page.locator(".toast.toast-error");
    await expect(errorToast).toBeVisible({ timeout: 5000 });

    // エラーメッセージが正しく表示されることを確認
    const toastMessage = errorToast.locator(".toast-message");
    await expect(toastMessage).toContainText("Export failed");
    await expect(toastMessage).toContainText(
      "Export operation failed: Invalid theme data",
    );

    // トーストに閉じるボタンがあることを確認
    const closeButton = errorToast.locator(".toast-close");
    await expect(closeButton).toBeVisible();

    // モックをクリーンアップ
    await serviceWorker.evaluate(() => {
      (globalThis as any).__exportMockActive = false;
    });
  });
});
