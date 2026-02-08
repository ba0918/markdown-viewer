import { expect, test } from "./fixtures.ts";

/**
 * E2Eテスト: 相対リンクのナビゲーション
 *
 * 目的: Markdownファイル間の相対リンクが正しく動作することを確認
 * 重要: 過去に壊れていた実績があるため、リグレッション防止のため必須
 */

test.describe("相対リンクのナビゲーション", () => {
  test("基本的な相対リンク (docs/ARCHITECTURE.md)", async ({ page, testServerUrl }) => {
    // README.mdを開く
    await page.goto(
      `${testServerUrl}/tests/e2e/fixtures/relative-links/README.md`,
    );

    // Markdownがレンダリングされるまで待つ
    await page.waitForSelector(".markdown-body", { timeout: 5000 });

    // "Architecture Document"リンクを見つける
    const link = page.locator('a:has-text("Architecture Document")');
    await expect(link).toBeVisible();

    // href属性を確認 (相対パスが残っているはず)
    const href = await link.getAttribute("href");
    expect(href).toBe("docs/ARCHITECTURE.md");

    // リンクをクリック
    await link.click();

    // URLが変わることを確認
    await page.waitForURL(/ARCHITECTURE\.md$/, { timeout: 5000 });

    // 遷移先のMarkdownがレンダリングされることを確認
    await page.waitForSelector(".markdown-body", { timeout: 5000 });
    await expect(page.locator('h1:has-text("Architecture")')).toBeVisible();
  });

  test("ドット付き相対リンク (./docs/SECURITY.md)", async ({ page, testServerUrl }) => {
    await page.goto(
      `${testServerUrl}/tests/e2e/fixtures/relative-links/README.md`,
    );
    await page.waitForSelector(".markdown-body", { timeout: 5000 });

    const link = page.locator('a:has-text("Security Document")');
    await expect(link).toBeVisible();

    const href = await link.getAttribute("href");
    expect(href).toBe("./docs/SECURITY.md");

    await link.click();
    await page.waitForURL(/SECURITY\.md$/, { timeout: 5000 });

    await page.waitForSelector(".markdown-body", { timeout: 5000 });
    await expect(page.locator('h1:has-text("Security")')).toBeVisible();
  });

  test("親ディレクトリへの相対リンク (../README.md)", async ({ page, testServerUrl }) => {
    // docs/ARCHITECTURE.mdから../README.mdへのリンク
    await page.goto(
      `${testServerUrl}/tests/e2e/fixtures/relative-links/docs/ARCHITECTURE.md`,
    );
    await page.waitForSelector(".markdown-body", { timeout: 5000 });

    const link = page.locator('a:has-text("Back to README")');
    await expect(link).toBeVisible();

    const href = await link.getAttribute("href");
    expect(href).toBe("../README.md");

    await link.click();
    await page.waitForURL(/README\.md$/, { timeout: 5000 });

    await page.waitForSelector(".markdown-body", { timeout: 5000 });
    await expect(page.locator('h1:has-text("Test README")')).toBeVisible();
  });

  test("複雑な相対パス (path/to/../to/file.md)", async ({ page, testServerUrl }) => {
    await page.goto(
      `${testServerUrl}/tests/e2e/fixtures/relative-links/README.md`,
    );
    await page.waitForSelector(".markdown-body", { timeout: 5000 });

    const link = page.locator('a:has-text("Complex Path")');
    await expect(link).toBeVisible();

    const href = await link.getAttribute("href");
    expect(href).toBe("docs/sub/../ARCHITECTURE.md");

    await link.click();
    await page.waitForURL(/ARCHITECTURE\.md$/, { timeout: 5000 });

    await page.waitForSelector(".markdown-body", { timeout: 5000 });
    await expect(page.locator('h1:has-text("Architecture")')).toBeVisible();
  });

  test("同一ページ内リンク (#section)", async ({ page, testServerUrl }) => {
    await page.goto(
      `${testServerUrl}/tests/e2e/fixtures/relative-links/README.md`,
    );
    await page.waitForSelector(".markdown-body", { timeout: 5000 });

    const link = page.locator('a:has-text("Jump to Features")');
    await expect(link).toBeVisible();

    const href = await link.getAttribute("href");
    expect(href).toBe("#features");

    // 初期スクロール位置を記録
    const initialY = await page.evaluate(() => globalThis.scrollY);

    await link.click();

    // スクロールが発生することを確認（URLは変わらない）
    await page.waitForTimeout(500); // スクロールアニメーション待ち
    const finalY = await page.evaluate(() => globalThis.scrollY);
    expect(finalY).toBeGreaterThan(initialY);

    // URLにフラグメントが追加される
    expect(page.url()).toContain("#features");
  });

  test("絶対URL (https://) はそのまま動作", async ({ page, testServerUrl }) => {
    await page.goto(
      `${testServerUrl}/tests/e2e/fixtures/relative-links/README.md`,
    );
    await page.waitForSelector(".markdown-body", { timeout: 5000 });

    const link = page.locator('a:has-text("External Link")');
    await expect(link).toBeVisible();

    const href = await link.getAttribute("href");
    expect(href).toBe("https://example.com");

    // 外部リンクは新しいタブで開くため、クリックイベントをキャプチャ
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      link.click({ modifiers: ["Meta"] }), // Cmd/Ctrl+クリックでシミュレート
    ]);

    // 新しいタブのURLを確認
    expect(popup.url()).toBe("https://example.com/");
  });

  test("XSS対策: javascript: プロトコルはブロック", async ({ page, testServerUrl }) => {
    await page.goto(
      `${testServerUrl}/tests/e2e/fixtures/relative-links/xss-test.md`,
    );
    await page.waitForSelector(".markdown-body", { timeout: 5000 });

    const link = page.locator('a:has-text("Malicious Link")');
    await expect(link).toBeVisible();

    // href属性が空またはブロックされていることを確認
    const href = await link.getAttribute("href");
    expect(href).not.toContain("javascript:");

    // クリックしてもalertが発火しないことを確認
    let alertFired = false;
    page.on("dialog", () => {
      alertFired = true;
    });

    await link.click();
    await page.waitForTimeout(500);

    expect(alertFired).toBe(false);
  });
});
