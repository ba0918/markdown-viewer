// deno-lint-ignore-file no-explicit-any
/**
 * load-theme アクション単体テスト
 */

import { assertEquals } from "@std/assert";
import { createLoadThemeAction } from "./load-theme.ts";

(globalThis as any).DEBUG = false;

const action = createLoadThemeAction();

Deno.test("load-theme: 有効なthemeIdでsuccessを返す", async () => {
  const result = await action({ themeId: "light" });
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(typeof result.data, "object");
  }
});

Deno.test("load-theme: 無効なthemeIdでエラー", async () => {
  const result = await action({ themeId: "invalid-theme" });
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error.includes("invalid themeId"), true);
  }
});

Deno.test("load-theme: themeIdが数値の場合エラー", async () => {
  const result = await action({ themeId: 42 });
  assertEquals(result.success, false);
});

Deno.test("load-theme: themeId未指定の場合エラー", async () => {
  const result = await action({});
  assertEquals(result.success, false);
});
