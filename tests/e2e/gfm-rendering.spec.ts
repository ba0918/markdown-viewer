/**
 * @file gfm-rendering.spec.ts
 * @description GitHub Flavored Markdown (GFM) 機能のE2Eテスト
 *
 * GFM仕様の以下の機能をテスト:
 * - Strikethrough (打ち消し線)
 * - Task Lists (タスクリスト)
 * - Tables (テーブル) - 既存テストと重複するが、GFM文脈で再確認
 * - Autolinks (オートリンク)
 */

import { expect, test } from "./fixtures.ts";
import {
  expectMarkdownRendered,
  openMarkdownFile,
} from "./helpers/extension-helpers.ts";

test.describe("GitHub Flavored Markdown (GFM)", () => {
  test("打ち消し線（Strikethrough）が正しく表示される", async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/gfm-test.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // <del> タグでレンダリングされているか確認
    const strikethrough = page.locator('del:has-text("strikethrough")');
    await expect(strikethrough).toBeVisible();

    // CSSで打ち消し線スタイルが適用されているか確認
    const textDecoration = await strikethrough.evaluate((el) => {
      return globalThis.getComputedStyle(el).textDecoration;
    });
    expect(textDecoration).toContain("line-through");

    // 複数の打ち消し線が存在するか確認
    const deletedText = page.locator('del:has-text("deleted")');
    await expect(deletedText).toBeVisible();

    const removedText = page.locator('del:has-text("removed")');
    await expect(removedText).toBeVisible();
  });

  test("タスクリスト（Task Lists）のチェックボックスが表示される", async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/gfm-test.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // チェックボックス（input[type="checkbox"]）が存在するか確認
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    expect(checkboxCount).toBeGreaterThanOrEqual(4); // 少なくとも4つのタスクがある

    // 完了したタスク（checked）が存在するか確認
    const checkedCheckbox = page.locator('input[type="checkbox"][checked]')
      .first();
    await expect(checkedCheckbox).toBeVisible();
    await expect(checkedCheckbox).toBeDisabled(); // クリック不可であることを確認

    // 未完了のタスク（unchecked）が存在するか確認
    const uncheckedCheckbox = page.locator(
      'input[type="checkbox"]:not([checked])',
    ).first();
    await expect(uncheckedCheckbox).toBeVisible();
    await expect(uncheckedCheckbox).toBeDisabled();
  });

  test("タスクリストのスタイルが正しく適用される", async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/gfm-test.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // タスクリストアイテムが存在することを確認
    const taskListItem = page.locator("li").filter({
      has: page.locator('input[type="checkbox"]'),
    }).first();
    await expect(taskListItem).toBeVisible();

    // チェックボックスのマージンが設定されているか確認（CSSが適用されている証拠）
    const checkbox = taskListItem.locator('input[type="checkbox"]');
    const marginLeft = await checkbox.evaluate((el) => {
      return globalThis.getComputedStyle(el).marginLeft;
    });
    // マージンが設定されていることを確認（-1.6em相当の負のマージン）
    expect(marginLeft).not.toBe("0px");
  });

  test("テーブルが正しくレンダリングされる（GFM）", async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/gfm-test.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // テーブルが表示されているか確認
    const table = page.locator("table").first();
    await expect(table).toBeVisible();

    // テーブルヘッダーが存在するか確認
    const th = page.locator('th:has-text("Feature")');
    await expect(th).toBeVisible();

    // テーブル内の打ち消し線が機能しているか確認
    const strikethroughInTable = page.locator(
      'table del:has-text("Old Feature")',
    );
    await expect(strikethroughInTable).toBeVisible();
  });

  test("オートリンク（Autolinks）が自動的にリンクになる", async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/gfm-test.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // URLが自動的にリンクになっているか確認（first()で最初の要素のみ取得）
    const link1 = page.locator('a[href="https://example.com"]').first();
    await expect(link1).toBeVisible();

    const link2 = page.locator('a[href="https://github.com"]').first();
    await expect(link2).toBeVisible();

    const link3 = page.locator('a[href="https://google.com"]').first();
    await expect(link3).toBeVisible();

    // 複数のリンクが存在することを確認
    const exampleLinks = page.locator('a[href="https://example.com"]');
    const count = await exampleLinks.count();
    expect(count).toBeGreaterThanOrEqual(2); // 少なくとも2つ存在
  });

  test("複合GFM機能が同時に動作する", async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/gfm-test.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // タスクリスト + 打ち消し線 + 太字
    const taskWithStrikethrough = page.locator("li").filter({
      hasText: "Complete",
    }).filter({
      has: page.locator("del"),
    });
    await expect(taskWithStrikethrough).toBeVisible();

    // タスクリスト + リンク + 斜体
    const taskWithLink = page.locator("li").filter({
      hasText: "documentation",
    }).filter({
      has: page.locator('a[href="https://example.com"]'),
    });
    await expect(taskWithLink).toBeVisible();
  });

  test("テーブル内の複合GFM機能", async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/gfm-test.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // テーブル内の打ち消し線付きリンク
    const strikethroughLinkInTable = page.locator("table").locator(
      'del:has-text("https://old.example.com")',
    );
    await expect(strikethroughLinkInTable).toBeVisible();

    // テーブル内のタスクリスト表記（記号として）
    const tableCell = page.locator('td:has-text("[x] Done")');
    await expect(tableCell).toBeVisible();
  });

  test.skip("全テーマでGFM要素が適切にスタイリングされる", async ({ page, testServerUrl }) => {
    // NOTE: このテストはchrome.storage APIがE2E環境で正しく動作しないためスキップ
    // テーマ切り替え機能のE2Eテストは別途 theme-switching.spec.ts で実装予定
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/gfm-test.md`;

    // デフォルトテーマでGFM要素が表示されることを確認
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // 打ち消し線が表示されているか確認
    const strikethrough = page.locator("del").first();
    await expect(strikethrough).toBeVisible();

    // チェックボックスが表示されているか確認
    const checkbox = page.locator('input[type="checkbox"]').first();
    await expect(checkbox).toBeVisible();
  });
});
