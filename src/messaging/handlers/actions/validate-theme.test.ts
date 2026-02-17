/**
 * validate-theme 単体テスト
 */

import { assertEquals } from "@std/assert";
import { validateThemeId } from "./validate-theme.ts";

Deno.test("validateThemeId: 有効なテーマID 'light'", () => {
  assertEquals(validateThemeId("light"), true);
});

Deno.test("validateThemeId: 有効なテーマID 'dark'", () => {
  assertEquals(validateThemeId("dark"), true);
});

Deno.test("validateThemeId: 有効なテーマID 'solarized-light'", () => {
  assertEquals(validateThemeId("solarized-light"), true);
});

Deno.test("validateThemeId: 無効な文字列", () => {
  assertEquals(validateThemeId("invalid-theme"), false);
});

Deno.test("validateThemeId: 数値は無効", () => {
  assertEquals(validateThemeId(42), false);
});

Deno.test("validateThemeId: nullは無効", () => {
  assertEquals(validateThemeId(null), false);
});

Deno.test("validateThemeId: undefinedは無効", () => {
  assertEquals(validateThemeId(undefined), false);
});

Deno.test("validateThemeId: XSSペイロードは無効", () => {
  assertEquals(validateThemeId("<script>alert(1)</script>"), false);
});
