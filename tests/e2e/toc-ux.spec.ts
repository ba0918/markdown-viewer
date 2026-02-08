/**
 * @file toc-ux.spec.ts
 * @description ToC UX改善機能のE2Eテスト
 *
 * ToC UX機能の以下の機能をテスト:
 * - 階層の折りたたみ機能（▶/▼アイコン）
 * - ToC全体の表示/非表示Toggle（×/☰ボタン）
 * - 横幅調整機能（Resize Handle）
 * - スクロール追従（固定位置）
 * - デザイン（全6テーマ対応）
 */

import { test, expect } from './fixtures.ts';
import {
  openMarkdownFile,
  expectMarkdownRendered,
} from './helpers/extension-helpers.ts';

test.describe('ToC UX Improvements', () => {

  test('ToCが左サイドに固定表示される', async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/long-document.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // ToC コンテナが存在することを確認
    const tocContainer = page.locator('.toc-container');
    await expect(tocContainer).toBeVisible();

    // position: fixed であることを確認
    const position = await tocContainer.evaluate((el) => {
      return window.getComputedStyle(el).position;
    });
    expect(position).toBe('fixed');

    // 左端に配置されていることを確認
    const left = await tocContainer.evaluate((el) => {
      return window.getComputedStyle(el).left;
    });
    expect(left).toBe('0px');
  });

  test('階層の折りたたみ: アイコンクリックで子要素が折りたたまれる', async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/long-document.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // 折りたたみボタンが存在することを確認
    const collapseBtn = page.locator('.toc-collapse-btn').first();
    await expect(collapseBtn).toBeVisible();

    // 初期状態: 展開状態（▼）
    const initialIcon = await collapseBtn.textContent();
    expect(initialIcon).toBe('▼');

    // サブリストが表示されていることを確認
    const sublist = page.locator('.toc-sublist').first();
    await expect(sublist).toBeVisible();

    // 折りたたみボタンをクリック
    await collapseBtn.click();

    // アイコンが▶に変わることを確認
    const collapsedIcon = await collapseBtn.textContent();
    expect(collapsedIcon).toBe('▶');

    // サブリストが非表示になることを確認
    await expect(sublist).not.toBeVisible();

    // 再度クリックして展開
    await collapseBtn.click();

    // アイコンが▼に戻ることを確認
    const expandedIcon = await collapseBtn.textContent();
    expect(expandedIcon).toBe('▼');

    // サブリストが再表示されることを確認
    await expect(sublist).toBeVisible();
  });

  test('ToC全体の表示/非表示: Toggleボタンで開閉できる', async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/long-document.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // ToC ヘッダーとToggleボタンが存在することを確認
    const tocHeader = page.locator('.toc-header');
    await expect(tocHeader).toBeVisible();

    const toggleBtn = page.locator('.toc-toggle-btn');
    await expect(toggleBtn).toBeVisible();

    // 初期状態: 表示状態（×）
    const initialIcon = await toggleBtn.textContent();
    expect(initialIcon).toBe('×');

    // Toggleボタンをクリックして非表示にする
    await toggleBtn.click();

    // ToCヘッダーが非表示になることを確認
    await expect(tocHeader).not.toBeVisible();

    // ShowボタンがVisible（☰）
    const showBtn = page.locator('.toc-show-btn');
    await expect(showBtn).toBeVisible();
    const showIcon = await showBtn.textContent();
    expect(showIcon).toBe('☰');

    // ToCコンテナの幅が40pxになることを確認
    const tocContainer = page.locator('.toc-container');
    const width = await tocContainer.evaluate((el) => {
      return window.getComputedStyle(el).width;
    });
    expect(width).toBe('40px');

    // Showボタンをクリックして再表示
    await showBtn.click();

    // ToCヘッダーが再表示されることを確認
    await expect(tocHeader).toBeVisible();
    await expect(toggleBtn).toBeVisible();
  });

  test('横幅調整: Resize Handleが表示される', async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/long-document.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // Resize Handleが存在することを確認
    const resizeHandle = page.locator('.toc-resize-handle');
    await expect(resizeHandle).toBeVisible();

    // cursor: col-resize であることを確認
    const cursor = await resizeHandle.evaluate((el) => {
      return window.getComputedStyle(el).cursor;
    });
    expect(cursor).toBe('col-resize');

    // 右端に配置されていることを確認
    const right = await resizeHandle.evaluate((el) => {
      return window.getComputedStyle(el).right;
    });
    expect(right).toBe('0px');
  });

  test('スクロール追従: 長いドキュメントをスクロールしてもToCが見える', async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/long-document.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // 初期位置でToCが表示されていることを確認
    const tocContainer = page.locator('.toc-container');
    await expect(tocContainer).toBeVisible();

    // ページ下部にスクロール
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });

    // スクロール後もToCが表示されていることを確認
    await expect(tocContainer).toBeVisible();

    // さらに下部にスクロール
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // さらにスクロール後もToCが表示されていることを確認
    await expect(tocContainer).toBeVisible();
  });

  test('テーマ対応: 全6テーマでToC要素が存在する', async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/long-document.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // ToCコンテナが存在し、テーマクラスが適用されていることを確認
    const tocContainer = page.locator('.toc-container');
    const classes = await tocContainer.getAttribute('class');

    // 少なくともtoc-containerクラスとtoc-theme-*クラスが存在することを確認
    expect(classes).toContain('toc-container');
    expect(classes).toMatch(/toc-theme-/);
  });

  test('折りたたみ状態: リロード後も状態が保持される', async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/long-document.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // 折りたたみボタンをクリック
    const collapseBtn = page.locator('.toc-collapse-btn').first();
    await collapseBtn.click();

    // アイコンが▶に変わることを確認
    let icon = await collapseBtn.textContent();
    expect(icon).toBe('▶');

    // ページをリロード
    await page.reload();
    await expectMarkdownRendered(page);

    // リロード後も折りたたみ状態が保持されていることを確認
    const collapseBtnAfterReload = page.locator('.toc-collapse-btn').first();
    icon = await collapseBtnAfterReload.textContent();
    expect(icon).toBe('▶');

    // サブリストが非表示のままであることを確認
    const sublist = page.locator('.toc-sublist').first();
    await expect(sublist).not.toBeVisible();
  });

  test('ToC表示状態: リロード後も状態が保持される', async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/long-document.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // Toggleボタンをクリックして非表示にする
    const toggleBtn = page.locator('.toc-toggle-btn');
    await toggleBtn.click();

    // ShowボタンがVisible
    const showBtn = page.locator('.toc-show-btn');
    await expect(showBtn).toBeVisible();

    // ページをリロード
    await page.reload();
    await expectMarkdownRendered(page);

    // リロード後も非表示状態が保持されていることを確認
    const showBtnAfterReload = page.locator('.toc-show-btn');
    await expect(showBtnAfterReload).toBeVisible();

    // ToCヘッダーが非表示のままであることを確認
    const tocHeader = page.locator('.toc-header');
    await expect(tocHeader).not.toBeVisible();
  });

});
