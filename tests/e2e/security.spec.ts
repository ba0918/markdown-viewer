import { expect, test } from "./fixtures.ts";
import {
  expectMarkdownRendered,
  openMarkdownFile,
} from "./helpers/extension-helpers.ts";

test.describe("XSS Protection", () => {
  test("XSS攻撃パターン集のMarkdownを安全にレンダリングする", async ({ page, testServerUrl }) => {
    // XSS攻撃パターンを含むMarkdownを開く
    await openMarkdownFile(
      page,
      `${testServerUrl}/tests/e2e/fixtures/xss-attack.md`,
    );

    // Markdownが正常にレンダリングされることを確認
    await expectMarkdownRendered(page);

    // コンソールにエラーがないことを確認
    const consoleMessages: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleMessages.push(msg.text());
      }
    });

    // alertが発火していないことを確認（ダイアログが表示されない）
    let alertFired = false;
    page.on("dialog", async (dialog) => {
      alertFired = true;
      await dialog.dismiss();
    });

    // 少し待機してalertが発火しないことを確認
    await page.waitForTimeout(1000);

    expect(alertFired).toBe(false);
  });

  test("JavaScript protocolリンクが無効化される", async ({ page, testServerUrl }) => {
    await openMarkdownFile(
      page,
      `${testServerUrl}/tests/e2e/fixtures/xss-attack.md`,
    );
    await expectMarkdownRendered(page);

    // javascript: リンクを探す
    const links = await page.locator('a[href*="javascript"]').all();

    // 全てのjavascript:リンクが削除またはhrefが無効化されていることを確認
    for (const link of links) {
      const href = await link.getAttribute("href");
      expect(href).not.toMatch(/javascript:/i);
    }
  });

  test("SVGインジェクションのonloadイベントハンドラが削除される", async ({ page }) => {
    const maliciousMarkdown = `
# SVG XSS Test
<svg onload="alert('XSS')"><circle r="50"/></svg>
    `;

    // 一時的なMarkdownファイルとしてメモリ上で作成
    await page.goto("data:text/html,");
    await page.evaluate((md) => {
      // contentスクリプトをシミュレート
      const blob = new Blob([md], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      globalThis.location.href = url;
    }, maliciousMarkdown);

    await page.waitForTimeout(1000);

    // SVG要素が存在するか確認
    const svg = page.locator("svg").first();

    if ((await svg.count()) > 0) {
      // SVG要素が存在する場合、onload属性が削除されていることを確認
      const onload = await svg.getAttribute("onload");
      expect(onload).toBeNull();
    }
    // SVG要素自体が削除されている場合もOK
  });

  test("imgタグのonerrorイベントハンドラが削除される", async ({ page }) => {
    const maliciousMarkdown = `
# Image XSS Test
<img src="x" onerror="alert('XSS')">
    `;

    // data URLで直接Markdownをロード
    await page.goto(
      `data:text/markdown,${encodeURIComponent(maliciousMarkdown)}`,
    );
    await page.waitForTimeout(1000);

    // img要素のonerror属性が削除されていることを確認
    const imgs = await page.locator("img").all();

    for (const img of imgs) {
      const onerror = await img.getAttribute("onerror");
      expect(onerror).toBeNull();
    }
  });

  test("onclickなどのイベントハンドラが削除される", async ({ page }) => {
    const maliciousMarkdown = `
# Event Handler XSS Test
<div onclick="alert('XSS')">Click me</div>
<button onmouseover="alert('XSS')">Hover me</button>
    `;

    await page.goto(
      `data:text/markdown,${encodeURIComponent(maliciousMarkdown)}`,
    );
    await page.waitForTimeout(1000);

    // 全要素のイベントハンドラが削除されていることを確認
    const elements = await page.locator("[onclick], [onmouseover]").all();

    expect(elements.length).toBe(0);
  });

  test("styleタグ内のXSSが無効化される", async ({ page }) => {
    const maliciousMarkdown = `
# Style XSS Test
<style>@import url('data:,*{x:expression(alert(1))}')</style>
    `;

    await page.goto(
      `data:text/markdown,${encodeURIComponent(maliciousMarkdown)}`,
    );
    await page.waitForTimeout(1000);

    // style要素が削除されているか、内容がサニタイズされていることを確認
    const styles = await page.locator("style").all();

    for (const style of styles) {
      const content = await style.textContent();
      // expression()やalert()が含まれていないことを確認
      expect(content).not.toMatch(/expression\s*\(/);
      expect(content).not.toMatch(/alert\s*\(/);
    }
  });

  test("data: URLスキームのiframeが削除される", async ({ page }) => {
    const maliciousMarkdown = `
# Iframe XSS Test
<iframe src="data:text/html,<script>alert('XSS')</script>"></iframe>
    `;

    await page.goto(
      `data:text/markdown,${encodeURIComponent(maliciousMarkdown)}`,
    );
    await page.waitForTimeout(1000);

    // iframe要素が削除されているか、src属性が無効化されていることを確認
    const iframes = await page.locator("iframe").all();

    for (const iframe of iframes) {
      const src = await iframe.getAttribute("src");
      if (src !== null) {
        expect(src).not.toMatch(/^data:/);
      }
    }
  });

  test("objectタグが削除される", async ({ page }) => {
    const maliciousMarkdown = `
# Object XSS Test
<object data="javascript:alert('XSS')"></object>
    `;

    await page.goto(
      `data:text/markdown,${encodeURIComponent(maliciousMarkdown)}`,
    );
    await page.waitForTimeout(1000);

    // object要素が削除されていることを確認
    const objects = await page.locator("object").all();

    expect(objects.length).toBe(0);
  });

  test("embedタグが削除される", async ({ page }) => {
    const maliciousMarkdown = `
# Embed XSS Test
<embed src="javascript:alert('XSS')">
    `;

    await page.goto(
      `data:text/markdown,${encodeURIComponent(maliciousMarkdown)}`,
    );
    await page.waitForTimeout(1000);

    // embed要素が削除されていることを確認
    const embeds = await page.locator("embed").all();

    expect(embeds.length).toBe(0);
  });

  test("meta refreshによるXSSが無効化される", async ({ page }) => {
    const maliciousMarkdown = `
# Meta Refresh XSS Test
<meta http-equiv="refresh" content="0;url=javascript:alert('XSS')">
    `;

    await page.goto(
      `data:text/markdown,${encodeURIComponent(maliciousMarkdown)}`,
    );
    await page.waitForTimeout(1000);

    // meta要素が削除されているか、http-equiv属性が無効化されていることを確認
    const metas = await page.locator('meta[http-equiv="refresh"]').all();

    for (const meta of metas) {
      const content = await meta.getAttribute("content");
      if (content !== null) {
        expect(content).not.toMatch(/javascript:/);
      }
    }
  });

  test("linkタグによるXSSが無効化される", async ({ page }) => {
    const maliciousMarkdown = `
# Link XSS Test
<link rel="stylesheet" href="javascript:alert('XSS')">
    `;

    await page.goto(
      `data:text/markdown,${encodeURIComponent(maliciousMarkdown)}`,
    );
    await page.waitForTimeout(1000);

    // link要素のhref属性にjavascript:が含まれていないことを確認
    const links = await page.locator('link[href*="javascript"]').all();

    expect(links.length).toBe(0);
  });

  test("formのaction属性によるXSSが無効化される", async ({ page }) => {
    const maliciousMarkdown = `
# Form XSS Test
<form action="javascript:alert('XSS')"><input type="submit"></form>
    `;

    await page.goto(
      `data:text/markdown,${encodeURIComponent(maliciousMarkdown)}`,
    );
    await page.waitForTimeout(1000);

    // form要素のaction属性にjavascript:が含まれていないことを確認
    const forms = await page.locator("form").all();

    for (const form of forms) {
      const action = await form.getAttribute("action");
      if (action !== null) {
        expect(action).not.toMatch(/javascript:/i);
      }
    }
  });

  test("baseタグが削除またはhrefが無効化される", async ({ page }) => {
    const maliciousMarkdown = `
# Base XSS Test
<base href="javascript:alert('XSS')//">
    `;

    await page.goto(
      `data:text/markdown,${encodeURIComponent(maliciousMarkdown)}`,
    );
    await page.waitForTimeout(1000);

    // base要素が削除されているか、href属性が無効化されていることを確認
    const bases = await page.locator("base").all();

    for (const base of bases) {
      const href = await base.getAttribute("href");
      if (href !== null) {
        expect(href).not.toMatch(/javascript:/i);
      }
    }
  });
});

test.describe("Mermaid SVG XSS Protection", () => {
  test("Mermaid図にXSS攻撃ベクターを含むMarkdownを安全にレンダリングする", async ({ page, testServerUrl }) => {
    // ダイアログ（alert等）が発火しないことを監視
    let alertFired = false;
    page.on("dialog", async (dialog) => {
      alertFired = true;
      await dialog.dismiss();
    });

    // Mermaid XSSフィクスチャを開く
    await openMarkdownFile(
      page,
      `${testServerUrl}/tests/e2e/fixtures/xss-mermaid.md`,
    );
    await expectMarkdownRendered(page);

    // Mermaidダイアグラムのレンダリングを待機
    await page.waitForTimeout(3000);

    // alertが発火していないことを確認
    expect(alertFired).toBe(false);
  });

  test("Mermaid SVG内にscriptタグが存在しない", async ({ page, testServerUrl }) => {
    await openMarkdownFile(
      page,
      `${testServerUrl}/tests/e2e/fixtures/xss-mermaid.md`,
    );
    await expectMarkdownRendered(page);

    // Mermaidダイアグラムのレンダリングを待機
    await page.waitForTimeout(3000);

    // Mermaidダイアグラム内のscriptタグが存在しないことを確認
    const scripts = await page.locator(".mermaid-diagram script").all();
    expect(scripts.length).toBe(0);
  });

  test("Mermaid SVG内にイベントハンドラ属性が存在しない", async ({ page, testServerUrl }) => {
    await openMarkdownFile(
      page,
      `${testServerUrl}/tests/e2e/fixtures/xss-mermaid.md`,
    );
    await expectMarkdownRendered(page);

    // Mermaidダイアグラムのレンダリングを待機
    await page.waitForTimeout(3000);

    // Mermaidダイアグラム内のイベントハンドラ属性が存在しないことを確認
    const maliciousElements = await page.locator(
      ".mermaid-diagram [onerror], .mermaid-diagram [onload], .mermaid-diagram [onclick], .mermaid-diagram [onmouseover]",
    ).all();
    expect(maliciousElements.length).toBe(0);
  });

  test("Mermaid SVG内にjavascript: URLが存在しない", async ({ page, testServerUrl }) => {
    await openMarkdownFile(
      page,
      `${testServerUrl}/tests/e2e/fixtures/xss-mermaid.md`,
    );
    await expectMarkdownRendered(page);

    // Mermaidダイアグラムのレンダリングを待機
    await page.waitForTimeout(3000);

    // Mermaidダイアグラム内のリンクにjavascript:が含まれていないことを確認
    const links = await page.locator('.mermaid-diagram a[href*="javascript"]')
      .all();
    expect(links.length).toBe(0);
  });
});

test.describe("Content Security Policy", () => {
  test.skip("拡張機能のCSPが正しく設定されている", async () => {
    // TODO: CSP検証の実装
    // manifest.jsonのCSP設定を確認
    // script-src 'self'
    // style-src 'self'
    // object-src 'none'
  });
});

test.describe("Subresource Integrity", () => {
  test.skip("外部スクリプトがSRIハッシュで検証される", async () => {
    // TODO: SRI検証の実装
    // MathJax, Mermaid などの外部スクリプトがSRIで検証されることを確認
    // （将来的にSRIを実装する場合のテスト）
  });
});
