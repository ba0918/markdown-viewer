/**
 * @file markdown-rendering.spec.ts
 * @description Markdown表示機能のE2Eテスト
 */

import { test, expect } from './fixtures.ts';
import {
  openMarkdownFile,
  expectMarkdownRendered,
  expectThemeApplied,
} from './helpers/extension-helpers.ts';

test.describe('Markdown Rendering', () => {

  test('Markdownファイルが正しくレンダリングされる', async ({ page, testServerUrl }) => {
    // Markdownファイルを開く（http://localhost経由）
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/test.md`;
    await openMarkdownFile(page, testUrl);

    // Markdownがレンダリングされているか確認
    await expectMarkdownRendered(page);

    // 見出しが表示されているか確認
    const h1 = page.locator('h1:has-text("E2E Test Markdown")');
    await expect(h1).toBeVisible();

    // 太字が表示されているか確認
    const bold = page.locator('strong:has-text("Bold text")');
    await expect(bold).toBeVisible();

    // コードブロックが表示されているか確認
    const codeBlock = page.locator('pre code');
    await expect(codeBlock).toBeVisible();
  });

  test('デフォルトテーマ（light）が適用される', async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/test.md`;
    await openMarkdownFile(page, testUrl);

    // lightテーマが適用されているか確認
    await expectThemeApplied(page, 'light');
  });

  test('シンタックスハイライトが適用される', async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/test.md`;
    await openMarkdownFile(page, testUrl);

    // コードブロックにhighlight.jsのクラスが付与されているか確認
    const codeBlock = page.locator('pre code');
    const className = await codeBlock.getAttribute('class');

    // highlight.jsは "language-javascript" や "hljs" などのクラスを付与する
    expect(className).toMatch(/language-javascript|hljs/);
  });

  test('テーブルが正しくレンダリングされる', async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/test.md`;
    await openMarkdownFile(page, testUrl);

    // テーブルが表示されているか確認
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // テーブルヘッダーが存在するか確認
    const th = page.locator('th:has-text("Feature")');
    await expect(th).toBeVisible();

    // テーブル行が存在するか確認
    const td = page.locator('td:has-text("Rendering")');
    await expect(td).toBeVisible();
  });

  test('リンクが正しくレンダリングされる', async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/test.md`;
    await openMarkdownFile(page, testUrl);

    // リンクが表示されているか確認
    const link = page.locator('a:has-text("Link")');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', 'https://example.com');
  });
});
