/**
 * Chrome Web Store用スクリーンショット撮影スクリプト
 *
 * Playwrightを使って1280x800のビューポートでdemo.mdを各テーマで撮影する。
 * 既存のE2Eインフラ（fixtures.ts）を活用。
 *
 * Service Worker経由でchrome.storage.syncにテーマを設定し、
 * ページロードで反映する。各テーマで異なるスクロール位置にして
 * 機能の多様性（Mermaid、テーブル、コードブロック、MathJax、チェックリスト）を訴求。
 *
 * 使用: xvfb-run --auto-servernum --server-args="-screen 0 1920x1080x24" \
 *       npx playwright test --config scripts/playwright-screenshots.config.ts
 */

import { test } from "../tests/e2e/fixtures.ts";
import {
  expectMarkdownRendered,
  openMarkdownFile,
} from "../tests/e2e/helpers/extension-helpers.ts";
import path from "node:path";
import process from "node:process";

// Chrome Web Store推奨サイズ
const VIEWPORT = { width: 1280, height: 800 };

/**
 * 撮影するテーマ構成（5枚 = Chrome Web Storeの最大数）
 *
 * 各テーマで見せる要素を散らして多様性を訴求:
 * 1. GitHub: Mermaidダイアグラム + テーブル（Tech Stackテーブルを中心に）
 * 2. Light: タイトル + ToC全体 + 概要（トップ位置、初見のインパクト）
 * 3. Dark: bash + TypeScriptコードブロック + シンタックスハイライト
 * 4. Solarized Dark: MathJax数式レンダリング（Performanceセクション）
 * 5. Minimal: MathJax数式 + チェックリスト（Performance〜Roadmap）
 */
const SCREENSHOTS = [
  {
    theme: "github",
    filename: "store1-github.png",
    // Tech Stackテーブルを画面中央付近に → Mermaid全体 + テーブルが見える
    scrollTarget: "h2:text('Tech Stack')",
    scrollOffset: -200, // 見出しの少し上にスクロール（Mermaid下部が見える）
  },
  {
    theme: "light",
    filename: "store2-light.png",
    scrollTarget: null,
    scrollOffset: 0,
  },
  {
    theme: "dark",
    filename: "store3-dark.png",
    // Quick Startのbashコードブロックから始まる位置
    scrollTarget: "h3:text('Quick Start')",
    scrollOffset: -20,
  },
  {
    theme: "solarized-dark",
    filename: "store4-solarized-dark.png",
    // Performance見出しを画面上部に
    scrollTarget: "h2:text('Performance')",
    scrollOffset: -20,
  },
  {
    theme: "minimal",
    filename: "store5-minimal.png",
    // Performance見出しを画面上部に → 数式 + チェックリスト両方見える
    scrollTarget: "h2:text('Performance')",
    scrollOffset: -20,
  },
] as const;

const OUTPUT_DIR = path.join(process.cwd(), "docs", "images");

for (const { theme, filename, scrollTarget, scrollOffset } of SCREENSHOTS) {
  test(`Capture screenshot: ${theme}`, async ({ context, page, testServerUrl }) => {
    // ビューポートサイズを設定
    await page.setViewportSize(VIEWPORT);

    // Service Worker経由でchrome.storage.sync の appState を更新
    // StateManagerは "appState" キーにAppState全体を保存している。
    // page.evaluateではchrome.storage APIにアクセスできないため、
    // Service Workerコンテキスト（拡張機能コンテキスト）で実行する。
    const [sw] = context.serviceWorkers();
    if (sw) {
      await sw.evaluate(async (themeId: string) => {
        // appStateを読み込み → テーマのみ変更 → 書き戻し
        const result = await chrome.storage.sync.get("appState");
        const appState = (result.appState as Record<string, unknown>) || {
          theme: "light",
          hotReload: { enabled: false, interval: 3000, autoReload: false },
        };
        appState.theme = themeId;
        await chrome.storage.sync.set({ appState });
      }, theme);
    }

    // テーマ設定後にMarkdownファイルを開く
    await openMarkdownFile(
      page,
      `${testServerUrl}/tests/e2e/fixtures/demo.md`,
    );
    await expectMarkdownRendered(page);

    // テーマCSSが適用されるまで待つ
    await page.waitForTimeout(1500);

    // ToCが表示されていることを確認
    const tocPanel = page.locator(".toc-panel");
    if (await tocPanel.count() > 0) {
      await tocPanel.first().waitFor({ state: "visible", timeout: 5000 })
        .catch(() => {
          // ToCが無くても続行
        });
    }

    // Mermaid / MathJax のレンダリング完了待ち
    await page.waitForTimeout(3000);

    // 指定された要素の位置まで精密スクロール
    if (scrollTarget) {
      const target = page.locator(`.markdown-viewer ${scrollTarget}`);
      if (await target.count() > 0) {
        // 要素のY座標を取得して、offsetを加えた位置にスクロール
        const box = await target.first().boundingBox();
        if (box) {
          // .markdown-viewer内でスクロール（ページ全体のscrollを使用）
          await page.evaluate(
            ({ top, offset }: { top: number; offset: number }) => {
              globalThis.scrollTo({
                top: top + globalThis.scrollY + offset,
                behavior: "instant",
              });
            },
            { top: box.y, offset: scrollOffset },
          );
          await page.waitForTimeout(500);
        }
      }
    }

    // スクリーンショット撮影
    const outputPath = path.join(OUTPUT_DIR, filename);
    await page.screenshot({
      path: outputPath,
      clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
    });

    console.log(`Captured: ${outputPath}`);
  });
}
