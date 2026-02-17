// deno-lint-ignore-file no-explicit-any
/**
 * generate-export-html アクション単体テスト
 */

import { assertEquals } from "@std/assert";
import { createGenerateExportHtmlAction } from "./generate-export-html.ts";

// Chrome API モック（exportService依存チェーン用）
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

const action = createGenerateExportHtmlAction();

Deno.test("generate-export-html: htmlが数値の場合エラー", async () => {
  const result = await action({
    html: 123,
    themeId: "light",
    filename: "test.md",
  });
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(
      result.error.includes("html and filename must be strings"),
      true,
    );
  }
});

Deno.test("generate-export-html: filenameが数値の場合エラー", async () => {
  const result = await action({
    html: "<p>test</p>",
    themeId: "light",
    filename: 42,
  });
  assertEquals(result.success, false);
});

Deno.test("generate-export-html: payloadがundefinedの場合エラー", async () => {
  const result = await action(undefined);
  assertEquals(result.success, false);
});

Deno.test("generate-export-html: htmlが未指定の場合エラー", async () => {
  const result = await action({ themeId: "light", filename: "test.md" });
  assertEquals(result.success, false);
});
