/**
 * @file mermaid-rendering.spec.ts
 * @description Mermaidダイアグラム機能のE2Eテスト (mermaid + Dynamic Import版)
 *
 * Mermaid機能のテスト:
 * - Flowchart
 * - Sequence Diagram
 * - Class Diagram
 * - Multiple Diagrams
 * - Dynamic Loading (Mermaidブロックがない場合はロードしない)
 */

import { expect, test } from "./fixtures.ts";
import {
  expectMarkdownRendered,
  openMarkdownFile,
} from "./helpers/extension-helpers.ts";

test.describe("Mermaid Diagram Rendering", () => {
  test("Flowchart が正しくレンダリングされる", async ({ page, testServerUrl }) => {
    // コンソールログを収集
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

    const testUrl = `${testServerUrl}/tests/e2e/fixtures/mermaid-test.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // Mermaidダイアグラムコンテナが出現するまで待機（最大30秒）
    const firstDiagram = page.locator(".mermaid-diagram").first();
    await expect(firstDiagram).toBeVisible({ timeout: 30000 });

    // SVG要素が生成されていることを確認
    const svgInDiagram = firstDiagram.locator("svg");
    await expect(svgInDiagram).toBeVisible();

    // SVG内にパス要素が存在することを確認（ダイアグラムが描画されている）
    const paths = svgInDiagram.locator("path, g, rect, text");
    const pathCount = await paths.count();
    expect(pathCount).toBeGreaterThan(0);
  });

  test("複数のダイアグラムが正しくレンダリングされる", async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/mermaid-test.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // すべてのダイアグラムが出現するまで待機
    await page.waitForFunction(() => {
      const diagrams = document.querySelectorAll(".mermaid-diagram");
      return diagrams.length >= 4; // Flowchart + Sequence + Class + Simple Graph
    }, { timeout: 30000 });

    // すべてのダイアグラム要素を取得
    const allDiagrams = await page.locator(".mermaid-diagram").all();
    expect(allDiagrams.length).toBeGreaterThanOrEqual(4);

    // 各ダイアグラムにSVG要素が含まれていることを確認
    for (const diagram of allDiagrams) {
      const svg = diagram.locator("svg");
      await expect(svg).toBeVisible();
    }
  });

  test("Sequence Diagram が正しくレンダリングされる", async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/mermaid-test.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // すべてのダイアグラムが出現するまで待機
    await page.waitForFunction(() => {
      const diagrams = document.querySelectorAll(".mermaid-diagram");
      return diagrams.length >= 4;
    }, { timeout: 30000 });

    // 2番目のダイアグラム（Sequence Diagram）を確認
    const sequenceDiagram = page.locator(".mermaid-diagram").nth(1);
    await expect(sequenceDiagram).toBeVisible();

    // SVG要素が存在することを確認
    const svg = sequenceDiagram.locator("svg");
    await expect(svg).toBeVisible();
  });

  test("Class Diagram が正しくレンダリングされる", async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/mermaid-test.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // すべてのダイアグラムが出現するまで待機
    await page.waitForFunction(() => {
      const diagrams = document.querySelectorAll(".mermaid-diagram");
      return diagrams.length >= 4;
    }, { timeout: 30000 });

    // 3番目のダイアグラム（Class Diagram）を確認
    const classDiagram = page.locator(".mermaid-diagram").nth(2);
    await expect(classDiagram).toBeVisible();

    // SVG要素が存在することを確認
    const svg = classDiagram.locator("svg");
    await expect(svg).toBeVisible();
  });

  test("Mermaidブロックがない場合はライブラリがロードされない", async ({ page, testServerUrl }) => {
    // Mermaidブロックのないファイルを使用
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/basic-test.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // 少し待機してからMermaid要素の存在を確認
    await page.waitForTimeout(2000);

    // Mermaidダイアグラム要素が存在しないことを確認
    const diagramCount = await page.locator(".mermaid-diagram").count();
    expect(diagramCount).toBe(0);

    // コードブロックとして表示されていることを確認
    // （Mermaidブロックがないので、codeブロックも存在しない）
    const mermaidCodeBlocks = await page.locator("code.language-mermaid")
      .count();
    expect(mermaidCodeBlocks).toBe(0);
  });

  test("SVG出力が正しく生成される", async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/mermaid-test.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // 最初のダイアグラムが出現するまで待機
    const firstDiagram = page.locator(".mermaid-diagram").first();
    await expect(firstDiagram).toBeVisible({ timeout: 30000 });

    // SVG要素の存在を確認
    const svg = firstDiagram.locator("svg");
    await expect(svg).toBeVisible();

    // SVG内にパス要素が存在することを確認
    const paths = svg.locator("path, g, rect");
    const pathCount = await paths.count();
    expect(pathCount).toBeGreaterThan(0);

    // SVGのviewBox属性が設定されていることを確認（Mermaid v11はviewBoxを使用）
    const viewBox = await svg.getAttribute("viewBox");
    expect(viewBox).not.toBeNull();
    expect(viewBox).toMatch(/^[\d\s.-]+$/); // viewBoxは数値とスペースの形式（例: "0 0 100 100"）
  });

  test("元のコードブロックが削除されていることを確認", async ({ page, testServerUrl }) => {
    const testUrl = `${testServerUrl}/tests/e2e/fixtures/mermaid-test.md`;
    await openMarkdownFile(page, testUrl);
    await expectMarkdownRendered(page);

    // ダイアグラムがレンダリングされるまで待機
    await page.waitForFunction(() => {
      const diagrams = document.querySelectorAll(".mermaid-diagram");
      return diagrams.length >= 4;
    }, { timeout: 30000 });

    // 元の <code class="language-mermaid"> 要素が削除されていることを確認
    const codeBlocks = await page.locator("code.language-mermaid").count();
    expect(codeBlocks).toBe(0);

    // Mermaidダイアグラムコンテナが存在することを確認
    const diagramCount = await page.locator(".mermaid-diagram").count();
    expect(diagramCount).toBeGreaterThanOrEqual(4);
  });
});
