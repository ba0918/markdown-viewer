/**
 * Toast Notification E2E Tests
 *
 * Note: Toast通知は実際のユーザー操作(Export失敗など)を通じてテストする
 * セキュリティ上の理由から、E2Eテスト専用にwindow.showToast()を公開しない
 */

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
});
