/**
 * @file image.spec.ts
 * @description 画像の相対パス表示テスト
 *
 * ローカルMarkdownファイル内の相対パス画像が正しく表示されることを確認。
 * - sanitizerが相対パスsrcを保持すること
 * - ブラウザが相対パスを正しく解決して画像を表示すること
 */

import { expect, test } from "./fixtures.ts";
import {
  expectMarkdownRendered,
  openMarkdownFile,
} from "./helpers/extension-helpers.ts";

test("相対パス画像がレンダリングされる", async ({ page, testServerUrl }) => {
  await openMarkdownFile(
    page,
    `${testServerUrl}/tests/e2e/fixtures/image-test.md`,
  );
  await expectMarkdownRendered(page);

  // img タグが存在することを確認
  const img = page.locator(".markdown-body img");
  await expect(img).toBeVisible();

  // src属性が存在し、画像パスを含むことを確認
  const src = await img.getAttribute("src");
  expect(src).toBeTruthy();
  expect(src).toContain("test-red.png");
});

test("相対パス画像が実際に読み込まれる（壊れていない）", async ({ page, testServerUrl }) => {
  await openMarkdownFile(
    page,
    `${testServerUrl}/tests/e2e/fixtures/image-test.md`,
  );
  await expectMarkdownRendered(page);

  // 画像が実際にロードされたことをnaturalWidthで確認
  // naturalWidth > 0 = 画像が正常に読み込まれた
  const img = page.locator(".markdown-body img");
  await expect(img).toBeVisible();

  const naturalWidth = await img.evaluate(
    (el: HTMLImageElement) => el.naturalWidth,
  );
  expect(naturalWidth).toBeGreaterThan(0);
});

test("alt属性が保持される", async ({ page, testServerUrl }) => {
  await openMarkdownFile(
    page,
    `${testServerUrl}/tests/e2e/fixtures/image-test.md`,
  );
  await expectMarkdownRendered(page);

  const img = page.locator(".markdown-body img");
  await expect(img).toHaveAttribute("alt", "Test Image");
});
