import { expect, test } from "./fixtures.ts";
import {
  expectMarkdownRendered,
  openMarkdownFile,
} from "./helpers/extension-helpers.ts";

/**
 * HTML Export 機能のE2Eテスト
 *
 * 責務: エクスポートメニューUI、ダウンロード機能、出力HTML品質の検証
 */

test.describe("HTML Export", () => {
  test("should display document header menu button in DocumentHeader", async ({ page, testServerUrl }) => {
    await openMarkdownFile(page, `${testServerUrl}/tests/e2e/fixtures/test.md`);
    await expectMarkdownRendered(page);

    // DocumentHeaderMenuボタンが表示されていること
    const menuButton = page.locator(".document-header-menu-button");
    await expect(menuButton).toBeVisible();
    await expect(menuButton).toHaveText("⋮");
  });

  test("should open dropdown menu when menu button is clicked", async ({ page, testServerUrl }) => {
    await openMarkdownFile(page, `${testServerUrl}/tests/e2e/fixtures/test.md`);
    await expectMarkdownRendered(page);

    // 初期状態ではドロップダウンが非表示
    const dropdown = page.locator(".document-header-menu-dropdown");
    await expect(dropdown).not.toBeVisible();

    // メニューボタンをクリック
    const menuButton = page.locator(".document-header-menu-button");
    await menuButton.click();

    // ドロップダウンが表示される
    await expect(dropdown).toBeVisible();

    // "Export HTML" メニュー項目が表示される
    const exportHtmlItem = page.locator(".document-header-menu-item").filter({
      hasText: "Export HTML",
    });
    await expect(exportHtmlItem).toBeVisible();
  });

  test("should trigger export when Export HTML is clicked", async ({ page, testServerUrl }) => {
    await openMarkdownFile(page, `${testServerUrl}/tests/e2e/fixtures/test.md`);
    await expectMarkdownRendered(page);

    // メニューを開く
    const menuButton = page.locator(".document-header-menu-button");
    await menuButton.click();

    // "Export HTML" をクリック
    const exportHtmlItem = page.locator(".document-header-menu-item").filter({
      hasText: "Export HTML",
    });

    // コンソールログを監視（アプリケーションエラーがないことを確認）
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Blob URLダウンロード時のリソースロードエラーは無視
        // （headless環境ではダウンロード先がないため発生する無害なログ）
        if (text.includes("net::ERR_FAILED")) return;
        consoleErrors.push(text);
      }
    });

    await exportHtmlItem.click();

    // 少し待機（messaging処理完了待ち）
    await page.waitForTimeout(500);

    // アプリケーションエラーが出ていないことを確認
    expect(consoleErrors).toEqual([]);
  });

  // NOTE: ダウンロードファイルの内容検証はChrome拡張のdownload APIの特性上、
  // E2Eテストでは困難なため、Unit testとブラウザでの手動確認で代替
  test.skip("should export HTML with correct structure and embedded CSS", async () => {
    // このテストは html-exporter.test.ts (Unit test) で詳細に検証済み
  });

  // NOTE: テーマスタイリングの詳細検証はUnit testで実施
  test.skip("should export HTML with current theme styling", async () => {
    // このテストは html-exporter.test.ts (Unit test) で検証済み
  });

  // NOTE: スタンドアロンHTML検証は手動テストで実施（ブラウザで開いて確認）
  test.skip("should export HTML that can be opened standalone", async () => {
    // このテストは手動確認で検証（エクスポート→ブラウザで開く→表示確認）
  });

  test("should close dropdown menu after export", async ({ page, testServerUrl }) => {
    await openMarkdownFile(page, `${testServerUrl}/tests/e2e/fixtures/test.md`);
    await expectMarkdownRendered(page);

    // メニューを開く
    await page.locator(".document-header-menu-button").click();
    const dropdown = page.locator(".document-header-menu-dropdown");
    await expect(dropdown).toBeVisible();

    // エクスポート実行
    await page.locator(".document-header-menu-item").filter({
      hasText: "Export HTML",
    }).click();

    // 少し待機（messaging処理完了待ち）
    await page.waitForTimeout(500);

    // ドロップダウンが閉じること
    await expect(dropdown).not.toBeVisible();
  });

  test("should have proper ARIA attributes for accessibility", async ({ page, testServerUrl }) => {
    await openMarkdownFile(page, `${testServerUrl}/tests/e2e/fixtures/test.md`);
    await expectMarkdownRendered(page);

    const menuButton = page.locator(".document-header-menu-button");

    // 初期状態でaria-expanded=false
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await expect(menuButton).toHaveAttribute("aria-label", "Actions menu");

    // クリックでaria-expanded=true
    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  });

  test("should include Mermaid SVG in rendered DOM for export", async ({ page, testServerUrl }) => {
    await openMarkdownFile(
      page,
      `${testServerUrl}/tests/e2e/fixtures/mermaid-test.md`,
    );
    await expectMarkdownRendered(page);

    // Mermaidダイアグラムがレンダリングされるまで待機
    await page.waitForSelector(
      ".mermaid-diagram[data-mermaid-rendered='true']",
      { timeout: 10000 },
    );

    // DOM上のmarkdown-bodyのinnerHTMLにMermaid SVGが含まれること
    // NOTE: .markdown-bodyが複数存在する場合があるため、.markdown-viewer内のものを指定
    const bodyHTML = await page.locator(".markdown-viewer > .markdown-body")
      .innerHTML();
    expect(bodyHTML).toContain("<svg");
    expect(bodyHTML).toContain("mermaid-diagram");
    expect(bodyHTML).toContain("data-mermaid-rendered");

    // 元のMermaidコードブロック（code.language-mermaid）がSVGに置換されていること
    const mermaidCodeBlocks = await page.locator(
      ".markdown-viewer code.language-mermaid",
    ).count();
    expect(mermaidCodeBlocks).toBe(0);
  });

  test("should include MathJax SVG in rendered DOM for export", async ({ page, testServerUrl }) => {
    await openMarkdownFile(
      page,
      `${testServerUrl}/tests/e2e/fixtures/math-test.md`,
    );
    await expectMarkdownRendered(page);

    // MathJaxがレンダリングされるまで待機
    await page.waitForSelector("mjx-container", { timeout: 10000 });

    // DOM上のmarkdown-bodyのinnerHTMLにMathJax SVGが含まれること
    // NOTE: .markdown-bodyが複数存在する場合があるため、.markdown-viewer内のものを指定
    const bodyHTML = await page.locator(".markdown-viewer > .markdown-body")
      .innerHTML();
    expect(bodyHTML).toContain("mjx-container");
    expect(bodyHTML).toContain("<svg");
  });

  test("should not include copy buttons in rendered DOM innerHTML", async ({ page, testServerUrl }) => {
    await openMarkdownFile(
      page,
      `${testServerUrl}/tests/e2e/fixtures/syntax-highlighting.md`,
    );
    await expectMarkdownRendered(page);

    // コードブロックにコピーボタンが存在すること（DOM上）
    const copyButtons = await page.locator(".code-block-copy-button").count();
    expect(copyButtons).toBeGreaterThan(0);

    // getRenderedHTMLのクリーンアップロジックを検証:
    // DOMをクローンしてコピーボタンを除去した結果を確認
    // NOTE: 実際のgetRenderedHTML関数はContent Script内部なので、
    // 同等のロジックをpage.evaluate()で実行して検証
    const cleanedHTML = await page.evaluate(() => {
      const container = document.querySelector(".markdown-body");
      if (!container) return "";
      const clone = container.cloneNode(true) as HTMLElement;
      clone.querySelectorAll(".code-block-copy-button").forEach((btn) => {
        btn.closest("div:not(.code-block-wrapper)")?.remove();
      });
      return clone.innerHTML;
    });

    // クリーンアップ後のHTMLにコピーボタンが含まれないこと
    expect(cleanedHTML).not.toContain("code-block-copy-button");
    // コードブロック自体は残っていること
    expect(cleanedHTML).toContain("<pre");
    expect(cleanedHTML).toContain("<code");
  });

  test("should trigger export without errors on Mermaid page", async ({ page, testServerUrl }) => {
    await openMarkdownFile(
      page,
      `${testServerUrl}/tests/e2e/fixtures/mermaid-test.md`,
    );
    await expectMarkdownRendered(page);

    // Mermaidレンダリング完了待機
    await page.waitForSelector(
      ".mermaid-diagram[data-mermaid-rendered='true']",
      { timeout: 10000 },
    );

    // メニューを開いてExport HTMLをクリック
    await page.locator(".document-header-menu-button").click();

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (text.includes("net::ERR_FAILED")) return;
        consoleErrors.push(text);
      }
    });

    await page.locator(".document-header-menu-item").filter({
      hasText: "Export HTML",
    }).click();

    await page.waitForTimeout(1000);

    // エクスポートエラーがないこと
    expect(consoleErrors).toEqual([]);
  });

  test("should trigger export without errors on MathJax page", async ({ page, testServerUrl }) => {
    await openMarkdownFile(
      page,
      `${testServerUrl}/tests/e2e/fixtures/math-test.md`,
    );
    await expectMarkdownRendered(page);

    // MathJaxレンダリング完了待機
    await page.waitForSelector("mjx-container", { timeout: 10000 });

    // メニューを開いてExport HTMLをクリック
    await page.locator(".document-header-menu-button").click();

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (text.includes("net::ERR_FAILED")) return;
        consoleErrors.push(text);
      }
    });

    await page.locator(".document-header-menu-item").filter({
      hasText: "Export HTML",
    }).click();

    await page.waitForTimeout(1000);

    // エクスポートエラーがないこと
    expect(consoleErrors).toEqual([]);
  });
});
