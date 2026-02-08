import {
  assertEquals as _assertEquals,
  assertStringIncludes,
} from "@std/assert";
import { applyTheme } from "./applier.ts";
import type { ThemeData } from "./types.ts";

/**
 * テーマ適用テスト
 *
 * 注: CSSファイルの読み込みはcontent層の責務。
 * applier.ts はテーマクラスを付与するのみ。
 */

Deno.test("applyTheme: テーマクラスが付与される", () => {
  const html = "<p>Content</p>";
  const theme: ThemeData = {
    id: "dark",
    cssPath: "content/styles/themes/dark.css",
  };

  const result = applyTheme(html, theme);

  assertStringIncludes(result, "theme-dark");
  assertStringIncludes(result, "markdown-body");
});

Deno.test("applyTheme: HTMLコンテンツが保持される", () => {
  const html = "<h1>Title</h1><p>Paragraph</p>";
  const theme: ThemeData = {
    id: "github",
    cssPath: "content/styles/themes/github.css",
  };

  const result = applyTheme(html, theme);

  assertStringIncludes(result, "<h1>Title</h1>");
  assertStringIncludes(result, "<p>Paragraph</p>");
});

Deno.test("applyTheme: 複数テーマでクラス名が正しく付与される", () => {
  const html = "<p>Test</p>";
  const themes: ThemeData[] = [
    { id: "light", cssPath: "content/styles/themes/light.css" },
    { id: "dark", cssPath: "content/styles/themes/dark.css" },
    { id: "github", cssPath: "content/styles/themes/github.css" },
    { id: "minimal", cssPath: "content/styles/themes/minimal.css" },
    {
      id: "solarized-light",
      cssPath: "content/styles/themes/solarized-light.css",
    },
    {
      id: "solarized-dark",
      cssPath: "content/styles/themes/solarized-dark.css",
    },
  ];

  for (const theme of themes) {
    const result = applyTheme(html, theme);
    assertStringIncludes(result, `theme-${theme.id}`);
    assertStringIncludes(result, "markdown-body");
  }
});
