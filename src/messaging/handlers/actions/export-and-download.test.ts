// deno-lint-ignore-file no-explicit-any
/**
 * export-and-download アクション単体テスト
 */

import { assertEquals } from "@std/assert";
import { createExportAndDownloadAction } from "./export-and-download.ts";

// Chrome API モック
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
  downloads: {
    download: () => Promise.resolve(1),
    onDeterminingFilename: {
      addListener: () => {},
      removeListener: () => {},
    },
  },
};
(globalThis as any).DEBUG = false;

const action = createExportAndDownloadAction();

Deno.test("export-and-download: htmlが未指定の場合エラー", async () => {
  const result = await action({
    html: null,
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

Deno.test("export-and-download: filenameが未指定の場合エラー", async () => {
  const result = await action({ html: "<p>test</p>", themeId: "light" });
  assertEquals(result.success, false);
});

Deno.test("export-and-download: payloadがundefinedの場合エラー", async () => {
  const result = await action(undefined);
  assertEquals(result.success, false);
});
