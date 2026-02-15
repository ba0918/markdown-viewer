/**
 * Remote URL Support E2E Tests
 *
 * カスタムドメイン追加機能のテスト
 * - 完全オプトイン方式（プリセットなし）
 * - ユーザーが手動で入力したドメインのみ許可
 */

import { expect, test } from "./fixtures.ts";

test.describe("Remote URL Settings", () => {
  test("should display remote URL settings section", async ({ page, extensionId }) => {
    // Options ページを開く
    await page.goto(`chrome-extension://${extensionId}/options.html`);

    // Remote URL Support セクションが表示される
    await expect(page.locator("text=Remote URL Support")).toBeVisible();
    await expect(
      page.locator("text=Enable Markdown viewing from remote URLs"),
    ).toBeVisible();
  });

  test("should have input form for adding custom domain", async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);

    // 入力フォームが表示される
    const input = page.locator('input[placeholder="https://example.com/*"]');
    await expect(input).toBeVisible();

    // Add Domain ボタンが表示される
    const addButton = page.locator('button:has-text("Add Domain")');
    await expect(addButton).toBeVisible();
  });

  test("should show help text with format example", async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);

    // ヘルプテキストが表示される
    await expect(page.locator("text=Format:")).toBeVisible();
    await expect(
      page.locator('code:has-text("https://example.com/*")'),
    ).toBeVisible();
  });

  test("should show security info box", async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);

    // セキュリティ情報ボックスが表示される
    await expect(page.locator("text=Security & Privacy")).toBeVisible();
    await expect(page.locator("text=HTTPS Only")).toBeVisible();
    await expect(page.locator("text=Zero tracking, zero data collection"))
      .toBeVisible();
    await expect(
      page.locator("text=Trust Carefully"),
    ).toBeVisible();
  });

  test("should validate origin input - empty", async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);

    const addButton = page.locator('button:has-text("Add Domain")');

    // 空の状態ではボタンが無効
    await expect(addButton).toBeDisabled();
  });

  test("should validate origin input - invalid format", async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);

    const input = page.locator('input[placeholder="https://example.com/*"]');
    const addButton = page.locator('button:has-text("Add Domain")');

    // HTTPは拒否される
    await input.fill("http://example.com/*");
    await addButton.click();

    // エラーメッセージが表示される
    await expect(page.locator("text=must start with https://")).toBeVisible();
  });

  test("should validate origin input - missing wildcard", async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);

    const input = page.locator('input[placeholder="https://example.com/*"]');
    const addButton = page.locator('button:has-text("Add Domain")');

    // ワイルドカードなしは拒否される
    await input.fill("https://example.com");
    await addButton.click();

    // エラーメッセージが表示される
    await expect(page.locator("text=must end with /*")).toBeVisible();
  });

  test("should not have any preset domains in manifest", async ({ page, extensionId }) => {
    // manifest.jsonを確認
    const manifestUrl = `chrome-extension://${extensionId}/manifest.json`;
    const response = await page.goto(manifestUrl);
    const manifest = await response?.json();

    // optional_host_permissionsはhttps://*/*のみ（カスタムドメイン用）
    expect(manifest.optional_host_permissions).toEqual(["https://*/*"]);

    // host_permissionsはfile://とlocalhostのみ（MAIN worldでのExportに必要）
    expect(manifest.host_permissions).toEqual([
      "file:///*",
      "http://localhost:*/*",
    ]);
  });

  test("should have scripting permission for dynamic content script registration", async ({ page, extensionId }) => {
    const manifestUrl = `chrome-extension://${extensionId}/manifest.json`;
    const response = await page.goto(manifestUrl);
    const manifest = await response?.json();

    // scripting権限が存在することを確認
    expect(manifest.permissions).toContain("scripting");
  });

  test("should not have all_urls permission", async ({ page, extensionId }) => {
    const manifestUrl = `chrome-extension://${extensionId}/manifest.json`;
    const response = await page.goto(manifestUrl);
    const manifest = await response?.json();

    // all_urlsが使われていないことを確認
    expect(manifest.host_permissions).not.toContain("<all_urls>");
    expect(manifest.permissions).not.toContain("<all_urls>");
    expect(manifest.optional_host_permissions || []).not.toContain(
      "<all_urls>",
    );
  });
});
