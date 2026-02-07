/**
 * @file extension-helpers.ts
 * @description Chrome拡張機能E2Eテスト用ヘルパー関数
 */

import type { Page, BrowserContext } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Chrome拡張がロードされているか確認
 */
export async function waitForExtensionLoad(context: BrowserContext): Promise<void> {
  // Service Workerが起動するまで待機
  await context.waitForEvent('serviceworker', { timeout: 10000 });
}

/**
 * Markdownファイルを開く
 *
 * @param page - Playwrightページオブジェクト
 * @param filePath - 絶対パス（file:// プロトコル付き）
 */
export async function openMarkdownFile(page: Page, filePath: string): Promise<void> {
  await page.goto(filePath);
  // Markdown Viewerがレンダリングされるまで待機
  await page.waitForSelector('.markdown-viewer', { timeout: 5000 });
}

/**
 * Options画面を開く
 *
 * @param page - Playwrightページオブジェクト
 * @param extensionId - 拡張機能ID
 */
export async function openOptionsPage(page: Page, extensionId: string): Promise<void> {
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Popup画面を開く
 *
 * @param page - Playwrightページオブジェクト
 * @param extensionId - 拡張機能ID
 */
export async function openPopupPage(page: Page, extensionId: string): Promise<void> {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.waitForLoadState('domcontentloaded');
}

/**
 * 拡張機能IDを取得
 *
 * Chrome拡張のIDは manifest.json の key から生成されるが、
 * unpacked拡張の場合は動的に生成される。
 * chrome://extensions/ ページから取得する。
 *
 * @param context - Playwrightブラウザコンテキスト
 * @returns 拡張機能ID
 */
export async function getExtensionId(context: BrowserContext): Promise<string> {
  const page = await context.newPage();
  await page.goto('chrome://extensions/');

  // デベロッパーモードを有効化
  await page.locator('#devMode').check();

  // 拡張機能のIDを取得（最初の拡張機能を想定）
  const extensionId = await page.locator('extensions-item')
    .first()
    .getAttribute('id');

  await page.close();

  if (!extensionId) {
    throw new Error('Failed to get extension ID');
  }

  return extensionId;
}

/**
 * テーマが適用されているか確認
 *
 * @param page - Playwrightページオブジェクト
 * @param themeName - テーマ名（例: 'light', 'dark'）
 */
export async function expectThemeApplied(page: Page, themeName: string): Promise<void> {
  const linkElement = page.locator('link[data-markdown-theme]');
  await expect(linkElement).toHaveAttribute('data-markdown-theme', themeName);
  await expect(linkElement).toHaveAttribute('href', new RegExp(`${themeName}\\.css$`));
}

/**
 * Markdownがレンダリングされているか確認
 *
 * @param page - Playwrightページオブジェクト
 */
export async function expectMarkdownRendered(page: Page): Promise<void> {
  // .markdown-viewer コンテナが存在するか確認
  const viewer = page.locator('.markdown-viewer');
  await expect(viewer).toBeVisible();

  // HTMLコンテンツが存在するか確認（空でない）
  const content = await viewer.innerHTML();
  expect(content.length).toBeGreaterThan(0);
}

/**
 * コンソールログを監視
 *
 * @param page - Playwrightページオブジェクト
 * @param callback - ログメッセージを受け取るコールバック
 */
export function monitorConsole(page: Page, callback: (message: string) => void): void {
  page.on('console', (msg) => {
    callback(msg.text());
  });
}
