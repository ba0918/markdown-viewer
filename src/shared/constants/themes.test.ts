/**
 * テーマ関連定数のテスト
 */

import { assertEquals } from "@std/assert";
import { getThemeCssPath, VALID_THEMES } from "./themes.ts";

Deno.test("getThemeCssPath", async (t) => {
  await t.step("全テーマのパスを正しく生成", () => {
    for (const theme of VALID_THEMES) {
      const path = getThemeCssPath(theme);
      assertEquals(path, `content/styles/themes/${theme}.css`);
    }
  });

  await t.step("light テーマのパスを生成", () => {
    assertEquals(
      getThemeCssPath("light"),
      "content/styles/themes/light.css",
    );
  });

  await t.step("dark テーマのパスを生成", () => {
    assertEquals(
      getThemeCssPath("dark"),
      "content/styles/themes/dark.css",
    );
  });

  await t.step("solarized-light テーマのパスを生成", () => {
    assertEquals(
      getThemeCssPath("solarized-light"),
      "content/styles/themes/solarized-light.css",
    );
  });
});
