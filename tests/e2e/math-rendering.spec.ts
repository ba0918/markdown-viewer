/**
 * @file math-rendering.spec.ts
 * @description MathJax数式表示機能のE2Eテスト (mathjax-full + SVG版)
 *
 * MathJax機能のテスト:
 * - Inline Math ($...$)
 * - Display Math ($$...$$)
 * - Mixed Math
 * - Dynamic Loading (数式がない場合はロードしない)
 */

import { test, expect } from './fixtures.ts';
import {
  openMarkdownFile,
  expectMarkdownRendered,
} from './helpers/extension-helpers.ts';

test.describe('MathJax Math Rendering', () => {

  test('インライン数式が正しくレンダリングされる', async ({ page, testServerUrl }) => {
    // コンソールログを収集
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    const testUrl = `${testServerUrl}/tests/e2e/fixtures/math-test.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // mathjax-fullは <mjx-container> 要素を生成する
    // 最初の数式要素が出現するまで待機（最大30秒）
    const firstMath = page.locator('mjx-container').first();
    await expect(firstMath).toBeVisible({ timeout: 30000 });

    // SVG要素が生成されていることを確認
    const svgInMath = firstMath.locator('svg');
    await expect(svgInMath).toBeVisible();

    // インライン数式とディスプレイ数式の合計があることを確認
    const allMathCount = await page.locator('mjx-container').count();
    expect(allMathCount).toBeGreaterThan(0);
  });

  test('ディスプレイ数式が正しくレンダリングされる', async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/math-test.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // まずすべての数式要素が出現するまで待機
    await page.waitForFunction(() => {
      const containers = document.querySelectorAll('mjx-container');
      return containers.length >= 6; // インライン + ディスプレイ
    }, { timeout: 30000 });

    // すべてのmjx-container要素を取得
    const allMath = await page.locator('mjx-container').all();
    expect(allMath.length).toBeGreaterThanOrEqual(6);

    // 各数式にSVG要素が含まれていることを確認
    for (const math of allMath) {
      const svg = math.locator('svg');
      await expect(svg).toBeVisible();
    }

    // ディスプレイ数式はセンタリングされているはず（CSSで）
    // math-test.mdには複数のディスプレイ数式があることを確認
    const allMathCount = allMath.length;
    expect(allMathCount).toBeGreaterThanOrEqual(6);
  });

  test('複数の数式が同時にレンダリングされる', async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/math-test.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // すべての数式要素が出現するまで待機
    await page.waitForFunction(() => {
      const containers = document.querySelectorAll('mjx-container');
      return containers.length >= 6; // インライン + ディスプレイ
    }, { timeout: 30000 });

    // すべての数式要素をカウント
    const allMathCount = await page.locator('mjx-container').count();
    expect(allMathCount).toBeGreaterThanOrEqual(6);

    // 各数式にSVGが含まれていることを確認
    const firstMath = page.locator('mjx-container').first();
    const svgCount = await firstMath.locator('svg').count();
    expect(svgCount).toBeGreaterThan(0);
  });

  test('数式がない場合はMathJaxがロードされない', async ({ page, testServerUrl }) => {
    // 数式のないMarkdownファイルを使用
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/basic-test.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // 少し待機してからMathJax要素の存在を確認
    await page.waitForTimeout(2000);

    // MathJax要素が存在しないことを確認
    const mathCount = await page.locator('mjx-container').count();
    expect(mathCount).toBe(0);

    // SVG要素も存在しないことを確認
    const svgCount = await page.locator('mjx-container svg').count();
    expect(svgCount).toBe(0);
  });

  test('SVG出力が正しく生成される', async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/math-test.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // 最初の数式要素が出現するまで待機
    const firstMath = page.locator('mjx-container').first();
    await expect(firstMath).toBeVisible({ timeout: 30000 });

    // SVG要素の存在を確認
    const svg = firstMath.locator('svg');
    await expect(svg).toBeVisible();

    // SVG内にパス要素が存在することを確認（フォント情報が埋め込まれている）
    const paths = svg.locator('path, g');
    const pathCount = await paths.count();
    expect(pathCount).toBeGreaterThan(0);

    // SVGの幅と高さが設定されていることを確認
    const svgWidth = await svg.getAttribute('width');
    const svgHeight = await svg.getAttribute('height');
    expect(svgWidth).not.toBeNull();
    expect(svgHeight).not.toBeNull();
  });
});
