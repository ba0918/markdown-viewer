/**
 * @file hot-reload.spec.ts
 * @description Hot Reload機能のE2Eテスト
 */

import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { writeFile, readFile } from 'node:fs/promises';
import {
  waitForExtensionLoad,
  openMarkdownFile,
  getExtensionId,
  openOptionsPage,
} from './helpers/extension-helpers.ts';

// テスト用Markdownファイルのパス
const TEST_MD_PATH = resolve(process.cwd(), 'tests/e2e/fixtures/hot-reload-test.md');
const TEST_MD_URL = `file://${TEST_MD_PATH}`;

// 元のMarkdownコンテンツ
const ORIGINAL_CONTENT = `# Hot Reload Test

Original content.
`;

// 更新後のMarkdownコンテンツ
const UPDATED_CONTENT = `# Hot Reload Test

**Updated content!**
`;

test.describe('Hot Reload', () => {
  test.beforeEach(async ({ context }) => {
    // Chrome拡張がロードされるまで待機
    await waitForExtensionLoad(context);

    // テスト用Markdownファイルを作成（元のコンテンツ）
    await writeFile(TEST_MD_PATH, ORIGINAL_CONTENT, 'utf-8');
  });

  test.afterEach(async () => {
    // テスト用Markdownファイルを元に戻す
    await writeFile(TEST_MD_PATH, ORIGINAL_CONTENT, 'utf-8');
  });

  test('Hot Reload有効時、ファイル変更で自動リロードされる', async ({ page, context }) => {
    // 拡張機能IDを取得
    const extensionId = await getExtensionId(context);

    // Options画面でHot Reloadを有効化
    const optionsPage = await context.newPage();
    await openOptionsPage(optionsPage, extensionId);

    // Hot Reloadトグルを有効化
    const hotReloadToggle = optionsPage.locator('input[type="checkbox"]#hotReloadEnabled');
    await hotReloadToggle.check();

    // 設定が保存されるまで少し待機
    await optionsPage.waitForTimeout(500);
    await optionsPage.close();

    // Markdownファイルを開く
    await openMarkdownFile(page, TEST_MD_URL);

    // 元のコンテンツが表示されているか確認
    await expect(page.locator('p:has-text("Original content.")')).toBeVisible();

    // コンソールログを監視
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    // Markdownファイルを更新
    await writeFile(TEST_MD_PATH, UPDATED_CONTENT, 'utf-8');

    // Hot Reloadが検知してリロードするまで待機（最大10秒）
    // "File changed detected! Reloading..." ログが出るか、ページがリロードされるのを待つ
    await page.waitForTimeout(5000); // Hot Reloadのinterval（デフォルト3秒）+ バッファ

    // リロード後、更新されたコンテンツが表示されているか確認
    // ※ リロード後は新しいコンテンツが表示される
    const updatedText = page.locator('strong:has-text("Updated content!")');
    await expect(updatedText).toBeVisible({ timeout: 5000 });

    // コンソールログに "File changed detected!" が含まれているか確認
    const hasDetectedLog = consoleLogs.some((log) =>
      log.includes('File changed detected')
    );
    expect(hasDetectedLog).toBe(true);
  });

  test('Hot Reload無効時、ファイル変更してもリロードされない', async ({ page, context }) => {
    // 拡張機能IDを取得
    const extensionId = await getExtensionId(context);

    // Options画面でHot Reloadを無効化（デフォルトで無効のはず）
    const optionsPage = await context.newPage();
    await openOptionsPage(optionsPage, extensionId);

    // Hot Reloadトグルを無効化
    const hotReloadToggle = optionsPage.locator('input[type="checkbox"]#hotReloadEnabled');
    await hotReloadToggle.uncheck();

    await optionsPage.waitForTimeout(500);
    await optionsPage.close();

    // Markdownファイルを開く
    await openMarkdownFile(page, TEST_MD_URL);

    // 元のコンテンツが表示されているか確認
    await expect(page.locator('p:has-text("Original content.")')).toBeVisible();

    // Markdownファイルを更新
    await writeFile(TEST_MD_PATH, UPDATED_CONTENT, 'utf-8');

    // 5秒待機（Hot Reloadが有効なら検知される時間）
    await page.waitForTimeout(5000);

    // 元のコンテンツがまだ表示されているか確認（リロードされていない）
    await expect(page.locator('p:has-text("Original content.")')).toBeVisible();

    // 更新されたコンテンツは表示されていないはず
    const updatedText = page.locator('strong:has-text("Updated content!")');
    await expect(updatedText).not.toBeVisible();
  });
});
