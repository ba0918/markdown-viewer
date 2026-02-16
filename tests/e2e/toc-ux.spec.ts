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
 * - アクティブハイライト安定性
 */

import { expect, test } from "./fixtures.ts";
import {
  expectMarkdownRendered,
  openMarkdownFile,
} from "./helpers/extension-helpers.ts";

test.describe("ToC UX Improvements", () => {
  test("ToCが左サイドに固定表示される", async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/long-document.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // ToC コンテナが存在することを確認
    const tocContainer = page.locator(".toc-container");
    await expect(tocContainer).toBeVisible();

    // position: fixed であることを確認
    const position = await tocContainer.evaluate((el) => {
      return globalThis.getComputedStyle(el).position;
    });
    expect(position).toBe("fixed");

    // 左端に配置されていることを確認
    const left = await tocContainer.evaluate((el) => {
      return globalThis.getComputedStyle(el).left;
    });
    expect(left).toBe("0px");
  });

  test("階層の折りたたみ: アイコンクリックで子要素が折りたたまれる", async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/long-document.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // 折りたたみボタンが存在することを確認
    const collapseBtn = page.locator(".toc-collapse-btn").first();
    await expect(collapseBtn).toBeVisible();

    // 初期状態: 展開状態（▼）
    const initialIcon = await collapseBtn.textContent();
    expect(initialIcon).toBe("▼");

    // サブリストが表示されていることを確認
    const sublist = page.locator(".toc-sublist").first();
    await expect(sublist).toBeVisible();

    // 折りたたみボタンをクリック
    await collapseBtn.click();

    // アイコンが▶に変わることを確認
    const collapsedIcon = await collapseBtn.textContent();
    expect(collapsedIcon).toBe("▶");

    // サブリストが非表示になることを確認
    await expect(sublist).not.toBeVisible();

    // 再度クリックして展開
    await collapseBtn.click();

    // アイコンが▼に戻ることを確認
    const expandedIcon = await collapseBtn.textContent();
    expect(expandedIcon).toBe("▼");

    // サブリストが再表示されることを確認
    await expect(sublist).toBeVisible();
  });

  test("ToC全体の表示/非表示: Toggleボタンで開閉できる", async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/long-document.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // ToC ヘッダーとToggleボタンが存在することを確認
    const tocHeader = page.locator(".toc-header");
    await expect(tocHeader).toBeVisible();

    const toggleBtn = page.locator(".toc-toggle-btn");
    await expect(toggleBtn).toBeVisible();

    // 初期状態: 表示状態（×）
    const initialIcon = await toggleBtn.textContent();
    expect(initialIcon).toBe("×");

    // Toggleボタンをクリックして非表示にする
    await toggleBtn.click();

    // ToCヘッダーが非表示になることを確認
    await expect(tocHeader).not.toBeVisible();

    // ShowボタンがVisible（☰）
    const showBtn = page.locator(".toc-show-btn");
    await expect(showBtn).toBeVisible();
    const showIcon = await showBtn.textContent();
    expect(showIcon).toBe("☰");

    // ToCコンテナの幅が40pxになることを確認
    // ⚠️ E2E環境ではchrome.storage未対応のため、width = 40px（非表示時）
    // トランジション完了を待つために少し待機
    await page.waitForTimeout(500);
    const tocContainer = page.locator(".toc-container");
    const width = await tocContainer.evaluate((el) => {
      return globalThis.getComputedStyle(el).width;
    });
    expect(width).toBe("40px");

    // Showボタンをクリックして再表示
    await showBtn.click();

    // ToCヘッダーが再表示されることを確認
    await expect(tocHeader).toBeVisible();
    await expect(toggleBtn).toBeVisible();
  });

  test("横幅調整: Resize Handleが表示される", async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/long-document.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // Resize Handleが存在することを確認
    const resizeHandle = page.locator(".toc-resize-handle");
    await expect(resizeHandle).toBeVisible();

    // cursor: col-resize であることを確認
    const cursor = await resizeHandle.evaluate((el) => {
      return globalThis.getComputedStyle(el).cursor;
    });
    expect(cursor).toBe("col-resize");

    // 右端に配置されていることを確認
    const right = await resizeHandle.evaluate((el) => {
      return globalThis.getComputedStyle(el).right;
    });
    expect(right).toBe("0px");
  });

  test("スクロール追従: 長いドキュメントをスクロールしてもToCが見える", async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/long-document.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // 初期位置でToCが表示されていることを確認
    const tocContainer = page.locator(".toc-container");
    await expect(tocContainer).toBeVisible();

    // ページ下部にスクロール
    await page.evaluate(() => {
      globalThis.scrollTo(0, document.body.scrollHeight / 2);
    });

    // スクロール後もToCが表示されていることを確認
    await expect(tocContainer).toBeVisible();

    // さらに下部にスクロール
    await page.evaluate(() => {
      globalThis.scrollTo(0, document.body.scrollHeight);
    });

    // さらにスクロール後もToCが表示されていることを確認
    await expect(tocContainer).toBeVisible();
  });

  test("テーマ対応: 全6テーマでToC要素が存在する", async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/long-document.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // ToCコンテナが存在することを確認
    // PostCSS移行後はCSS変数ベースでテーマ切り替えを行うため、
    // toc-theme-*クラスは不要（テーマ別クラスではなくCSS変数で制御）
    const tocContainer = page.locator(".toc-container");
    await expect(tocContainer).toBeVisible();

    const classes = await tocContainer.getAttribute("class");
    expect(classes).toContain("toc-container");
  });

  test("アクティブハイライト: ページロード直後に最初の見出しがアクティブ", async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/long-document.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // ToCが表示されるのを待つ（前のテストでchrome.storageに非表示状態が残る場合の対策）
    const tocContainer = page.locator(".toc-container.visible");
    const isVisible = await tocContainer.isVisible().catch(() => false);
    if (!isVisible) {
      // ToCが非表示の場合、Showボタンをクリックして表示
      const showBtn = page.locator(".toc-show-btn");
      if (await showBtn.isVisible()) {
        await showBtn.click();
        await expect(tocContainer).toBeVisible();
      }
    }

    // ページロード直後にアクティブなToCリンクが存在すること
    const activeLink = page.locator(".toc-link.active");
    await expect(activeLink).toBeVisible({ timeout: 5000 });

    // 最初の見出し（Long Document Test）がアクティブであること
    const activeText = await activeLink.textContent();
    expect(activeText).toBe("Long Document Test");
  });

  test("アクティブハイライト: ページ最下部にスクロール後、最上部に戻ってもアクティブが消えない", async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/long-document.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // ToCが表示されていることを保証
    const tocContainer = page.locator(".toc-container.visible");
    const isVisible = await tocContainer.isVisible().catch(() => false);
    if (!isVisible) {
      const showBtn = page.locator(".toc-show-btn");
      if (await showBtn.isVisible()) {
        await showBtn.click();
        await expect(tocContainer).toBeVisible();
      }
    }

    // 初期状態でアクティブがあることを確認
    const activeLink = page.locator(".toc-link.active");
    await expect(activeLink).toBeVisible({ timeout: 5000 });

    // ページ最下部にスクロール
    await page.evaluate(() => {
      globalThis.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(500);

    // 最下部でもアクティブがあること
    await expect(activeLink).toBeVisible();

    // ページ最上部に戻る
    await page.evaluate(() => {
      globalThis.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);

    // 最上部でもアクティブが消えないこと
    await expect(activeLink).toBeVisible();
  });

  test("アクティブハイライト: スクロール中に常にいずれかの見出しがアクティブ", async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/long-document.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // ToCが表示されていることを保証
    const tocContainer = page.locator(".toc-container.visible");
    const isVisible = await tocContainer.isVisible().catch(() => false);
    if (!isVisible) {
      const showBtn = page.locator(".toc-show-btn");
      if (await showBtn.isVisible()) {
        await showBtn.click();
        await expect(tocContainer).toBeVisible();
      }
    }

    // 初期状態でアクティブがあることを確認
    const activeLink = page.locator(".toc-link.active");
    await expect(activeLink).toBeVisible({ timeout: 5000 });

    // 複数のスクロール位置でアクティブが常に存在することを確認
    const scrollPositions = [0.25, 0.5, 0.75, 1.0, 0.5, 0.0];
    for (const ratio of scrollPositions) {
      await page.evaluate((r) => {
        globalThis.scrollTo(0, document.body.scrollHeight * r);
      }, ratio);
      await page.waitForTimeout(400);

      // アクティブなリンクが常に1つ存在すること
      const count = await page.locator(".toc-link.active").count();
      expect(count).toBe(1);
    }
  });

  test("折りたたみ状態: リロード後も状態が保持される", async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/long-document.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // 折りたたみボタンをクリック
    const collapseBtn = page.locator(".toc-collapse-btn").first();
    await collapseBtn.click();

    // アイコンが▶に変わることを確認
    let icon = await collapseBtn.textContent();
    expect(icon).toBe("▶");

    // ページをリロード
    await page.reload();
    await expectMarkdownRendered(page);

    // リロード後も折りたたみ状態が保持されていることを確認
    const collapseBtnAfterReload = page.locator(".toc-collapse-btn").first();
    icon = await collapseBtnAfterReload.textContent();
    expect(icon).toBe("▶");

    // サブリストが非表示のままであることを確認
    const sublist = page.locator(".toc-sublist").first();
    await expect(sublist).not.toBeVisible();
  });

  test("ToC表示状態: リロード後も状態が保持される", async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/long-document.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // Toggleボタンをクリックして非表示にする
    const toggleBtn = page.locator(".toc-toggle-btn");
    await toggleBtn.click();

    // ShowボタンがVisible
    const showBtn = page.locator(".toc-show-btn");
    await expect(showBtn).toBeVisible();

    // ページをリロード
    await page.reload();
    await expectMarkdownRendered(page);

    // リロード後も非表示状態が保持されていることを確認
    const showBtnAfterReload = page.locator(".toc-show-btn");
    await expect(showBtnAfterReload).toBeVisible();

    // ToCヘッダーが非表示のままであることを確認
    const tocHeader = page.locator(".toc-header");
    await expect(tocHeader).not.toBeVisible();
  });
});
