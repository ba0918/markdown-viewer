/**
 * @file syntax-highlighting.spec.ts
 * @description シンタックスハイライト機能のE2Eテスト
 */

import { expect, test } from "./fixtures.ts";
import {
  expectMarkdownRendered,
  openMarkdownFile,
} from "./helpers/extension-helpers.ts";

test.describe("Syntax Highlighting", () => {
  test("PHPコードがシンタックスハイライトされる", async ({ page, testServerUrl }) => {
    const testUrl =
      `${testServerUrl}/tests/e2e/fixtures/syntax-highlighting.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // PHPコードブロックを取得
    const phpCodeBlock = page.locator("pre code.language-php").first();
    await expect(phpCodeBlock).toBeVisible();

    // highlight.jsのクラスが付与されているか確認
    const className = await phpCodeBlock.getAttribute("class");
    expect(className).toContain("language-php");

    // シンタックスハイライトのspan要素が存在するか確認
    const highlightedSpans = phpCodeBlock.locator(
      "span.hljs-keyword, span.hljs-variable, span.hljs-function",
    );
    await expect(highlightedSpans.first()).toBeVisible();

    // キーワード（function）が色付けされているか確認
    const keywordSpan = phpCodeBlock.locator("span.hljs-keyword").first();
    await expect(keywordSpan).toBeVisible();
    const color = await keywordSpan.evaluate((el) =>
      getComputedStyle(el).color
    );
    // デフォルトの黒色(rgb(0, 0, 0))ではないことを確認
    expect(color).not.toBe("rgb(0, 0, 0)");
    expect(color).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("C++コードがシンタックスハイライトされる", async ({ page, testServerUrl }) => {
    const testUrl =
      `${testServerUrl}/tests/e2e/fixtures/syntax-highlighting.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // C++コードブロックを取得
    const cppCodeBlock = page.locator("pre code.language-cpp").first();
    await expect(cppCodeBlock).toBeVisible();

    // highlight.jsのクラスが付与されているか確認
    const className = await cppCodeBlock.getAttribute("class");
    expect(className).toContain("language-cpp");

    // シンタックスハイライトのspan要素が存在するか確認
    const highlightedSpans = cppCodeBlock.locator(
      "span.hljs-keyword, span.hljs-type, span.hljs-class",
    );
    await expect(highlightedSpans.first()).toBeVisible();

    // 型（int）が色付けされているか確認
    const typeSpan = cppCodeBlock.locator("span.hljs-type").first();
    await expect(typeSpan).toBeVisible();
    const color = await typeSpan.evaluate((el) => getComputedStyle(el).color);
    // デフォルトの黒色ではないことを確認
    expect(color).not.toBe("rgb(0, 0, 0)");
    expect(color).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("JavaScriptコードがシンタックスハイライトされる", async ({ page, testServerUrl }) => {
    const testUrl =
      `${testServerUrl}/tests/e2e/fixtures/syntax-highlighting.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // JavaScriptコードブロックを取得
    const jsCodeBlock = page.locator("pre code.language-javascript").first();
    await expect(jsCodeBlock).toBeVisible();

    // シンタックスハイライトのspan要素が存在するか確認
    const keywordSpan = jsCodeBlock.locator("span.hljs-keyword").first();
    await expect(keywordSpan).toBeVisible();

    // キーワードが適切に色付けされているか確認
    const color = await keywordSpan.evaluate((el) =>
      getComputedStyle(el).color
    );
    expect(color).not.toBe("rgb(0, 0, 0)");
    expect(color).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("複数言語のコードブロックがそれぞれ正しくハイライトされる", async ({ page, testServerUrl }) => {
    const testUrl =
      `${testServerUrl}/tests/e2e/fixtures/syntax-highlighting.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // すべてのコードブロックを確認
    const codeBlocks = page.locator("pre code[class*='language-']");
    const count = await codeBlocks.count();

    // 6つの言語（PHP, C++, JS, Python, TypeScript, Rust）が存在することを確認
    expect(count).toBeGreaterThanOrEqual(6);

    // 各コードブロックにhljsクラスが付与されていることを確認
    for (let i = 0; i < count; i++) {
      const block = codeBlocks.nth(i);
      const className = await block.getAttribute("class");
      expect(className).toMatch(/language-/);

      // シンタックスハイライト用のspan要素が存在することを確認
      const spans = block.locator("span[class*='hljs-']");
      const spanCount = await spans.count();
      expect(spanCount).toBeGreaterThan(0);
    }
  });
});
