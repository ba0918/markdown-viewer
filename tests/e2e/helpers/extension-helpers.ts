/**
 * @file extension-helpers.ts
 * @description Chrome拡張機能E2Eテスト用ヘルパー関数
 */

import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Markdownファイルを開く
 *
 * @param page - Playwrightページオブジェクト
 * @param url - MarkdownファイルのURL（file:// or http://localhost）
 */
export async function openMarkdownFile(page: Page, url: string): Promise<void> {
  await page.goto(url);
  // Markdown Viewerがレンダリングされるまで待機
  await page.waitForSelector(".markdown-viewer", { timeout: 10000 });
}

/**
 * Options画面を開く
 *
 * @param page - Playwrightページオブジェクト
 * @param extensionId - 拡張機能ID
 */
export async function openOptionsPage(
  page: Page,
  extensionId: string,
): Promise<void> {
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.waitForLoadState("domcontentloaded");
}

/**
 * Popup画面を開く
 *
 * @param page - Playwrightページオブジェクト
 * @param extensionId - 拡張機能ID
 */
export async function openPopupPage(
  page: Page,
  extensionId: string,
): Promise<void> {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.waitForLoadState("domcontentloaded");
}

/**
 * テーマが適用されているか確認
 *
 * @param page - Playwrightページオブジェクト
 * @param themeName - テーマ名（例: 'light', 'dark'）
 */
export async function expectThemeApplied(
  page: Page,
  themeName: string,
): Promise<void> {
  // 全テーマのlink要素が存在し、有効なテーマだけdisabled属性がない仕組み
  // disabledでない（=有効な）link要素を探す
  const linkElement = page.locator(
    `link[data-markdown-theme="${themeName}"]:not([disabled])`,
  );
  // link要素はhead内にあるためtoBeVisible()は使えない
  // 代わりに要素数が1であることを確認
  await expect(linkElement).toHaveCount(1);
  await expect(linkElement).toHaveAttribute(
    "href",
    new RegExp(`${themeName}\\.css$`),
  );
}

/**
 * Markdownがレンダリングされているか確認
 *
 * @param page - Playwrightページオブジェクト
 */
export async function expectMarkdownRendered(page: Page): Promise<void> {
  // .markdown-viewer コンテナが存在するか確認
  const viewer = page.locator(".markdown-viewer");
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
export function monitorConsole(
  page: Page,
  callback: (message: string) => void,
): void {
  page.on("console", (msg) => {
    callback(msg.text());
  });
}
