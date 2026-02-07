/**
 * @file hot-reload.spec.ts
 * @description Hot Reload機能のE2Eテスト
 */

import { test, expect } from './fixtures.ts';
import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import {
  openMarkdownFile,
  openOptionsPage,
} from './helpers/extension-helpers.ts';

// テスト用Markdownファイルのパス
const TEST_MD_PATH = resolve(process.cwd(), 'tests/e2e/fixtures/hot-reload-test.md');

// 元のMarkdownコンテンツ
const ORIGINAL_CONTENT = `# Hot Reload Test

Original content.
`;

// 更新後のMarkdownコンテンツ
const UPDATED_CONTENT = `# Hot Reload Test

**Updated content!**
`;

test.describe('Hot Reload', () => {
  // Hot Reloadテストは時間がかかるため、タイムアウトを120秒に延長
  test.setTimeout(120000);

  test.beforeEach(async () => {
    // テスト用Markdownファイルを作成（元のコンテンツ）
    await writeFile(TEST_MD_PATH, ORIGINAL_CONTENT, 'utf-8');
  });

  test.afterEach(async () => {
    // テスト用Markdownファイルを元に戻す
    await writeFile(TEST_MD_PATH, ORIGINAL_CONTENT, 'utf-8');
  });

  test('Hot Reload有効時、ファイル変更で自動リロードされる', async ({ page, context, extensionId, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/hot-reload-test.md`;

    // Options画面でHot Reloadを有効化
    const optionsPage = await context.newPage();
    await openOptionsPage(optionsPage, extensionId);

    // Hot Reloadトグルボタンを探す（aria-labelで探す）
    const hotReloadToggle = optionsPage.getByLabel(/Hot Reload有効化|Hot Reload無効化/);

    // トグルボタンが表示されるまで待機
    await hotReloadToggle.waitFor({ state: 'visible', timeout: 10000 });

    // 現在の状態を確認（activeクラスがあるかチェック）
    const isActive = await hotReloadToggle.evaluate((el) => el.classList.contains('active'));

    // 無効の場合のみクリック
    if (!isActive) {
      await hotReloadToggle.click();
      // クリック後、設定が反映されるまで待機
      await optionsPage.waitForTimeout(1000);
    }

    await optionsPage.close();

    // Markdownファイルを開く
    await openMarkdownFile(page, testUrl);

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

  test('Hot Reload無効時、ファイル変更してもリロードされない', async ({ page, context, extensionId, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/hot-reload-test.md`;

    // Options画面でHot Reloadを無効化（デフォルトで無効のはず）
    const optionsPage = await context.newPage();
    await openOptionsPage(optionsPage, extensionId);

    // Hot Reloadトグルボタンを探す
    const hotReloadToggle = optionsPage.getByLabel(/Hot Reload有効化|Hot Reload無効化/);

    // トグルボタンが表示されるまで待機
    await hotReloadToggle.waitFor({ state: 'visible', timeout: 10000 });

    // 現在の状態を確認
    const isActive = await hotReloadToggle.evaluate((el) => el.classList.contains('active'));

    // 有効の場合のみクリックして無効化
    if (isActive) {
      await hotReloadToggle.click();
      await optionsPage.waitForTimeout(1000);
    }

    await optionsPage.close();

    // Markdownファイルを開く
    await openMarkdownFile(page, testUrl);

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
