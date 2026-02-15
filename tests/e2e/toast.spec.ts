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

  test("should show error toast when HTML export fails", async ({ page, testServerUrl, context }) => {
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

    // Background Script側で chrome.runtime.onMessage ハンドラーをモック
    await serviceWorker.evaluate(() => {
      // 新しいモックハンドラーを追加
      chrome.runtime.onMessage.addListener(
        (message: any, _sender: any, sendResponse: any) => {
          console.log(
            "🔥 Background: Received message:",
            JSON.stringify(message),
          );

          if (message.type === "GENERATE_EXPORT_HTML") {
            console.log("🚨 Background: Returning ERROR response");
            sendResponse({
              success: false,
              error: "Export operation failed: Invalid theme data",
            });
            return true; // 非同期レスポンスを示す
          }

          // 他のメッセージは元のハンドラーに委譲
          console.log("✅ Background: Passing to original handler");
          return false; // 元のハンドラーに処理を委譲
        },
      );
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
    await expect(errorToast).toBeVisible({ timeout: 3000 });

    // エラーメッセージが正しく表示されることを確認
    const toastMessage = errorToast.locator(".toast-message");
    await expect(toastMessage).toContainText("Export failed");
    await expect(toastMessage).toContainText(
      "Export operation failed: Invalid theme data",
    );

    // トーストに閉じるボタンがあることを確認
    const closeButton = errorToast.locator(".toast-close");
    await expect(closeButton).toBeVisible();
  });
});
