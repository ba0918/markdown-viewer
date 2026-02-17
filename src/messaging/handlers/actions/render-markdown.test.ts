// deno-lint-ignore-file no-explicit-any
/**
 * render-markdown アクション単体テスト
 */

import { assertEquals } from "@std/assert";
import { createRenderMarkdownAction } from "./render-markdown.ts";

// Chrome API モック（loadTheme → markdownService依存チェーン）
(globalThis as any).chrome = {
  storage: {
    sync: {
      get: () => Promise.resolve({}),
      set: () => Promise.resolve(),
      clear: () => Promise.resolve(),
    },
    onChanged: { addListener: () => {} },
  },
  runtime: { getURL: (path: string) => `chrome-extension://test-id/${path}` },
};
(globalThis as any).DEBUG = false;

const action = createRenderMarkdownAction();

Deno.test("render-markdown: 正常なmarkdownでsuccessを返す", async () => {
  const result = await action({ markdown: "# Hello" });
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(typeof result.data, "object");
  }
});

Deno.test("render-markdown: markdownが文字列でない場合エラー", async () => {
  const result = await action({ markdown: 123 });
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.includes("markdown must be a string"), true);
  }
});

Deno.test("render-markdown: payloadがundefinedの場合エラー", async () => {
  const result = await action(undefined);
  assertEquals(result.success, false);
});

Deno.test("render-markdown: payloadが空オブジェクトの場合エラー", async () => {
  const result = await action({});
  assertEquals(result.success, false);
});

Deno.test("render-markdown: 有効なthemeIdでレンダリング成功", async () => {
  const result = await action({ markdown: "# Hello", themeId: "dark" });
  assertEquals(result.success, true);
});

Deno.test("render-markdown: themeId未指定でデフォルトテーマ適用", async () => {
  const result = await action({ markdown: "# Hello", themeId: undefined });
  assertEquals(result.success, true);
});

Deno.test("render-markdown: 無効なthemeIdでエラー", async () => {
  const result = await action({
    markdown: "# Hello",
    themeId: "invalid-theme",
  });
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.includes("invalid themeId"), true);
  }
});

Deno.test("render-markdown: themeIdが数値の場合エラー", async () => {
  const result = await action({ markdown: "# Hello", themeId: 42 });
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.includes("invalid themeId"), true);
  }
});

Deno.test("render-markdown: themeIdがXSSペイロードの場合エラー", async () => {
  const result = await action({
    markdown: "# Hello",
    themeId: "<script>alert(1)</script>",
  });
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.includes("invalid themeId"), true);
  }
});
