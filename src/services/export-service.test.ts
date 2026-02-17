// deno-lint-ignore-file no-explicit-any
/**
 * export-service.ts ユニットテスト
 *
 * Chrome API (chrome.runtime.getURL) と fetch をモックして
 * ExportServiceのHTML生成パイプラインをテスト。
 *
 * no-explicit-any: Chrome APIモックとfetchモックでany型キャストが必要
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { ExportService } from "./export-service.ts";
import type { ExportParams } from "./export-service.ts";

// Chrome API モック
(globalThis as any).chrome = {
  runtime: {
    getURL: (path: string) => `chrome-extension://test-ext-id/${path}`,
  },
};

// グローバルDEBUGフラグ設定（logger依存）
(globalThis as any).DEBUG = false;

// fetch モック（テーマCSSを返す）
const MOCK_THEME_CSS = `
.markdown-body { font-family: sans-serif; }
.theme-light { background: #fff; color: #333; }
`;

const originalFetch = globalThis.fetch;

// テスト用のfetchモックをセットアップ
const setupFetchMock = (css: string = MOCK_THEME_CSS, ok: boolean = true) => {
  (globalThis as any).fetch = (_url: string) =>
    Promise.resolve({
      ok,
      status: ok ? 200 : 404,
      text: () => Promise.resolve(css),
    });
};

// fetchモックを復元
const restoreFetch = () => {
  globalThis.fetch = originalFetch;
};

// --- 正常系テスト ---

Deno.test("ExportService: 基本的なHTML生成", async () => {
  setupFetchMock();
  try {
    const service = new ExportService();
    const params: ExportParams = {
      html: "<h1>Hello</h1><p>World</p>",
      themeId: "light",
      filename: "test.md",
      title: "Test Document",
    };

    const result = await service.generateExportHTML(params);

    // HTML5ドキュメント構造を検証
    assertStringIncludes(result, "<!DOCTYPE html>");
    assertStringIncludes(result, "<html");
    assertStringIncludes(result, "</html>");
    // コンテンツが含まれている
    assertStringIncludes(result, "<h1>Hello</h1>");
    assertStringIncludes(result, "<p>World</p>");
    // テーマCSSが埋め込まれている
    assertStringIncludes(result, "markdown-body");
    // タイトルが設定されている
    assertStringIncludes(result, "Test Document");
  } finally {
    restoreFetch();
  }
});

Deno.test("ExportService: タイトルなしの場合", async () => {
  setupFetchMock();
  try {
    const service = new ExportService();
    const params: ExportParams = {
      html: "<p>Content</p>",
      themeId: "dark",
      filename: "readme.md",
    };

    const result = await service.generateExportHTML(params);

    // HTML構造は正常に生成される
    assertStringIncludes(result, "<!DOCTYPE html>");
    assertStringIncludes(result, "<p>Content</p>");
  } finally {
    restoreFetch();
  }
});

Deno.test("ExportService: 各テーマでHTML生成できる", async () => {
  setupFetchMock();
  try {
    const service = new ExportService();
    const themes = [
      "light",
      "dark",
      "github",
      "minimal",
      "solarized-light",
      "solarized-dark",
    ] as const;

    for (const themeId of themes) {
      const params: ExportParams = {
        html: "<p>Test</p>",
        themeId,
        filename: "test.md",
      };

      const result = await service.generateExportHTML(params);
      assertStringIncludes(result, "<!DOCTYPE html>");
      assertStringIncludes(result, "<p>Test</p>");
    }
  } finally {
    restoreFetch();
  }
});

Deno.test("ExportService: chrome.runtime.getURLが正しいパスで呼ばれる", async () => {
  let capturedUrl = "";
  (globalThis as any).fetch = (url: string) => {
    capturedUrl = url;
    return Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(MOCK_THEME_CSS),
    });
  };

  try {
    const service = new ExportService();
    const params: ExportParams = {
      html: "<p>Test</p>",
      themeId: "light",
      filename: "test.md",
    };

    await service.generateExportHTML(params);

    // chrome.runtime.getURLで生成されたURLがfetchに渡されている
    assertEquals(
      capturedUrl.startsWith("chrome-extension://test-ext-id/"),
      true,
    );
    assertEquals(capturedUrl.includes("light"), true);
  } finally {
    restoreFetch();
  }
});

// --- 異常系テスト ---

Deno.test("ExportService: fetch失敗時にエラーをthrow", async () => {
  (globalThis as any).fetch = () => Promise.reject(new Error("Network error"));

  try {
    const service = new ExportService();
    const params: ExportParams = {
      html: "<p>Test</p>",
      themeId: "light",
      filename: "test.md",
    };

    let error: Error | null = null;
    try {
      await service.generateExportHTML(params);
    } catch (e) {
      error = e as Error;
    }

    assertEquals(error !== null, true);
    assertEquals(error?.message, "Network error");
  } finally {
    restoreFetch();
  }
});

Deno.test("ExportService: 空のHTMLコンテンツでも生成可能", async () => {
  setupFetchMock();
  try {
    const service = new ExportService();
    const params: ExportParams = {
      html: "",
      themeId: "light",
      filename: "empty.md",
    };

    const result = await service.generateExportHTML(params);
    assertStringIncludes(result, "<!DOCTYPE html>");
  } finally {
    restoreFetch();
  }
});
